const STORAGE_KEY = "repoinsight-starred-repos";

export interface StarredRepo {
  owner: string;
  repo: string;
  name?: string;
  starredAt: number;
}

function getStored(): StarredRepo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StarredRepo =>
        item != null &&
        typeof item === "object" &&
        typeof (item as StarredRepo).owner === "string" &&
        typeof (item as StarredRepo).repo === "string"
    );
  } catch {
    return [];
  }
}

function setStored(items: StarredRepo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function key(owner: string, repo: string): string {
  return `${owner}/${repo}`.toLowerCase();
}

export function isStarred(owner: string, repo: string): boolean {
  const items = getStored();
  const k = key(owner, repo);
  return items.some((r) => key(r.owner, r.repo) === k);
}

export function addStarredRepo(owner: string, repo: string, name?: string): void {
  const items = getStored();
  const k = key(owner, repo);
  if (items.some((r) => key(r.owner, r.repo) === k)) return;
  setStored([
    ...items,
    { owner, repo, name: name ?? repo, starredAt: Date.now() },
  ]);
}

export function removeStarredRepo(owner: string, repo: string): void {
  const items = getStored();
  const k = key(owner, repo);
  setStored(items.filter((r) => key(r.owner, r.repo) !== k));
}

export function getStarredRepos(): StarredRepo[] {
  return getStored();
}

export function toggleStarredRepo(
  owner: string,
  repo: string,
  name?: string
): boolean {
  if (isStarred(owner, repo)) {
    removeStarredRepo(owner, repo);
    return false;
  }
  addStarredRepo(owner, repo, name);
  return true;
}
