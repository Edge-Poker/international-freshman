import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rank do usuario em ano academico, pela quantidade de partes
 * consecutivas do curso concluidas (profiles.rank_parts):
 *   0 -> Freshman    (ainda na Parte I)
 *   1 -> Sophomore   (Parte I concluida)
 *   2 -> Junior      (Partes I e II)
 *   3 -> Senior      (Partes I, II e III)
 *   4 -> Graduate    (curso inteiro — ganha o capelo e o brilho)
 *
 * Substitui o rank em cartas de baralho do projeto de origem. A API
 * (`rank`, `size`) e a coluna rank_parts continuam iguais, entao todos
 * os pontos de uso seguem funcionando sem alteracao.
 */
const TIERS = [
  { short: "FR", full: "Freshman", cls: "border-white/15 bg-white/5 text-dim" },
  { short: "SO", full: "Sophomore", cls: "border-accent-dim/40 bg-accent-dim/10 text-accent-dim" },
  { short: "JR", full: "Junior", cls: "border-accent/40 bg-accent/10 text-accent" },
  { short: "SR", full: "Senior", cls: "border-gold/40 bg-gold/10 text-gold" },
  { short: "GR", full: "Graduate", cls: "border-gold/60 bg-gold/15 text-gold shadow-glow-sm" },
] as const;

const LABELS = [
  "Freshman: has not finished Part I yet",
  "Sophomore: finished Part I",
  "Junior: finished Parts I and II",
  "Senior: finished Parts I, II and III",
  "Graduate: finished the entire course",
];

export function RankBadge({
  rank,
  size = "md",
}: {
  rank: number | null | undefined;
  size?: "sm" | "md";
}) {
  const r = Math.min(Math.max(rank ?? 0, 0), 4);
  const tier = TIERS[r];
  const grad = r === 4;

  return (
    <span
      title={LABELS[r]}
      aria-label={LABELS[r]}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border font-mono font-bold uppercase leading-none tracking-wider",
        tier.cls,
        size === "sm" ? "px-1.5 py-1 text-[9px]" : "px-2.5 py-1.5 text-[11px]"
      )}
    >
      {grad && <GraduationCap className={size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} />}
      {size === "sm" ? tier.short : tier.full}
    </span>
  );
}
