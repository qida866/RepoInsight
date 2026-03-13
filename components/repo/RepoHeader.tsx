import type { RepoAnalysis } from "@/types/repo";

interface Props {
  analysis: RepoAnalysis;
}

export default function RepoHeader({ analysis }: Props) {
  const { repo, techStack } = analysis;

  return (
    <section className="glass-panel flex flex-col gap-4 border-slate-800/80 p-5 shadow-soft md:flex-row md:items-center md:justify-between">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">
          Repository
        </div>
        <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
          {repo.owner}/{repo.name}
        </h1>
        {repo.description && (
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            {repo.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            {repo.stars.toLocaleString()} stars
          </span>
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-sky-600/60 bg-sky-500/10 px-2 py-0.5 text-sky-300 hover:bg-sky-500/20"
          >
            View on GitHub
          </a>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {techStack.map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-slate-200"
          >
            {tech}
          </span>
        ))}
      </div>
    </section>
  );
}

