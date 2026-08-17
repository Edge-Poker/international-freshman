/**
 * Tipos do domínio de assinaturas.
 *
 * Fonte de verdade: a tabela `subscriptions`. A coluna `profiles.plan`
 * é apenas um cache derivado (sincronizado por trigger no banco).
 *
 * Esta etapa (infra) NÃO integra gateway. Os tipos já contemplam os
 * campos de provedor para as próximas etapas não exigirem refatoração.
 */

/** Slugs de plano — espelham public.plans.slug. */
export type SubscriptionPlan = "free" | "pro" | "vitalicio";

/** Status possíveis — espelham o CHECK de subscriptions.status. */
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "expired"
  | "incomplete";

/** Periodicidade — espelha plans.interval. */
export type PlanInterval = "monthly" | "yearly" | "lifetime";

/**
 * Provedor de pagamento. Aberto para a integração futura (ex.: mercadopago).
 * "manual" cobre concessões administrativas/testes sem gateway.
 */
export type ProviderType = "manual" | "mercadopago" | "stripe";

/** Linha de plano (public.plans). */
export interface Plan {
  id: number;
  slug: SubscriptionPlan;
  title: string;
  price_cents: number;
  interval: PlanInterval;
  features: string[];
  /** Descrição comercial (coluna adicionada na 0016; null em bases antigas). */
  description?: string | null;
}

/** Linha de assinatura (public.subscriptions) já com os campos de gateway. */
export interface Subscription {
  id: number;
  user_id: string;
  plan_id: number;
  status: SubscriptionStatus;
  started_at: string;
  ends_at: string | null;
  provider: ProviderType | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_payment_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Assinatura com o plano relacionado embutido (join com plans). */
export interface SubscriptionWithPlan extends Subscription {
  plan: Plan | null;
}

/**
 * Resultado padronizado de uma checagem de acesso.
 * `allowed` diz se pode; `reason` é um código estável para a UI decidir
 * a mensagem/CTA nas próximas etapas (sem regra espalhada por componente).
 */
export type AccessReason =
  | "ok"
  | "free_chapter"
  | "lifetime"
  | "active_subscription"
  | "not_authenticated"
  | "no_subscription"
  | "subscription_expired"
  | "exam_locked"
  | "part_locked";

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  /** plano vigente do usuário no momento da checagem (cache). */
  plan: SubscriptionPlan;
}
