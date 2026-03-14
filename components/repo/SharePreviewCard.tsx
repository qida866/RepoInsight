"use client";

import { useMemo } from "react";
import { getDetectedLayerLabels } from "@/components/repo/ArchitectureMapPanel";

export interface SharePreviewCardProps {
  /** Repository display name (e.g. owner/repo or project name) */
  name: string;
  /** Short AI-generated summary; will be truncated for the card */
  summary: string;
  /** Detected tech stack (e.g. React, TypeScript, Next.js) */
  techStack: string[];
  /** Full file paths; used to derive architecture layers and file count */
  fileTree: string[];
  /** GitHub star count */
  stars: number;
  /** Optional fixed width for consistent screenshot/social dimensions (e.g. 420) */
  width?: number;
  className?: string;
}

const SUMMARY_MAX_CHARS = 220;

export default function SharePreviewCard({
  name,
  summary,
  techStack,
  fileTree,
  stars,
  width,
  className = "",
}: SharePreviewCardProps) {
  const layerLabels = useMemo(() => getDetectedLayerLabels(fileTree), [fileTree]);
  const fileCount = fileTree.length;
  const displaySummary =
    summary.length <= SUMMARY_MAX_CHARS
      ? summary
      : summary.slice(0, SUMMARY_MAX_CHARS).trim().replace(/\s+\S*$/, "") + "…";

  const topTech = techStack.slice(0, 5);
  const style = width ? { width: width, maxWidth: "100%" } : undefined;

  return (
    <article
      style={style}
      className={
        "overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 shadow-xl " +
        "ring-1 ring-slate-800/80 " +
        className
      }
    >
      <div className="p-6 sm:p-8">
        {/* Repo name */}
        <h2 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
          {name}
        </h2>

        {/* Stars + files */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="text-amber-400/90">
              ★
            </span>
            <span className="tabular-nums">{stars.toLocaleString()} stars</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="tabular-nums">{fileCount} files</span>
        </div>

        {/* AI summary */}
        {displaySummary && (
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            {displaySummary}
          </p>
        )}

        {/* Tech stack */}
        {topTech.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Tech stack
            </p>
            <div className="flex flex-wrap gap-2">
              {topTech.map((tech) => (
                <span
                  key={tech}
                  className="rounded-lg border border-slate-700/80 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Architecture layers */}
        {layerLabels.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Architecture
            </p>
            <div className="flex flex-wrap gap-2">
              {layerLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-lg border border-emerald-800/60 bg-emerald-950/50 px-2.5 py-1 text-xs font-medium text-emerald-200/90"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer accent + branding (polished for export) */}
      <div
        className="flex h-8 w-full items-center justify-between bg-gradient-to-r from-sky-600/80 via-indigo-500/80 to-slate-700/80 px-4"
        aria-hidden
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
          RepoInsight
        </span>
        <span className="text-[10px] text-white/70">Analysis</span>
      </div>
    </article>
  );
}
