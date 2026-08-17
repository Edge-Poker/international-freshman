"use client";

import { useState, useTransition } from "react";
import { setSilence } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { MicOff, Mic } from "lucide-react";

/** Silenciar/dessilenciar conta — só admins veem este botão. */
export function SilenceButton({
  userId,
  isSilenced,
}: {
  userId: string;
  isSilenced: boolean;
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
    setError(null);
    start(async () => {
      const res = await setSilence(userId, !isSilenced);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <Button variant="ghost" disabled={pending} onClick={click}>
        {isSilenced ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        {pending
          ? "Aplicando..."
          : confirm
            ? "Click again to confirm"
            : isSilenced
              ? "Remover silenciamento"
              : "Silence user"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
