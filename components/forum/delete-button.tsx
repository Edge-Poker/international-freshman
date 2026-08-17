"use client";

import { useState, useTransition } from "react";
import { deleteTopic, deleteReply } from "@/actions/forum";
import { Trash2 } from "lucide-react";

/**
 * Apagar postagem (pergunta ou resposta). Dois cliques: o primeiro
 * pede confirmacao, o segundo apaga. Só aparece pro autor.
 */
export function DeleteButton({
  kind,
  id,
  topicId,
}: {
  kind: "topic" | "post";
  id: number;
  topicId: number;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function click() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 4000);
      return;
    }
    start(async () => {
      if (kind === "topic") await deleteTopic(id);
      else await deleteReply(id, topicId);
    });
  }

  return (
    <button
      onClick={click}
      disabled={pending}
      aria-label="Delete post"
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-xs transition-colors ${
        confirm ? "bg-danger text-white" : "text-dim hover:text-danger"
      }`}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting..." : confirm ? "Confirm?" : "Delete"}
    </button>
  );
}
