"use server";

/**
 * Server actions do Painel Administrativo (Etapa 2).
 *
 * Só orquestram: validam a entrada (Zod), exigem admin no servidor
 * (requireAdmin) e delegam para lib/admin.ts — que chama as RPCs
 * `security definer`, onde a permissão é revalidada no banco.
 *
 * Ban/silêncio continuam nas actions já existentes (actions/admin.ts)
 * e fixar tópico em actions/forum.ts — o painel as reutiliza; nada
 * foi duplicado.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  adminActivateSubscription,
  adminCancelSubscription,
  adminDeleteUser,
  adminExpireSubscription,
  adminGrantLifetime,
  adminRenewSubscription,
  adminResetProgress,
  adminResolveReport,
  adminSetFeatured,
  adminSetLock,
  adminSetPlan,
  logAdminEvent,
  requireAdmin,
} from "@/lib/admin";

const NAO_AUTORIZADO = { error: "Acesso negado" } as const;

const uuidSchema = z.string().uuid("Invalid user");
const idSchema = z.coerce.number().int().positive();
const planSchema = z.enum(["free", "pro", "vitalicio"]);

function revalidateAdmin(userId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/logs");
  if (userId) revalidatePath(`/admin/users/${userId}`);
}

// ------------------------------------------------------------------
// Assinaturas e plano (por usuário)
// ------------------------------------------------------------------

export async function changeUserPlan(userId: string, plan: string) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const uid = uuidSchema.safeParse(userId);
  const p = planSchema.safeParse(plan);
  if (!uid.success) return { error: uid.error.issues[0].message };
  if (!p.success) return { error: "Invalid plan" };

  const res = await adminSetPlan(uid.data, p.data);
  if ("error" in res) return res;
  revalidateAdmin(uid.data);
  return { ok: true };
}

export async function activateUserSubscription(userId: string) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const uid = uuidSchema.safeParse(userId);
  if (!uid.success) return { error: uid.error.issues[0].message };

  const res = await adminActivateSubscription(uid.data);
  if ("error" in res) return res;
  revalidateAdmin(uid.data);
  return { ok: true };
}

export async function cancelUserSubscription(userId: string, immediate = false) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const uid = uuidSchema.safeParse(userId);
  if (!uid.success) return { error: uid.error.issues[0].message };

  const res = await adminCancelSubscription(uid.data, Boolean(immediate));
  if ("error" in res) return res;
  revalidateAdmin(uid.data);
  return { ok: true };
}

export async function expireUserSubscription(userId: string) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const uid = uuidSchema.safeParse(userId);
  if (!uid.success) return { error: uid.error.issues[0].message };

  const res = await adminExpireSubscription(uid.data);
  if ("error" in res) return res;
  revalidateAdmin(uid.data);
  return { ok: true };
}

export async function renewUserSubscription(userId: string) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const uid = uuidSchema.safeParse(userId);
  if (!uid.success) return { error: uid.error.issues[0].message };

  const res = await adminRenewSubscription(uid.data);
  if ("error" in res) return res;
  revalidateAdmin(uid.data);
  return { ok: true };
}

export async function grantLifetime(userId: string) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const uid = uuidSchema.safeParse(userId);
  if (!uid.success) return { error: uid.error.issues[0].message };

  const res = await adminGrantLifetime(uid.data);
  if ("error" in res) return res;
  revalidateAdmin(uid.data);
  return { ok: true };
}

// ------------------------------------------------------------------
// Conta e progresso
// ------------------------------------------------------------------

export async function deleteUserAccount(userId: string) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const uid = uuidSchema.safeParse(userId);
  if (!uid.success) return { error: uid.error.issues[0].message };

  const res = await adminDeleteUser(uid.data);
  if ("error" in res) return res;
  revalidateAdmin();
  redirect("/admin/users");
}

export async function resetUserProgress(userId: string) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const uid = uuidSchema.safeParse(userId);
  if (!uid.success) return { error: uid.error.issues[0].message };

  const res = await adminResetProgress(uid.data);
  if ("error" in res) return res;
  revalidateAdmin(uid.data);
  return { ok: true };
}

// ------------------------------------------------------------------
// Moderação — exclusões reutilizam o caminho já existente
// (RLS: admin pode deletar; mesmo padrão de actions/forum.ts),
// acrescentando somente o registro de auditoria.
// ------------------------------------------------------------------

export async function adminDeleteTopic(topicId: number) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const id = idSchema.safeParse(topicId);
  if (!id.success) return { error: "Invalid topic" };

  const supabase = await createClient();
  const { data: alvo } = await supabase
    .from("forum_topics").select("user_id, title").eq("id", id.data).maybeSingle();

  const { error } = await supabase.from("forum_topics").delete().eq("id", id.data);
  if (error) return { error: error.message };

  await logAdminEvent("conteudo_excluido", {
    targetUser: alvo?.user_id ?? null,
    targetType: "topic",
    targetId: String(id.data),
    details: { titulo: alvo?.title ?? null },
  });
  revalidatePath("/forum");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/logs");
  return { ok: true };
}

export async function adminDeleteReply(postId: number) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const id = idSchema.safeParse(postId);
  if (!id.success) return { error: "Invalid reply" };

  const supabase = await createClient();
  const { data: alvo } = await supabase
    .from("forum_posts").select("user_id, topic_id, body").eq("id", id.data).maybeSingle();

  const { error } = await supabase.from("forum_posts").delete().eq("id", id.data);
  if (error) return { error: error.message };

  await logAdminEvent("conteudo_excluido", {
    targetUser: alvo?.user_id ?? null,
    targetType: "post",
    targetId: String(id.data),
    details: { trecho: alvo?.body?.slice(0, 140) ?? null },
  });
  if (alvo?.topic_id) revalidatePath(`/forum/${alvo.topic_id}`);
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/logs");
  return { ok: true };
}

export async function adminDeleteComment(commentId: number) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const id = idSchema.safeParse(commentId);
  if (!id.success) return { error: "Invalid comment" };

  const supabase = await createClient();
  const { data: alvo } = await supabase
    .from("comments").select("user_id, body").eq("id", id.data).maybeSingle();

  const { error } = await supabase.from("comments").delete().eq("id", id.data);
  if (error) return { error: error.message };

  await logAdminEvent("conteudo_excluido", {
    targetUser: alvo?.user_id ?? null,
    targetType: "comment",
    targetId: String(id.data),
    details: { trecho: alvo?.body?.slice(0, 140) ?? null },
  });
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/logs");
  return { ok: true };
}

export async function toggleTopicFeatured(topicId: number, featured: boolean) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const id = idSchema.safeParse(topicId);
  if (!id.success) return { error: "Invalid topic" };

  const res = await adminSetFeatured(id.data, Boolean(featured));
  if ("error" in res) return res;
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/logs");
  return { ok: true };
}

export async function toggleTopicLock(topicId: number, locked: boolean) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const id = idSchema.safeParse(topicId);
  if (!id.success) return { error: "Invalid topic" };

  const res = await adminSetLock(id.data, Boolean(locked));
  if ("error" in res) return res;
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/logs");
  return { ok: true };
}

export async function resolveReport(reportId: number, resolved: boolean) {
  if (!(await requireAdmin())) return NAO_AUTORIZADO;
  const id = idSchema.safeParse(reportId);
  if (!id.success) return { error: "Invalid report" };

  const res = await adminResolveReport(id.data, Boolean(resolved));
  if ("error" in res) return res;
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/logs");
  return { ok: true };
}
