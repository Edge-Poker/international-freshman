"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Abre (ou reaproveita) a conversa com outro usuário e vai para ela. */
export async function startConversation(otherUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_other: otherUserId,
  });
  if (error) return { error: error.message };
  redirect(`/messages/${data as number}`);
}

const msgSchema = z.object({
  conversationId: z.coerce.number().int().positive(),
  body: z.string().trim().max(4000),
  images: z.array(z.string().url()).max(4).default([]),
});

export async function sendMessage(input: {
  conversationId: number;
  body: string;
  images: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const parsed = msgSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!parsed.data.body && parsed.data.images.length === 0) {
    return { error: "Escreva algo ou anexe uma foto." };
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    body: parsed.data.body,
    images: parsed.data.images,
  });
  if (error) {
    return {
      error: error.message.includes("row-level security")
        ? "Could not send: your account is silenced, or there is a block between you."
        : error.message,
    };
  }

  // notifica o outro participante (regras de preferência/privacidade no banco)
  const { data: conv } = await supabase
    .from("conversations").select("user_a, user_b")
    .eq("id", parsed.data.conversationId).maybeSingle();
  if (conv) {
    const outro = conv.user_a === user.id ? conv.user_b : conv.user_a;
    const { data: me } = await supabase
      .from("profiles").select("nickname").eq("id", user.id).maybeSingle();
    await supabase.rpc("notify_user", {
      p_user: outro,
      p_title: `Nova mensagem de ${me?.nickname ? "@" + me.nickname : "um jogador"}`,
      p_body: parsed.data.body ? parsed.data.body.slice(0, 100) : "[foto]",
      p_url: `/messages/${parsed.data.conversationId}`,
      p_kind: "message",
    });
  }

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}

/** Total de mensagens recebidas ainda não lidas (para o badge da sidebar). */
export async function getUnreadCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .neq("sender_id", user.id);
  return count ?? 0;
}

/** Apaga uma mensagem própria (a RLS limita a 24 horas após o envio). */
export async function deleteMessage(messageId: number, conversationId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { data, error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "You can only delete your own messages within 24 hours of sending." };
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}
