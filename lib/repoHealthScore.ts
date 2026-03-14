import { getDetectedLayerLabels } from "@/components/repo/ArchitectureMapPanel";

const lower = (p: string) => p.toLowerCase();

export interface ActivityData {
  commits: { date: string }[];
  contributors: unknown[];
  lastUpdated: string | null;
}

export interface HealthBreakdown {
  documentation: number;
  structure: number;
  dependency: number;
  activity: number;
  tests: number;
  organization: number;
}

export interface HealthScoreResult {
  score: number;
  maxScore: number;
  breakdown: HealthBreakdown;
}

/** Documentation: README, CONTRIBUTING, docs/, LICENSE (max 2) */
function scoreDocumentation(fileTree: string[]): number {
  const paths = fileTree.map(lower);
  let s = 0;
  if (paths.some((p) => p === "readme.md" || p === "readme" || p.endsWith("/readme.md"))) s += 0.5;
  if (paths.some((p) => p.includes("contributing") || p.includes("docs/"))) s += 0.5;
  if (paths.some((p) => p.includes("license"))) s += 0.5;
  if (paths.some((p) => p.includes("code_of_conduct") || p.includes("changelog") || p.includes("doc/"))) s += 0.5;
  return Math.min(s, 2);
}

/** Structure: package.json/config, config files, src/app/lib (max 1.5) */
function scoreStructure(fileTree: string[]): number {
  const paths = fileTree.map(lower);
  let s = 0;
  if (paths.some((p) => p === "package.json" || p === "requirements.txt" || p === "cargo.toml" || p === "go.mod"))) s += 0.5;
  if (paths.some((p) => p.includes("tsconfig") || p.includes("vite.config") || p.includes("next.config") || p.includes("webpack"))) s += 0.5;
  if (paths.some((p) => p.startsWith("src/") || p.startsWith("app/") || p.startsWith("lib/") || p === "src")) s += 0.5;
  return Math.min(s, 1.5);
}

/** Dependency health: lockfile present = reproducible (max 1) */
function scoreDependency(fileTree: string[]): number {
  const paths = fileTree.map(lower);
  const hasLock = paths.some((p) =>
    p.endsWith("package-lock.json") || p.endsWith("yarn.lock") || p.endsWith("pnpm-lock.yaml") || p.endsWith("cargo.lock") || p.endsWith("go.sum")
  );
  return hasLock ? 1 : 0;
}

/** Activity: recent commits, contributors, last updated (max 2) */
function scoreActivity(activity: ActivityData | null): number {
  if (!activity) return 0;
  let s = 0;
  if (activity.commits.length > 0) s += 0.5;
  if (Array.isArray(activity.contributors) && activity.contributors.length >= 2) s += 0.5;
  if (activity.lastUpdated) {
    const date = new Date(activity.lastUpdated).getTime();
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    if (date >= ninetyDaysAgo) s += 1;
  }
  return Math.min(s, 2);
}

/** Test folders and spec files (max 2) */
function scoreTests(fileTree: string[]): number {
  const paths = fileTree.map(lower);
  let s = 0;
  if (paths.some((p) => p.includes("__tests__") || p.includes("tests/") || p.includes("/tests/") || p.includes("spec/"))) s += 1;
  if (paths.some((p) => p.includes(".test.") || p.includes(".spec."))) s += 1;
  return Math.min(s, 2);
}

/** Code organization: architecture layers (max 1.5) */
function scoreOrganization(fileTree: string[]): number {
  const layers = getDetectedLayerLabels(fileTree);
  if (layers.length >= 3) return 1.5;
  if (layers.length === 2) return 1;
  if (layers.length === 1) return 0.5;
  return 0;
}

const MAX_SCORE = 10;

/**
 * Compute repository health score 0–10 from file tree, optional activity, and optional dependency count.
 */
export function computeHealthScore(
  fileTree: string[],
  options?: { activity?: ActivityData | null; dependencyNodeCount?: number }
): HealthScoreResult {
  const activity = options?.activity ?? null;

  const documentation = scoreDocumentation(fileTree);
  const structure = scoreStructure(fileTree);
  const dependency = scoreDependency(fileTree);
  const activityScore = scoreActivity(activity);
  const tests = scoreTests(fileTree);
  const organization = scoreOrganization(fileTree);

  const breakdown: HealthBreakdown = {
    documentation,
    structure,
    dependency,
    activity: activityScore,
    tests,
    organization,
  };

  const raw = documentation + structure + dependency + activityScore + tests + organization;
  const score = Math.round(Math.min(raw, MAX_SCORE) * 10) / 10;

  return { score, maxScore: MAX_SCORE, breakdown };
}
