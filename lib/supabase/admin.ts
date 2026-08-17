import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client administrativo (service_role) — uso EXCLUSIVO de servidor,
 * nunca importado por componentes de cliente.
 *
 * Ignora a RLS de propósito: é o webhook do gateway que grava a
 * assinatura e o pagamento, e ele não tem uma sessão de usuário. A
 * chave service_role vive só em variável de ambiente de servidor
 * (SUPABASE_SERVICE_ROLE_KEY), jamais em NEXT_PUBLIC_*, então nunca
 * chega ao navegador.
 *
 * Se a variável não estiver configurada, falha explicitamente — é
 * melhor o webhook dar erro claro do que ativar acesso pela metade.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Webhook sem credenciais de servidor: defina SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
