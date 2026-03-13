import type React from "react";
import { detectEntrypoints, inferArchitecture } from "@/lib/repoAnalyzer";

interface RepoIntelligencePanelProps {
  fileTree: string[];
  name: string;
  description: string | null;
  techStack: string[];
}

const CORE_FOLDER_IGNORE = new Set([
  "node_modules",
  ".git",
  ".github",
  ".vscode",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo"
]);

export default function RepoIntelligencePanel({
  fileTree,
  name,
  description,
  techStack
}: RepoIntelligencePanelProps): React.JSX.Element {
  const entrypoints = detectEntrypoints(fileTree);
  const architecture = inferArchitecture(fileTree);

  const coreFolders = Array.from(
    new Set(
      fileTree
        .map((p) => p.split("/")[0] ?? "")
        .filter((folder) => folder && !CORE_FOLDER_IGNORE.has(folder))
    )
  ).sort();

  const lowerTree = fileTree.map((p) => p.toLowerCase());
  const hasAny = (predicates: ((p: string) => boolean)[]) =>
    lowerTree.some((p) => predicates.some((fn) => fn(p)));

  const layers: string[] = [];
  if (
    hasAny([
      (p) => p.includes("/pages/"),
      (p) => p.startsWith("pages/"),
      (p) => p.includes("/components/"),
      (p) => p.startsWith("components/"),
      (p) => p.includes("/ui/"),
      (p) => p.startsWith("ui/")
    ])
  ) {
    layers.push("frontend");
  }
  if (
    hasAny([
      (p) => p.includes("/api/"),
      (p) => p.startsWith("api/"),
      (p) => p.includes("/routes/"),
      (p) => p.startsWith("routes/")
    ])
  ) {
    layers.push("api");
  }
  if (
    hasAny([
      (p) => p.includes("/server"),
      (p) => p.startsWith("server/"),
      (p) => p.includes("/services/"),
      (p) => p.startsWith("services/"),
      (p) => p.includes("/controllers/"),
      (p) => p.startsWith("controllers/")
    ])
  ) {
    layers.push("backend");
  }
  if (
    hasAny([
      (p) => p.includes("/models/"),
      (p) => p.startsWith("models/"),
      (p) => p.includes("/db/"),
      (p) => p.startsWith("db/"),
      (p) => p.includes("database")
    ])
  ) {
    layers.push("data");
  }
  if (
    hasAny([
      (p) => p.startsWith("config/"),
      (p) => p.includes("/config/"),
      (p) => p.endsWith(".env"),
      (p) => p.includes(".env."),
      (p) => p.includes("settings")
    ])
  ) {
    layers.push("config");
  }
  if (
    hasAny([
      (p) => p.includes("/tests/"),
      (p) => p.startsWith("tests/"),
      (p) => p.includes("/__tests__/"),
      (p) => p.endsWith(".spec.ts") || p.endsWith(".test.ts") || p.endsWith(".spec.js")
    ])
  ) {
    layers.push("tests");
  }

  const uniqueLayers = Array.from(new Set(layers));

  const keyFiles: string[] = [];
  const addKeyFile = (target: string) => {
    const found = fileTree.find((p) => p.toLowerCase() === target.toLowerCase());
    if (found) keyFiles.push(found);
  };
  addKeyFile("README.md");
  addKeyFile("readme.md");
  addKeyFile("package.json");
  addKeyFile("server.js");
  addKeyFile("main.py");
  addKeyFile("app/page.tsx");

  const topTechs = techStack.slice(0, 3);
  const purposeParts: string[] = [];
  if (description && description.trim().length > 0) {
    purposeParts.push(description.trim());
  } else {
    purposeParts.push(
      `${name} is a codebase without a detailed description, but its structure and tech stack give some hints.`
    );
  }
  if (topTechs.length) {
    purposeParts.push(`It primarily uses ${topTechs.join(", ")}.`);
  }
  if (uniqueLayers.length) {
    purposeParts.push(
      `The repository appears to be organized into ${uniqueLayers.join(", ")} layer${
        uniqueLayers.length > 1 ? "s" : ""
      }.`
    );
  }
  const projectPurpose = purposeParts.join(" ");

  return (
    <section className="glass-panel transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repo intelligence
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 text-xs text-slate-200">
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[11px] font-medium text-slate-300">
              Project purpose
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              {projectPurpose}
            </p>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-medium text-slate-300">
              Architecture layers
            </div>
            {uniqueLayers.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No clear layers detected from the current file tree.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {uniqueLayers.map((layer) => (
                  <span
                    key={layer}
                    className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-100"
                  >
                    {layer}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[11px] font-medium text-slate-300">
              Core modules
            </div>
            {coreFolders.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No prominent top-level folders.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {coreFolders.slice(0, 8).map((folder) => (
                  <span
                    key={folder}
                    className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-100"
                  >
                    {folder}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 text-[11px] font-medium text-slate-300">
              Key files
            </div>
            {keyFiles.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No canonical key files (README, package.json, server.js, main.py, app/page.tsx) were found.
              </p>
            ) : (
              <ul className="space-y-1">
                {keyFiles.map((file) => (
                  <li
                    key={file}
                    className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] text-slate-100"
                  >
                    {file}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

