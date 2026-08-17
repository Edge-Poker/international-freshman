import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import type { BillingPlanSlug } from "@/types/billing";

/**
 * Integração com o Mercado Pago (Checkout Pro).
 *
 * Modelo adotado: pagamento avulso por plano. O Checkout Pro não faz
 * débito recorrente — o plano mensal é um acesso de 30 dias que a
 * pessoa renova manualmente; anual são 365 dias; vitalício não expira.
 * A validade é calculada aqui e gravada na assinatura pelo webhook.
 *
 * Toda a comunicação usa o Access Token, que vive só no servidor
 * (MERCADOPAGO_ACCESS_TOKEN). A Public Key não é usada aqui porque o
 * Checkout Pro redireciona para uma página do próprio Mercado Pago —
 * os dados do cartao nunca passam pela nossa aplicacao.
 */

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN ausente: configure a credencial do Mercado Pago."
    );
  }
  return token;
}

function client() {
  return new MercadoPagoConfig({ accessToken: accessToken() });
}

/** Endereço público do site, usado nos retornos e no webhook. */
function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Dias de acesso concedidos por plano. null = não expira (vitalício). */
export function accessDaysFor(slug: BillingPlanSlug): number | null {
  switch (slug) {
    case "pro":
      return 30;
    case "anual":
      return 365;
    case "vitalicio":
      return null;
    default:
      return 30;
  }
}

/**
 * Cria uma preferência de checkout e devolve a URL para onde o usuário
 * deve ser enviado. `external_reference` carrega quem está comprando e
 * qual plano — é o que o webhook lê para ativar a assinatura certa.
 */
export async function createCheckoutPreference(params: {
  userId: string;
  planSlug: BillingPlanSlug;
  planTitle: string;
  priceCents: number;
  userEmail?: string;
}): Promise<{ url: string; preferenceId: string }> {
  const site = siteUrl();
  const preference = new Preference(client());

  const ref = JSON.stringify({ u: params.userId, p: params.planSlug });

  // Em ambiente de teste, NÃO fixamos o e-mail do comprador: o Mercado
  // Pago recusa quando o e-mail do pagador é o mesmo da conta vendedora,
  // e no sandbox o pagamento usa um e-mail fictício digitado na hora.
  // Em produção passamos o e-mail real (melhora a taxa de aprovação).
  //
  // A detecção é por variável explícita (MERCADOPAGO_TEST_MODE=true),
  // porque as credenciais de teste do Mercado Pago podem começar tanto
  // com "TEST-" quanto com "APP_USR-", então o prefixo não é confiável.
  const isTest = process.env.MERCADOPAGO_TEST_MODE === "true";
  const payer =
    !isTest && params.userEmail ? { email: params.userEmail } : undefined;

  const result = await preference.create({
    body: {
      items: [
        {
          id: params.planSlug,
          title: `International Freshman — ${params.planTitle} plan`,
          quantity: 1,
          unit_price: Number((params.priceCents / 100).toFixed(2)),
          currency_id: "BRL",
        },
      ],
      payer,
      external_reference: ref,
      back_urls: {
        success: `${site}/subscription?pagamento=sucesso`,
        pending: `${site}/subscription?pagamento=pendente`,
        failure: `${site}/subscription?pagamento=falha`,
      },
      auto_return: "approved",
      notification_url: `${site}/api/webhooks/mercadopago`,
      statement_descriptor: "FRESHMAN",
    },
  });

  const url = result.init_point;
  if (!url || !result.id) {
    throw new Error("The payment provider did not return a checkout URL.");
  }
  return { url, preferenceId: String(result.id) };
}

/** Consulta um pagamento pelo id (usado pelo webhook para confirmar status). */
export async function getPayment(paymentId: string) {
  const payment = new Payment(client());
  return payment.get({ id: paymentId });
}

/** Lê o external_reference de volta para { userId, planSlug }. */
export function parseExternalReference(
  ref: string | null | undefined
): { userId: string; planSlug: BillingPlanSlug } | null {
  if (!ref) return null;
  try {
    const o = JSON.parse(ref);
    if (o && typeof o.u === "string" && typeof o.p === "string") {
      return { userId: o.u, planSlug: o.p as BillingPlanSlug };
    }
  } catch {
    // ignora ref malformado
  }
  return null;
}
