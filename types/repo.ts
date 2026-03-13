export interface RepoMetadata {
  owner: string;
  name: string;
  description: string | null;
  stars: number;
  language?: string | null;
  topics?: string[];
  url: string;
}

export interface FileNode {
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

export interface ArchitectureNode {
  id: string;
  label: string;
  group?: string;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface RepoAnalysis {
  repo: RepoMetadata;
  techStack: string[];
  summary: string;
  explanation: string;
  learningPath: string[];
  fileTree: FileNode[];
  architecture: {
    nodes: ArchitectureNode[];
    edges: ArchitectureEdge[];
  };
}

