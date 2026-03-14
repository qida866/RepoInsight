"use client";

import { useState } from "react";
import type { RepoKnowledge } from "@/lib/repoKnowledge";
import { getDetectedLayerLabels } from "@/components/repo/ArchitectureMapPanel";

interface RepoChatPanelProps {
  /** Pre-built repo knowledge (preferred). When set, other props are only fallbacks. */
  knowledge?: RepoKnowledge | null;
  name: string;
  description: string | null;
  summary?: string | null;
  techStack: string[];
  fileTree: string[];
  entrypoints?: string[];
  onSelectFile?: (path: string) => void;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  referencedFiles?: string[];
  architectureContext?: string | null;
}

function getEntrypoints(fileTree: string[]): string[] {
  const lower = (p: string) => p.toLowerCase();
  return fileTree.filter((p) => {
    const l = lower(p);
    return (
      l.endsWith("app/page.tsx") ||
      l.endsWith("src/app.tsx") ||
      l.endsWith("src/main.tsx") ||
      l === "server.js" ||
      l === "index.js" ||
      l.endsWith("main.py") ||
      l.endsWith("app.py")
    );
  });
}

export default function RepoChatPanel({
  knowledge: knowledgeProp,
  name,
  description,
  summary,
  techStack,
  fileTree,
  entrypoints = [],
  onSelectFile
}: RepoChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);

  const architectureLayers = knowledgeProp?.architectureLayers ?? getDetectedLayerLabels(fileTree);
  const entrypointsList = knowledgeProp?.entryPoints?.length
    ? knowledgeProp.entryPoints
    : entrypoints.length > 0
    ? entrypoints
    : getEntrypoints(fileTree);

  const ask = () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: counter, role: "user", content: trimmed };
    setCounter((c) => c + 1);
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);
    setQuestion("");

    const payload = knowledgeProp
      ? {
          question: trimmed,
          name: knowledgeProp.name,
          description: knowledgeProp.description,
          summary: knowledgeProp.repoSummary || null,
          techStack: knowledgeProp.techStack,
          fileTree: knowledgeProp.fileTreeSample,
          architectureLayers: knowledgeProp.architectureLayers,
          entrypoints: knowledgeProp.entryPoints.slice(0, 20),
          importantFolders: knowledgeProp.importantFolders,
          importantFiles: knowledgeProp.importantFiles
        }
      : {
          question: trimmed,
          name,
          description,
          summary: summary ?? null,
          techStack,
          fileTree,
          architectureLayers,
          entrypoints: entrypointsList.slice(0, 20),
          importantFolders: [] as string[],
          importantFiles: [] as string[]
        };

    void (async () => {
      try {
        const res = await fetch("/api/repo-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = (await res.json()) as {
          answer?: string;
          referencedFiles?: string[];
          architectureContext?: string | null;
          error?: string;
        };
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to get an answer.");
        }
        const assistantMsg: ChatMessage = {
          id: counter + 1,
          role: "assistant",
          content: json.answer ?? "",
          referencedFiles: json.referencedFiles ?? [],
          architectureContext: json.architectureContext ?? null
        };
        setCounter((c) => c + 1);
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-xl">
      <div className="border-b border-slate-800/80 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Repo chat
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Ask about structure, entry points, and architecture
        </p>
      </div>

      <div className="flex flex-col p-4">
        <div className="mb-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder="Ask AI about this repository…"
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={loading || !question.trim()}
              onClick={ask}
              className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner h-3.5 w-3.5 rounded-full border-2 border-sky-200/40 border-t-slate-950" />
                  Answering…
                </span>
              ) : (
                "Ask"
              )}
            </button>
            {error && (
              <span className="max-w-[65%] truncate text-[11px] text-red-400">
                {error}
              </span>
            )}
          </div>
        </div>

        <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          {messages.length === 0 && !loading ? (
            <p className="py-4 text-center text-xs text-slate-500">
              e.g. “Where is the API?”, “How do I run this?”, “What’s the architecture?”
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-6 flex flex-col items-end gap-1"
                    : "mr-6 flex flex-col items-start gap-1"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-sky-500/15 px-3 py-2 text-sm text-slate-100"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-slate-700/80 bg-slate-800/80 px-3 py-2.5 text-sm leading-relaxed text-slate-200"
                  }
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>
                {m.role === "assistant" && (m.referencedFiles?.length ?? 0) > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {m.referencedFiles!.map((path) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => onSelectFile?.(path)}
                        className="rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 font-mono text-[10px] text-sky-300 transition hover:border-sky-500/60 hover:bg-slate-700/80 hover:text-sky-200"
                      >
                        {path}
                      </button>
                    ))}
                  </div>
                )}
                {m.role === "assistant" && m.architectureContext && (
                  <div className="mt-1 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-2.5 py-1.5 text-[11px] text-emerald-200/90">
                    <span className="font-medium text-emerald-400/90">Context: </span>
                    {m.architectureContext}
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
              <span className="spinner h-3.5 w-3.5 rounded-full border-2 border-slate-500 border-t-sky-400" />
              Thinking…
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
