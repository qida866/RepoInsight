"use client";

import { useState, useCallback } from "react";

interface ShareAnalysisButtonProps {
  owner: string;
  repo: string;
  className?: string;
}

export default function ShareAnalysisButton({ owner, repo, className = "" }: ShareAnalysisButtonProps) {
  const [showToast, setShowToast] = useState(false);

  const handleCopy = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/analyze/${owner}/${repo}`;
    try {
      await navigator.clipboard.writeText(url);
      setShowToast(true);
      const t = window.setTimeout(() => {
        setShowToast(false);
        window.clearTimeout(t);
      }, 2000);
    } catch {
      // clipboard not available
    }
  }, [owner, repo]);

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        className={
          className ||
          "inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[10px] font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800/80"
        }
      >
        <span aria-hidden className="text-slate-400">
          ↗
        </span>
        Share Analysis
      </button>

      {/* Success toast */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-toast-up rounded-full border border-slate-700 bg-slate-800/95 px-4 py-2 text-xs font-medium text-slate-100 shadow-lg backdrop-blur-sm"
        >
          Link copied to clipboard
        </div>
      )}
    </>
  );
}
