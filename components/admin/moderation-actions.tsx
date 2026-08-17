"use client";

import { useState, useTransition } from "react";
import { pinTopic } from "@/actions/forum";
import {
  adminDeleteComment,
  adminDeleteReply,
  adminDeleteTopic,
  resolveReport,
  toggleTopicFeatured,
  toggleTopicLock,
} from "@/actions/admin-panel";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Lock, LockOpen, Pin, PinOff, RotateCcw, Sparkles, Trash2,
} from "lucide-react";

const PILL =
  "flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs transition-colors disabled:opacity-50";

function useAcao() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok?: boolean; error?: string } | void>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
    });
  };
  return { error, pending, run };
}

/**
 * Ferramentas de moderação de um tópico: fixar/desafixar (reutiliza
 * pinTopic já existente), destacar, fechar discussão e apagar.
 */
export function ModTopicActions({
  topicId, isPinned, isFeatured, isLocked,
}: {
  topicId: number;
  isPinned: boolean;
  isFeatured: boolean;
  isLocked: boolean;
}) {
  const { error, pending, run } = useAcao();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => pinTopic(topicId, isPinned ? "unpin" : "1w"))}
        className={cn(PILL, isPinned
          ? "border-accent/60 bg-accent/10 text-accent"
          : "border-white/10 text-dim hover:border-accent/50 hover:text-accent")}
        title={isPinned ? "Unpin from top" : "Pin to top for 1 week"}
      >
        {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        {isPinned ? "Desafixar" : "Fixar 1sem"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => toggleTopicFeatured(topicId, !isFeatured))}
        className={cn(PILL, isFeatured
          ? "border-gold/60 bg-gold/10 text-gold"
          : "border-white/10 text-dim hover:border-gold/50 hover:text-gold")}
        title={isFeatured ? "Remove highlight" : "Highlight post"}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isFeatured ? "Destacado" : "Destacar"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => toggleTopicLock(topicId, !isLocked))}
        className={cn(PILL, isLocked
          ? "border-danger/50 bg-danger/10 text-danger"
          : "border-white/10 text-dim hover:border-danger/40 hover:text-danger")}
        title={isLocked ? "Reopen discussion" : "Close discussion"}
      >
        {isLocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        {isLocked ? "Reabrir" : "Fechar"}
      </button>

      <ConfirmActionButton
        label="Apagar"
        confirmLabel="Confirm deletion"
        variant="ghost"
        icon={<Trash2 className="h-3.5 w-3.5 text-danger" />}
        action={() => adminDeleteTopic(topicId)}
        className="[&_button]:rounded-full [&_button]:px-3 [&_button]:py-1 [&_button]:text-xs"
      />
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Apagar resposta de fórum ou comentário de aula. */
export function ModDeleteButton({
  id, kind,
}: { id: number; kind: "reply" | "comment" }) {
  return (
    <ConfirmActionButton
      label="Apagar"
      confirmLabel="Confirm deletion"
      variant="ghost"
      icon={<Trash2 className="h-3.5 w-3.5 text-danger" />}
      action={() => (kind === "reply" ? adminDeleteReply(id) : adminDeleteComment(id))}
      className="[&_button]:rounded-full [&_button]:px-3 [&_button]:py-1 [&_button]:text-xs"
    />
  );
}

/** Resolver ou reabrir uma denúncia. */
export function ReportResolveButton({
  reportId, resolved,
}: { reportId: number; resolved: boolean }) {
  const { error, pending, run } = useAcao();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => resolveReport(reportId, !resolved))}
        className={cn(PILL, resolved
          ? "border-white/10 text-dim hover:border-gold/50 hover:text-gold"
          : "border-accent/50 bg-accent/10 text-accent hover:shadow-glow-sm")}
      >
        {resolved
          ? <><RotateCcw className="h-3.5 w-3.5" /> Reabrir</>
          : <><CheckCircle2 className="h-3.5 w-3.5" /> Resolver</>}
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
