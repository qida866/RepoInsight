"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRecentRepos, type RecentRepo } from "@/lib/recentRepos";

export default function RecentRepos() {
  const [repos, setRepos] = useState<RecentRepo[]>([]);

  useEffect(() => {
    setRepos(getRecentRepos());
  }, []);

  if (repos.length === 0) return null;

  return (
    <section className="mt-8 text-left">
      <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        Recent repositories
      </h2>
      <ul className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
        {repos.map((r) => (
          <li key={`${r.owner}/${r.repo}`}>
            <Link
              href={`/analyze/${r.owner}/${r.repo}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800/70 hover:text-slate-100"
            >
              <span className="font-mono text-slate-400">
                {r.owner}/{r.repo}
              </span>
              {r.name && r.name !== r.repo && (
                <span className="text-slate-500">·</span>
              )}
              {r.name && r.name !== r.repo && (
                <span className="truncate max-w-[120px] text-slate-400" title={r.name}>
                  {r.name}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
