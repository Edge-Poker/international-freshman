import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Renderiza um texto do fórum transformando @nickname em link para o
 * perfil — mas SÓ quando o nickname existe. Nicks inexistentes ficam
 * como texto puro (a especificação: "caso o usuário não exista, não
 * criar link").
 *
 * Server component: resolve os nicks citados numa única consulta e
 * preserva as quebras de linha do original (whitespace-pre-wrap no
 * container do chamador). O destaque visual e a animação de hover
 * vivem na classe .mention (globals.css).
 */
const MENTION_RE = /@([a-zA-Z0-9_]{3,20})/g;

export async function MentionText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const nicks = Array.from(
    new Set((text.match(MENTION_RE) ?? []).map((m) => m.slice(1).toLowerCase()))
  );

  // resolve quais nicks existem (uma query só); mapa lower -> nick real
  const existentes = new Map<string, string>();
  if (nicks.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("nickname")
      .not("nickname", "is", null)
      .in("nickname", nicks);
    for (const row of (data ?? []) as { nickname: string }[]) {
      existentes.set(row.nickname.toLowerCase(), row.nickname);
    }
  }

  // fragmenta o texto alternando trechos comuns e menções
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(MENTION_RE)) {
    const start = match.index ?? 0;
    const nick = match[1];
    const real = existentes.get(nick.toLowerCase());
    if (start > last) parts.push(text.slice(last, start));
    if (real) {
      parts.push(
        <Link key={key++} href={`/u/${real}`} className="mention" title={`Ver @${real}`}>
          @{match[1]}
        </Link>
      );
    } else {
      parts.push(match[0]); // nick inexistente: texto puro, sem link
    }
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <p className={className}>{parts}</p>;
}
