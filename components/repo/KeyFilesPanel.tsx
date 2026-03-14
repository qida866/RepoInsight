"use client";

import { useMemo } from "react";

interface KeyFilesPanelProps {
  fileTree: string[];
  onSelectFile: (path: string) => void;
  selectedPath?: string | null;
}

type KeyFileCategory = "readme" | "package" | "config" | "entry" | "routes" | "controllers" | "models" | "other";

function getCategory(path: string): KeyFileCategory {
  const lower = path.toLowerCase();
  if (lower === "readme.md" || lower.endsWith("/readme.md")) return "readme";
  if (lower.endsWith("package.json")) return "package";
  if (
    lower.endsWith("next.config.js") ||
    lower.endsWith("next.config.mjs") ||
    lower.endsWith("next.config.ts") ||
    lower.endsWith("vite.config.ts") ||
    lower.endsWith("vite.config.js") ||
    lower.endsWith("tsconfig.json") ||
    lower.endsWith(".env.example") ||
    lower.endsWith("dockerfile") ||
    lower.endsWith(".dockerignore")
  )
    return "config";
  if (
    lower.endsWith("server.js") ||
    lower.endsWith("server.ts") ||
    lower.endsWith("index.js") ||
    lower.endsWith("index.ts") ||
    lower.endsWith("index.tsx") ||
    lower.endsWith("main.js") ||
    lower.endsWith("main.ts") ||
    lower.endsWith("main.tsx") ||
    lower.endsWith("app.tsx") ||
    lower.endsWith("app.jsx") ||
    lower.endsWith("app.js") ||
    lower === "app/page.tsx" ||
    lower.endsWith("pages/index.tsx") ||
    lower.endsWith("pages/index.jsx") ||
    lower.endsWith("main.py") ||
    lower.endsWith("app.py") ||
    lower.endsWith("go.mod") ||
    lower.endsWith("requirements.txt")
  )
    return "entry";
  if (lower.includes("/routes/") || lower.startsWith("routes/")) return "routes";
  if (lower.includes("/controllers/") || lower.startsWith("controllers/")) return "controllers";
  if (lower.includes("/models/") || lower.startsWith("models/")) return "models";
  return "other";
}

function categoryOrder(cat: KeyFileCategory): number {
  const order: KeyFileCategory[] = ["readme", "package", "config", "entry", "routes", "controllers", "models", "other"];
  return order.indexOf(cat);
}

function isKeyFile(path: string): boolean {
  const lower = path.toLowerCase();
  if (lower.endsWith("readme.md")) return true;
  if (lower.endsWith("package.json")) return true;
  if (
    lower.endsWith("next.config.js") ||
    lower.endsWith("next.config.mjs") ||
    lower.endsWith("next.config.ts") ||
    lower.endsWith("vite.config.ts") ||
    lower.endsWith("vite.config.js") ||
    lower.endsWith("tsconfig.json") ||
    lower.endsWith(".env.example")
  )
    return true;
  if (
    lower.endsWith("server.js") ||
    lower.endsWith("server.ts") ||
    lower === "index.js" ||
    lower === "index.ts" ||
    lower.endsWith("/index.js") ||
    lower.endsWith("/index.ts") ||
    lower.endsWith("/index.tsx") ||
    lower.endsWith("main.js") ||
    lower.endsWith("main.ts") ||
    lower.endsWith("main.tsx") ||
    lower.endsWith("app.tsx") ||
    lower.endsWith("app.jsx") ||
    lower.endsWith("app.js") ||
    lower === "app/page.tsx" ||
    lower.endsWith("pages/index.tsx") ||
    lower.endsWith("pages/index.jsx") ||
    lower.endsWith("main.py") ||
    lower.endsWith("app.py") ||
    lower.endsWith("go.mod") ||
    lower.endsWith("requirements.txt")
  )
    return true;
  if (lower.includes("/routes/") || lower.startsWith("routes/")) return true;
  if (lower.includes("/controllers/") || lower.startsWith("controllers/")) return true;
  if (lower.includes("/models/") || lower.startsWith("models/")) return true;
  return false;
}

function label(path: string): string {
  const name = path.split("/").pop() ?? path;
  if (name) return name;
  return path;
}

export default function KeyFilesPanel({
  fileTree,
  onSelectFile,
  selectedPath
}: KeyFilesPanelProps) {
  const keyFiles = useMemo(() => {
    const matched = fileTree.filter(isKeyFile);
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const p of matched) {
      if (seen.has(p.toLowerCase())) continue;
      seen.add(p.toLowerCase());
      unique.push(p);
    }
    return unique.sort((a, b) => {
      const catA = getCategory(a);
      const catB = getCategory(b);
      if (catA !== catB) return categoryOrder(catA) - categoryOrder(catB);
      return a.localeCompare(b);
    });
  }, [fileTree]);

  if (keyFiles.length === 0) {
    return (
      <section className="glass-panel border-slate-800/80 p-4">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Key files
        </h2>
        <p className="text-xs text-slate-500">
          No README, package.json, entry points, or routes/controllers/models detected.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel border-slate-800/80 p-4">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Key files
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {keyFiles.map((path) => {
          const isSelected = selectedPath === path;
          return (
            <button
              key={path}
              type="button"
              onClick={() => onSelectFile(path)}
              className={`rounded-lg border px-3 py-2 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-0 focus:ring-offset-slate-950 ${
                isSelected
                  ? "border-sky-500 bg-sky-500/15 text-slate-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80"
              }`}
            >
              <span className="font-mono block truncate" title={path}>
                {label(path)}
              </span>
              {path.includes("/") && (
                <span className="mt-0.5 block truncate text-[10px] text-slate-500" title={path}>
                  {path.replace(/\/[^/]+$/, "")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
