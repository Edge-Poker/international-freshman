"use server";

/**
 * Server actions de billing — ponte fina entre a UI e lib/billing.ts.
 *
 * Regras:
 *   • componente NUNCA fala com gateway; só chama estas actions;
 *   • visitante recebe { status: "auth_required" } e a UI redireciona
 *     para o cadastro com retorno à página de planos;
 *   • validação de entrada com zod (slug restrito aos planos vendáveis).
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  cancelSubscription,
  changePlan,
  downgradePlan,
  renewSubscription,
  startCheckout,
} from "@/lib/billing";
import type { CheckoutIntent, CheckoutResponse } from "@/types/billing";

// aceita os pagos e também 'free' (destino válido de downgrade/cancelamento)
const planSchema = z.enum(["free", "pro", "anual", "vitalicio"]);

const AUTH_REQUIRED: CheckoutResponse = {
  status: "auth_required",
  redirectTo: "/signup?next=/pricing",
};

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function dispatch(
  intent: CheckoutIntent,
  rawSlug: string
): Promise<CheckoutResponse> {
  const slug = planSchema.safeParse(rawSlug);
  if (!slug.success) return { status: "error", message: "Invalid plan." };

  const userId = await currentUserId();
  if (!userId) return AUTH_REQUIRED;

  const req = { userId, planSlug: slug.data, intent } as const;
  switch (intent) {
    case "subscribe":   return startCheckout(req);
    case "change_plan": return changePlan(req);
    case "downgrade":   return downgradePlan(req);
    case "renew":       return renewSubscription(req);
    case "cancel":      return cancelSubscription(req);
  }
}

/** Inicia a assinatura/compra de um plano. */
export async function startCheckoutAction(planSlug: string): Promise<CheckoutResponse> {
  return dispatch("subscribe", planSlug);
}

/** Upgrade entre planos pagos (ex.: mensal → anual). */
export async function changePlanAction(planSlug: string): Promise<CheckoutResponse> {
  return dispatch("change_plan", planSlug);
}

/** Downgrade (anual → mensal, ou qualquer pago → free). */
export async function downgradePlanAction(planSlug: string): Promise<CheckoutResponse> {
  return dispatch("downgrade", planSlug);
}

/** Renovação antecipada (plano anual). */
export async function renewSubscriptionAction(planSlug: string): Promise<CheckoutResponse> {
  return dispatch("renew", planSlug);
}

/** Cancelamento da assinatura vigente. */
export async function cancelSubscriptionAction(planSlug: string): Promise<CheckoutResponse> {
  return dispatch("cancel", planSlug);
}
