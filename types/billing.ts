/**
 * Tipos do domínio de BILLING (Etapa 3 — experiência de compra).
 *
 * Regra central: nada aqui conhece Mercado Pago ou qualquer gateway.
 * O checkout é uma INTERFACE (BillingGateway); a implementação atual é
 * um placeholder documentado que responde "not_implemented". Na etapa
 * de integração, troca-se a implementação sem tocar em componente algum.
 */
import type {
  PlanInterval,
  ProviderType,
  Subscription,
  SubscriptionPlan,
} from "@/types/subscription";

/**
 * Slug comercial de plano. Estende os slugs originais com o plano
 * 'anual' (introduzido na 0016). Atenção à diferença de conceitos:
 * o CACHE profiles.plan continua restrito a free/pro/vitalicio
 * (nível de acesso); 'anual' existe apenas como plano comercial e é
 * mapeado para o nível 'pro' pelo trigger do banco.
 */
export type BillingPlanSlug = SubscriptionPlan | "anual";

/** Nível de acesso (espelha o CHECK de profiles.plan). */
export type BillingAccessTier = SubscriptionPlan;

/**
 * Estado consolidado da assinatura do usuário, derivado no servidor a
 * partir de subscriptions + plans + profiles.plan (lib/billing.ts).
 */
export type BillingStatus =
  | "none"       // nunca assinou / nada registrado
  | "active"     // recorrente em vigência
  | "pending"    // pagamento pendente (past_due / incomplete)
  | "canceled"   // cancelada (imediata ou no fim do período)
  | "expired"    // vigência encerrada
  | "lifetime";  // acesso vitalício

/** Linha de public.plans já enriquecida para a UI de venda. */
export interface BillingPlan {
  id: number;
  slug: BillingPlanSlug;
  /** Título salvo na tabela (ex.: "Pro"). */
  title: string;
  /** Nome comercial exibido, derivado do interval: Mensal / Anual / Vitalício. */
  displayName: string;
  price_cents: number;
  interval: PlanInterval;
  features: string[];
  description: string | null;
  /** Plano destacado na página ("Melhor custo-benefício"): o anual. */
  highlighted: boolean;
}

/** Estado completo entregue às páginas de planos e de billing. */
export interface BillingState {
  authenticated: boolean;
  /** Nível de acesso vigente (cache profiles.plan). */
  tier: BillingAccessTier;
  status: BillingStatus;
  /** Última assinatura do usuário (qualquer status) com o plano embutido. */
  subscription: (Subscription & { plan: BillingPlan | null }) | null;
  /** Fim da vigência (current_period_end ?? ends_at). Null = sem fim/lifetime. */
  periodEnd: string | null;
  /** Dias restantes de vigência; null quando não se aplica (lifetime/none). */
  daysLeft: number | null;
}

// ------------------------------------------------------------------
// Checkout — contrato único entre UI e gateway
// ------------------------------------------------------------------

/**
 * Intenções possíveis de compra/gestão disparadas pela UI.
 * - subscribe: assinar/comprar um plano pago;
 * - change_plan: upgrade entre pagos (ex.: mensal → anual);
 * - downgrade: descer de plano (anual → mensal, ou pago → free);
 * - renew: renovação antecipada;
 * - cancel: cancelar a assinatura vigente.
 */
export type CheckoutIntent =
  | "subscribe"
  | "change_plan"
  | "downgrade"
  | "renew"
  | "cancel";

export interface CheckoutRequest {
  userId: string;
  /** Plano alvo; "free" é válido para downgrade/cancelamento. */
  planSlug: BillingPlanSlug;
  intent: CheckoutIntent;
}

/**
 * Resposta padronizada do fluxo de checkout.
 * - redirect: a UI navega para `url` (comportamento da integração futura);
 * - not_implemented: placeholder desta etapa — a UI exibe `message`;
 * - auth_required: visitante precisa entrar antes (a UI navega p/ `redirectTo`);
 * - error: falha de validação/execução com mensagem legível.
 */
export type CheckoutResponse =
  | { status: "redirect"; url: string }
  | { status: "not_implemented"; message: string }
  | { status: "auth_required"; redirectTo: string }
  | { status: "error"; message: string };

/**
 * Contrato do gateway de pagamento. A Etapa 3 fornece apenas a
 * implementação placeholder; a integração real (Mercado Pago ou outro)
 * implementa esta interface e é trocada em UM único ponto
 * (getGateway em lib/billing.ts).
 */
export interface BillingGateway {
  startCheckout(req: CheckoutRequest): Promise<CheckoutResponse>;
  changePlan(req: CheckoutRequest): Promise<CheckoutResponse>;
  downgradePlan(req: CheckoutRequest): Promise<CheckoutResponse>;
  renewSubscription(req: CheckoutRequest): Promise<CheckoutResponse>;
  cancelSubscription(req: CheckoutRequest): Promise<CheckoutResponse>;
}

// ------------------------------------------------------------------
// Histórico de pagamentos (tabela payments — estrutura da 0016)
// ------------------------------------------------------------------

export type PaymentStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "refunded"
  | "chargeback";

/** Linha de public.payments. */
export interface BillingHistoryEntry {
  id: number;
  user_id: string;
  subscription_id: number | null;
  plan_slug: BillingPlanSlug | null;
  provider: ProviderType | null;
  provider_payment_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  paid_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type BillingHistory = BillingHistoryEntry[];

/** Descritor do botão de um card de plano, derivado do estado do usuário. */
export interface PlanCta {
  label: string;
  intent: CheckoutIntent | null;
  disabled: boolean;
  /** Observação curta exibida sob o botão (ex.: "renovação desativada"). */
  note?: string;
}
