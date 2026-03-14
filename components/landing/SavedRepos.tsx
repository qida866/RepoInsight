"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStarredRepos, removeStarredRepo, type StarredRepo } from "@/lib/starredRepos";

export default function SavedRepos() {
  const [repos, setRepos] = useState<StarredRepo[]>([]);

  const load = () => setRepos(getStarredRepos());

  useEffect(() => {
    load();
  }, []);

  const handleUnstar = (e: React.MouseEvent, owner: string, repo: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeStarredRepo(owner, repo);
    load();
  };

  if (repos.length === 0) return null;

  return (
    <section className="mt-8 text-left">
      <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        Saved repositories
      </h2>
      <ul className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
        {repos.map((r) => (
          <li key={`${r.owner}/${r.repo}`}>
            <Link
              href={`/analyze/${r.owner}/${r.repo}`}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-700/60 hover:bg-amber-950/50 hover:text-slate-100"
            >
              <span className="text-amber-400/90" aria-hidden>★</span>
              <span className="font-mono text-slate-300">
                {r.owner}/{r.repo}
              </span>
              {r.name && r.name !== r.repo && (
                <>
                  <span className="text-slate-500">·</span>
                  <span className="truncate max-w-[100px] text-slate-400" title={r.name}>
                    {r.name}
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={(e) => handleUnstar(e, r.owner, r.repo)}
                className="ml-0.5 rounded p-0.5 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300"
                title="Remove from saved"
                aria-label="Remove from saved"
              >
                <span aria-hidden>×</span>
              </button>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
