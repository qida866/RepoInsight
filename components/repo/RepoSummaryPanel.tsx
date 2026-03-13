import type { RepoAnalysis } from "@/types/repo";

interface Props {
  analysis: RepoAnalysis;
}

export default function RepoSummaryPanel({ analysis }: Props) {
  return (
    <section className="glass-panel border-slate-800/80 p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-100">
        AI Repo Summary
      </h2>
      <p className="text-sm text-slate-300 whitespace-pre-line">
        {analysis.summary}
      </p>
      <h3 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        How it works
      </h3>
      <p className="text-xs text-slate-400 whitespace-pre-line">
        {analysis.explanation}
      </p>
    </section>
  );
}

