"use client";

import { useMemo } from "react";

interface TechStackPanelProps {
  techStack: string[];
  fileTree: string[];
}

interface StackSignal {
  id: string;
  label: string;
  confidence: "high" | "medium";
}

export default function TechStackPanel({
  techStack,
  fileTree
}: TechStackPanelProps) {
  const lowerPaths = useMemo(
    () => fileTree.map((p) => p.toLowerCase()),
    [fileTree]
  );

  const hasPath = (predicates: ((p: string) => boolean)[]) =>
    lowerPaths.some((p) => predicates.some((fn) => fn(p)));

  const signals: StackSignal[] = useMemo(() => {
    const results: StackSignal[] = [];
    const add = (id: string, label: string, confidence: "high" | "medium") => {
      if (!results.find((r) => r.id === id)) {
        results.push({ id, label, confidence });
      }
    };

    const hasTech = (name: string) =>
      techStack.some((t) => t.toLowerCase() === name.toLowerCase());

    // React / Next / Vite
    if (hasTech("React"))
      add(
        "react",
        "React",
        hasPath([
          (p) => p.includes("components/"),
          (p) => p.endsWith(".tsx"),
          (p) => p.endsWith(".jsx")
        ])
          ? "high"
          : "medium"
      );
    if (hasTech("Next.js"))
      add(
        "next",
        "Next.js",
        hasPath([
          (p) => p.startsWith("app/"),
          (p) => p.startsWith("pages/")
        ])
          ? "high"
          : "medium"
      );
    if (hasTech("Vite"))
      add(
        "vite",
        "Vite",
        hasPath([(p) => p.includes("vite.config")]) ? "high" : "medium"
      );

    // Backend / APIs
    if (hasTech("Express"))
      add(
        "express",
        "Express",
        hasPath([
          (p) => p.includes("routes/"),
          (p) => p.includes("controllers/")
        ])
          ? "high"
          : "medium"
      );

    // Tailwind / Prisma / Redux
    if (hasTech("Tailwind CSS"))
      add(
        "tailwind",
        "Tailwind CSS",
        hasPath([(p) => p.includes("tailwind.config")]) ? "high" : "medium"
      );
    if (hasTech("Prisma"))
      add(
        "prisma",
        "Prisma",
        hasPath([(p) => p.includes("prisma/"), (p) => p.includes("schema.prisma")])
          ? "high"
          : "medium"
      );
    if (hasTech("Redux"))
      add(
        "redux",
        "Redux",
        hasPath([
          (p) => p.includes("store."),
          (p) => p.includes("slices/")
        ])
          ? "medium"
          : "medium"
      );

    // Python / Flask / Django / Pygame
    const hasPy = hasPath([(p: string) => p.endsWith(".py")]);
    if (hasPy || hasTech("Python")) add("python", "Python", hasPy ? "medium" : "medium");

    if (hasTech("Flask") || hasPath([(p: string) => p.includes("flask")]))
      add(
        "flask",
        "Flask",
        hasPath([(p) => p.includes("app.py")]) ? "high" : "medium"
      );

    if (hasTech("Django") || hasPath([(p: string) => p.includes("django")]))
      add(
        "django",
        "Django",
        hasPath([(p) => p.includes("manage.py"), (p) => p.includes("settings.py")])
          ? "high"
          : "medium"
      );

    if (hasPath([(p: string) => p.includes("pygame")]))
      add("pygame", "Pygame", "medium");

    // Java / C / C++
    if (hasPath([(p) => p.endsWith(".java")]))
      add("java", "Java", "medium");
    if (
      hasPath([
        (p) => p.endsWith(".c"),
        (p) => p.endsWith(".cpp"),
        (p) => p.endsWith(".h"),
        (p) => p.endsWith(".hpp")
      ])
    )
      add("cpp", "C / C++", "medium");

    return results;
  }, [fileTree, techStack, lowerPaths]);

  if (!signals.length) {
    return (
      <div className="glass-panel border-slate-800/80 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Tech stack
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          No recognizable stack detected from this snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel border-slate-800/80 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Tech stack
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            Inferred from dependencies, file structure, and config files.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {signals.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 shadow-soft"
          >
            <span className="font-medium">{s.label}</span>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px]",
                s.confidence === "high"
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-700/50 text-slate-200 border border-slate-600/60"
              ].join(" ")}
            >
              {s.confidence === "high" ? "High confidence" : "Heuristic"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

