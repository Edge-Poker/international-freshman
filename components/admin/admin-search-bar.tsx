"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Busca do painel: mesmo padrão visual e de navegação da
 * UserSearchBar, porém genérica — mantém os filtros atuais na URL
 * e zera a paginação ao pesquisar.
 */
export function AdminSearchBar({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(valor: string) {
    const qs = new URLSearchParams(params.toString());
    qs.delete("pagina");
    if (valor) qs.set("q", valor);
    else qs.delete("q");
    router.push(qs.size ? `${pathname}?${qs}` : pathname);
  }

  function go(e: React.FormEvent) {
    e.preventDefault();
    apply(q.trim());
  }

  return (
    <form onSubmit={go} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-10 pr-9 text-sm outline-none focus:border-accent"
      />
      {q && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setQ(""); apply(""); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-dim hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
