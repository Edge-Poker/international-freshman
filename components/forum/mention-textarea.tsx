"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Sugestao { nickname: string }

/**
 * Textarea com autocomplete de menções: ao digitar @alguma-coisa,
 * sugere nicknames existentes; clicar (ou Enter) insere a menção.
 * A validação final acontece no servidor: menções a nicks
 * inexistentes simplesmente não geram notificação.
 */
export function MentionTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const supabase = createClient();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [busca, setBusca] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(0);

  useEffect(() => {
    if (busca === null) { setSugestoes([]); return; }
    let vivo = true;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nickname")
        .not("nickname", "is", null)
        .ilike("nickname", `${busca}%`)
        .limit(5);
      if (vivo) { setSugestoes((data ?? []) as Sugestao[]); setAtivo(0); }
    }, 200);
    return () => { vivo = false; clearTimeout(t); };
  }, [busca, supabase]);

  function detectar(texto: string, caret: number) {
    const antes = texto.slice(0, caret);
    const m = antes.match(/@([a-zA-Z0-9_]{1,20})$/);
    setBusca(m ? m[1] : null);
  }

  function inserir(nick: string) {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const antes = value.slice(0, caret).replace(/@([a-zA-Z0-9_]{1,20})$/, `@${nick} `);
    const depois = value.slice(caret);
    onChange(antes + depois);
    setBusca(null);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = antes.length;
    });
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          detectar(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          if (sugestoes.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => (a + 1) % sugestoes.length); }
          if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => (a - 1 + sugestoes.length) % sugestoes.length); }
          if (e.key === "Enter" && busca !== null) { e.preventDefault(); inserir(sugestoes[ativo].nickname); }
          if (e.key === "Escape") setBusca(null);
        }}
        onClick={(e) => detectar(value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setBusca(null), 150)}
      />
      {sugestoes.length > 0 && (
        <ul className="glass absolute z-20 mt-1 w-56 overflow-hidden rounded-xl">
          {sugestoes.map((s, i) => (
            <li key={s.nickname}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); inserir(s.nickname); }}
                className={`block w-full px-3 py-2 text-left font-mono text-sm ${
                  i === ativo ? "bg-accent/15 text-accent" : "text-dim hover:bg-white/5"
                }`}
              >
                @{s.nickname}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
