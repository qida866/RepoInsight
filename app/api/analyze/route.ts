import { NextRequest, NextResponse } from "next/server";
import {
  fetchLanguages,
  fetchRepoMetadata,
  fetchRepoTree,
  deriveArchitectureFromTree
} from "@/lib/github";
import { analyzeRepoWithClaude, generateRepoUnderstandingFromTree } from "@/lib/claude";
import { analyzeGithubRepository } from "@/lib/repoAnalyzer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      url?: string;
      owner?: string;
      repo?: string;
    };

    // Simple URL-based analyzer (for landing page button)
    if (body.url) {
      try {
        const result = await analyzeGithubRepository(body.url);
        const ai = await generateRepoUnderstandingFromTree({
          repoName: result.repoSummary.name,
          description: result.repoSummary.description,
          fileTree: result.fileTree.slice(0, 80)
        });
        return NextResponse.json({
          name: result.repoSummary.name,
          description: result.repoSummary.description,
          stars: result.repoSummary.stars,
          language: result.repoSummary.language,
          fileTree: result.fileTree,
          summary: ai.summary,
          explanation: ai.explanation,
          learningPath: ai.learningPath
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to analyze repository";
        if (message.includes("404")) {
          return NextResponse.json(
            {
              error:
                "We couldn’t find that repository. Make sure the URL is correct and that the repo is public, then try again."
            },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { error: message || "Failed to analyze repository" },
          { status: 500 }
        );
      }
    }

    // Existing owner/repo-based, full AI analysis (for deep repo page)
    const { owner, repo } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing repository URL or owner/repo" },
        { status: 400 }
      );
    }

    const [meta, langs, tree] = await Promise.all([
      fetchRepoMetadata(owner, repo),
      fetchLanguages(owner, repo),
      fetchRepoTree(owner, repo)
    ]);

    const techStack = langs.length ? langs : ["Unknown"];

    const { nodes, edges } = deriveArchitectureFromTree(tree);

    const samplePaths: string[] = [];
    const collectSample = (node: any, depth = 0) => {
      if (samplePaths.length > 40 || depth > 6) return;
      samplePaths.push(node.path || ".");
      node.children?.forEach((child: any) => collectSample(child, depth + 1));
    };
    tree.forEach((n) => collectSample(n));

    const claude = await analyzeRepoWithClaude({
      repoName: `${meta.owner}/${meta.name}`,
      description: meta.description,
      techStack,
      fileTreeSample: samplePaths.join("\n")
    });

    return NextResponse.json({
      repo: meta,
      techStack,
      summary: claude.summary,
      explanation: claude.explanation,
      learningPath: claude.learningPath,
      fileTree: tree,
      architecture: { nodes, edges }
    });
  } catch (error) {
    console.error("Repo analysis error", error);
    return NextResponse.json(
      { error: "Failed to analyze repository" },
      { status: 500 }
    );
  }
}

