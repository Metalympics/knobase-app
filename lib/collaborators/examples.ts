/**
 * Agent Discovery Examples
 * 
 * This file demonstrates various usage patterns for the Agent Discovery API,
 * showing how agents can intelligently find and delegate to specialists.
 */

import { findCollaborators, extractKeywordsFromQuery, getMemberStats } from './discovery';
import type { CollaboratorQuery } from './types';

/* ============================================
 * Example 1: General Agent Self-Assessment
 * ============================================
 * 
 * A general-purpose agent receives a complex task and determines
 * whether to handle it themselves or delegate to a specialist.
 */

interface AgentSelfAssessment {
  canHandle: boolean;
  confidence: number;
  reasoningChain: string[];
  recommendation: 'handle' | 'delegate' | 'collaborate';
}

async function assessTask(task: string, myCapabilities: string[]): Promise<AgentSelfAssessment> {
  const reasoning: string[] = [];
  
  // Step 1: Extract task requirements
  const extracted = extractKeywordsFromQuery(task);
  reasoning.push(`Task requires: ${extracted.capabilities.join(', ')}`);
  
  // Step 2: Check if I have matching capabilities
  const myMatchedCapabilities = extracted.capabilities.filter(cap => 
    myCapabilities.includes(cap)
  );
  
  const matchRate = myMatchedCapabilities.length / Math.max(extracted.capabilities.length, 1);
  reasoning.push(`I match ${myMatchedCapabilities.length}/${extracted.capabilities.length} required capabilities`);
  
  // Step 3: Decide action
  let recommendation: 'handle' | 'delegate' | 'collaborate';
  let confidence: number;
  
  if (matchRate >= 0.8) {
    recommendation = 'handle';
    confidence = matchRate;
    reasoning.push('High match rate - I should handle this task myself');
  } else if (matchRate >= 0.4) {
    recommendation = 'collaborate';
    confidence = matchRate;
    reasoning.push('Partial match - I should collaborate with a specialist');
  } else {
    recommendation = 'delegate';
    confidence = 1 - matchRate;
    reasoning.push('Low match rate - I should delegate to a specialist');
  }
  
  return {
    canHandle: matchRate >= 0.8,
    confidence,
    reasoningChain: reasoning,
    recommendation,
  };
}

/* ============================================
 * Example 2: Finding and Delegating to Specialist
 * ============================================
 */

async function delegateToSpecialist(
  workspaceId: string,
  task: string,
  taskDescription: string
): Promise<{
  success: boolean;
  delegatedTo?: string;
  mentionSyntax?: string;
  reason: string;
}> {
  console.log(`🤖 Received task: "${task}"`);
  
  // Step 1: Self-assess
  const myCapabilities = ['general', 'writing', 'research'];
  const assessment = await assessTask(task, myCapabilities);
  
  console.log('💭 Reasoning:');
  assessment.reasoningChain.forEach(r => console.log(`   - ${r}`));
  
  if (assessment.recommendation === 'handle') {
    return {
      success: true,
      reason: 'I have the required capabilities to handle this myself',
    };
  }
  
  // Step 2: Search for specialists
  console.log('🔍 Searching for specialists...');
  
  const query: CollaboratorQuery = {
    query: task,
    type: 'agent',
    available_only: true,
    limit: 3,
    min_confidence: 0.5,
    exclude_ids: [process.env.CURRENT_AGENT_ID!], // Don't return myself
  };
  
  const results = await findCollaborators(workspaceId, query);
  
  if (results.total === 0) {
    console.log('❌ No suitable specialists found');
    return {
      success: false,
      reason: 'No specialists available - will handle myself as fallback',
    };
  }
  
  // Step 3: Pick best specialist
  const specialist = results.collaborators[0];
  
  console.log(`✅ Found specialist: ${specialist.member.name}`);
  console.log(`   Confidence: ${(specialist.confidence * 100).toFixed(1)}%`);
  console.log(`   Match reason: ${specialist.match_reason}`);
  console.log(`   Capabilities: ${specialist.member.capabilities.join(', ')}`);
  
  // Step 4: Prepare delegation message
  const delegationMessage = assessment.recommendation === 'collaborate'
    ? `${taskDescription}\n\nI'm bringing you in as a specialist. I'll handle the general aspects, but your expertise in ${specialist.matched_capabilities.join(', ')} will be valuable here.`
    : `${taskDescription}\n\nI'm delegating this to you as the workspace specialist in ${specialist.matched_capabilities.join(', ')}. Please take the lead on this.`;
  
  return {
    success: true,
    delegatedTo: specialist.member.name,
    mentionSyntax: `@${specialist.member.name.replace(/\s+/g, '-').toLowerCase()}`,
    reason: specialist.match_reason,
  };
}

/* ============================================
 * Example 3: Multi-Agent Collaboration
 * ============================================
 * 
 * Break down complex tasks and assign different parts to specialists
 */

async function orchestrateComplexTask(
  workspaceId: string,
  task: string
): Promise<{
  subtasks: Array<{
    description: string;
    assignedTo: string;
    mentionSyntax: string;
    confidence: number;
  }>;
  orchestrationPlan: string;
}> {
  console.log(`🎯 Orchestrating complex task: "${task}"`);
  
  // Example: "Analyze our Q3 earnings and create a presentation"
  const subtasks = [
    {
      description: 'Analyze Q3 financial data and extract key insights',
      requiredCapabilities: ['data-analysis', 'finance', 'sql'],
    },
    {
      description: 'Create visualizations and charts from the analysis',
      requiredCapabilities: ['visualization', 'design', 'data-analysis'],
    },
    {
      description: 'Design and build the presentation deck',
      requiredCapabilities: ['presentation', 'design', 'writing'],
    },
  ];
  
  const assignments = [];
  
  for (const subtask of subtasks) {
    console.log(`\n📋 Subtask: ${subtask.description}`);
    
    const results = await findCollaborators(workspaceId, {
      capabilities: subtask.requiredCapabilities,
      type: 'agent',
      available_only: true,
      limit: 1,
      min_confidence: 0.6,
    });
    
    if (results.total > 0) {
      const specialist = results.collaborators[0];
      
      assignments.push({
        description: subtask.description,
        assignedTo: specialist.member.name,
        mentionSyntax: `@${specialist.member.name.replace(/\s+/g, '-').toLowerCase()}`,
        confidence: specialist.confidence,
      });
      
      console.log(`   ✅ Assigned to: ${specialist.member.name} (${(specialist.confidence * 100).toFixed(1)}%)`);
    } else {
      console.log(`   ⚠️  No specialist found - assigning to general agent`);
      
      assignments.push({
        description: subtask.description,
        assignedTo: 'General Agent',
        mentionSyntax: '@assistant',
        confidence: 0.5,
      });
    }
  }
  
  // Build orchestration plan
  const plan = `
Task Breakdown & Assignment:

${assignments.map((a, i) => `
${i + 1}. ${a.description}
   → Assigned to: ${a.assignedTo} (${a.mentionSyntax})
   → Confidence: ${(a.confidence * 100).toFixed(1)}%
`).join('\n')}

Execution Plan:
1. ${assignments[0].mentionSyntax} will start with data analysis
2. Once complete, ${assignments[1].mentionSyntax} will create visualizations
3. Finally, ${assignments[2].mentionSyntax} will build the presentation
4. I'll coordinate between all agents and consolidate results
`;
  
  return {
    subtasks: assignments,
    orchestrationPlan: plan,
  };
}

/* ============================================
 * Example 4: Learning from Past Collaborations
 * ============================================
 */

async function findBestCollaborator(
  workspaceId: string,
  query: CollaboratorQuery
): Promise<{
  collaborator: any;
  stats: any;
  recommendation: string;
}> {
  // Find potential collaborators
  const results = await findCollaborators(workspaceId, query);
  
  if (results.total === 0) {
    throw new Error('No suitable collaborators found');
  }
  
  // Get detailed stats for top candidates
  const topCandidates = results.collaborators.slice(0, 3);
  
  const candidatesWithStats = await Promise.all(
    topCandidates.map(async (candidate) => {
      const stats = await getMemberStats(
        candidate.member.id,
        candidate.member.type
      );
      
      return {
        ...candidate,
        stats,
      };
    })
  );
  
  // Rank by success rate + confidence
  const ranked = candidatesWithStats.sort((a, b) => {
    const scoreA = (a.confidence * 0.6) + (a.stats.success_rate * 0.4);
    const scoreB = (b.confidence * 0.6) + (b.stats.success_rate * 0.4);
    return scoreB - scoreA;
  });
  
  const best = ranked[0];
  
  const recommendation = `
Best Match: ${best.member.name}
- Capability Match: ${(best.confidence * 100).toFixed(1)}%
- Success Rate: ${(best.stats.success_rate * 100).toFixed(1)}% (${best.stats.completed_tasks}/${best.stats.total_tasks} tasks)
- Avg Completion Time: ${(best.stats.avg_completion_time_ms / 1000).toFixed(1)}s
- Last Active: ${best.stats.last_task_at ? new Date(best.stats.last_task_at).toLocaleString() : 'Never'}

Why this match:
${best.match_reason}

Recommendation: ${best.stats.success_rate > 0.8 ? 'Highly recommended' : best.stats.success_rate > 0.6 ? 'Recommended' : 'Acceptable'}
`;
  
  return {
    collaborator: best.member,
    stats: best.stats,
    recommendation,
  };
}

/* ============================================
 * Example 5: Agent Reasoning Chain (Full Flow)
 * ============================================
 */

export async function intelligentTaskHandling(
  workspaceId: string,
  task: string,
  taskDescription: string
): Promise<void> {
  console.log('\n='.repeat(60));
  console.log('🤖 AGENT REASONING CHAIN');
  console.log('='.repeat(60));
  console.log(`\n📝 Task Received: "${task}"`);
  
  // Step 1: Self-assess
  console.log('\n--- Step 1: Self-Assessment ---');
  const myCapabilities = ['general', 'writing', 'research'];
  console.log(`My capabilities: ${myCapabilities.join(', ')}`);
  
  const assessment = await assessTask(task, myCapabilities);
  console.log('\nReasoning:');
  assessment.reasoningChain.forEach(r => console.log(`  ${r}`));
  console.log(`\nDecision: ${assessment.recommendation.toUpperCase()}`);
  
  // Step 2: Find specialists if needed
  if (assessment.recommendation !== 'handle') {
    console.log('\n--- Step 2: Finding Specialists ---');
    
    const result = await delegateToSpecialist(
      workspaceId,
      task,
      taskDescription
    );
    
    if (result.success && result.delegatedTo) {
      console.log('\n--- Step 3: Delegation ---');
      console.log(`Creating mention: ${result.mentionSyntax}`);
      console.log(`\nMessage to specialist:`);
      console.log(`"${taskDescription}"`);
      
      console.log('\n--- Step 4: Monitoring ---');
      console.log(`Tracking task progress...`);
      console.log(`Will notify when ${result.delegatedTo} completes the task.`);
    } else {
      console.log('\n--- Step 3: Fallback ---');
      console.log('No specialists available. Handling task myself.');
    }
  } else {
    console.log('\n--- Step 2: Direct Execution ---');
    console.log('I have sufficient capabilities to handle this task.');
    console.log('Proceeding with execution...');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

/* ============================================
 * Example 6: Real-Time Collaboration Status
 * ============================================
 */

export async function getWorkspaceCollaborationMap(
  workspaceId: string
): Promise<{
  online: any[];
  busy: any[];
  offline: any[];
  recommendations: string[];
}> {
  const allMembers = await findCollaborators(
    workspaceId,
    {
      type: 'all',
      limit: 100,
    }
  );
  
  const byStatus = {
    online: allMembers.collaborators.filter(c => c.member.availability === 'online'),
    busy: allMembers.collaborators.filter(c => c.member.availability === 'busy'),
    offline: allMembers.collaborators.filter(c => c.member.availability === 'offline'),
  };
  
  const recommendations = [];
  
  if (byStatus.online.length === 0) {
    recommendations.push('⚠️  No team members currently online. Consider async task assignment.');
  } else if (byStatus.online.length === 1) {
    recommendations.push('ℹ️  Limited availability. Prioritize critical tasks.');
  } else {
    recommendations.push(`✅ ${byStatus.online.length} members available for collaboration.`);
  }
  
  // Check for specialists
  const specialists = byStatus.online.filter(c => 
    c.member.capabilities.length > 3 && c.member.type === 'agent'
  );
  
  if (specialists.length > 0) {
    recommendations.push(`🎯 ${specialists.length} specialist agents online for complex tasks.`);
  }
  
  return {
    ...byStatus,
    recommendations,
  };
}

/**
 * Export all examples for testing
 */
export const examples = {
  assessTask,
  delegateToSpecialist,
  orchestrateComplexTask,
  findBestCollaborator,
  intelligentTaskHandling,
  getWorkspaceCollaborationMap,
};
