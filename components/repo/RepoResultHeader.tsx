"use client";

import { useRef, useState, useMemo, useCallback } from "react";
import { toPng } from "html-to-image";
import type { AnalyzeResult } from "@/types/analyze";
import { getDetectedLayerLabels } from "@/components/repo/ArchitectureMapPanel";
import ShareAnalysisButton from "@/components/repo/ShareAnalysisButton";
import StarRepoButton from "@/components/repo/StarRepoButton";
import SharePreviewCard from "@/components/repo/SharePreviewCard";

const SUMMARY_MAX_CHARS = 160;
const CARD_WIDTH = 480;
const EXPORT_BG = "#0f172a";

interface RepoResultHeaderProps {
  result: AnalyzeResult;
  showShareButton?: boolean;
}

export default function RepoResultHeader({ result, showShareButton = true }: RepoResultHeaderProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const layerLabels = useMemo(() => getDetectedLayerLabels(result.fileTree), [result.fileTree]);
  const subtitle =
    result.summary.length <= SUMMARY_MAX_CHARS
      ? result.summary
      : result.summary.slice(0, SUMMARY_MAX_CHARS).trim().replace(/\s+\S*$/, "") + "…";
  const topTech = (result.techStack ?? []).slice(0, 6);

  const handleExport = useCallback(async () => {
    const node = cardRef.current;
    if (!node) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: EXPORT_BG,
        cacheBust: true,
        style: { borderRadius: "1rem" },
      });
      const link = document.createElement("a");
      link.download = `repoinsight-${result.owner}-${result.repo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [result.owner, result.repo]);

  return (
    <>
      <header className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/95 to-slate-950 shadow-2xl ring-1 ring-slate-800/50">
        {/* Subtle gradient orbs for depth */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative px-6 py-6 sm:px-8 sm:py-8">
          {/* Top row: title + actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                {result.name}
              </h1>
              <a
                href={`https://github.com/${result.owner}/${result.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-sky-400"
              >
                {result.owner}/{result.repo}
                <span aria-hidden>↗</span>
              </a>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StarRepoButton
                owner={result.owner}
                repo={result.repo}
                name={result.name}
              />
              {showShareButton && (
                <ShareAnalysisButton owner={result.owner} repo={result.repo} />
              )}
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[10px] font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700/80 disabled:opacity-60"
              >
                {exporting ? (
                  <>
                    <span className="spinner h-3 w-3 rounded-full border-2 border-slate-500 border-t-slate-200" />
                    Exporting…
                  </>
                ) : (
                  <>
                    <span aria-hidden>↓</span>
                    Export as Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Subtitle: AI summary */}
          {subtitle && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">
              {subtitle}
            </p>
          )}

          {/* Compact metadata row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-slate-800/80 pt-5">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-amber-400/90">★</span>
              <span className="tabular-nums">{result.stars.toLocaleString()} stars</span>
            </span>
            {result.language && (
              <>
                <span className="text-slate-600">·</span>
                <span className="rounded-md border border-slate-700/80 bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                  {result.language}
                </span>
              </>
            )}
            {topTech.length > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {topTech.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-slate-700/80 bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </span>
              </>
            )}
            {layerLabels.length > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {layerLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-md border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-medium text-emerald-200/90"
                    >
                      {label}
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hidden card for export (off-screen, in DOM for html-to-image) */}
      <div
        ref={cardRef}
        style={{ position: "fixed", left: -9999, top: 0, width: CARD_WIDTH }}
        aria-hidden
      >
        <div style={{ width: CARD_WIDTH }}>
          <SharePreviewCard
            name={result.name}
            summary={result.summary}
            techStack={result.techStack ?? []}
            fileTree={result.fileTree}
            stars={result.stars}
            width={CARD_WIDTH}
          />
        </div>
      </div>
    </>
  );
}
