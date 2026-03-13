"use client";

import { useEffect, useState } from "react";

interface RepoActivityPanelProps {
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

export default function RepoActivityPanel({
  owner,
  repo
}: RepoActivityPanelProps) {
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
      .then((data: {
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
      })
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
    : "Unknown";

  if (loading) {
    return (
      <section className="glass-panel">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Repo activity
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Loading activity…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="glass-panel">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Repo activity
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-red-400">{error}</p>
      </section>
    );
  }

  return (
    <section className="glass-panel">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repo activity
        </h2>
      </div>
      <div className="grid gap-4 text-xs text-slate-200 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] font-medium text-slate-300">
            Recent commits
          </div>
          {commits.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No recent commits available from GitHub.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {commits.map((c) => (
                <li key={c.sha} className="space-y-0.5">
                  <p className="truncate text-[11px] text-slate-100">
                    {c.message || "(no message)"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {c.author} · {new Date(c.date).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-slate-300">
            Top contributors
          </div>
          {contributors.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              Contributor information is not available.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {contributors.map((u) => (
                <li
                  key={u.login}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="text-slate-100">@{u.login}</span>
                  <span className="text-slate-400">
                    {u.contributions} commit{u.contributions === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-[10px] text-slate-500">
            Last updated: {lastUpdatedLabel}
          </div>
        </div>
      </div>
    </section>
  );
}
