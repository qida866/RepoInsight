"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnalyzeResult } from "@/types/analyze";
import { getDetectedLayerLabels } from "@/components/repo/ArchitectureMapPanel";

interface RepoCompareViewProps {
  owner1: string;
  repo1: string;
  owner2: string;
  repo2: string;
}

interface DependencyStats {
  nodes: number;
  edges: number;
}

async function fetchAnalysis(owner: string, repo: string): Promise<AnalyzeResult | null> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: `https://github.com/${owner}/${repo}` }),
  });
  if (!res.ok) return null;
  return (await res.json()) as AnalyzeResult;
}

async function fetchDependencyStats(
  owner: string,
  repo: string,
  fileTree: string[]
): Promise<DependencyStats> {
  try {
    const res = await fetch("/api/dependency-graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, fileTree }),
    });
    if (!res.ok) return { nodes: 0, edges: 0 };
    const data = (await res.json()) as { nodes?: unknown[]; edges?: unknown[] };
    return {
      nodes: Array.isArray(data.nodes) ? data.nodes.length : 0,
      edges: Array.isArray(data.edges) ? data.edges.length : 0,
    };
  } catch {
    return { nodes: 0, edges: 0 };
  }
}

function CompareRow({
  label,
  left,
  right,
}: {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <tr className="border-b border-slate-800">
      <td className="py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </td>
      <td className="py-2 px-4 text-sm text-slate-200">{left}</td>
      <td className="py-2 px-4 text-sm text-slate-200">{right}</td>
    </tr>
  );
}

function PillList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-slate-500">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span
          key={t}
          className="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-200"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export default function RepoCompareView({
  owner1,
  repo1,
  owner2,
  repo2,
}: RepoCompareViewProps) {
  const [a, setA] = useState<AnalyzeResult | null>(null);
  const [b, setB] = useState<AnalyzeResult | null>(null);
  const [dep1, setDep1] = useState<DependencyStats | null>(null);
  const [dep2, setDep2] = useState<DependencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [result1, result2] = await Promise.all([
          fetchAnalysis(owner1, repo1),
          fetchAnalysis(owner2, repo2),
        ]);

        if (cancelled) return;
        if (!result1 || !result2) {
          setError("Could not load one or both repositories.");
          setA(result1 ?? null);
          setB(result2 ?? null);
          setLoading(false);
          return;
        }

        setA(result1);
        setB(result2);

        const [d1, d2] = await Promise.all([
          fetchDependencyStats(owner1, repo1, result1.fileTree),
          fetchDependencyStats(owner2, repo2, result2.fileTree),
        ]);
        if (!cancelled) {
          setDep1(d1);
          setDep2(d2);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Comparison failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [owner1, repo1, owner2, repo2]);

  const label1 = `${owner1}/${repo1}`;
  const label2 = `${owner2}/${repo2}`;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="glass-panel flex items-center justify-center gap-3 px-6 py-8 text-slate-300">
          <span className="spinner h-5 w-5 rounded-full border-2 border-slate-500 border-t-sky-400" />
          <span>Loading both repositories…</span>
        </div>
      </div>
    );
  }

  if (error || !a || !b) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="glass-panel border-red-900/50 p-6">
          <p className="text-sm text-red-400">{error ?? "Missing repository data"}</p>
          <Link
            href="/"
            className="mt-3 inline-block text-xs text-sky-400 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  const layers1 = getDetectedLayerLabels(a.fileTree);
  const layers2 = getDetectedLayerLabels(b.fileTree);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
          Compare repositories
        </h1>
        <Link
          href="/"
          className="text-xs font-medium text-slate-400 hover:text-slate-200"
        >
          ← Home
        </Link>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="font-semibold uppercase tracking-wider text-slate-500">
              Metric
            </div>
            <div className="font-semibold text-slate-200">
              <Link href={`/analyze/${owner1}/${repo1}`} className="hover:text-sky-400">
                {label1}
              </Link>
            </div>
            <div className="font-semibold text-slate-200">
              <Link href={`/analyze/${owner2}/${repo2}`} className="hover:text-sky-400">
                {label2}
              </Link>
            </div>
          </div>
        </div>
        <table className="w-full table-fixed">
          <tbody>
            <CompareRow
              label="File count"
              left={<span className="tabular-nums">{a.fileTree.length}</span>}
              right={<span className="tabular-nums">{b.fileTree.length}</span>}
            />
            <CompareRow
              label="Tech stack"
              left={<PillList items={a.techStack ?? []} />}
              right={<PillList items={b.techStack ?? []} />}
            />
            <CompareRow
              label="Architecture layers"
              left={<PillList items={layers1} />}
              right={<PillList items={layers2} />}
            />
            <CompareRow
              label="Dependencies (import graph)"
              left={
                dep1 ? (
                  <span className="text-slate-300">
                    {dep1.nodes} nodes, {dep1.edges} edges
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )
              }
              right={
                dep2 ? (
                  <span className="text-slate-300">
                    {dep2.nodes} nodes, {dep2.edges} edges
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )
              }
            />
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/analyze/${owner1}/${repo1}`}
          className="glass-panel block p-4 text-sm text-slate-200 transition hover:border-slate-700 hover:text-slate-100"
        >
          <span className="font-medium">View full analysis</span>
          <span className="ml-2 font-mono text-slate-400">{label1}</span>
        </Link>
        <Link
          href={`/analyze/${owner2}/${repo2}`}
          className="glass-panel block p-4 text-sm text-slate-200 transition hover:border-slate-700 hover:text-slate-100"
        >
          <span className="font-medium">View full analysis</span>
          <span className="ml-2 font-mono text-slate-400">{label2}</span>
        </Link>
      </div>
    </div>
  );
}
