const STORAGE_KEY = "repoinsight-recent-repos";
const MAX_RECENT = 10;

export interface RecentRepo {
  owner: string;
  repo: string;
  name?: string;
  addedAt: number;
}

function getStored(): RecentRepo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentRepo =>
        item != null &&
        typeof item === "object" &&
        typeof (item as RecentRepo).owner === "string" &&
        typeof (item as RecentRepo).repo === "string"
    );
  } catch {
    return [];
  }
}

function setStored(items: RecentRepo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Add a repository to recent list. Dedupes by owner/repo (moves to top), limits to MAX_RECENT.
 */
export function addRecentRepo(owner: string, repo: string, name?: string): void {
  const items = getStored();
  const key = `${owner}/${repo}`.toLowerCase();
  const filtered = items.filter(
    (r) => `${r.owner}/${r.repo}`.toLowerCase() !== key
  );
  const updated: RecentRepo[] = [
    { owner, repo, name: name ?? repo, addedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT);
  setStored(updated);
}

/**
 * Get recent repositories, most recent first.
 */
export function getRecentRepos(): RecentRepo[] {
  return getStored();
}
