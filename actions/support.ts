"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const suporteSchema = z.object({
  subject: z.string().trim().min(3, "Escolha um assunto").max(120),
  body: z
    .string()
    .trim()
    .min(15, "Descreva o problema com um pouco mais de detalhe")
    .max(4000),
});

/**
 * Envia uma mensagem de suporte. Fica vinculada à conta, então o
 * atendimento já recebe nickname, plano e e-mail junto — sem precisar
 * pedir esses dados ao usuário.
 */
export async function sendSupportMessage(input: {
  subject: string;
  body: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in to send this." };

  const parsed = suporteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }

  const { error } = await supabase.from("support_messages").insert({
    user_id: user.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
  });

  if (error) {
    return {
      error: error.message.includes("row-level security")
        ? "Your account cannot send messages right now."
        : error.message,
    };
  }

  revalidatePath("/support");
  return { ok: true };
}

/** Marca uma mensagem como respondida (ou reabre). Somente admin. */
export async function setSupportAnswered(id: number, answered: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase.rpc("admin_set_support_answered", {
    p_id: id,
    p_answered: answered,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/support");
  return { ok: true };
}
