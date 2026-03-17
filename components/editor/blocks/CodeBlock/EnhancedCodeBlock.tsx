"use client";

import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Copy, ChevronDown, Hash } from "lucide-react";

const LANGUAGES = [
  { id: null, label: "Plain text" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "ruby", label: "Ruby" },
  { id: "php", label: "PHP" },
  { id: "swift", label: "Swift" },
  { id: "kotlin", label: "Kotlin" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "yaml", label: "YAML" },
  { id: "markdown", label: "Markdown" },
  { id: "graphql", label: "GraphQL" },
  { id: "docker", label: "Dockerfile" },
];

export function EnhancedCodeBlockView(props: NodeViewProps) {
  const { node, updateAttributes, editor } = props;
  const { language, showLineNumbers } = node.attrs;
  const [copied, setCopied] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const lineCount = node.textContent.split("\n").length;

  useEffect(() => {
    if (!showLangDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLangDropdown]);

  useEffect(() => {
    if (!language || !node.textContent) return;

    let cancelled = false;
    import("prismjs").then(async (Prism) => {
      if (cancelled) return;
      const langMap: Record<string, string> = {
        javascript: "javascript",
        typescript: "typescript",
        python: "python",
        html: "markup",
        css: "css",
        json: "json",
        sql: "sql",
        bash: "bash",
        yaml: "yaml",
        markdown: "markdown",
        graphql: "graphql",
      };
      const prismLang = langMap[language];
      if (prismLang && !Prism.default.languages[prismLang]) {
        try {
          await import(`prismjs/components/prism-${prismLang}`);
        } catch {
          // language not available
        }
      }
    });
    return () => { cancelled = true; };
  }, [language, node.textContent]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(node.textContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [node.textContent]);

  const isEditable = editor.isEditable;
  const currentLang = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

  return (
    <NodeViewWrapper className="code-block-enhanced my-3">
      <div
        className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-[#fafafa]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-1.5">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => isEditable && setShowLangDropdown((p) => !p)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200/50 hover:text-neutral-700"
            >
              {currentLang.label}
              {isEditable && <ChevronDown className="h-3 w-3" />}
            </button>
            {showLangDropdown && (
              <div className="absolute top-full left-0 z-20 mt-1 max-h-48 w-40 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id ?? "plain"}
                    onClick={() => {
                      updateAttributes({ language: lang.id });
                      setShowLangDropdown(false);
                    }}
                    className={`w-full px-3 py-1 text-left text-xs transition-colors ${
                      lang.id === language
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isEditable && (
              <button
                onClick={() =>
                  updateAttributes({ showLineNumbers: !showLineNumbers })
                }
                className={`rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600 ${
                  showLineNumbers ? "bg-neutral-200/50" : ""
                }`}
                title="Toggle line numbers"
              >
                <Hash className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600"
              title="Copy code"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Code content */}
        <div className="relative flex overflow-x-auto">
          {showLineNumbers && (
            <div
              className="flex-shrink-0 select-none border-r border-neutral-200 bg-neutral-50/50 px-3 py-3 text-right font-mono text-[11px] leading-[1.6] text-neutral-300"
              aria-hidden
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}
          <div className="flex-1">
            <NodeViewContent
              className={`code-block-content px-4 py-3 font-mono text-[13px] leading-[1.6] text-neutral-800 outline-none whitespace-pre ${
                language ? `language-${language}` : ""
              }`}
            />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
