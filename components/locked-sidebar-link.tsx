"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, X, Crown } from "lucide-react";

/**
 * Link da barra lateral para conteúdo exclusivo de assinantes.
 * Para conta sem acesso premium: mostra cadeado e, ao clicar, NÃO navega —
 * abre um popup explicando que é conteúdo de assinantes, com botão que
 * leva à página de assinatura.
 */
export function LockedSidebarLink({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-dim/70 transition-colors hover:bg-white/5 hover:text-dim"
      >
        <span className="opacity-70">{icon}</span>
        <span className="flex-1">{label}</span>
        <Lock className="h-3.5 w-3.5 shrink-0 text-dim/60" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-5"
          style={{ background: "rgba(8,11,18,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card relative w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-dim hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <Crown className="h-7 w-7 text-accent" />
            </div>
            <h2 className="mt-4 font-display text-xl font-black">Members only</h2>
            <p className="mt-2 text-sm text-dim">
              <span className="text-white">{label}</span> is part of the Premium
              plan. Subscribe to unlock the full course, the forum, messages and
              the whole community.
            </p>

            <Link
              href="/subscription"
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-ink-950 shadow-glow-sm transition-shadow hover:shadow-glow"
            >
              <Crown className="h-4 w-4" /> See subscription plans
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full py-2 font-mono text-xs text-dim hover:text-white"
            >
              not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
