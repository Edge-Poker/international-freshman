/**
 * Subscription service — camada única de acesso a assinaturas.
 *
 * Fonte de verdade: a tabela `subscriptions`. Leitura passa pela RLS
 * (o usuário só vê a própria). Escrita NUNCA acontece por insert/update
 * direto: usa as RPCs `security definer` da migration 0014, que são a
 * via única de mutação (chamadas futuramente pelo webhook / service role).
 *
 * Esta camada é server-side. Segue o mesmo padrão do resto do projeto
 * (createClient de @/lib/supabase/server).
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Plan,
  Subscription,
  SubscriptionPlan,
  SubscriptionWithPlan,
  ProviderType,
} from "@/types/subscription";

type DB = Awaited<ReturnType<typeof createClient>>;

/** Cliente já resolvido é opcional: reaproveita um existente para evitar recriar. */
async function db(client?: DB): Promise<DB> {
  return client ?? (await createClient());
}

/**
 * Assinatura vigente do usuário (a que concede acesso), já com o plano.
 * Retorna null quando não há nenhuma válida — nesse caso o plano é 'free'.
 * Sem argumento, usa o usuário autenticado.
 */
export async function getSubscription(
  userId?: string,
  client?: DB
): Promise<SubscriptionWithPlan | null> {
  const supabase = await db(client);
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    uid = user.id;
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", uid)
    .in("status", ["active", "past_due"])
    .order("current_period_end", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const sub = (data as unknown as SubscriptionWithPlan | null) ?? null;
  if (!sub) return null;

  // valida a vigência do lado do servidor (o cache do profile já reflete isso,
  // mas aqui garantimos coerência mesmo lendo a linha crua)
  const interval = sub.plan?.interval;
  const fim = sub.current_period_end ?? sub.ends_at;
  const vigente =
    sub.status === "active" &&
    (interval === "lifetime" || !fim || new Date(fim).getTime() > Date.now());
  return vigente ? sub : null;
}

/**
 * Plano atual do usuário. Lê o cache `profiles.plan` (barato) — mantido
 * em dia pelo trigger. Sem usuário/registro, assume 'free'.
 */
export async function getCurrentPlan(
  userId?: string,
  client?: DB
): Promise<SubscriptionPlan> {
  const supabase = await db(client);
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "free";
    uid = user.id;
  }
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", uid)
    .maybeSingle();
  return ((data?.plan as SubscriptionPlan) ?? "free");
}

/** Lista os planos disponíveis (public.plans). */
export async function listPlans(client?: DB): Promise<Plan[]> {
  const supabase = await db(client);
  const { data } = await supabase.from("plans").select("*").order("price_cents");
  return (data as unknown as Plan[]) ?? [];
}

// ------------------------------------------------------------------
// Escrita — wrappers finos sobre as RPCs security definer (0014).
// Nesta etapa NÃO são chamadas por nenhuma UI; ficam prontas para o
// webhook / service role das próximas etapas. Mantêm a regra de que
// o cliente jamais escreve na tabela diretamente.
// ------------------------------------------------------------------

export interface ActivateInput {
  userId: string;
  planSlug: SubscriptionPlan;
  provider?: ProviderType;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPaymentId?: string;
  currentPeriodEnd?: string | null;
  metadata?: Record<string, unknown>;
}

export async function activateSubscription(input: ActivateInput, client?: DB) {
  const supabase = await db(client);
  const { data, error } = await supabase.rpc("activate_subscription", {
    p_user: input.userId,
    p_plan_slug: input.planSlug,
    p_provider: input.provider ?? null,
    p_provider_customer_id: input.providerCustomerId ?? null,
    p_provider_subscription_id: input.providerSubscriptionId ?? null,
    p_provider_payment_id: input.providerPaymentId ?? null,
    p_current_period_end: input.currentPeriodEnd ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error) return { error: error.message };
  return { ok: true, subscriptionId: data as number };
}

export async function renewSubscription(
  provider: ProviderType,
  providerSubscriptionId: string,
  currentPeriodEnd: string,
  client?: DB
) {
  const supabase = await db(client);
  const { error } = await supabase.rpc("renew_subscription", {
    p_provider: provider,
    p_provider_subscription_id: providerSubscriptionId,
    p_current_period_end: currentPeriodEnd,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function cancelSubscription(
  provider: ProviderType,
  providerSubscriptionId: string,
  immediate = false,
  client?: DB
) {
  const supabase = await db(client);
  const { error } = await supabase.rpc("cancel_subscription", {
    p_provider: provider,
    p_provider_subscription_id: providerSubscriptionId,
    p_immediate: immediate,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function expireSubscription(
  provider: ProviderType,
  providerSubscriptionId: string,
  client?: DB
) {
  const supabase = await db(client);
  const { error } = await supabase.rpc("expire_subscription", {
    p_provider: provider,
    p_provider_subscription_id: providerSubscriptionId,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Atualização genérica de campos do gateway (ex.: sincronizar customer id,
 * metadata). Passa pela mesma via segura: reutiliza activate_subscription,
 * que é idempotente por provider_subscription_id.
 */
export async function updateSubscription(input: ActivateInput, client?: DB) {
  return activateSubscription(input, client);
}
