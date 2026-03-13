import type { ArchitectureEdge, ArchitectureNode, FileNode, RepoMetadata } from "@/types/repo";
import { GITHUB_API_BASE } from "./github-api-constants";

function getAuthHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

// Simple in-memory caches per server instance to reduce duplicate GitHub calls
const metadataCache = new Map<string, Promise<RepoMetadata>>();
const languagesCache = new Map<string, Promise<string[]>>();
const treeCache = new Map<string, Promise<FileNode[]>>();

export async function fetchRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
  const key = `${owner}/${repo}`;
  const cached = metadataCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...getAuthHeaders()
      },
      next: { revalidate: 60 }
    });

    if (!res.ok) {
      throw new Error(`GitHub repo fetch failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as any;

    return {
      owner: json.owner?.login ?? owner,
      name: json.name ?? repo,
      description: json.description ?? null,
      stars: json.stargazers_count ?? 0,
      language: json.language ?? null,
      topics: Array.isArray(json.topics) ? json.topics : [],
      url: json.html_url ?? `https://github.com/${owner}/${repo}`
    };
  })();

  metadataCache.set(key, promise);
  return promise;
}

export async function fetchLanguages(owner: string, repo: string): Promise<string[]> {
  const key = `${owner}/${repo}`;
  const cached = languagesCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...getAuthHeaders()
      },
      next: { revalidate: 300 }
    });

    if (!res.ok) return [];
    const json = (await res.json()) as Record<string, number>;
    return Object.keys(json);
  })();

  languagesCache.set(key, promise);
  return promise;
}

export interface GithubTreeItem {
  path: string;
  type: "blob" | "tree";
}

export async function fetchRepoTree(owner: string, repo: string): Promise<FileNode[]> {
  const key = `${owner}/${repo}`;
  const cached = treeCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const res = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          ...getAuthHeaders()
        },
        next: { revalidate: 300 }
      }
    );

    if (!res.ok) {
      return [];
    }

    const json = (await res.json()) as { tree?: GithubTreeItem[] };
    const tree = json.tree ?? [];

    const root: FileNode = { path: "", type: "dir", children: [] };

    for (const item of tree) {
      const segments = item.path.split("/");
      let current = root;

      for (let i = 0; i < segments.length; i++) {
        const part = segments[i]!;
        if (!current.children) current.children = [];

        const isLast = i === segments.length - 1;

        const existing = current.children.find(
          (c) => c.path === (current.path ? `${current.path}/${part}` : part)
        );

        if (existing) {
          current = existing;
        } else {
          const node: FileNode = {
            path: current.path ? `${current.path}/${part}` : part,
            type: isLast && item.type === "blob" ? "file" : "dir",
            children: isLast && item.type === "blob" ? undefined : []
          };

          current.children.push(node);
          current = node;
        }
      }
    }

    return root.children ?? [];
  })();

  treeCache.set(key, promise);
  return promise;
}

export function deriveArchitectureFromTree(tree: FileNode[]): {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
} {
  const nodes: ArchitectureNode[] = [];
  const edges: ArchitectureEdge[] = [];

  const addNode = (id: string, label: string) => {
    if (!nodes.find((n) => n.id === id)) {
      nodes.push({ id, label });
    }
  };

  const traverse = (node: FileNode) => {
    const name = node.path.split("/").pop() ?? node.path;
    const id = node.path || name;

    if (node.type === "dir") {
      addNode(id, name + "/");

      node.children?.forEach((child) => {
        const childId = child.path;
        const childName = child.path.split("/").pop() ?? child.path;

        addNode(childId, childName + (child.type === "dir" ? "/" : ""));

        edges.push({
          id: `${id}->${childId}`,
          source: id,
          target: childId
        });

        traverse(child);
      });
    } else {
      addNode(id, name);
    }
  };

  tree.forEach(traverse);

  return { nodes, edges };
}