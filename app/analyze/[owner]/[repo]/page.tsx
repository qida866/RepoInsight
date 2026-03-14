import AnalyzePageClient from "@/components/analyze/AnalyzePageClient";

interface AnalyzePageProps {
  params: { owner: string; repo: string };
}

/**
 * Dynamic analyze page: /analyze/[owner]/[repo]
 * Reads params, auto-starts analysis with GitHub URL, shows loading then RepoAnalysisDashboard.
 */
export default function AnalyzePage({ params }: AnalyzePageProps) {
  const { owner, repo } = params;
  return <AnalyzePageClient owner={owner} repo={repo} />;
}
