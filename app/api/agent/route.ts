import { NextRequest, NextResponse } from "next/server";

/**
 * AGENT API - External Agent Bridge Only
 * 
 * This API route acts as a bridge for external agents (OpenClaw, MCP clients)
 * to interact with Knobase. 
 * 
 * IMPORTANT: Knobase does NOT run AI itself. It only provides:
 * - Document storage and retrieval
 * - Real-time collaboration infrastructure
 * - MCP server for external agent integration
 * 
 * Users bring their own AI via OpenClaw or other MCP-compatible agents.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, action, content, context, agentId } = body as {
      documentId?: string;
      action: "read" | "write" | "chat" | "summarize";
      content?: string;
      context?: string;
      agentId?: string;
    };

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing action" },
        { status: 400 }
      );
    }

    // Knobase does not run native AI. 
    // This endpoint is reserved for future external agent orchestration.
    // For now, return a helpful message directing users to use MCP instead.
    
    return NextResponse.json({
      success: false,
      error: "Native AI is disabled. Knobase is an agent-friendly workspace, not an AI service.",
      message: "To use AI with Knobase, connect an external agent via MCP. See Settings > Integration to connect OpenClaw or other MCP-compatible agents.",
      documentation: "https://docs.knobase.ai/mcp-integration",
      action,
      documentId,
      timestamp: new Date().toISOString(),
    }, { status: 501 });
    
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[agent/route] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Knobase Agent Bridge",
    capabilities: ["mcp-server", "document-storage", "realtime-collab"],
    aiProvider: null,
    note: "Knobase does not provide native AI. Connect external agents via MCP.",
  });
}
