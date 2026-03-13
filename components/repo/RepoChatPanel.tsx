"use client";

import { useState } from "react";

interface RepoChatPanelProps {
  name: string;
  description: string | null;
  techStack: string[];
  fileTree: string[];
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export default function RepoChatPanel({
  name,
  description,
  techStack,
  fileTree
}: RepoChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);

  const ask = () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: counter,
      role: "user",
      content: trimmed
    };
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
            fileTree
          })
        });
        const json = (await res.json()) as { answer?: string; error?: string };
        if (!res.ok || json.error) {
          throw new Error(
            json.error || "Failed to get an answer for this question."
          );
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
          err instanceof Error
            ? err.message
            : "Unexpected error while chatting about this repo."
        );
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <section className="glass-panel space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repo chat
        </div>
      </div>
      <div className="space-y-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this repo (e.g. Where is the API? How does authentication work? How do I run this project?)"
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={loading || !question.trim()}
            onClick={ask}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-1.5 text-[11px] font-medium text-slate-950 shadow-soft transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
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
            <span className="text-[11px] text-red-400 truncate max-w-[60%]">
              {error}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 flex max-h-60 flex-col gap-2 overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-xs">
        {messages.length === 0 && !loading ? (
          <p className="text-slate-500">
            Ask things like “What does this repo do?”, “Where is the API?”, “How does
            authentication work?”, or “What is the architecture?”.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "self-end max-w-[80%] rounded-xl bg-sky-500/10 px-3 py-1.5 text-slate-100"
                  : "self-start max-w-[80%] rounded-xl bg-slate-900/90 px-3 py-1.5 text-slate-200"
              }
            >
              <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="spinner h-3 w-3 rounded-full border border-sky-200/40 border-t-sky-50" />
            <span>Thinking about this repo…</span>
          </div>
        )}
      </div>
    </section>
  );
}

