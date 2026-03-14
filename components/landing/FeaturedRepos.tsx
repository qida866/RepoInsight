"use client";

import Link from "next/link";

const FEATURED_REPOS = [
  {
    owner: "vercel",
    repo: "next.js",
    tagline: "The React Framework for the Web",
    accent: "from-slate-100 to-slate-400",
  },
  {
    owner: "facebook",
    repo: "react",
    tagline: "A JavaScript library for building user interfaces",
    accent: "from-sky-200 to-sky-500",
  },
  {
    owner: "supabase",
    repo: "supabase",
    tagline: "Open source Firebase alternative",
    accent: "from-emerald-200 to-emerald-500",
  },
  {
    owner: "langchain-ai",
    repo: "langchain",
    tagline: "Build applications with LLMs",
    accent: "from-amber-200 to-amber-500",
  },
  {
    owner: "openai",
    repo: "openai-cookbook",
    tagline: "Examples and guides for the OpenAI API",
    accent: "from-violet-200 to-violet-500",
  },
  {
    owner: "vuejs",
    repo: "core",
    tagline: "Vue.js core monorepo",
    accent: "from-green-200 to-emerald-500",
  },
] as const;

export default function FeaturedRepos() {
  return (
    <section className="mt-12 text-left">
      <h2 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        Try an example
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_REPOS.map(({ owner, repo, tagline, accent }) => (
          <Link
            key={`${owner}/${repo}`}
            href={`/analyze/${owner}/${repo}`}
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-slate-950/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            {/* Subtle gradient accent on left edge */}
            <div
              className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${accent} opacity-60 transition-opacity group-hover:opacity-90`}
              aria-hidden
            />
            <div className="pl-3">
              <p className="font-mono text-sm font-semibold text-slate-100 group-hover:text-white">
                {owner}/{repo}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400 line-clamp-2">
                {tagline}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500 transition-colors group-hover:text-sky-400">
                View analysis
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
