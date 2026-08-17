"use client";

import { useState, useTransition } from "react";
import { setBan } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { ShieldBan, ShieldCheck } from "lucide-react";

/** Banir/desbanir conta, visível apenas para admins no perfil alheio. */
export function BanButton({
  userId,
  isBanned,
}: {
  userId: string;
  isBanned: boolean;
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
      const res = await setBan(userId, !isBanned);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <Button variant={isBanned ? "ghost" : "danger"} disabled={pending} onClick={click}>
        {isBanned ? <ShieldCheck className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
        {pending
          ? "Aplicando..."
          : confirm
            ? "Click again to confirm"
            : isBanned
              ? "Remover banimento"
              : "Ban account"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
