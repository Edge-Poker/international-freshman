import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessPremiumContent } from "@/lib/access";

/**
 * Guard de página premium (server-side). Garante que contas sem acesso
 * (free, não-admin) não abram áreas restritas nem digitando a URL.
 * Redireciona para /subscription quando bloqueado. Retorna o supabase e o
 * user para a página reaproveitar (evita recriar o client).
 */
export async function requirePremium() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const acesso = await canAccessPremiumContent(user.id, supabase);
  if (!acesso.allowed) redirect("/subscription");
  return { supabase, user };
}
