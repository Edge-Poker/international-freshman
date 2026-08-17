"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Resultado = { ok?: boolean; error?: string } | void;

/**
 * Botão de ação administrativa com confirmação obrigatória, no
 * mesmo padrão de duplo clique do BanButton/SilenceButton: o
 * primeiro clique arma ("Click again to confirm") por 4s,
 * o segundo executa a server action.
 */
export function ConfirmActionButton({
  label,
  confirmLabel = "Click again to confirm",
  pendingLabel = "Aplicando...",
  icon,
  action,
  variant = "ghost",
  className,
  onDone,
}: {
  label: string;
  confirmLabel?: string;
  pendingLabel?: string;
  icon?: React.ReactNode;
  action: () => Promise<Resultado>;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  onDone?: () => void;
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
    setConfirm(false);
    setError(null);
    start(async () => {
      const res = await action();
      if (res && "error" in res && res.error) setError(res.error);
      else onDone?.();
    });
  }

  return (
    <div className={cn("min-w-0", className)}>
      <Button
        type="button"
        variant={confirm && variant === "ghost" ? "danger" : variant}
        disabled={pending}
        onClick={click}
        className="w-full justify-start text-left"
      >
        {icon}
        <span className="truncate">
          {pending ? pendingLabel : confirm ? confirmLabel : label}
        </span>
      </Button>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
