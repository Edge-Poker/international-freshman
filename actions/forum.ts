"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { VoteTarget } from "@/types/forum";

const MAX_IMAGES = 4;
const imagesSchema = z.array(z.string().url()).max(MAX_IMAGES).default([]);

const topicSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  title: z.string().trim().min(4, "The title needs at least 4 characters").max(160),
  body: z.string().trim().min(1, "Escreva sua mensagem").max(8000),
  images: imagesSchema,
});

export async function createTopic(input: {
  categoryId: number;
  title: string;
  body: string;
  images: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const parsed = topicSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await supabase
    .from("forum_topics")
    .insert({
      category_id: parsed.data.categoryId,
      user_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      images: parsed.data.images,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error: error.message.includes("row-level security")
        ? "Your account is silenced by moderation and cannot post."
        : error.message,
    };
  }
  await processMentions(`${parsed.data.title} ${parsed.data.body}`, `/forum/${data.id}`);
  revalidatePath("/forum");
  redirect(`/forum/${data.id}`);
}

const replySchema = z.object({
  topicId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1, "Escreva sua resposta").max(8000),
  images: imagesSchema,
});

export async function createReply(input: {
  topicId: number;
  body: string;
  images: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase.from("forum_posts").insert({
    topic_id: parsed.data.topicId,
    user_id: user.id,
    body: parsed.data.body,
    images: parsed.data.images,
  });

  if (error) {
    return {
      error: error.message.includes("row-level security")
        ? "Your account is silenced by moderation and cannot reply."
        : error.message,
    };
  }
  // o autor do tópico já é avisado pelo trigger de resposta; excluímos ele
  // das menções para não receber duas notificações da mesma resposta
  const { data: dono } = await supabase
    .from("forum_topics").select("user_id").eq("id", parsed.data.topicId).maybeSingle();
  await processMentions(parsed.data.body, `/forum/${parsed.data.topicId}`, dono?.user_id);
  revalidatePath(`/forum/${parsed.data.topicId}`);
  return { ok: true };
}

export async function castVote(target: VoteTarget, id: number, value: -1 | 1) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { data, error } = await supabase.rpc("cast_vote", {
    p_type: target,
    p_id: id,
    p_value: value,
  });
  if (error) return { error: error.message };
  return { ok: true, score: data as number };
}

export async function deleteTopic(topicId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  // a RLS já garante que só o dono (ou admin) apaga; o eq extra e cinto de seguranca
  const { error } = await supabase
    .from("forum_topics")
    .delete()
    .eq("id", topicId);
  if (error) return { error: error.message };

  revalidatePath("/forum");
  redirect("/forum");
}

export async function deleteReply(postId: number, topicId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath(`/forum/${topicId}`);
  return { ok: true };
}

export type PinOption = "1h" | "24h" | "1w" | "forever" | "unpin";

/** Fixa (ou desafixa) um tópico no topo do forum. Só para admins. */
export async function pinTopic(topicId: number, option: PinOption) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase.rpc("set_pin", {
    p_topic: topicId,
    p_option: option,
  });
  if (error) return { error: error.message };

  revalidatePath("/forum");
  revalidatePath(`/forum/${topicId}`);
  return { ok: true };
}

/** Favorita/desfavorita uma postagem do fórum. */
export async function toggleTopicFavorite(topicId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { data: fav } = await supabase
    .from("forum_favorites")
    .select("topic_id")
    .eq("user_id", user.id)
    .eq("topic_id", topicId)
    .maybeSingle();

  const { error } = fav
    ? await supabase.from("forum_favorites").delete()
        .eq("user_id", user.id).eq("topic_id", topicId)
    : await supabase.from("forum_favorites").insert({ user_id: user.id, topic_id: topicId });
  if (error) return { error: error.message };

  revalidatePath(`/forum/${topicId}`);
  revalidatePath("/saved");
  return { ok: true, favorited: !fav };
}

/**
 * Processa menções @nickname de um texto: encontra os perfis citados e
 * dispara notificação (que respeita preferências, privacidade e bloqueios
 * dentro do banco, via notify_user).
 */
export async function processMentions(texto: string, url: string, excluir?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // uma notificação por pessoa: nicks únicos (Set), então mencionar
  // alguém duas vezes na mesma postagem gera só uma notificação
  const nicks = Array.from(
    new Set((texto.match(/@([a-zA-Z0-9_]{3,20})/g) ?? []).map((m) => m.slice(1).toLowerCase()))
  ).slice(0, 10);
  if (nicks.length === 0) return;

  const { data: me } = await supabase
    .from("profiles").select("nickname").eq("id", user.id).maybeSingle();
  const quem = me?.nickname ? `@${me.nickname}` : "Someone";

  for (const nick of nicks) {
    const { data: alvo } = await supabase
      .from("profiles").select("id").ilike("nickname", nick).maybeSingle();
    if (!alvo || alvo.id === user.id) continue;
    // não duplica: se este usuário já recebeu a notificação de resposta, pula a menção
    if (excluir && alvo.id === excluir) continue;
    await supabase.rpc("notify_user", {
      p_user: alvo.id,
      p_title: `${quem} mencionou você`,
      p_body: texto.length > 120 ? texto.slice(0, 117) + "..." : texto,
      p_url: url,
      p_kind: "mention",
    });
  }
}

/**
 * Denuncia um alvo do fórum (tópico, post ou comentário). Reutiliza a
 * tabela reports (RLS: usuário só insere denúncia em seu próprio nome).
 * Não duplica denúncia do mesmo usuário sobre o mesmo alvo ainda aberta.
 */
export async function reportContent(
  targetType: "topic" | "post" | "comment",
  targetId: number,
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const motivo = (reason ?? "").trim().slice(0, 500);
  if (motivo.length < 3) return { error: "Briefly describe the reason for the report." };

  // evita denúncia duplicada do mesmo usuário sobre o mesmo alvo (ainda aberta)
  const { data: existente } = await supabase
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("resolved", false)
    .maybeSingle();
  if (existente) return { ok: true, already: true };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: motivo,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
