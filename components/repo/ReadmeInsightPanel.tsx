"use client";

import { useEffect, useState } from "react";

interface ReadmeInsightPanelProps {
  owner: string;
  repo: string;
}

function extractSections(markdown: string): {
  description: string | null;
  installation: string | null;
  usage: string | null;
  features: string | null;
} {
  const lines = markdown.split("\n");

  let description: string | null = null;
  const installationLines: string[] = [];
  const usageLines: string[] = [];
  const featuresLines: string[] = [];

  type Section = "none" | "installation" | "usage" | "features";
  let section: Section = "none";

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const line = raw.trim();

    if (!description && line && !line.startsWith("#")) {
      description = line;
    }

    if (line.startsWith("#")) {
      const title = line.replace(/^#+\s*/, "").toLowerCase();
      if (title.includes("install")) {
        section = "installation";
        continue;
      }
      if (title.includes("usage") || title.includes("getting started")) {
        section = "usage";
        continue;
      }
      if (title.includes("feature")) {
        section = "features";
        continue;
      }
      section = "none";
      continue;
    }

    if (!line) continue;

    if (section === "installation") {
      installationLines.push(raw);
    } else if (section === "usage") {
      usageLines.push(raw);
    } else if (section === "features") {
      featuresLines.push(raw);
    }
  }

  const clean = (arr: string[]): string | null =>
    arr.length ? arr.join("\n").trim() || null : null;

  return {
    description: description ?? null,
    installation: clean(installationLines),
    usage: clean(usageLines),
    features: clean(featuresLines)
  };
}

export default function ReadmeInsightPanel({
  owner,
  repo
}: ReadmeInsightPanelProps) {
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!owner || !repo) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReadme(null);
    const url = `/api/readme?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data: { readme?: string | null; error?: string }) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          setReadme(data.readme ?? null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owner, repo]);

  if (loading) {
    return (
      <section className="glass-panel">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            README insight
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Loading README…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="glass-panel">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            README insight
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-red-400">{error}</p>
      </section>
    );
  }

  if (!readme) {
    return (
      <section className="glass-panel">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            README insight
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          README.md could not be loaded from GitHub for this repository.
        </p>
      </section>
    );
  }

  const { description, installation, usage, features } = extractSections(readme);

  return (
    <section className="glass-panel">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          README insight
        </h2>
      </div>
      <div className="grid gap-4 text-xs text-slate-200 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[11px] font-medium text-slate-300">
              Project description
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              {description ??
                "No clear description paragraph was found in README.md."}
            </p>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-medium text-slate-300">
              Features
            </div>
            {features ? (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-[11px] text-slate-200">
                {features}
              </pre>
            ) : (
              <p className="text-[11px] text-slate-500">
                No dedicated features section detected in README.md.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[11px] font-medium text-slate-300">
              Installation
            </div>
            {installation ? (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-[11px] text-slate-200">
                {installation}
              </pre>
            ) : (
              <p className="text-[11px] text-slate-500">
                No installation section detected. Check README.md directly for details.
              </p>
            )}
          </div>
          <div>
            <div className="mb-1 text-[11px] font-medium text-slate-300">
              Usage examples
            </div>
            {usage ? (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-[11px] text-slate-200">
                {usage}
              </pre>
            ) : (
              <p className="text-[11px] text-slate-500">
                No usage section detected. Look for code samples or commands in
                README.md.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
