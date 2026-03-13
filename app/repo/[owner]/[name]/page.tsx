import RepoAnalysisShell from "@/components/repo/RepoAnalysisShell";

interface RepoPageProps {
  params: { owner: string; name: string };
}

export default function RepoPage({ params }: RepoPageProps) {
  const { owner, name } = params;
  return <RepoAnalysisShell owner={owner} name={name} />;
}

