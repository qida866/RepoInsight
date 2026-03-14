"use client";

import { useEffect, useState } from "react";
import type { RepoAnalysis } from "@/types/repo";
import { addRecentRepo } from "@/lib/recentRepos";
import RepoHeader from "./RepoHeader";
import RepoSummaryPanel from "./RepoSummaryPanel";
import LearningPathPanel from "./LearningPathPanel";
import FileTreePanel from "./FileTreePanel";
import ArchitectureGraphPanel from "./ArchitectureGraphPanel";

interface Props {
  owner: string;
  name: string;
}

export default function RepoAnalysisShell({ owner, name }: Props) {
  const [data, setData] = useState<RepoAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedPaths, setHighlightedPaths] = useState<string[] | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo: name })
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to analyze repository");
        }
        const json = (await res.json()) as RepoAnalysis;
        setData(json);
        addRecentRepo(owner, name, json.repo?.name ?? name);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [owner, name]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="glass-panel flex items-center gap-3 px-4 py-3 text-sm text-slate-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
          <span>Analyzing repository with GitHub &amp; Claude…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-400">Failed to analyze repo: {error}</p>
        <p className="text-xs text-slate-400">
          Make sure the repository is public. If the error persists, configure{" "}
          <code className="rounded bg-slate-900 px-1 py-0.5 text-[10px]">
            GITHUB_TOKEN
          </code>{" "}
          and{" "}
          <code className="rounded bg-slate-900 px-1 py-0.5 text-[10px]">
            CLAUDE_API_KEY
          </code>{" "}
          in your environment.
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <RepoHeader analysis={data} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <RepoSummaryPanel analysis={data} />
          <LearningPathPanel analysis={data} />
        </div>
        <FileTreePanel
          analysis={data}
          highlightedPaths={highlightedPaths}
        />
      </div>
      <ArchitectureGraphPanel
        analysis={data}
        onHighlightPaths={setHighlightedPaths}
      />
    </div>
  );
}

