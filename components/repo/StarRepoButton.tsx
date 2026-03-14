"use client";

import { useState, useEffect } from "react";
import {
  isStarred,
  toggleStarredRepo,
} from "@/lib/starredRepos";

interface StarRepoButtonProps {
  owner: string;
  repo: string;
  name?: string;
  className?: string;
}

export default function StarRepoButton({
  owner,
  repo,
  name,
  className = "",
}: StarRepoButtonProps) {
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    setStarred(isStarred(owner, repo));
  }, [owner, repo]);

  const handleClick = () => {
    const next = toggleStarredRepo(owner, repo, name);
    setStarred(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ||
        "inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[10px] font-medium transition-colors hover:border-slate-600 hover:bg-slate-700/80 " +
        (starred
          ? "text-amber-400 border-amber-700/60 bg-amber-950/30 hover:bg-amber-950/50"
          : "text-slate-200 hover:text-slate-100")
      }
      title={starred ? "Unsave repository" : "Save repository"}
    >
      <span aria-hidden>{starred ? "★" : "☆"}</span>
      {starred ? "Saved" : "Save"}
    </button>
  );
}
