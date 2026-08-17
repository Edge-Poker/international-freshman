"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, CreditCard, Banknote, Gavel, LifeBuoy, ScrollText,
} from "lucide-react";

const ITENS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Assinaturas", icon: CreditCard },
  { href: "/admin/finance", label: "Financeiro", icon: Banknote },
  { href: "/admin/moderation", label: "Moderation", icon: Gavel },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
] as const;

/** Navegação entre as áreas do painel, no padrão de pills da plataforma. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-wrap gap-2">
      {ITENS.map(({ href, label, icon: Icon, ...i }) => {
        const ativo = "exact" in i && i.exact
          ? pathname === href
          : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs transition-all",
              ativo
                ? "border-accent/60 bg-accent/10 text-accent shadow-glow-sm"
                : "border-white/10 text-dim hover:border-accent/40 hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
