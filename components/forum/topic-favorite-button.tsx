"use client";

import { useState, useTransition } from "react";
import { toggleTopicFavorite } from "@/actions/forum";
import { Star } from "lucide-react";

export function TopicFavoriteButton({
  topicId,
  initialFavorited,
}: {
  topicId: number;
  initialFavorited: boolean;
}) {
  const [fav, setFav] = useState(initialFavorited);
  const [pending, start] = useTransition();

  return (
    <button
      aria-label={fav ? "Remove from saved" : "Save post"}
      title={fav ? "Remove from saved" : "Save post"}
      disabled={pending}
      onClick={() => {
        setFav((f) => !f);
        start(async () => {
          const res = await toggleTopicFavorite(topicId);
          if (res?.error) setFav((f) => !f);
        });
      }}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
        fav
          ? "border-gold/60 text-gold"
          : "border-white/10 text-dim hover:border-gold/50 hover:text-gold"
      }`}
    >
      <Star className="h-4 w-4" fill={fav ? "currentColor" : "none"} />
    </button>
  );
}
