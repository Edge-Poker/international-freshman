"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Reinício self-service do progresso do próprio usuário.
 * Delega à RPC reset_my_progress (0018), que apaga apenas progresso,
 * capítulos concluídos, provas, tentativas, XP, nível, conquistas,
 * favoritos e histórico de leitura — preservando conta, assinatura,
 * posts, comentários, seguidores, seguindo, perfil e configurações.
 */
export async function resetMyProgress() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase.rpc("reset_my_progress");
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/course");
  revalidatePath("/settings");
  return { ok: true };
}
