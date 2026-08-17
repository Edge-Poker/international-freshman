"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, ShieldCheck, Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/nav-items";
import { UnreadBadge } from "@/components/chat/unread-badge";
import { NotifBadge } from "@/components/notif-badge";
import { BrandLogo } from "@/components/brand-logo";
import { RankBadge } from "@/components/profile/rank-badge";

/**
 * Navegação para telas pequenas: barra fixa no topo com botão de menu
 * e uma gaveta lateral com os mesmos itens da barra lateral do desktop
 * (fonte única em components/nav-items).
 *
 * A barra lateral do desktop fica escondida no celular; sem este menu,
 * quem entra pelo telefone ficaria sem forma de navegar.
 *
 * Contas sem assinatura veem as áreas premium com cadeado: tocar não
 * navega, abre o convite para assinar — mesma regra do desktop.
 */
export function MobileNav({
  premium,
  isAdmin,
  unread,
  notifCount,
  profileLabel,
  rank,
}: {
  premium: boolean;
  isAdmin: boolean;
  unread: number;
  notifCount: number;
  profileLabel: string;
  rank: number | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [bloqueado, setBloqueado] = useState<string | null>(null);
  const pathname = usePathname();

  // fecha a gaveta ao trocar de página
  useEffect(() => {
    setAberto(false);
    setBloqueado(null);
  }, [pathname]);

  // trava o scroll do fundo enquanto a gaveta está aberta
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [aberto]);

  return (
    <>
      {/* barra superior — so no celular */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/5 bg-ink-900/95 px-4 backdrop-blur md:hidden">
        <BrandLogo size="sm" href="/dashboard" />
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={aberto}
          onClick={() => setAberto(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-dim transition-colors hover:border-accent/40 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* gaveta */}
      {aberto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setAberto(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col border-l border-white/10 bg-ink-900 p-5">
            <div className="flex items-center justify-between">
              <BrandLogo size="sm" href="/dashboard" />
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setAberto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-dim hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto text-sm">
              {NAV_ITEMS.map(({ href, label, Icon, premium: exigePremium, badge }) => {
                const travado = Boolean(exigePremium) && !premium;
                const ativo = pathname === href || pathname.startsWith(`${href}/`);

                if (travado) {
                  return (
                    <button
                      key={href}
                      type="button"
                      onClick={() => setBloqueado(label)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-dim/70 transition-colors hover:bg-white/5"
                    >
                      <Icon className="h-4 w-4 opacity-70" />
                      <span className="flex-1">{label}</span>
                      <Lock className="h-3.5 w-3.5 text-dim/60" />
                    </button>
                  );
                }

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                      ativo ? "bg-white/5 text-white" : "text-dim hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{label}</span>
                    {badge === "unread" && <UnreadBadge initial={unread} />}
                    {badge === "notif" && <NotifBadge initial={notifCount} />}
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-white/5 text-white"
                      : "text-dim hover:bg-white/5 hover:text-white"
                  )}
                >
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <span className="flex-1">Admin</span>
                </Link>
              )}
            </nav>

            <Link
              href="/settings"
              className="mt-4 block rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-mono text-xs text-accent">{profileLabel}</p>
                <RankBadge rank={rank} size="sm" />
              </div>
              <p className="mt-0.5 text-[10px] text-dim">progresso do curso</p>
            </Link>

            <form action="/auth/signout" method="post" className="mt-4">
              <button className="flex items-center gap-2 text-sm text-dim hover:text-white">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </form>
          </aside>
        </div>
      )}

      {/* convite para assinar, ao tocar numa area bloqueada */}
      {bloqueado && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-5 md:hidden"
          style={{ background: "rgba(8,11,18,0.8)", backdropFilter: "blur(4px)" }}
          onClick={() => setBloqueado(null)}
        >
          <div className="card relative w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Fechar"
              onClick={() => setBloqueado(null)}
              className="absolute right-3 top-3 text-dim hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <Crown className="h-7 w-7 text-accent" />
            </div>
            <h2 className="mt-4 font-display text-xl font-black">Members only</h2>
            <p className="mt-2 text-sm text-dim">
              <span className="text-white">{bloqueado}</span> is part of the
              Premium plan.
            </p>
            <Link
              href="/subscription"
              onClick={() => { setBloqueado(null); setAberto(false); }}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-ink-950 shadow-glow-sm"
            >
              <Crown className="h-4 w-4" /> See subscription plans
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
