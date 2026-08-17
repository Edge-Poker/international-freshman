import Link from "next/link";
import { nameWithPct, type AuthorLike } from "@/lib/format";
import { RankBadge } from "@/components/profile/rank-badge";
import { VerifiedBadge } from "@/components/verified-badge";

/**
 * Chip do usuário: @nick com a % do curso e a carta de rank.
 * Com nickname, vira um botao clicavel para o perfil, com destaque
 * visual e animacao de hover (borda e glow accent, leve subida).
 */
export function UserLink({ author }: { author?: AuthorLike | null }) {
  const label = nameWithPct(author);

  if (author?.nickname) {
    return (
      <Link
        href={`/u/${author.nickname}`}
        title={`Ver o perfil de @${author.nickname}`}
        className="group inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/5 py-1 pl-2.5 pr-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/70 hover:bg-accent/10 hover:shadow-glow-sm"
      >
        <span className="font-mono text-xs font-semibold text-accent transition-colors group-hover:brightness-125">
          {label}
        </span>
        {author?.is_admin && <VerifiedBadge />}
        <span className="transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3">
          <RankBadge rank={author?.rank_parts} size="sm" />
        </span>
      </Link>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-2.5 pr-1.5">
      <span className="font-mono text-xs text-dim">{label}</span>
      {author?.is_admin && <VerifiedBadge />}
      <RankBadge rank={author?.rank_parts} size="sm" />
    </span>
  );
}
