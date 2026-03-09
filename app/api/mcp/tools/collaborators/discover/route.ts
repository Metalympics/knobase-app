/**
 * MCP Tool: collaborators/discover
 * 
 * Enables agents to discover and query workspace members (humans + agents)
 * to find the right collaborator for a task.
 * 
 * Use Case:
 * 1. General agent receives task: "Analyze Q3 data"
 * 2. Agent realizes: "I need a data specialist"
 * 3. Agent calls this tool: "Who can do data analysis?"
 * 4. System returns: @data-analyst (specialist agent)
 * 5. Agent can then mention the specialist
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import {
  findCollaborators,
  extractKeywordsFromQuery,
} from '@/lib/collaborators/discovery';
import type { CollaboratorQuery } from '@/lib/collaborators/types';

const MCPDiscoverSchema = z.object({
  // Natural language query
  query: z.string().optional(),
  
  // Specific capability filters
  capabilities: z.array(z.string()).optional(),
  
  // Domain expertise filters
  expertise: z.array(z.string()).optional(),
  
  // Filter by type
  type: z.enum(['human', 'agent', 'all']).optional().default('all'),
  
  // Only return available members
  available_only: z.boolean().optional().default(false),
  
  // Maximum results
  limit: z.number().min(1).max(20).optional().default(5),
  
  // Minimum confidence threshold
  min_confidence: z.number().min(0).max(1).optional().default(0.4),
  
  // Exclude the calling agent
  exclude_self: z.boolean().optional().default(true),
});

/**
 * POST /api/mcp/tools/collaborators/discover
 * 
 * MCP tool for agent-to-agent discovery
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const params = MCPDiscoverSchema.parse(body);

    // Authenticate via API key (required for MCP tools)
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: 'API key required for MCP tool access',
                },
                null,
                2
              ),
            },
          ],
        },
        { status: 401 }
      );
    }

    const supabase = await createServerClient();

    // Verify API key and get school + agent context
    const { data: keyData, error: keyError } = await supabase
      .from('agent_api_keys')
      .select('school_id, agent_id')
      .eq('key_hash', apiKey)
      .is('revoked_at', null)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json(
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Invalid or revoked API key',
                },
                null,
                2
              ),
            },
          ],
        },
        { status: 401 }
      );
    }

    const { school_id: workspaceId, agent_id: callingAgentId } = keyData;

    // Build search query
    let searchQuery: CollaboratorQuery = {
      query: params.query,
      capabilities: params.capabilities || [],
      expertise: params.expertise || [],
      type: params.type,
      available_only: params.available_only,
      limit: params.limit,
      min_confidence: params.min_confidence,
      exclude_ids: params.exclude_self ? [callingAgentId] : [],
    };

    // Auto-extract keywords from natural language query
    if (params.query) {
      const extracted = extractKeywordsFromQuery(params.query);
      searchQuery.capabilities = [
        ...(searchQuery.capabilities || []),
        ...extracted.capabilities,
      ];
      searchQuery.expertise = [
        ...(searchQuery.expertise || []),
        ...extracted.expertise,
      ];
    }

    // Perform discovery
    const results = await findCollaborators(workspaceId, searchQuery);

    // Format results for MCP response
    const formattedResults = results.collaborators.map((result) => ({
      id: result.member.id,
      name: result.member.name,
      type: result.member.type,
      description: result.member.description,
      capabilities: result.member.capabilities,
      expertise: result.member.expertise,
      availability: result.member.availability,
      confidence: result.confidence,
      match_reason: result.match_reason,
      mention_syntax: `@${result.member.name.replace(/\s+/g, '-').toLowerCase()}`,
      
      // Include relevant profile info
      ...(result.member.type === 'agent' && result.member.agent_profile
        ? {
            agent_type: result.member.agent_profile.agent_type,
            success_rate: result.member.agent_profile.success_rate,
            total_invocations: result.member.agent_profile.total_invocations,
          }
        : {}),
      
      ...(result.member.type === 'human' && result.member.human_profile
        ? {
            email: result.member.human_profile.email,
            role: result.member.human_profile.role,
          }
        : {}),
    }));

    // Build response message
    const responseMessage = buildResponseMessage(
      formattedResults,
      params.query,
      results.total
    );

    // Return MCP-compatible response
    return NextResponse.json(
      {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                collaborators: formattedResults,
                total: results.total,
                query: params.query || 'No query provided',
                message: responseMessage,
              },
              null,
              2
            ),
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('MCP collaborators/discover error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Invalid parameters',
                  details: error.issues,
                },
                null,
                2
              ),
            },
          ],
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Discovery failed',
              },
              null,
              2
            ),
          },
        ],
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mcp/tools/collaborators/discover
 * 
 * Returns tool metadata for MCP discovery
 */
export async function GET() {
  return NextResponse.json({
    name: 'collaborators/discover',
    description:
      'Discover workspace members (humans and agents) who can help with specific tasks. Returns ranked results based on capabilities, expertise, and availability.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Natural language query describing what you need help with (e.g., "I need someone to analyze Q3 financial data")',
        },
        capabilities: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Specific capability tags to filter by (e.g., ["data-analysis", "sql"])',
        },
        expertise: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Domain expertise to filter by (e.g., ["finance", "healthcare"])',
        },
        type: {
          type: 'string',
          enum: ['human', 'agent', 'all'],
          default: 'all',
          description: 'Filter by member type',
        },
        available_only: {
          type: 'boolean',
          default: false,
          description: 'Only return members who are currently available',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 20,
          default: 5,
          description: 'Maximum number of results to return',
        },
        min_confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          default: 0.4,
          description: 'Minimum confidence threshold for matches (0-1)',
        },
        exclude_self: {
          type: 'boolean',
          default: true,
          description: 'Exclude the calling agent from results',
        },
      },
    },
    examples: [
      {
        description: 'Find a data analyst',
        input: {
          query: 'I need someone to analyze Q3 financial data',
          type: 'agent',
          limit: 3,
        },
        output: {
          collaborators: [
            {
              id: 'agent-uuid',
              name: 'Data Analyst',
              type: 'agent',
              description:
                'Specializes in financial data analysis, SQL queries, and creating executive dashboards',
              capabilities: ['data-analysis', 'sql', 'finance', 'visualization'],
              confidence: 0.95,
              mention_syntax: '@data-analyst',
            },
          ],
        },
      },
      {
        description: 'Find collaborators with specific capabilities',
        input: {
          capabilities: ['writing', 'research'],
          type: 'all',
          available_only: true,
        },
        output: {
          collaborators: [
            {
              name: 'Content Writer',
              capabilities: ['writing', 'research', 'seo'],
              availability: 'online',
            },
          ],
        },
      },
    ],
  });
}

/**
 * Build a helpful response message for the agent
 */
function buildResponseMessage(
  results: any[],
  query: string | undefined,
  total: number
): string {
  if (total === 0) {
    return query
      ? `No collaborators found matching "${query}". Try broadening your search criteria.`
      : 'No collaborators found. Try adjusting your filters.';
  }

  const topResult = results[0];
  const topResultType = topResult.type === 'agent' ? 'agent' : 'team member';

  let message = `Found ${total} matching collaborator${total > 1 ? 's' : ''}`;
  
  if (query) {
    message += ` for "${query}"`;
  }
  
  message += `. Top match: ${topResult.mention_syntax} (${topResult.name})`;

  if (topResult.description) {
    message += ` - ${topResult.description.slice(0, 100)}${topResult.description.length > 100 ? '...' : ''}`;
  }

  message += `. You can mention ${topResult.type === 'agent' ? 'this agent' : 'them'} using ${topResult.mention_syntax}`;

  return message;
}

/**
 * Example agent usage:
 * 
 * const mcpClient = new MCPClient(apiKey);
 * 
 * // Natural language query
 * const specialists = await mcpClient.call('collaborators/discover', {
 *   query: 'I need help analyzing Q3 earnings data',
 *   type: 'agent',
 *   limit: 3
 * });
 * 
 * // Specific capability search
 * const analysts = await mcpClient.call('collaborators/discover', {
 *   capabilities: ['data-analysis', 'finance'],
 *   available_only: true
 * });
 * 
 * // Then agent can mention the top result:
 * const topMatch = specialists.collaborators[0];
 * await agent.mention(topMatch.mention_syntax, 'Can you analyze Q3 earnings?');
 */
