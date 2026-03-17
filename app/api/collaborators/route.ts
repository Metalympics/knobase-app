/**
 * REST API for Collaborator Discovery
 * 
 * Endpoints:
 * - GET /api/collaborators - List all workspace members
 * - POST /api/collaborators/search - Search for specific collaborators
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import {
  findCollaborators,
  getAllWorkspaceMembers,
  getMemberStats,
  extractKeywordsFromQuery,
} from '@/lib/collaborators/discovery';
import type { CollaboratorQuery } from '@/lib/collaborators/types';

const SearchRequestSchema = z.object({
  query: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  expertise: z.array(z.string()).optional(),
  type: z.enum(['human', 'agent', 'all']).optional().default('all'),
  available_only: z.boolean().optional().default(false),
  limit: z.number().min(1).max(50).optional().default(10),
  min_confidence: z.number().min(0).max(1).optional().default(0.3),
  exclude_ids: z.array(z.string()).optional(),
  auto_extract_keywords: z.boolean().optional().default(true),
});

/**
 * GET /api/collaborators
 * List all workspace members or filter by query params
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's school
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, school_id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData || !userData.school_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const workspaceId = userData.school_id;

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const type = searchParams.get('type') as 'human' | 'agent' | 'all' | null;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // If query param provided, do search
    if (query) {
      const extracted = extractKeywordsFromQuery(query);
      const searchQuery: CollaboratorQuery = {
        query,
        capabilities: extracted.capabilities,
        type: type || 'all',
        limit,
      };

      const results = await findCollaborators(workspaceId, searchQuery);

      return NextResponse.json({
        success: true,
        ...results,
      });
    }

    // Otherwise, return all members
    const members = await getAllWorkspaceMembers(workspaceId, type || 'all');

    return NextResponse.json({
      success: true,
      collaborators: members.map((member) => ({
        member,
        confidence: 1.0,
        matched_capabilities: [],
        matched_expertise: [],
        match_reason: 'All workspace members',
      })),
      total: members.length,
    });
  } catch (error) {
    console.error('GET /api/collaborators error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collaborators/search
 * Advanced search with full query options
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Authenticate user or API key
    const apiKey = request.headers.get('x-api-key');
    let workspaceId: string;

    if (apiKey) {
      // Authenticate via API key
      const { data: keyData, error: keyError } = await supabase
        .from('agent_api_keys')
        .select('school_id')
        .eq('key_hash', apiKey)
        .is('revoked_at', null)
        .single();

      if (keyError || !keyData) {
        return NextResponse.json(
          { success: false, error: 'Invalid API key' },
          { status: 401 }
        );
      }

      workspaceId = keyData.school_id;
    } else {
      // Authenticate via session
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Get user's school
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, school_id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData || !userData.school_id) {
        return NextResponse.json(
          { success: false, error: 'User profile not found' },
          { status: 404 }
        );
      }

      workspaceId = userData.school_id;
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = SearchRequestSchema.parse(body);

    // Auto-extract keywords if enabled
    let searchQuery: CollaboratorQuery = {
      query: validated.query,
      capabilities: validated.capabilities || [],
      expertise: validated.expertise || [],
      type: validated.type,
      available_only: validated.available_only,
      limit: validated.limit,
      min_confidence: validated.min_confidence,
      exclude_ids: validated.exclude_ids,
    };

    if (validated.auto_extract_keywords && validated.query) {
      const extracted = extractKeywordsFromQuery(validated.query);
      searchQuery.capabilities = [
        ...(searchQuery.capabilities || []),
        ...extracted.capabilities,
      ];
      searchQuery.expertise = [
        ...(searchQuery.expertise || []),
        ...extracted.expertise,
      ];
    }

    // Perform search
    const results = await findCollaborators(workspaceId, searchQuery);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('POST /api/collaborators/search error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/collaborators
 * Update a teammate's role
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, school_id, role_id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData || !userData.school_id) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    if (userData.role_id !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can change roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const schema = z.object({
      teammate_id: z.string().uuid(),
      role: z.enum(['admin', 'editor', 'viewer']),
    });
    const validated = schema.parse(body);

    if (validated.teammate_id === userData.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ role_id: validated.role })
      .eq('id', validated.teammate_id)
      .eq('school_id', userData.school_id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, role: validated.role });
  } catch (error) {
    console.error('PATCH /api/collaborators error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Example requests:
 * 
 * GET /api/collaborators?query=data+analysis&limit=5
 * 
 * POST /api/collaborators/search
 * {
 *   "query": "I need someone to analyze Q3 financial data",
 *   "type": "agent",
 *   "available_only": true,
 *   "limit": 3
 * }
 * 
 * POST /api/collaborators/search
 * {
 *   "capabilities": ["data-analysis", "sql"],
 *   "expertise": ["finance"],
 *   "type": "all",
 *   "min_confidence": 0.5
 * }
 */
