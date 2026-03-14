/** API response shape from POST /api/analyze when called with { url } */
export interface AnalyzeResult {
  owner: string;
  repo: string;
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
  fileTree: string[];
  techStack: string[];
  summary: string;
  explanation: string;
  learningPath: string[];
}
