"use client";

interface ArchitectureHeatmapProps {
  fileTree: string[];
}

interface ModuleScore {
  name: string;
  score: number;
  files: number;
}

export default function ArchitectureHeatmap({
  fileTree
}: ArchitectureHeatmapProps) {
  const lower = fileTree.map((p) => p.toLowerCase());

  const moduleMap = new Map<string, { files: number; score: number }>();

  const bump = (name: string, amount: number) => {
    const current = moduleMap.get(name) ?? { files: 0, score: 0 };
    current.score += amount;
    moduleMap.set(name, current);
  };

  // Seed modules based on top-level folders
  for (const path of fileTree) {
    const [top] = path.split("/");
    if (!top) continue;
    const entry = moduleMap.get(top) ?? { files: 0, score: 0 };
    entry.files += 1;
    entry.score += 1; // base weight per file
    moduleMap.set(top, entry);
  }

  // Heuristic boosts for known layers
  lower.forEach((p, idx) => {
    const original = fileTree[idx]!;
    const [top] = original.split("/");
    if (!top) return;

    if (p.startsWith("app/") || p.startsWith("pages/") || p.includes("/components/")) {
      bump(top, 2); // frontend
    }
    if (
      p.startsWith("app/api") ||
      p.startsWith("pages/api") ||
      p.startsWith("api/") ||
      p.includes("/api/")
    ) {
      bump(top, 2); // api
    }
    if (p.includes("/services/") || p.includes("/controllers/") || p.includes("/server")) {
      bump(top, 2); // backend
    }
    if (
      p.includes("/models/") ||
      p.includes("/db/") ||
      p.includes("database") ||
      p.includes("prisma/")
    ) {
      bump(top, 2); // data
    }
    if (
      p.startsWith("config/") ||
      p.includes("/config/") ||
      p.endsWith(".env") ||
      p.includes(".env.") ||
      p.includes("settings")
    ) {
      bump(top, 1.5); // config
    }
    if (
      p.includes("/tests/") ||
      p.includes("/__tests__/") ||
      p.endsWith(".spec.ts") ||
      p.endsWith(".test.ts") ||
      p.endsWith(".spec.js")
    ) {
      bump(top, 1); // tests
    }
    if (p.startsWith("scripts/") || p.startsWith("tools/") || p.startsWith("bin/")) {
      bump(top, 1.5); // scripts
    }
  });

  const modules: ModuleScore[] = Array.from(moduleMap.entries())
    .map(([name, { files, score }]) => ({ name, files, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (!modules.length) {
    return null;
  }

  const maxScore = modules[0]?.score || 1;

  return (
    <section className="glass-panel space-y-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Architecture heatmap
        </h2>
      </div>
      <p className="text-[11px] text-slate-400">
        Most central modules inferred from folder structure and code organization.
      </p>
      <div className="space-y-2 text-xs text-slate-200">
        {modules.map((m) => {
          const ratio = Math.max(0.1, Math.min(1, m.score / maxScore));
          const widthPercent = `${ratio * 100}%`;
          return (
            <div key={m.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-100">
                  {m.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {m.files} file{m.files === 1 ? "" : "s"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500"
                  style={{ width: widthPercent }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

