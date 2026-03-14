"use client";

import { useCallback, useEffect, useState } from "react";

interface RepoCopilotPanelProps {
  owner: string;
  repo: string;
  name: string;
  description: string | null;
  techStack: string[];
  fileTree: string[];
  entrypoints: string[];
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_QUESTIONS = [
  "What does this repo do?",
  "Where is the API?",
  "Explain the architecture",
  "How do I run this project?"
];

export default function RepoCopilotPanel({
  owner,
  repo,
  name,
  description,
  techStack,
  fileTree,
  entrypoints
}: RepoCopilotPanelProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  const fetchKeyFiles = useCallback(async () => {
    const paths: string[] = [];
    const pkgPath = fileTree.find((p) => p.toLowerCase().endsWith("package.json"));
    if (pkgPath) paths.push(pkgPath);
    const readmePath = fileTree.find(
      (p) =>
        p.toLowerCase() === "readme.md" ||
        p.toLowerCase() === "readme" ||
        p.toLowerCase().endsWith("/readme.md")
    );
    if (readmePath) paths.push(readmePath);
    if (paths.length === 0) return;
    const next: Record<string, string> = {};
    for (const path of paths) {
      try {
        const res = await fetch("/api/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, path })
        });
        const data = (await res.json()) as { content?: string };
        if (res.ok && data.content) next[path] = data.content;
      } catch {
        // ignore single file failure
      }
    }
    setFileContents((prev) => ({ ...prev, ...next }));
  }, [owner, repo, fileTree]);

  useEffect(() => {
    if (owner && repo && fileTree.length > 0) void fetchKeyFiles();
  }, [owner, repo, fileTree.length, fetchKeyFiles]);

  const ask = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = { id: counter, role: "user", content: trimmed };
      setCounter((c) => c + 1);
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);
      setQuestion("");

      void (async () => {
        try {
          const res = await fetch("/api/repo-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: trimmed,
              name,
              description,
              techStack,
              fileTree,
              entrypoints: entrypoints.length ? entrypoints : undefined,
              fileContents: Object.keys(fileContents).length ? fileContents : undefined
            })
          });
          const json = (await res.json()) as { answer?: string; error?: string };
          if (!res.ok || json.error) {
            throw new Error(json.error || "Failed to get an answer.");
          }
          const assistantMsg: ChatMessage = {
            id: counter + 1,
            role: "assistant",
            content: json.answer ?? ""
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
    },
    [
      loading,
      counter,
      name,
      description,
      techStack,
      fileTree,
      entrypoints,
      fileContents
    ]
  );

  return (
    <section className="glass-panel space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repo Copilot
        </h2>
      </div>
      <p className="text-[11px] text-slate-500">
        Ask questions about this repository. Answers use metadata, file tree, tech stack, entry points, and key file content.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700/80 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(question);
            }
          }}
          placeholder="Ask anything about this repo…"
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={loading || !question.trim()}
            onClick={() => ask(question)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-1.5 text-[11px] font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="spinner h-3 w-3 rounded-full border border-sky-200/40 border-t-sky-50" />
                <span>Answering…</span>
              </>
            ) : (
              "Ask"
            )}
          </button>
          {error && (
            <span className="max-w-[60%] truncate text-[11px] text-red-400">
              {error}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 flex max-h-64 flex-col gap-2 overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-xs">
        {messages.length === 0 && !loading ? (
          <p className="text-slate-500">
            Click an example above or type your own question (e.g. “What does this repo do?”, “Where is the API?”, “How do I run this?”).
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "max-w-[85%] self-end rounded-xl bg-sky-500/10 px-3 py-1.5 text-slate-100"
                  : "max-w-[85%] self-start rounded-xl bg-slate-900/90 px-3 py-1.5 text-slate-200"
              }
            >
              <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="spinner h-3 w-3 rounded-full border border-sky-200/40 border-t-sky-50" />
            <span>Using repo context…</span>
          </div>
        )}
      </div>
    </section>
  );
}
