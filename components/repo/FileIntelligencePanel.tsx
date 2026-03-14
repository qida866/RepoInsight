"use client";

import { useEffect, useState } from "react";

interface FileIntelligencePanelProps {
  code: string;
  path?: string;
  repoName?: string;
  /** Increment to refetch (e.g. when file selection changes). */
  version?: number;
}

interface IntelligenceData {
  purpose?: string;
  mainFunctions?: string;
  dependencies?: string;
  architectureRole?: string;
}

function Section({
  title,
  content,
  placeholder
}: {
  title: string;
  content?: string | null;
  placeholder: string;
}) {
  const text = (content?.trim() || "").replace(/^[-—]\s*$/, "") ? content : null;
  return (
    <div>
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <p className="whitespace-pre-wrap text-slate-200">
        {text ?? <span className="text-slate-500 italic">{placeholder}</span>}
      </p>
    </div>
  );
}

export default function FileIntelligencePanel({
  code,
  path,
  repoName,
  version
}: FileIntelligencePanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IntelligenceData | null>(null);

  useEffect(() => {
    if (!path || !code?.trim()) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    void (async () => {
      try {
        const res = await fetch("/api/explain-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path,
            code,
            repoName,
            intelligenceMode: true
          })
        });
        const json = (await res.json()) as IntelligenceData & { error?: string };
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
        } else {
          setData({
            purpose: json.purpose,
            mainFunctions: json.mainFunctions,
            dependencies: json.dependencies,
            architectureRole: json.architectureRole
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load file intelligence.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, path, repoName, version ?? 0]);

  if (!path) {
    return (
      <section className="glass-panel flex flex-col gap-3 border-slate-800/80 p-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          File intelligence
        </h2>
        <p className="text-xs text-slate-500">
          Select a file in the explorer or key files to see an AI explanation (purpose, main functions, dependencies, role in architecture).
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel flex flex-col gap-3 border-slate-800/80 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          File intelligence
        </h2>
        {path && (
          <span className="truncate font-mono text-[10px] text-slate-400" title={path}>
            {path.split("/").pop() ?? path}
          </span>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-400">{error}</p>
      )}

      {loading && (
        <div className="flex flex-col gap-2">
          <div className="h-3 w-4/5 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-800" />
        </div>
      )}

      {!loading && data && (
        <div className="flex flex-col gap-4 text-xs">
          <Section
            title="Purpose"
            content={data.purpose}
            placeholder="What this file is for and its role in the codebase."
          />
          <Section
            title="Main functions"
            content={data.mainFunctions}
            placeholder="Key functions, components, classes, or exports."
          />
          <Section
            title="Dependencies"
            content={data.dependencies}
            placeholder="Imports and what depends on this file."
          />
          <Section
            title="Role in architecture"
            content={data.architectureRole}
            placeholder="How it fits in the overall architecture."
          />
        </div>
      )}
    </section>
  );
}
