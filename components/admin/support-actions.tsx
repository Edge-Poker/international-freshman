"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSupportAnswered } from "@/actions/support";
import { Check, Undo2 } from "lucide-react";

/** Marca uma mensagem de suporte como respondida (ou reabre). */
export function SupportAnswerButton({
  id,
  answered,
}: {
  id: number;
  answered: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setSupportAnswered(id, !answered);
          router.refresh();
        })
      }
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs transition-colors ${
        answered
          ? "border-white/10 text-dim hover:border-white/25 hover:text-white"
          : "border-accent/40 text-accent hover:bg-accent/10"
      }`}
    >
      {answered ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
      {pending ? "..." : answered ? "Reabrir" : "Mark as answered"}
    </button>
  );
}
