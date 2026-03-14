"use client";

import { useEffect, useState, useMemo } from "react";
import {
  computeHealthScore,
  type ActivityData,
  type HealthBreakdown,
} from "@/lib/repoHealthScore";

interface RepoHealthScoreProps {
  fileTree: string[];
  owner?: string;
  repo?: string;
  className?: string;
}

const LABELS: Record<keyof HealthBreakdown, string> = {
  documentation: "Documentation",
  structure: "Structure",
  dependency: "Dependency",
  activity: "Activity",
  tests: "Tests",
  organization: "Code organization",
};

const MAX_PER_FACTOR: Record<keyof HealthBreakdown, number> = {
  documentation: 2,
  structure: 1.5,
  dependency: 1,
  activity: 2,
  tests: 2,
  organization: 1.5,
};

function getScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-sky-400";
  if (score >= 4) return "text-amber-400";
  return "text-slate-400";
}

export default function RepoHealthScore({
  fileTree,
  owner,
  repo,
  className = "",
}: RepoHealthScoreProps) {
  const [activity, setActivity] = useState<ActivityData | null>(null);

  useEffect(() => {
    if (!owner || !repo) return;
    let cancelled = false;
    fetch(`/api/repo-activity?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setActivity({
          commits: data.commits ?? [],
          contributors: data.contributors ?? [],
          lastUpdated: data.lastUpdated ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [owner, repo]);

  const result = useMemo(
    () => computeHealthScore(fileTree, { activity }),
    [fileTree, activity]
  );

  const { score, breakdown } = result;

  return (
    <div className={className}>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Repository health
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex shrink-0 items-center gap-3">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 text-2xl font-bold tabular-nums ${getScoreColor(score)}`}
            aria-label={`Health score ${score} out of 10`}
          >
            {score.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400">
            <span className="font-medium text-slate-200">/ 10</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {(Object.keys(breakdown) as (keyof HealthBreakdown)[]).map((key) => {
            const value = breakdown[key];
            const max = MAX_PER_FACTOR[key];
            const pct = max > 0 ? (value / max) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[11px] text-slate-400">
                  {LABELS[key]}
                </span>
                <div className="h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-slate-500 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
                  {value.toFixed(1)}/{max}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
