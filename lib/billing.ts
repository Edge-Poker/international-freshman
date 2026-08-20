/**
 * Billing service — camada ÚNICA da experiência de compra (Etapa 3).
 *
 * Responsabilidades:
 *   • listar os planos vendáveis (sempre da tabela plans, nunca fixo);
 *   • derivar o estado consolidado da assinatura do usuário;
 *   • centralizar a REGRA DOS BOTÕES da página de planos (ctaForPlan);
 *   • expor o contrato de checkout (startCheckout / changePlan /
 *     renewSubscription / cancelSubscription) através de um gateway
 *     plugável.
 *
 * GATEWAY: nesta etapa a implementação é um placeholder documentado que
 * responde { status: "not_implemented" }. A integração real (Mercado
 * Pago ou qualquer outro) implementa BillingGateway e é ligada em UM
 * único lugar: getGateway(). Nenhum componente conhece o gateway.
 *
 * Leitura usa lib/subscriptions.ts + RLS (o usuário só enxerga o que é
 * dele). Escrita de assinatura/pagamento continua proibida no cliente:
 * é papel das RPCs security definer (0014) e do webhook (service_role).
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPlan, listPlans } from "@/lib/subscriptions";
import { createCheckoutPreference } from "@/lib/mercadopago";
import type {
  BillingGateway,
  BillingHistory,
  BillingPlan,
  BillingPlanSlug,
  BillingState,
  BillingStatus,
  CheckoutRequest,
  CheckoutResponse,
  PlanCta,
} from "@/types/billing";
import type { PlanInterval, SubscriptionWithPlan } from "@/types/subscription";

type DB = Awaited<ReturnType<typeof createClient>>;

async function db(client?: DB): Promise<DB> {
  return client ?? (await createClient());
}

// ------------------------------------------------------------------
// Planos
// ------------------------------------------------------------------

/**
 * Nome comercial derivado do interval (a pagina vende por periodicidade).
 *
 * O gratuito e a excecao: ele existe como 'monthly' no banco porque a
 * coluna interval nao aceita nulo, mas nao e "o plano mensal". Sem este
 * caso especial o card do Free aparece rotulado "Monthly $0/mo".
 */
export function planDisplayName(interval: PlanInterval, slug?: string): string {
  if (slug === "free") return "Free";
  if (interval === "yearly") return "Yearly";
  if (interval === "lifetime") return "Lifetime";
  return "Monthly";
}

function toBillingPlan(p: {
  id: number; slug: string; title: string; price_cents: number;
  interval: PlanInterval; features: string[]; description?: string | null;
}): BillingPlan {
  return {
    id: p.id,
    slug: p.slug as BillingPlanSlug,
    title: p.title,
    displayName: planDisplayName(p.interval, p.slug),
    price_cents: p.price_cents,
    interval: p.interval,
    features: Array.isArray(p.features) ? p.features : [],
    description: p.description ?? null,
    highlighted: p.interval === "yearly", // "Best value"
  };
}

/**
 * Planos exibidos na página pública, ordenados
 * Free → Mensal → Anual → Vitalício. O Free entra porque a página
 * mostra SEMPRE os quatro planos; sua ação é sempre "Plano atual"/
 * "Plano gratuito" (nunca vendável). Preço, features e descrição
 * vêm sempre de public.plans.
 */
export async function listBillingPlans(client?: DB): Promise<BillingPlan[]> {
  const plans = await listPlans(await db(client));
  const order: Record<PlanInterval, number> = { monthly: 0, yearly: 1, lifetime: 2 };
  return plans
    .map(toBillingPlan)
    .sort((a, b) => {
      // Free sempre primeiro
      if (a.slug === "free") return -1;
      if (b.slug === "free") return 1;
      return order[a.interval] - order[b.interval];
    });
}

// ------------------------------------------------------------------
// Estado da assinatura
// ------------------------------------------------------------------

function isInForce(sub: SubscriptionWithPlan): boolean {
  if (sub.status !== "active") return false;
  if (sub.plan?.interval === "lifetime") return true;
  const end = sub.current_period_end ?? sub.ends_at;
  return !end || new Date(end).getTime() > Date.now();
}

function deriveStatus(sub: SubscriptionWithPlan | null): BillingStatus {
  if (!sub) return "none";
  if (sub.plan?.interval === "lifetime" && isInForce(sub)) return "lifetime";
  if (sub.status === "past_due" || sub.status === "incomplete") return "pending";
  if (isInForce(sub)) return sub.cancel_at_period_end ? "canceled" : "active";
  if (sub.status === "canceled") return "canceled";
  return "expired";
}

/**
 * Estado consolidado para as páginas de planos e "Minha assinatura".
 * Visitante não autenticado recebe um estado neutro (sem redirect):
 * a página de planos é pública.
 */
export async function getBillingState(client?: DB): Promise<BillingState> {
  const supabase = await db(client);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      authenticated: false, tier: "free", status: "none",
      subscription: null, periodEnd: null, daysLeft: null,
    };
  }

  // última assinatura do usuário, QUALQUER status (a vigente aparece
  // primeiro; se nenhuma vige, mostramos a mais recente: é o que a
  // página de billing precisa para dizer "expirada em ...").
  const { data } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const subs = ((data as unknown as SubscriptionWithPlan[]) ?? []);
  const current = subs.find(isInForce) ?? subs[0] ?? null;

  const tier = await getCurrentPlan(user.id, supabase);
  const status = deriveStatus(current);
  const periodEnd =
    current && current.plan?.interval !== "lifetime"
      ? current.current_period_end ?? current.ends_at
      : null;
  const daysLeft =
    periodEnd && (status === "active" || status === "canceled" || status === "pending")
      ? Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / 86_400_000))
      : null;

  return {
    authenticated: true,
    tier,
    status,
    subscription: current
      ? { ...current, plan: current.plan ? toBillingPlan(current.plan) : null }
      : null,
    periodEnd,
    daysLeft,
  };
}

// ------------------------------------------------------------------
// Regra dos botões — centralizada e pura (testável, sem UI)
// ------------------------------------------------------------------

/**
 * Decide o CTA principal de um card de plano dado o estado do usuário.
 * A página exibe SEMPRE os quatro planos (Free, Mensal, Anual,
 * Vitalício); as ações de cancelar e sair para Free ficam em
 * accountActionsFor (renderizadas uma vez, fora dos cards).
 *
 * Matriz (card → rótulo por estado do usuário):
 *   Free:      Free → "Plano atual"(disabled) · pagos → "Plano gratuito"(disabled)
 *   Mensal:    free → "Assinar Mensal" · mensal → "Plano atual" ·
 *              anual → "Downgrade para Mensal" · vitalício → incluso
 *   Anual:     free → "Assinar Anual" · mensal → "Upgrade para Anual" ·
 *              anual → "Renovar" · vitalício → incluso
 *   Vitalício: !vitalício → "Buy Lifetime" · vitalício → "Plano atual"
 */
export function ctaForPlan(plan: BillingPlan, state: BillingState): PlanCta {
  const tier = state.authenticated ? state.tier : "free";
  const currentInterval = state.subscription?.plan?.interval ?? null;
  const isVitalicio = state.status === "lifetime";
  const canceled = state.status === "canceled";
  const pending = state.status === "pending";
  const note = canceled ? "cancels at period end" : pending ? "pagamento pendente" : undefined;

  // ---- Card FREE (sempre visível) ----
  if (plan.interval === "monthly" && plan.slug === "free") {
    // (defensivo; o slug free tem interval monthly no seed)
  }
  if (plan.slug === "free") {
    // usuário sem assinatura ativa está no Free hoje
    const noFree = !state.authenticated || tier === "free";
    return noFree
      ? { label: "Current plan", intent: null, disabled: true }
      : { label: "Plano gratuito", intent: null, disabled: true };
  }

  // ---- Vitalício ativo: tudo o mais fica incluso ----
  if (isVitalicio) {
    return plan.interval === "lifetime"
      ? { label: "Current plan", intent: null, disabled: true }
      : { label: "Already included in your access", intent: null, disabled: true };
  }

  // ---- Card VITALÍCIO ----
  if (plan.interval === "lifetime") {
    return { label: "Buy Lifetime", intent: "subscribe", disabled: false };
  }

  // ---- visitante ou Free: assinar ----
  if (!state.authenticated || tier === "free" || state.status === "none" || state.status === "expired") {
    return { label: `Subscribe ${plan.displayName}`, intent: "subscribe", disabled: false };
  }

  // ---- usuario MENSAL vigente ----
  if (currentInterval === "monthly") {
    if (plan.interval === "monthly")
      return { label: "Current plan", intent: null, disabled: true, note };
    // card Anual
    return { label: "Upgrade to Yearly", intent: "change_plan", disabled: false };
  }

  // ---- usuário ANUAL vigente ----
  if (currentInterval === "yearly") {
    if (plan.interval === "yearly")
      return { label: "Renew", intent: "renew", disabled: false, note };
    // card Mensal = downgrade
    return { label: "Downgrade to Monthly", intent: "downgrade", disabled: false };
  }

  // residual
  return { label: `Subscribe ${plan.displayName}`, intent: "subscribe", disabled: false };
}

/**
 * Ações da conta que não pertencem a um card específico: cancelar a
 * assinatura vigente e sair para o Free. Nunca disponíveis para
 * vitalício (não permite downgrade nem cancelamento) nem para quem já
 * está no Free. Renderizadas uma única vez abaixo da grade de planos.
 */
export function accountActionsFor(state: BillingState): PlanCta[] {
  if (!state.authenticated) return [];
  if (state.status === "lifetime") return []; // vitalício: sem downgrade/cancelamento
  if (state.tier === "free" || state.status === "none" || state.status === "expired") return [];

  const actions: PlanCta[] = [];
  // cancelar só faz sentido se ainda não está cancelada
  if (state.status !== "canceled") {
    actions.push({ label: "Cancel subscription", intent: "cancel", disabled: false });
  }
  // sair para o Free (downgrade total)
  actions.push({ label: "Downgrade to Free", intent: "downgrade", disabled: false });
  return actions;
}

// ------------------------------------------------------------------
// Histórico de pagamentos (tabela payments, estrutura da 0016)
// ------------------------------------------------------------------

/**
 * Histórico do próprio usuário (RLS). Nesta etapa a tabela existe e
 * está vazia: nenhum emissor grava nela até a integração do gateway.
 */
export async function getPaymentHistory(client?: DB): Promise<BillingHistory> {
  const supabase = await db(client);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(24);
  return ((data as unknown as BillingHistory) ?? []);
}

// ------------------------------------------------------------------
// Gateway de checkout — ponto ÚNICO de troca de provedor
// ------------------------------------------------------------------

const NOT_IMPLEMENTED_MESSAGE =
  "Payments are not enabled yet. The payment provider " +
  "integration is the next step; the plans and prices shown " +
  "are already final.";

/**
 * Gateway real: Mercado Pago (Checkout Pro).
 *
 * startCheckout cria a preferência e devolve a URL de redirect. Os
 * demais fluxos (mudança de plano, renovação) também passam por um novo
 * checkout, porque o modelo é de pagamento avulso — cada compra gera
 * um novo pagamento. O cancelamento é tratado sem gateway: apenas
 * marca a assinatura para não renovar (o acesso segue até o fim do
 * período já pago), então não vai ao Mercado Pago.
 */
const mercadoPagoGateway: BillingGateway = {
  async startCheckout(req: CheckoutRequest): Promise<CheckoutResponse> {
    return iniciarCheckoutMP(req);
  },
  async changePlan(req: CheckoutRequest): Promise<CheckoutResponse> {
    // trocar de plano = comprar o novo plano
    return iniciarCheckoutMP(req);
  },
  async downgradePlan(): Promise<CheckoutResponse> {
    // downgrade não cobra: é feito pela ação de cancelar/ajustar,
    // que não passa pelo gateway.
    return {
      status: "error",
      message: "Downgrades are handled in the subscription area, with no new payment.",
    };
  },
  async renewSubscription(req: CheckoutRequest): Promise<CheckoutResponse> {
    // renovar o mensal = novo checkout do mesmo plano
    return iniciarCheckoutMP(req);
  },
  async cancelSubscription(): Promise<CheckoutResponse> {
    return {
      status: "error",
      message: "Cancellation is handled in the subscription area.",
    };
  },
};

/**
 * Cria a preferência no Mercado Pago para o plano pedido e devolve a
 * URL de redirect. Busca preço e título na tabela plans (fonte única)
 * e o e-mail do usuário para pré-preencher o checkout.
 */
async function iniciarCheckoutMP(
  req: CheckoutRequest,
  client?: DB
): Promise<CheckoutResponse> {
  // Sem credencial do gateway o checkout nunca vai completar. Dizer isso
  // de frente e melhor do que o "tente novamente em instantes" generico
  // do catch abaixo, que faria a pessoa insistir num botao quebrado.
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return { status: "error", message: NOT_IMPLEMENTED_MESSAGE };
  }

  try {
    const supabase = await db(client);

    const plans = await listBillingPlans(supabase);
    const plano = plans.find((p) => p.slug === req.planSlug);
    if (!plano) {
      return { status: "error", message: "Plan not found." };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { url } = await createCheckoutPreference({
      userId: req.userId,
      planSlug: req.planSlug,
      planTitle: plano.title,
      priceCents: plano.price_cents,
      userEmail: user?.email,
    });

    return { status: "redirect", url };
  } catch (e) {
    console.error("checkout Mercado Pago falhou:", e);
    return {
      status: "error",
      message:
        "Could not start the payment right now. Please try again shortly.",
    };
  }
}

/**
 * ÚNICO ponto de acoplamento com o provedor de pagamento.
 */
function getGateway(): BillingGateway {
  return mercadoPagoGateway;
}

/** Valida que o slug pedido existe e é vendável (exclui free) antes de ir ao gateway. */
async function assertSellablePlan(
  slug: string,
  client?: DB
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (slug === "free") return { ok: false, message: "The Free plan is not purchasable." };
  const plans = await listBillingPlans(client);
  return plans.some((p) => p.slug === slug && p.slug !== "free")
    ? { ok: true }
    : { ok: false, message: "Plan does not exist or is not available for purchase." };
}

export async function startCheckout(
  req: CheckoutRequest,
  client?: DB
): Promise<CheckoutResponse> {
  const valid = await assertSellablePlan(req.planSlug, client);
  if (!valid.ok) return { status: "error", message: valid.message };
  return getGateway().startCheckout(req);
}

export async function changePlan(
  req: CheckoutRequest,
  client?: DB
): Promise<CheckoutResponse> {
  const valid = await assertSellablePlan(req.planSlug, client);
  if (!valid.ok) return { status: "error", message: valid.message };
  return getGateway().changePlan(req);
}

/**
 * Downgrade. Aceita destino "free" (sair de tudo) ou um plano pago
 * inferior (anual → mensal). Só o "free" pula a validação de vendável.
 */
export async function downgradePlan(
  req: CheckoutRequest,
  client?: DB
): Promise<CheckoutResponse> {
  if (req.planSlug !== "free") {
    const valid = await assertSellablePlan(req.planSlug, client);
    if (!valid.ok) return { status: "error", message: valid.message };
  }
  return getGateway().downgradePlan(req);
}

export async function renewSubscription(
  req: CheckoutRequest
): Promise<CheckoutResponse> {
  return getGateway().renewSubscription(req);
}

export async function cancelSubscription(
  req: CheckoutRequest
): Promise<CheckoutResponse> {
  return getGateway().cancelSubscription(req);
}
