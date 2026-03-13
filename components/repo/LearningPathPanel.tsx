import type { RepoAnalysis } from "@/types/repo";

interface Props {
  analysis: RepoAnalysis;
}

export default function LearningPathPanel({ analysis }: Props) {
  return (
    <section className="glass-panel border-slate-800/80 p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-100">
        Learning Path
      </h2>
      <ol className="space-y-2 text-sm text-slate-300">
        {analysis.learningPath.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-200">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

