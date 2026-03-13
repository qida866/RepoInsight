import { fetchRepoMetadata } from "@/lib/github";

interface ParsedRepo {
  owner: string;
  repo: string;
}

export interface RepoSummary {
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
}

export interface RepoAnalyzerOutput {
  repoSummary: RepoSummary;
  techStack: string[];
  fileTree: string[];
}

function parseGithubUrl(input: string): ParsedRepo | null {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes("github.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, "") };
  } catch {
    const parts = trimmed.split("/").filter(Boolean);
    if (parts.length === 2) {
      return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, "") };
    }
    return null;
  }
}

async function fetchFileTree(owner: string, repo: string): Promise<string[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
    {
      headers: {
        Accept: "application/vnd.github+json"
      },
      next: { revalidate: 300 }
    }
  );

  if (!res.ok) {
    return [];
  }

  const json = (await res.json()) as { tree?: { path: string; type: string }[] };
  const tree = json.tree ?? [];

  return tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path)
    .sort();
}

function detectTechStack(files: string[]): string[] {
  const techs = new Set<string>();

  const hasFile = (name: string) =>
    files.some((p) => p.toLowerCase().endsWith(name.toLowerCase()));

  if (hasFile("package.json")) {
    techs.add("JavaScript");
    techs.add("Node.js");
  }
  if (hasFile("requirements.txt")) {
    techs.add("Python");
  }
  if (hasFile("go.mod")) {
    techs.add("Go");
  }
  if (hasFile("pom.xml")) {
    techs.add("Java");
  }

  const allContent = files.join("\n").toLowerCase();

  if (allContent.includes("next.config") || allContent.includes("next/")) {
    techs.add("Next.js");
    techs.add("React");
  } else if (allContent.includes("react")) {
    techs.add("React");
  }

  if (allContent.includes("express")) {
    techs.add("Express");
  }

  if (allContent.includes("django")) {
    techs.add("Django");
  }

  if (allContent.includes("flask")) {
    techs.add("Flask");
  }

  if (allContent.includes("spring-boot") || allContent.includes("springframework")) {
    techs.add("Spring");
  }

  return Array.from(techs);
}

export async function analyzeGithubRepository(
  repoUrl: string
): Promise<RepoAnalyzerOutput> {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub repository URL");
  }

  const { owner, repo } = parsed;

  const [meta, filePaths] = await Promise.all([
    fetchRepoMetadata(owner, repo),
    fetchFileTree(owner, repo)
  ]);

  const techStack = detectTechStack(filePaths);

  const repoSummary: RepoSummary = {
    name: meta.name,
    description: meta.description,
    stars: meta.stars,
    language: meta.language ?? null,
    topics: meta.topics ?? []
  };

  const fileTree = filePaths;

  return {
    repoSummary,
    techStack,
    fileTree
  };
}

