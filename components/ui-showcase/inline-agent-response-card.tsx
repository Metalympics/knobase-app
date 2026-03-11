"use client";

import Image from "next/image";
import { CheckCircle2, Check, X } from "lucide-react";

interface InlineAgentResponseCardProps {
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  prompt?: string;
  result: string;
  resultHtml?: string;
  onAccept?: () => void;
  onReject?: () => void;
}

export function InlineAgentResponseCard({
  agentName,
  agentAvatar,
  agentColor,
  prompt,
  result,
  resultHtml,
  onAccept,
  onReject,
}: InlineAgentResponseCardProps) {
  const hasImageAvatar = agentAvatar.startsWith("/");

  return (
    <div className="relative rounded-lg border border-emerald-200 bg-emerald-50/50 group/completed">
      <div className="flex items-center justify-between border-b border-emerald-100 px-3 py-1.5">
        <div className="flex items-center gap-2">
          {hasImageAvatar ? (
            <div
              className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ backgroundColor: agentColor }}
            >
              <Image src={agentAvatar} alt={agentName} width={16} height={16} className="h-full w-full object-cover rounded-full" />
            </div>
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          )}
          <span className="text-xs font-medium text-emerald-700">
            {agentName} responded
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onReject} className="rounded px-2 py-0.5 text-[11px] text-neutral-500 hover:bg-red-50 hover:text-red-600">
            <X className="h-3 w-3" />
          </button>
          <button onClick={onAccept} className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-600">
            <Check className="h-3 w-3" />
            Accept
          </button>
        </div>
      </div>

      <div className="px-3 py-2">
        {resultHtml ? (
          <div
            className="agent-response-body text-sm leading-relaxed text-neutral-700"
            dangerouslySetInnerHTML={{ __html: resultHtml }}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{result}</p>
        )}
      </div>

      {prompt && (
        <div className="absolute -top-8 left-3 right-3 opacity-0 group-hover/completed:opacity-100 pointer-events-none transition-opacity">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-neutral-800 px-2.5 py-1 text-[11px] text-neutral-300 shadow-lg">
            <span className="text-neutral-500">Prompt:</span> {prompt}
          </div>
        </div>
      )}
    </div>
  );
}
