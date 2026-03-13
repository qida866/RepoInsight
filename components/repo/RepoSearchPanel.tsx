"use client";

import { useMemo, useState } from "react";

interface RepoSearchPanelProps {
  files: string[];
  onSelectFile?: (path: string) => void;
}

export default function RepoSearchPanel({
  files,
  onSelectFile
}: RepoSearchPanelProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return files
      .filter((p) => p.toLowerCase().includes(q))
      .slice(0, 20);
  }, [files, query]);

  return (
    <section className="glass-panel space-y-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repo search
        </h2>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search files by name (e.g. auth, service, README)"
        className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-0 transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
      />
      <div className="mt-1 max-h-52 space-y-1 overflow-auto text-xs text-slate-200">
        {!query.trim() ? (
          <p className="text-[11px] text-slate-500">
            Start typing to search across the repository file paths.
          </p>
        ) : results.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            No files matched &quot;{query.trim()}&quot;.
          </p>
        ) : (
          results.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onSelectFile?.(p)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-[10px] text-slate-200 hover:border-sky-500"
            >
              <span className="truncate">{p}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

