"use client";

import { useState, useTransition } from "react";
import { setChapterStatus, toggleFavorite } from "@/actions/progress";
import type { ChapterStatus } from "@/types/course";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle2 } from "lucide-react";

export function ChapterActions({
  slug,
  status,
  favorited,
}: {
  slug: string;
  status: ChapterStatus;
  favorited: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const concluido = status === "concluido";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant={concluido ? "ghost" : "primary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await setChapterStatus(slug, concluido ? "em_andamento" : "concluido");
            if (res?.error) setError(res.error);
          })
        }
      >
        <CheckCircle2 className="h-4 w-4" />
        {concluido ? "Completed" : "Mark as completed"}
      </Button>
      <button
        aria-label={favorited ? "Remove from saved" : "Save chapter"}
        disabled={pending}
        onClick={() => start(() => void toggleFavorite(slug))}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
          favorited
            ? "border-gold/60 text-gold"
            : "border-white/10 text-dim hover:border-gold/50 hover:text-gold"
        }`}
      >
        <Star className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
      </button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
