"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Bane ou desbane uma conta. Só funciona para admins (regra no banco). */
export async function setBan(userId: string, banned: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase.rpc("set_ban", {
    p_user: userId,
    p_banned: banned,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Silencia ou dessilencia uma conta (admin). Silenciado lê tudo, mas não escreve. */
export async function setSilence(userId: string, silenced: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase.rpc("set_silence", {
    p_user: userId,
    p_silenced: silenced,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
