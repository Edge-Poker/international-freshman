"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Lock, X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Modal de conteúdo bloqueado (plano Free). Elegante e no padrão da
 * plataforma: cadeado, nome do conteúdo, breve descrição, mensagem de
 * que aquilo é Premium e um botão "Ver Planos". Fecha no X, no backdrop
 * ou no Esc. Sem libs externas.
 */
export function LockedModal({
  open,
  onClose,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Premium content"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
      />
      <div className="glass relative w-full max-w-md rounded-2xl border border-accent/30 p-7 shadow-glow animate-[fadeIn_0.2s_ease]">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 text-dim transition-colors hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
          <Lock className="h-6 w-6 text-accent" />
        </span>

        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Premium content
        </p>
        <h2 className="mt-2 font-display text-2xl font-black leading-tight">{title}</h2>
        {description && <p className="mt-2 text-sm text-dim">{description}</p>}

        <p className="mt-4 text-sm text-dim">
          This content is part of the Premium plan. Subscribe to unlock the
          full course, the exams and all the material.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" className="flex-1">
            <Button className="w-full">
              <Crown className="h-4 w-4" /> See plans
            </Button>
          </Link>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
