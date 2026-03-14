"use client";

import { useMemo, useState } from "react";

interface RepoSearchProps {
  /** Full list of file paths in the repo. */
  files: string[];
  /** Called when user clicks a result; opens that file in CodeViewer when wired to handleSelectFile. */
  onSelectFile?: (path: string) => void;
  placeholder?: string;
  /** Max results to show. */
  maxResults?: number;
  className?: string;
  /** Optional label for the input (e.g. for accessibility). */
  "aria-label"?: string;
}

export default function RepoSearch({
  files,
  onSelectFile,
  placeholder = "Search files by name…",
  maxResults = 25,
  className = "",
  "aria-label": ariaLabel = "Search repository files"
}: RepoSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return files
      .filter((path) => path.toLowerCase().includes(q))
      .slice(0, maxResults);
  }, [files, query, maxResults]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
      />
      <div className="max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-950/50">
        {!query.trim() ? (
          <p className="p-3 text-[11px] text-slate-500">
            Type to search files by name. Results appear instantly.
          </p>
        ) : results.length === 0 ? (
          <p className="p-3 text-[11px] text-slate-500">
            No files match &quot;{query.trim()}&quot;.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {results.map((path) => (
              <li key={path}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectFile?.(path);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[11px] text-slate-200 transition hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:ring-inset"
                >
                  <span className="min-w-0 truncate" title={path}>
                    {path}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
