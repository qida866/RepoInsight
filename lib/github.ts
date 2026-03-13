import type { ArchitectureEdge, ArchitectureNode, FileNode, RepoMetadata } from "@/types/repo";

const GITHUB_API_BASE = "https://api.github.com";

function getAuthHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

export async function fetchRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
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
}

export async function fetchLanguages(owner: string, repo: string): Promise<string[]> {
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
}

export interface GithubTreeItem {
  path: string;
  type: "blob" | "tree";
}

export async function fetchRepoTree(owner: string, repo: string): Promise<FileNode[]> {
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
      const existing = current.children.find((c) => c.path === (current.path ? `${current.path}/${part}` : part));
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

