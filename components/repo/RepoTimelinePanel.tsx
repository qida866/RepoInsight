"use client";

import { useEffect, useState } from "react";

interface RepoTimelinePanelProps {
  owner: string;
  repo: string;
}

interface CommitSummary {
  message: string;
  author: string;
  date: string;
  sha: string;
}

interface ContributorSummary {
  login: string;
  contributions: number;
}

export default function RepoTimelinePanel({ owner, repo }: RepoTimelinePanelProps) {
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [contributors, setContributors] = useState<ContributorSummary[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!owner || !repo) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/repo-activity?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
    fetch(url)
      .then((res) => res.json())
      .then(
        (data: {
          commits?: CommitSummary[];
          contributors?: ContributorSummary[];
          lastUpdated?: string | null;
          error?: string;
        }) => {
          if (cancelled) return;
          if (data.error) {
            setError(data.error);
          } else {
            setCommits(data.commits ?? []);
            setContributors(data.contributors ?? []);
            setLastUpdated(data.lastUpdated ?? null);
          }
        }
      )
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owner, repo]);

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString()
    : "—";

  if (loading) {
    return (
      <section className="glass-panel border-slate-800/80 p-4">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Repo timeline
        </h2>
        <p className="text-xs text-slate-500">Loading activity from GitHub…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="glass-panel border-slate-800/80 p-4">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Repo timeline
        </h2>
        <p className="text-xs text-red-400">{error}</p>
      </section>
    );
  }

  return (
    <section className="glass-panel border-slate-800/80 p-4">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Repo timeline
      </h2>

      {/* Last updated */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Last updated
        </span>
        <span className="text-[11px] text-slate-200">{lastUpdatedLabel}</span>
      </div>

      {/* Recent commits (timeline) */}
      <div className="mb-4">
        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Recent commits
        </h3>
        {commits.length === 0 ? (
          <p className="text-[11px] text-slate-500">No recent commits from GitHub.</p>
        ) : (
          <ul className="relative space-y-0 border-l-2 border-slate-700 pl-4">
            {commits.map((c, i) => (
              <li key={c.sha} className="relative pb-3 last:pb-0">
                <span
                  className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-sky-500"
                  aria-hidden
                />
                <p className="text-[11px] text-slate-100">
                  {c.message || "(no message)"}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {c.author} · {new Date(c.date).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top contributors */}
      <div>
        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Top contributors
        </h3>
        {contributors.length === 0 ? (
          <p className="text-[11px] text-slate-500">Contributor data not available.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {contributors.map((u) => (
              <li
                key={u.login}
                className="rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-[11px]"
              >
                <span className="font-medium text-slate-100">@{u.login}</span>
                <span className="ml-1.5 text-slate-400">
                  {u.contributions} commit{u.contributions === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
