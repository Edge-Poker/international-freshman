"use client";

import { useState, useTransition } from "react";
import { pinTopic, type PinOption } from "@/actions/forum";
import { Pin, PinOff } from "lucide-react";

const OPCOES: { value: PinOption; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "1w", label: "1 week" },
  { value: "forever", label: "Indefinite" },
];

/** Controle de fixar tópico, visível apenas para admins. */
export function PinControl({
  topicId,
  isPinned,
}: {
  topicId: number;
  isPinned: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apply(option: PinOption) {
    setError(null);
    start(async () => {
      const res = await pinTopic(topicId, option);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="card mt-4 flex flex-wrap items-center gap-2 p-3">
      <span className="mr-1 flex items-center gap-1.5 font-mono text-xs text-dim">
        <Pin className="h-3.5 w-3.5 text-accent" /> Fixar no topo:
      </span>
      {OPCOES.map((o) => (
        <button
          key={o.value}
          disabled={pending}
          onClick={() => apply(o.value)}
          className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-dim transition-colors hover:border-accent/60 hover:text-accent"
        >
          {o.label}
        </button>
      ))}
      {isPinned && (
        <button
          disabled={pending}
          onClick={() => apply("unpin")}
          className="flex items-center gap-1 rounded-full border border-danger/40 px-3 py-1 font-mono text-xs text-danger transition-colors hover:bg-danger/10"
        >
          <PinOff className="h-3 w-3" /> Desafixar
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
