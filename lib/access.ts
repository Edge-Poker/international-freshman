/**
 * Access service — ponto ÚNICO de decisão de acesso.
 *
 * Nenhuma regra de "pode ver isto?" deve ficar espalhada por componentes:
 * tudo passa por aqui. Combina assinatura (via lib/subscriptions), o
 * gancho `is_free` do conteúdo e as travas de curso/prova já existentes.
 *
 * Esta etapa (infra) NÃO bloqueia páginas nem muda UI — apenas fornece as
 * funções que as próximas etapas usarão para aplicar o gating.
 *
 * Regra de produto (padrão): conteúdo com `isFree` é aberto a todos; o
 * restante exige assinatura ativa (mensal/anual dentro da vigência) ou
 * acesso vitalício. Admin tem acesso pleno.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, getCurrentPlan } from "@/lib/subscriptions";
import { curso, allChapters } from "@/content/course";
import type { AccessResult, SubscriptionPlan } from "@/types/subscription";

type DB = Awaited<ReturnType<typeof createClient>>;

async function db(client?: DB): Promise<DB> {
  return client ?? (await createClient());
}

async function currentUserId(supabase: DB): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Plano vigente do usuário (cache profiles.plan). */
export async function currentPlan(
  userId?: string,
  client?: DB
): Promise<SubscriptionPlan> {
  return getCurrentPlan(userId, await db(client));
}

/** Tem assinatura que concede acesso agora (mensal/anual vigente ou vitalícia)? */
export async function hasActiveSubscription(
  userId?: string,
  client?: DB
): Promise<boolean> {
  const sub = await getSubscription(userId, await db(client));
  return sub !== null;
}

/** Acesso vitalício (plano lifetime ativo). */
export async function hasLifetimeAccess(
  userId?: string,
  client?: DB
): Promise<boolean> {
  const sub = await getSubscription(userId, await db(client));
  return sub?.plan?.interval === "lifetime";
}

/** Dias restantes da vigência atual; null se vitalício ou sem assinatura. */
export async function daysRemaining(
  userId?: string,
  client?: DB
): Promise<number | null> {
  const sub = await getSubscription(userId, await db(client));
  if (!sub || sub.plan?.interval === "lifetime") return null;
  const fim = sub.current_period_end ?? sub.ends_at;
  if (!fim) return null;
  const ms = new Date(fim).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** É admin? (acesso pleno a conteúdo premium.) */
async function isAdmin(supabase: DB, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return Boolean(data?.is_admin);
}

/** O capítulo (por slug) é gratuito? Lê o gancho isFree do conteúdo. */
export function isFreeChapter(chapterSlug: string): boolean {
  const c = allChapters.find((x) => x.slug === chapterSlug);
  return Boolean(c?.isFree);
}

/** Acesso geral a conteúdo premium (sem olhar um capítulo específico). */
export async function canAccessPremiumContent(
  userId?: string,
  client?: DB
): Promise<AccessResult> {
  const supabase = await db(client);
  const uid = userId ?? (await currentUserId(supabase));
  if (!uid) return { allowed: false, reason: "not_authenticated", plan: "free" };

  if (await isAdmin(supabase, uid)) {
    return { allowed: true, reason: "active_subscription", plan: await getCurrentPlan(uid, supabase) };
  }
  const sub = await getSubscription(uid, supabase);
  const plan = await getCurrentPlan(uid, supabase);
  if (!sub) return { allowed: false, reason: "no_subscription", plan };
  if (sub.plan?.interval === "lifetime")
    return { allowed: true, reason: "lifetime", plan };
  return { allowed: true, reason: "active_subscription", plan };
}

/**
 * Pode acessar um capítulo específico?
 * Livre => sempre; caso contrário exige acesso premium.
 * (A trava por parte/prova é tratada em canAccessPart/canAccessExam e no
 * fluxo já existente do curso — aqui cuidamos da dimensão de assinatura.)
 */
export async function canAccessChapter(
  chapterSlug: string,
  userId?: string,
  client?: DB
): Promise<AccessResult> {
  const supabase = await db(client);
  const plan = await getCurrentPlan(userId, supabase);
  if (isFreeChapter(chapterSlug)) {
    return { allowed: true, reason: "free_chapter", plan };
  }
  return canAccessPremiumContent(userId, supabase);
}

/**
 * Pode acessar uma parte (1..4)?
 * Se todos os capítulos da parte forem livres, libera; senão, exige premium.
 */
export async function canAccessPart(
  part: number,
  userId?: string,
  client?: DB
): Promise<AccessResult> {
  const supabase = await db(client);
  const plan = await getCurrentPlan(userId, supabase);
  const parte = curso[part - 1];
  if (parte && parte.chapters.every((c) => c.isFree)) {
    return { allowed: true, reason: "free_chapter", plan };
  }
  return canAccessPremiumContent(userId, supabase);
}

/**
 * Pode fazer a prova de uma parte? (dimensão de assinatura)
 * A elegibilidade por aulas concluídas / prova anterior continua no
 * fluxo de provas (actions/exams.ts); aqui só a régua de premium.
 */
export async function canAccessExam(
  part: number,
  userId?: string,
  client?: DB
): Promise<AccessResult> {
  return canAccessPart(part, userId, await db(client));
}
