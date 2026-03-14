import RepoCompareView from "@/components/compare/RepoCompareView";

interface ComparePageProps {
  params: { owner1: string; repo1: string; owner2: string; repo2: string };
}

export default function ComparePage({ params }: ComparePageProps) {
  const { owner1, repo1, owner2, repo2 } = params;
  return (
    <RepoCompareView
      owner1={owner1}
      repo1={repo1}
      owner2={owner2}
      repo2={repo2}
    />
  );
}
