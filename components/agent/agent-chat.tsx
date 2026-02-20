"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, FileText, Sparkles, BookOpen } from "lucide-react";
import { AgentAvatar } from "./agent-avatar";
import { ReasoningBadge } from "@/components/editor/reasoning-tooltip";
import { agentChat, agentSuggestEdit, agentSummarize } from "@/lib/agents/bridge";
import type { Agent, AgentSuggestion, ReasoningTrace } from "@/lib/agents/types";
import { addSuggestion } from "@/lib/agents/store";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  reasoning?: ReasoningTrace;
  timestamp: string;
}

interface AgentChatProps {
  agent: Agent;
  documentId?: string;
  documentContent?: string;
  onTyping: () => void;
  onDone: () => void;
  onSuggestion: (suggestion: AgentSuggestion) => void;
}

export function AgentChat({
  agent,
  documentId,
  documentContent,
  onTyping,
  onDone,
  onSuggestion,
}: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      content: `Hey! I'm ${agent.name}, your workspace mascot. 🐾\n\nKnobase doesn't run AI natively—I'm just here to help you navigate.\n\nFor real AI power, connect an external agent via MCP (Settings → Integration). Then your AI can read and write documents directly!`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    onTyping();

    try {
      const response = await agentChat(trimmed, documentContent);

      const trace: ReasoningTrace | undefined = response.reasoning
        ? {
            reasoning: response.reasoning,
            model: response.model ?? "unknown",
            agentId: agent.id,
            agentName: agent.name,
            timestamp: response.timestamp,
          }
        : undefined;

      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: response.content,
        reasoning: trace,
        timestamp: response.timestamp,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: `Sorry, I ran into an error: ${err instanceof Error ? err.message : "Unknown error"}. Make sure your API key is configured in .env.local.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      onDone();
    }
  }, [input, isLoading, documentContent, agent, onTyping, onDone]);

  const handleSuggestEdit = useCallback(async () => {
    if (!documentId || !documentContent || isLoading) return;
    setIsLoading(true);
    onTyping();

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: "Can you suggest improvements to my document?",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await agentSuggestEdit(documentId, documentContent);

      const suggestion: AgentSuggestion = {
        id: crypto.randomUUID(),
        agentId: agent.id,
        documentId,
        originalContent: documentContent,
        suggestedContent: response.content,
        reasoning: response.reasoning ?? "",
        model: response.model ?? "unknown",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      addSuggestion(suggestion);
      onSuggestion(suggestion);

      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: "I've prepared a suggestion for your document. Review the changes in the suggestion panel!",
        reasoning: response.reasoning
          ? {
              reasoning: response.reasoning,
              model: response.model ?? "unknown",
              agentId: agent.id,
              agentName: agent.name,
              timestamp: new Date().toISOString(),
            }
          : undefined,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: `Failed to generate suggestion: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      onDone();
    }
  }, [documentId, documentContent, isLoading, agent, onTyping, onDone, onSuggestion]);

  const handleSummarize = useCallback(async () => {
    if (!documentId || !documentContent || isLoading) return;
    setIsLoading(true);
    onTyping();

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: "Summarize this document for me.",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await agentSummarize(documentId, documentContent);

      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: response.content,
        reasoning: response.reasoning
          ? {
              reasoning: response.reasoning,
              model: response.model ?? "unknown",
              agentId: agent.id,
              agentName: agent.name,
              timestamp: response.timestamp,
            }
          : undefined,
        timestamp: response.timestamp,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: `Failed to summarize: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      onDone();
    }
  }, [documentId, documentContent, isLoading, agent, onTyping, onDone]);

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 z-30 flex h-screen w-[360px] flex-col border-l border-neutral-200 bg-white shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <AgentAvatar
          name={agent.name}
          avatar={agent.avatar}
          color={agent.color}
          status={agent.status}
          size="md"
        />
        <div className="flex-1">
          <div className="text-sm font-semibold text-neutral-900">{agent.name}</div>
          <div className="text-[11px] text-neutral-400">Workspace Mascot</div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="text-[10px] font-medium text-amber-600">Demo Mode</span>
        </div>
      </div>

      {/* Quick actions */}
      {documentId && documentContent && (
        <div className="flex gap-2 border-b border-neutral-100 px-4 py-2">
          <button
            onClick={handleSuggestEdit}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" />
            Suggest Edit
          </button>
          <button
            onClick={handleSummarize}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50"
          >
            <BookOpen className="h-3 w-3" />
            Summarize
          </button>
          <button
            disabled
            className="flex items-center gap-1.5 rounded-md border border-neutral-100 px-2.5 py-1.5 text-[11px] font-medium text-neutral-300"
            title="Document is available as context"
          >
            <FileText className="h-3 w-3" />
            Context ON
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "agent" && (
                <div className="shrink-0 pt-0.5">
                  <AgentAvatar
                    name={agent.name}
                    avatar={agent.avatar}
                    color={agent.color}
                    status="online"
                    size="sm"
                  />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-purple-500 text-white"
                    : "bg-neutral-100 text-neutral-700"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.reasoning && (
                  <div className="mt-2">
                    <ReasoningBadge trace={msg.reasoning} />
                  </div>
                )}
                <div
                  className={`mt-1 text-[10px] ${
                    msg.role === "user" ? "text-purple-200" : "text-neutral-400"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5">
              <div className="shrink-0 pt-0.5">
                <AgentAvatar
                  name={agent.name}
                  avatar={agent.avatar}
                  color={agent.color}
                  status="typing"
                  size="sm"
                />
              </div>
              <div className="rounded-xl bg-neutral-100 px-3 py-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-2 w-2 rounded-full bg-neutral-300"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-neutral-100 p-3">
        <div className="flex items-end gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 focus-within:border-purple-300 focus-within:ring-1 focus-within:ring-purple-100">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Message ${agent.name}...`}
            rows={1}
            className="max-h-24 flex-1 resize-none bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-md p-1.5 text-purple-500 transition-colors hover:bg-purple-50 disabled:text-neutral-300 disabled:hover:bg-transparent"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 text-center text-[10px] text-neutral-300">
          Demo mode • Connect external agent for real AI
        </div>
      </div>
    </motion.div>
  );
}
