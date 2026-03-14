import { NextRequest, NextResponse } from "next/server";
import { CLAUDE_API_URL } from "@/lib/claude-api-constants";

export const dynamic = "force-dynamic";

export interface AIDemoPreviewRequest {
  repoName: string;
  description?: string | null;
  techStack: string[];
  fileTree: string[];
  entryPoints?: string[];
  isBackend: boolean;
}

export interface AIDemoFrontendResponse {
  kind: "frontend";
  appType: string;
  screens: string[];
  userFlow: string[];
  mockUiDescription: string;
}

export interface AIDemoBackendResponse {
  kind: "backend";
  apiRoutes: string[];
  services: string[];
  database: string[];
  systemDescription: string;
}

export type AIDemoPreviewResponse = AIDemoFrontendResponse | AIDemoBackendResponse;

function inferFromTree(fileTree: string[]): { folders: string[]; hints: string[] } {
  const lower = fileTree.map((p) => p.toLowerCase());
  const folders = new Set<string>();
  lower.forEach((p) => {
    const parts = p.split(/[/\\]/);
    if (parts.length > 1) folders.add(parts[0]);
    if (parts.length > 2) folders.add(parts[1]);
  });
  const hintFolders = ["pages", "app", "components", "dashboard", "auth", "admin", "api", "services", "routes", "controllers", "db", "models"];
  const hints = hintFolders.filter((f) => lower.some((p) => p.startsWith(f + "/") || p.includes("/" + f + "/")));
  return { folders: Array.from(folders), hints };
}

function fallbackFrontend(repoName: string, hints: string[]): AIDemoFrontendResponse {
  let appType = "Web application";
  if (hints.includes("dashboard")) appType = "SaaS dashboard";
  else if (hints.includes("admin")) appType = "Admin panel";
  else if (hints.includes("auth")) appType = "App with authentication";
  return {
    kind: "frontend",
    appType,
    screens: ["Home", "Main view", "Settings or profile"].filter((_, i) => i < 3),
    userFlow: ["Land on home or login", "Navigate to main feature", "Complete a primary action"],
    mockUiDescription: `A ${appType.toLowerCase()} with a header, main content area, and navigation.`,
  };
}

function fallbackBackend(repoName: string, hints: string[]): AIDemoBackendResponse {
  return {
    kind: "backend",
    apiRoutes: hints.includes("api") ? ["/api/...", "/health"] : ["/", "/health"],
    services: hints.includes("services") ? ["Core service", "Auth service"] : ["Main service"],
    database: hints.includes("db") ? ["Primary database", "Migrations"] : ["Data layer"],
    systemDescription: `${repoName} appears to be a backend service. It likely exposes HTTP endpoints and uses a database or external APIs.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AIDemoPreviewRequest;
    const { repoName, description, techStack, fileTree, entryPoints = [], isBackend } = body;

    const { folders, hints } = inferFromTree(fileTree);
    const treeSample = fileTree.slice(0, 100).join("\n");
    const entrySample = entryPoints.slice(0, 20).join(", ") || "none detected";

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      if (isBackend) return NextResponse.json(fallbackBackend(repoName, hints));
      return NextResponse.json(fallbackFrontend(repoName, hints));
    }

    const systemPrompt = isBackend
      ? `You are an expert at inferring backend architecture from repository structure. Given repo name, description, tech stack, file tree, and entry points, respond with a JSON object only (no markdown, no code fence). Use this exact shape:
{"kind":"backend","apiRoutes":["route1","route2"],"services":["Service A","Service B"],"database":["DB or schema hint"],"systemDescription":"2-4 sentences on how the system likely works."}
Infer API routes from paths like api/, routes/, controllers/. Infer services from services/, usecases/, domain/. Infer database from db/, prisma/, migrations/, *.sql. Be concise.`
      : `You are an expert at inferring web app type and UX from repository structure. Given repo name, description, tech stack, file tree, entry points, and folder names (e.g. pages, app, components, dashboard, auth, admin), respond with a JSON object only (no markdown, no code fence). Use this exact shape:
{"kind":"frontend","appType":"one of: SaaS dashboard, landing page, admin panel, blog, e-commerce site, API service frontend, CLI tool (or similar)","screens":["Screen 1","Screen 2","..."],"userFlow":["Step 1","Step 2","..."],"mockUiDescription":"2-3 sentences describing what the UI likely looks like (layout, main sections, key components)."}
Use folder names like dashboard, auth, admin, pages, app to infer app type and screens. Be specific and concise.`;

    const userPrompt = [
      `Repository name: ${repoName}`,
      description ? `Description: ${description}` : null,
      techStack.length ? `Tech stack: ${techStack.join(", ")}` : null,
      `Entry points: ${entrySample}`,
      `Relevant folders / hints: ${hints.length ? hints.join(", ") : folders.slice(0, 15).join(", ")}`,
      "File tree (sample):",
      treeSample,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      if (isBackend) return NextResponse.json(fallbackBackend(repoName, hints));
      return NextResponse.json(fallbackFrontend(repoName, hints));
    }

    const json = (await res.json()) as { content?: { text?: string }[] };
    const text = json.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as AIDemoPreviewResponse) : null;

    if (parsed && (parsed.kind === "frontend" || parsed.kind === "backend")) {
      return NextResponse.json(parsed);
    }

    if (isBackend) return NextResponse.json(fallbackBackend(repoName, hints));
    return NextResponse.json(fallbackFrontend(repoName, hints));
  } catch (e) {
    console.error("ai-demo-preview error", e);
    return NextResponse.json(
      {
        kind: "frontend",
        appType: "Web application",
        screens: ["Home", "Main"],
        userFlow: ["Open app", "Use main feature"],
        mockUiDescription: "Unable to generate preview. The repository may be a web or backend application.",
      } as AIDemoFrontendResponse,
      { status: 200 }
    );
  }
}
