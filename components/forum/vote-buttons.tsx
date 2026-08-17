"use client";

import { useState, useTransition } from "react";
import { castVote } from "@/actions/forum";
import type { VoteTarget, VoteValue } from "@/types/forum";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Like / dislike com atualizacao otimista. Um voto por usuário:
 * clicar de novo no mesmo desfaz; clicar no oposto troca.
 */
export function VoteButtons({
  target,
  id,
  initialScore,
  initialVote,
  layout = "vertical",
}: {
  target: VoteTarget;
  id: number;
  initialScore: number;
  initialVote: VoteValue;
  layout?: "vertical" | "horizontal";
}) {
  const [score, setScore] = useState(initialScore);
  const [vote, setVote] = useState<VoteValue>(initialVote);
  const [pending, start] = useTransition();

  function click(v: 1 | -1) {
    const wasVote = vote;
    const nextVote: VoteValue = wasVote === v ? 0 : v;
    setScore((s) => s - wasVote + nextVote);
    setVote(nextVote);
    start(async () => {
      const res = await castVote(target, id, v);
      if ("error" in res && res.error) {
        setScore((s) => s + wasVote - nextVote);
        setVote(wasVote);
      } else if ("score" in res && res.score != null) {
        setScore(res.score);
      }
    });
  }

  const vertical = layout === "vertical";
  return (
    <div className={cn("flex items-center gap-1", vertical ? "flex-col" : "flex-row")}>
      <button
        aria-label="Upvote"
        title={vote === 1 ? "Click again to remove your upvote" : "Upvote"}
        disabled={pending}
        onClick={() => click(1)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          vote === 1 ? "bg-accent/15 text-accent" : "text-dim hover:text-accent"
        )}
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <span className={cn("min-w-6 text-center font-mono text-sm font-semibold",
        vote === 1 ? "text-accent" : vote === -1 ? "text-danger" : "text-white")}>
        {score}
      </span>
      <button
        aria-label="Downvote"
        title={vote === -1 ? "Click again to remove your downvote" : "Downvote"}
        disabled={pending}
        onClick={() => click(-1)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          vote === -1 ? "bg-danger/15 text-danger" : "text-dim hover:text-danger"
        )}
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}
