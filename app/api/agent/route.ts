import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/agents/ai-provider";

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

    let systemPrompt: string;
    let userPrompt: string;

    switch (action) {
      case "read":
        systemPrompt = SYSTEM_PROMPTS.read;
        userPrompt = `Analyze this document and provide insights:\n\n${content ?? ""}`;
        break;
      case "write":
        systemPrompt = SYSTEM_PROMPTS.write;
        userPrompt = context
          ? `Context: ${context}\n\nCurrent content:\n${content ?? ""}\n\nPlease suggest improvements or additions.`
          : `Please help write or improve this content:\n\n${content ?? ""}`;
        break;
      case "chat":
        systemPrompt = SYSTEM_PROMPTS.chat;
        userPrompt = content ?? "";
        if (context) {
          userPrompt = `[Document context]\n${context}\n\n[User message]\n${content ?? ""}`;
        }
        break;
      case "summarize":
        systemPrompt = SYSTEM_PROMPTS.summarize;
        userPrompt = `Summarize the following document:\n\n${content ?? ""}`;
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const result = await callAI(systemPrompt, userPrompt);

    return NextResponse.json({
      success: true,
      content: result.content,
      reasoning: result.reasoning,
      model: result.model,
      agentId: agentId ?? "claw-default",
      documentId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[agent/route] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

const SYSTEM_PROMPTS = {
  read: `You are Claw, an AI teammate collaborating on documents in Knobase.
You can read documents and provide analysis, insights, and suggestions.
Always explain your reasoning clearly.
Be helpful, concise, and collaborative.
Format your response as JSON with "content" (your analysis) and "reasoning" (why you came to these conclusions).`,

  write: `You are Claw, an AI teammate collaborating on documents in Knobase.
You help write, edit, and improve document content.
When suggesting edits, provide the improved text directly.
Always respond with reasoning: why you made this suggestion.
Be helpful, concise, and collaborative.
Format your response as JSON with "content" (the improved text) and "reasoning" (why you made these changes).`,

  chat: `You are Claw, an AI teammate collaborating on documents in Knobase.
You're having a conversation with a user who may be working on a document.
If document context is provided, reference it when relevant.
Be helpful, concise, and collaborative. Use a warm but professional tone.
Format your response as JSON with "content" (your reply) and "reasoning" (your thought process).`,

  summarize: `You are Claw, an AI teammate collaborating on documents in Knobase.
Create a clear, concise summary of the document provided.
Highlight key points and structure the summary well.
Format your response as JSON with "content" (the summary) and "reasoning" (what you focused on and why).`,
};
