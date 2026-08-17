import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPayment,
  parseExternalReference,
  accessDaysFor,
} from "@/lib/mercadopago";

/**
 * Valida a assinatura do Mercado Pago (header x-signature).
 *
 * O Mercado Pago envia x-signature no formato "ts=...,v1=..." e um
 * x-request-id. A prova é o HMAC-SHA256 de um "manifest" montado com o
 * id do recurso, o request-id e o timestamp, usando a assinatura
 * secreta da aplicação (MERCADOPAGO_WEBHOOK_SECRET).
 *
 * Se a secret não estiver configurada, não bloqueia — o webhook segue
 * confiando na consulta à API como antes (defesa que já existe). Assim
 * a validação é um reforço opcional, não um ponto único de falha.
 */
function assinaturaValida(request: Request, dataId: string | null): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // reforço opcional

  const sig = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!sig || !dataId) return false;

  // x-signature: "ts=1699999999,v1=abcdef..."
  const partes = Object.fromEntries(
    sig.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const ts = partes["ts"];
  const v1 = partes["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const esperado = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(esperado));
  } catch {
    return false;
  }
}

/**
 * Webhook do Mercado Pago.
 *
 * O Mercado Pago chama esta rota quando um pagamento muda de estado.
 * A notificação em si NÃO é confiável (qualquer um pode chamar a URL),
 * então nunca ativamos nada a partir do corpo recebido: usamos apenas
 * o ID informado para CONSULTAR o pagamento na API do Mercado Pago com
 * nosso Access Token, e só agimos sobre o que a consulta confirmar.
 *
 * Quando o pagamento está "approved", ativamos a assinatura via RPC
 * (activate_subscription) e registramos em `payments`. Tudo com o
 * client service_role, porque não há sessão de usuário aqui.
 *
 * A ativação é idempotente: a RPC reaproveita a assinatura do mesmo
 * provider_payment_id, então receber a mesma notificação duas vezes
 * (o Mercado Pago reenvia) não duplica nada.
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);

    // o id do pagamento pode vir no corpo ou na query, conforme o tipo
    let paymentId: string | null = null;
    let topic: string | null =
      url.searchParams.get("type") ?? url.searchParams.get("topic");

    try {
      const body = await request.json();
      topic = body?.type ?? body?.topic ?? topic;
      if (body?.data?.id) paymentId = String(body.data.id);
    } catch {
      // corpo vazio/again: seguimos com os parâmetros da query
    }
    paymentId =
      paymentId ??
      url.searchParams.get("data.id") ??
      url.searchParams.get("id");

    // só tratamos notificação de pagamento; as demais respondemos 200
    // para o Mercado Pago não reenfileirar (não é erro, é só ignorado)
    if (topic && topic !== "payment") {
      return NextResponse.json({ ignored: topic }, { status: 200 });
    }
    if (!paymentId) {
      return NextResponse.json({ error: "sem id" }, { status: 200 });
    }

    // reforço de autenticidade: se a secret estiver configurada, exige
    // que a assinatura confira antes de qualquer consulta
    if (!assinaturaValida(request, paymentId)) {
      console.warn("webhook mercadopago: assinatura inválida");
      return NextResponse.json({ error: "assinatura" }, { status: 401 });
    }

    // fonte da verdade: consultamos o pagamento na API
    const pay = await getPayment(paymentId);
    const status = pay.status; // approved | pending | rejected | ...
    const ref = parseExternalReference(pay.external_reference);

    if (!ref) {
      // sem referência não sabemos de quem é; nada a fazer
      return NextResponse.json({ error: "sem referencia" }, { status: 200 });
    }

    const supabase = createAdminClient();

    // validade conforme o plano
    const dias = accessDaysFor(ref.planSlug);
    const periodEnd =
      dias === null ? null : new Date(Date.now() + dias * 86400_000).toISOString();

    if (status === "approved") {
      // ativa (ou reaproveita) a assinatura — idempotente pelo payment id
      const { error: rpcError } = await supabase.rpc("activate_subscription", {
        p_user: ref.userId,
        p_plan_slug: ref.planSlug,
        p_provider: "mercadopago",
        p_provider_payment_id: String(pay.id),
        p_current_period_end: periodEnd,
        p_metadata: {
          mp_status: status,
          mp_payment_method: pay.payment_method_id ?? null,
        },
      });
      if (rpcError) {
        console.error("activate_subscription falhou:", rpcError.message);
        return NextResponse.json({ error: "rpc" }, { status: 500 });
      }

      // registra o pagamento via RPC security definer (migration 0026).
      // Usamos RPC em vez de INSERT direto porque a escrita direta
      // depende da chave service_role passar pela RLS de `payments` —
      // foi exatamente esse caminho que falhou em silêncio na primeira
      // venda real, deixando o financeiro zerado apesar da assinatura
      // ativa. A RPC roda com privilégios próprios e não depende disso.
      const { error: payError } = await supabase.rpc("record_payment", {
        p_user: ref.userId,
        p_plan_slug: ref.planSlug,
        p_provider: "mercadopago",
        p_provider_payment_id: String(pay.id),
        p_amount_cents: Math.round((pay.transaction_amount ?? 0) * 100),
        p_status: "approved",
        p_paid_at: pay.date_approved ?? new Date().toISOString(),
        p_metadata: { mp_payment_method: pay.payment_method_id ?? null },
      });
      if (payError) {
        // não derruba o webhook: a assinatura já foi ativada e o acesso
        // liberado. Registra para diagnóstico — a venda pode ser
        // reconciliada depois pelo backfill da 0026.
        console.error("record_payment falhou:", payError.message);
      }
    } else {
      // registra tentativas não aprovadas para o histórico, sem dar acesso
      const mapa: Record<string, string> = {
        pending: "pending",
        in_process: "pending",
        rejected: "rejected",
        cancelled: "rejected",
        refunded: "refunded",
        charged_back: "chargeback",
      };
      const st = mapa[status ?? ""] ?? "pending";
      const { error: payError } = await supabase.rpc("record_payment", {
        p_user: ref.userId,
        p_plan_slug: ref.planSlug,
        p_provider: "mercadopago",
        p_provider_payment_id: String(pay.id),
        p_amount_cents: Math.round((pay.transaction_amount ?? 0) * 100),
        p_status: st,
        p_paid_at: null,
        p_metadata: { mp_status: status },
      });
      if (payError) {
        console.error("record_payment (não aprovado) falhou:", payError.message);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("webhook mercadopago erro:", e);
    // 200 evita reenvio infinito por erro nosso; o log registra a falha
    return NextResponse.json({ error: "interno" }, { status: 200 });
  }
}

// o Mercado Pago às vezes faz um GET de verificação da URL
export async function GET() {
  return NextResponse.json({ ok: true });
}
