import { allChapters } from "@/content/course";

export const TOTAL_AULAS = allChapters.length;

export interface AuthorLike {
  nickname?: string | null;
  name?: string | null;
  chapters_done?: number | null;
  rank_parts?: number | null;
  is_admin?: boolean | null;
}

/** Nome exibido: @nickname > nome > "jogador". O @ marca nick autentico. */
export function displayName(a?: AuthorLike | null) {
  const nick = a?.nickname?.trim();
  if (nick) return `@${nick}`;
  return a?.name?.trim() || "jogador";
}

export function coursePct(a?: AuthorLike | null) {
  const done = a?.chapters_done ?? 0;
  return Math.min(100, Math.round((done / TOTAL_AULAS) * 100));
}

/** Ex.: "PedroPro - 78%" */
export function nameWithPct(a?: AuthorLike | null) {
  return `${displayName(a)} - ${coursePct(a)}%`;
}

/** Data curta pt-BR: "21/07/2026". Aceita null com fallback "—". */
export function formatDateShort(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/** Data e hora pt-BR: "21/07/2026 14:32". */
export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${formatDateShort(iso)} ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  })}`;
}

/** Tempo relativo curto: "agora", "5 min", "3 h", "2 d". */
export function timeAgoShort(iso?: string | null) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d`;
  return formatDateShort(iso);
}

/**
 * Moeda exibida na interface. Ponto UNICO de troca: mude estas duas
 * constantes e todo preco (planos, historico, painel financeiro) segue.
 *
 * ATENCAO: isto controla apenas a EXIBICAO. O gateway integrado
 * (Mercado Pago, lib/mercadopago.ts) cobra na moeda da conta —
 * tipicamente BRL. Antes de vender para fora do Brasil, alinhe os dois
 * ou troque o gateway (ver README).
 */
export const CURRENCY = "USD";
export const CURRENCY_LOCALE = "en-US";

/** Preco a partir de centavos: "$9.90", "$49.90", "$79.90". */
export function formatMoney(cents: number) {
  const value = cents / 100;
  return value.toLocaleString(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}
