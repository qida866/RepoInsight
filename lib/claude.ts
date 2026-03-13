import { CLAUDE_API_URL } from "./claude-api-constants";

export interface ClaudeAnalysisRequest {
  repoName: string;
  description: string | null;
  techStack: string[];
  fileTreeSample: string;
}

export interface ClaudeAnalysisResponse {
  summary: string;
  explanation: string;
  learningPath: string[];
}

export interface SimpleRepoAiInput {
  repoName: string;
  description: string | null;
  techStack: string[];
  fileTree: string;
}

export interface SimpleRepoAiOutput {
  summary: string;
  explanation: string;
  learningGuide: string;
}

export interface RepoUnderstanding {
  summary: string;
  explanation: string;
  learningPath: string[];
}

// Simple in-memory caches keyed by input payload to avoid repeated AI calls
const repoAnalysisCache = new Map<string, Promise<ClaudeAnalysisResponse>>();
const repoInsightsCache = new Map<string, Promise<SimpleRepoAiOutput>>();

export async function analyzeRepoWithClaude(
  payload: ClaudeAnalysisRequest
): Promise<ClaudeAnalysisResponse> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return {
      summary:
        "Claude API key is not configured. Add CLAUDE_API_KEY to your environment to enable AI summaries.",
      explanation:
        "RepoInsight uses Claude to read the repository structure and language breakdown, then generates a concise mental model of how the codebase is organized. Once configured, this section will reflect that AI-assisted explanation.",
      learningPath: [
        "1. Skim the README and docs to understand the problem domain.",
        "2. Look at the main entrypoints (e.g. src/index.tsx, app/page.tsx, or main.go) to see how the app boots.",
        "3. Explore feature or module directories (like src/features/* or app/routes/*) to see how responsibilities are split.",
        "4. Trace a single user flow end‑to‑end (e.g. request handler → service → data access).",
        "5. Note cross‑cutting concerns like auth, logging, and configuration."
      ]
    };
  }

  const systemPrompt =
    "You are RepoInsight, an AI assistant that helps developers quickly understand unfamiliar GitHub repositories. Given the repo name, description, tech stack and a high-level file tree sample, you will:\n" +
    "1) Write a concise 3–5 sentence summary targeted at a senior engineer.\n" +
    "2) Explain the high-level architecture in 3–6 sentences, focusing on entrypoints, main modules, and data flow.\n" +
    "3) Propose a practical step-by-step learning path (5–8 bullet points) to deeply understand and safely contribute to the project.\n" +
    "Your tone is precise, technical, and pragmatic.";

  const userPrompt = [
    `Repository: ${payload.repoName}`,
    payload.description ? `Description: ${payload.description}` : null,
    payload.techStack.length ? `Tech stack: ${payload.techStack.join(", ")}` : null,
    "File tree sample:",
    payload.fileTreeSample
  ]
    .filter(Boolean)
    .join("\n");

  const cacheKey = JSON.stringify(payload);
  const cached = repoAnalysisCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
    });

    if (!res.ok) {
      throw new Error(`Claude API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as any;
    const text: string = json.content?.[0]?.text ?? "";

    const learningPath: string[] = [];
    const lines = text.split("\n").map((l: string) => l.trim());
    const summaryLines: string[] = [];
    const explanationLines: string[] = [];
    let section: "summary" | "explanation" | "learning" = "summary";

    for (const line of lines) {
      if (!line) continue;
      if (/^summary/i.test(line)) {
        section = "summary";
        continue;
      }
      if (/^architecture|^explanation/i.test(line)) {
        section = "explanation";
        continue;
      }
      if (/^learning path|^steps|^how to learn/i.test(line)) {
        section = "learning";
        continue;
      }
      if (section === "summary") summaryLines.push(line);
      else if (section === "explanation") explanationLines.push(line);
      else if (section === "learning")
        learningPath.push(line.replace(/^[-*\d.)\s]+/, ""));
    }

    return {
      summary: summaryLines.join(" "),
      explanation: explanationLines.join(" "),
      learningPath: learningPath.length
        ? learningPath
        : [
            "Read the README and high-level docs to understand the problem space and non-functional requirements.",
            "Identify the main entrypoints (web, CLI, background workers) and trace how requests or jobs flow through the system.",
            "Map core domains or bounded contexts (e.g. auth, billing, search) to their corresponding source directories.",
            "Study representative features end‑to‑end (handler → service → persistence) to internalize patterns and conventions.",
            "Review testing strategy and CI configuration to understand quality gates and release workflow."
          ]
    };
  })();

  repoAnalysisCache.set(cacheKey, promise);
  return promise;
}

export async function generateRepoUnderstandingFromTree(input: {
  repoName: string;
  description: string | null;
  fileTree: string[];
}): Promise<RepoUnderstanding> {
  const insights = await generateRepoInsightsWithClaude({
    repoName: input.repoName,
    description: input.description,
    techStack: [],
    fileTree: input.fileTree.join("\n")
  });

  const learningPath = insights.learningGuide
    .split("\n")
    .map((line) => line.trim().replace(/^[-*\d.)\s]+/, ""))
    .filter(Boolean);

  return {
    summary: insights.summary,
    explanation: insights.explanation,
    learningPath
  };
}

export async function generateRepoInsightsWithClaude(
  input: SimpleRepoAiInput
): Promise<SimpleRepoAiOutput> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    const paths = input.fileTree
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const lower = paths.map((p) => p.toLowerCase());
    const hasAny = (predicates: ((p: string) => boolean)[]) =>
      lower.some((p) => predicates.some((fn) => fn(p)));

    const layers: string[] = [];
    if (
      hasAny([
        (p) => p.startsWith("app/"),
        (p) => p.startsWith("pages/"),
        (p) => p.includes("components/"),
        (p) => p.endsWith(".tsx"),
        (p) => p.endsWith(".jsx")
      ])
    ) {
      layers.push("frontend UI");
    }
    if (
      hasAny([
        (p) => p.includes("/api/"),
        (p) => p.startsWith("app/api"),
        (p) => p.startsWith("pages/api"),
        (p) => p.includes("routes/"),
        (p) => p.includes("controllers/")
      ])
    ) {
      layers.push("HTTP API");
    }
    if (
      hasAny([
        (p) => p.includes("services/"),
        (p) => p.includes("usecase"),
        (p) => p.includes("domain/"),
        (p) => p.includes("backend/")
      ])
    ) {
      layers.push("service / domain");
    }
    if (
      hasAny([
        (p) => p.includes("prisma/"),
        (p) => p.includes("migrations/"),
        (p) => p.includes("db/"),
        (p) => p.endsWith(".sql")
      ])
    ) {
      layers.push("database / persistence");
    }

    const stackLine =
      input.techStack && input.techStack.length
        ? `It primarily uses ${input.techStack.join(", ")}. `
        : "";

    const architectureLine = layers.length
      ? `The codebase appears to have ${layers.join(", ")} layers. `
      : "The codebase appears to be a relatively simple or monolithic layout without clearly separated layers. ";

    const repoName = input.repoName || "this repository";
    const description = input.description
      ? ` ${input.description}`
      : "";

    const summary = `${repoName} is a codebase focused on solving a specific problem in a way that can be reused and extended by engineers.${description}`;

    const explanation =
      stackLine +
      architectureLine +
      "You can orient yourself by starting from the main entrypoints (such as app/page files, index.ts/tsx, or server/bootstrap files) and following how requests or user interactions flow through components, services, and data access code.";

    const learningGuide =
      "1) Skim the README and any docs folder to understand the problem domain and high-level goals.\n" +
      "2) Identify the main entrypoints: web (app/page, pages/index, src/main), server (server.ts/js, src/server), or CLI (bin/*, cli.ts/js).\n" +
      "3) Explore the core feature or domain folders (e.g. components/, features/, services/, domain/) to see how responsibilities are split.\n" +
      "4) Trace one representative user flow or request end-to-end, from the entrypoint through handlers/controllers/services into the database or external APIs.\n" +
      "5) Review tests and configuration (jest/playwright configs, CI workflows, Dockerfiles) to understand quality guarantees and how the project is built and deployed.";

    return {
      summary,
      explanation,
      learningGuide
    };
  }

  const systemPrompt =
    "You are an AI assistant for developers trying to understand an unfamiliar GitHub repository.\n" +
    "Given the repository name, description, tech stack and file tree, you must:\n" +
    "1) Write exactly ONE sentence that summarizes what this repo is and why it exists.\n" +
    "2) Write a detailed, multi-paragraph explanation of how the repo is structured and how the major pieces fit together.\n" +
    "3) Write a practical, step-by-step learning guide as a numbered list for how an engineer should approach learning this codebase.\n" +
    "Respond in three sections with clear labels: SUMMARY, EXPLANATION, LEARNING GUIDE.";

  const userPrompt = [
    `Repository: ${input.repoName}`,
    input.description ? `Description: ${input.description}` : null,
    input.techStack.length ? `Tech stack: ${input.techStack.join(", ")}` : null,
    "File tree:",
    input.fileTree
  ]
    .filter(Boolean)
    .join("\n");

  const cacheKey = JSON.stringify(input);
  const cached = repoInsightsCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 900,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
    });

    if (!res.ok) {
      throw new Error(`Claude API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as any;
    const text: string = json.content?.[0]?.text ?? "";

    const lines = text.split("\n").map((l: string) => l.trim());
    const summaryParts: string[] = [];
    const explanationParts: string[] = [];
    const learningLines: string[] = [];

    let section: "summary" | "explanation" | "learning" = "summary";

    for (const line of lines) {
      if (!line) continue;

      if (/^summary\b/i.test(line)) {
        section = "summary";
        continue;
      }
      if (/^explanation\b/i.test(line)) {
        section = "explanation";
        continue;
      }
      if (/^learning guide\b/i.test(line)) {
        section = "learning";
        continue;
      }

      if (section === "summary") summaryParts.push(line);
      else if (section === "explanation") explanationParts.push(line);
      else if (section === "learning")
        learningLines.push(line.replace(/^[-*\d.)\s]+/, ""));
    }

    const summarySentence =
      summaryParts.join(" ").split(/(?<=[.?!])\s+/)[0] ?? "";

    const learningGuide =
      learningLines.length > 0
        ? learningLines.join("\n")
        : "1) Read the README and any high-level docs.\n" +
          "2) Skim the main entrypoints and routing or bootstrap files.\n" +
          "3) Explore the primary feature or domain folders.\n" +
          "4) Trace one end-to-end feature or request.\n" +
          "5) Review the tests and configuration to understand quality and deployment.";

    return {
      summary: summarySentence,
      explanation: explanationParts.join(" "),
      learningGuide
    };
  })();

  repoInsightsCache.set(cacheKey, promise);
  return promise;
}


