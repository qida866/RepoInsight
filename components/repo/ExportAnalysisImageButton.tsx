"use client";

import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import SharePreviewCard from "@/components/repo/SharePreviewCard";
import type { SharePreviewCardProps } from "@/components/repo/SharePreviewCard";

const CARD_WIDTH = 480;
const EXPORT_BG = "#0f172a";

export interface ExportAnalysisImageButtonProps extends SharePreviewCardProps {
  owner: string;
  repo: string;
  className?: string;
}

export default function ExportAnalysisImageButton({
  owner,
  repo,
  name,
  summary,
  techStack,
  fileTree,
  stars,
  className = "",
}: ExportAnalysisImageButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

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
      link.download = `repoinsight-${owner}-${repo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [owner, repo]);

  return (
    <div className={className}>
      {/* Card used for capture; visible so it renders correctly and user sees what they export */}
      <div
        ref={cardRef}
        className="inline-block"
        style={{ width: CARD_WIDTH }}
      >
        <SharePreviewCard
          name={name}
          summary={summary}
          techStack={techStack}
          fileTree={fileTree}
          stars={stars}
          width={CARD_WIDTH}
        />
      </div>
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[10px] font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800/80 disabled:opacity-60"
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
  );
}
