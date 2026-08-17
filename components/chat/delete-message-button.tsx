"use client";

import { useState, useTransition } from "react";
import { deleteMessage } from "@/actions/chat";
import { Trash2 } from "lucide-react";

/** Apagar a própria mensagem (até 24h). Dois cliques: confirma e apaga. */
export function DeleteMessageButton({
  messageId,
  conversationId,
}: {
  messageId: number;
  conversationId: number;
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function click() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 4000);
      return;
    }
    start(async () => {
      const res = await deleteMessage(messageId, conversationId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={click}
        disabled={pending}
        aria-label="Delete message"
        title="Delete (up to 24h after sending)"
        className={`inline-flex items-center gap-1 rounded px-1 font-mono text-[10px] transition-colors ${
          confirm ? "bg-danger text-white" : "text-dim hover:text-danger"
        }`}
      >
        <Trash2 className="h-3 w-3" />
        {pending ? "..." : confirm ? "confirm?" : "apagar"}
      </button>
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </span>
  );
}
