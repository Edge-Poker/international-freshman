/**
 * Admin service — camada ÚNICA da lógica administrativa (Etapa 2).
 *
 * Nenhuma regra do painel vive em componente: páginas e actions
 * chamam este módulo, que por sua vez fala apenas com as RPCs
 * `security definer` da migration 0015 (que revalidam is_admin no
 * banco). Mesmo padrão de lib/access.ts e lib/subscriptions.ts.
 *
 * Leituras agregadas (dashboard, listas, detalhe) também moram no
 * banco — o painel nunca monta consultas soltas no frontend.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminDashboardStats,
  AdminLogRow,
  AdminSubscriptionFilter,
  AdminSubscriptionRow,
  AdminUserDetail,
  AdminUserPlanFilter,
  AdminUserRow,
  AdminUserStatusFilter,
  ModAuthor,
  ModComment,
  ModReport,
  ModTopic,
  ModerationSort,
} from "@/types/admin";
import type { SubscriptionPlan } from "@/types/subscription";

type DB = Awaited<ReturnType<typeof createClient>>;

async function db(client?: DB): Promise<DB> {
  return client ?? (await createClient());
}

export const ADMIN_PAGE_SIZE = 20;
export const ADMIN_LOGS_PAGE_SIZE = 30;

/** Campos de autor reutilizados nas listas de moderação. */
const AUTHOR_FIELDS = "name, nickname, avatar_url, chapters_done, rank_parts, is_admin";

// ------------------------------------------------------------------
// Guarda de acesso (servidor)
// ------------------------------------------------------------------

/**
 * Usuário logado é admin? Fonte: profiles.is_admin — a mesma flag
 * usada pelas policies RLS e pelas RPCs (que revalidam no banco).
 */
export async function isCurrentUserAdmin(client?: DB): Promise<boolean> {
  const supabase = await db(client);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return Boolean(data?.is_admin);
}

/**
 * Exige admin: devolve o id do admin logado ou null. Toda página e
 * toda action do painel começa por aqui — e o banco ainda revalida.
 */
export async function requireAdmin(client?: DB): Promise<string | null> {
  const supabase = await db(client);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return data?.is_admin ? user.id : null;
}

// ------------------------------------------------------------------
// Leituras agregadas
// ------------------------------------------------------------------

export async function getDashboardStats(client?: DB): Promise<AdminDashboardStats | null> {
  const supabase = await db(client);
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (error) return null;
  return (data as unknown as AdminDashboardStats) ?? null;
}

export interface ListUsersParams {
  search?: string;
  status?: AdminUserStatusFilter;
  plan?: AdminUserPlanFilter;
  page?: number;
}

export async function listUsers(
  params: ListUsersParams = {},
  client?: DB
): Promise<{ rows: AdminUserRow[]; total: number }> {
  const supabase = await db(client);
  const page = Math.max(1, params.page ?? 1);
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: params.search?.trim() || null,
    p_status: params.status ?? "todos",
    p_plan: params.plan ?? "todos",
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  if (error) return { rows: [], total: 0 };
  const rows = (data as unknown as AdminUserRow[]) ?? [];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

export async function getUserDetail(
  userId: string,
  client?: DB
): Promise<AdminUserDetail | null> {
  const supabase = await db(client);
  const { data, error } = await supabase.rpc("admin_get_user", { p_user: userId });
  if (error || !data) return null;
  return data as unknown as AdminUserDetail;
}

export interface ListSubscriptionsParams {
  search?: string;
  status?: AdminSubscriptionFilter;
  page?: number;
}

export async function listSubscriptions(
  params: ListSubscriptionsParams = {},
  client?: DB
): Promise<{ rows: AdminSubscriptionRow[]; total: number }> {
  const supabase = await db(client);
  const page = Math.max(1, params.page ?? 1);
  const { data, error } = await supabase.rpc("admin_list_subscriptions", {
    p_search: params.search?.trim() || null,
    p_status: params.status ?? "todas",
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  if (error) return { rows: [], total: 0 };
  const rows = (data as unknown as AdminSubscriptionRow[]) ?? [];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

export interface ListLogsParams {
  search?: string;
  event?: string;
  page?: number;
}

export async function listLogs(
  params: ListLogsParams = {},
  client?: DB
): Promise<{ rows: AdminLogRow[]; total: number }> {
  const supabase = await db(client);
  const page = Math.max(1, params.page ?? 1);
  const { data, error } = await supabase.rpc("admin_list_logs", {
    p_search: params.search?.trim() || null,
    p_event: params.event && params.event !== "todos" ? params.event : null,
    p_limit: ADMIN_LOGS_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_LOGS_PAGE_SIZE,
  });
  if (error) return { rows: [], total: 0 };
  const rows = (data as unknown as AdminLogRow[]) ?? [];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

// ------------------------------------------------------------------
// Moderação — listas centralizadas
// (leitura usa as policies existentes: conteúdo do fórum é público
// e reports já têm select para admin; contagens agregadas idem)
// ------------------------------------------------------------------

const MOD_LIMIT = 30;

export async function listModTopics(
  sort: ModerationSort = "recentes",
  client?: DB
): Promise<ModTopic[]> {
  const supabase = await db(client);

  // denúncias abertas por tópico (para badge e para o filtro "denunciados")
  const { data: reportRows } = await supabase
    .from("reports")
    .select("target_type, target_id")
    .eq("resolved", false);
  const openByTopic = new Map<number, number>();
  for (const r of reportRows ?? []) {
    if (r.target_type === "topic") {
      openByTopic.set(r.target_id, (openByTopic.get(r.target_id) ?? 0) + 1);
    }
  }

  let query = supabase
    .from("forum_topics")
    .select(
      `id, title, body, score, reply_count, created_at, pinned_until, is_locked, is_featured,
       author:profiles!forum_topics_user_id_fkey(${AUTHOR_FIELDS})`
    )
    .limit(MOD_LIMIT);

  if (sort === "curtidos") query = query.order("score", { ascending: false });
  else if (sort === "comentados") query = query.order("reply_count", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  if (sort === "denunciados") {
    const ids = [...openByTopic.keys()];
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data } = await query;
  return ((data ?? []) as unknown as Omit<ModTopic, "reports_open">[]).map((t) => ({
    ...t,
    reports_open: openByTopic.get(t.id) ?? 0,
  }));
}

export async function listModComments(
  sort: ModerationSort = "recentes",
  client?: DB
): Promise<ModComment[]> {
  const supabase = await db(client);

  const reportedIds = new Set<number>();
  if (sort === "denunciados") {
    const { data: reportRows } = await supabase
      .from("reports")
      .select("target_type, target_id")
      .eq("resolved", false);
    for (const r of reportRows ?? []) {
      if (r.target_type === "post" || r.target_type === "comment") {
        reportedIds.add(r.target_id);
      }
    }
    if (reportedIds.size === 0) return [];
  }

  // respostas do fórum
  let replies = supabase
    .from("forum_posts")
    .select(
      `id, body, score, created_at, topic_id,
       topic:forum_topics!forum_posts_topic_id_fkey(title),
       author:profiles!forum_posts_user_id_fkey(${AUTHOR_FIELDS})`
    )
    .limit(MOD_LIMIT);
  replies = sort === "curtidos"
    ? replies.order("score", { ascending: false })
    : replies.order("created_at", { ascending: false });

  // comentários das aulas
  const lessonComments = supabase
    .from("comments")
    .select(
      `id, body, created_at, chapter_id,
       chapter:chapters!comments_chapter_id_fkey(title),
       author:profiles!comments_user_id_fkey(${AUTHOR_FIELDS})`
    )
    .order("created_at", { ascending: false })
    .limit(MOD_LIMIT);

  const [{ data: rep }, { data: com }] = await Promise.all([replies, lessonComments]);

  type ReplyRow = {
    id: number; body: string; score: number; created_at: string; topic_id: number;
    topic: { title: string } | null; author: ModAuthor | null;
  };
  type CommentRow = {
    id: number; body: string; created_at: string; chapter_id: number;
    chapter: { title: string } | null; author: ModAuthor | null;
  };

  const list: ModComment[] = [
    ...((rep ?? []) as unknown as ReplyRow[]).map((r): ModComment => ({
      id: r.id, kind: "reply", body: r.body, score: r.score,
      created_at: r.created_at, parent_id: r.topic_id,
      parent_label: r.topic?.title ?? `Tópico #${r.topic_id}`,
      author: r.author,
    })),
    ...((com ?? []) as unknown as CommentRow[]).map((c): ModComment => ({
      id: c.id, kind: "comment", body: c.body, score: null,
      created_at: c.created_at, parent_id: c.chapter_id,
      parent_label: c.chapter?.title ?? `Aula #${c.chapter_id}`,
      author: c.author,
    })),
  ];

  const filtered = sort === "denunciados"
    ? list.filter((c) => reportedIds.has(c.id))
    : list;

  if (sort === "curtidos") {
    filtered.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  } else {
    filtered.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
  return filtered.slice(0, MOD_LIMIT);
}

export async function listModReports(client?: DB): Promise<ModReport[]> {
  const supabase = await db(client);

  const { data } = await supabase
    .from("reports")
    .select(`id, target_type, target_id, reason, resolved, created_at,
             reporter:profiles!reports_reporter_id_fkey(${AUTHOR_FIELDS})`)
    .order("resolved", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);

  type ReportRow = {
    id: number; target_type: "topic" | "post" | "comment"; target_id: number;
    reason: string | null; resolved: boolean; created_at: string;
    reporter: ModAuthor | null;
  };
  const reports = (data ?? []) as unknown as ReportRow[];
  if (reports.length === 0) return [];

  const ids = (t: string) => reports.filter((r) => r.target_type === t).map((r) => r.target_id);
  const [topicIds, postIds, commentIds] = [ids("topic"), ids("post"), ids("comment")];

  const [topics, posts, comments] = await Promise.all([
    topicIds.length
      ? supabase.from("forum_topics")
          .select(`id, title, author:profiles!forum_topics_user_id_fkey(${AUTHOR_FIELDS})`)
          .in("id", topicIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("forum_posts")
          .select(`id, body, topic_id, author:profiles!forum_posts_user_id_fkey(${AUTHOR_FIELDS})`)
          .in("id", postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? supabase.from("comments")
          .select(`id, body, chapter_id, chapter:chapters!comments_chapter_id_fkey(slug),
                   author:profiles!comments_user_id_fkey(${AUTHOR_FIELDS})`)
          .in("id", commentIds)
      : Promise.resolve({ data: [] }),
  ]);

  type TopicT = { id: number; title: string; author: ModAuthor | null };
  type PostT = { id: number; body: string; topic_id: number; author: ModAuthor | null };
  type CommentT = {
    id: number; body: string; chapter_id: number;
    chapter: { slug: string } | null; author: ModAuthor | null;
  };
  const topicMap = new Map(((topics.data ?? []) as unknown as TopicT[]).map((t) => [t.id, t]));
  const postMap = new Map(((posts.data ?? []) as unknown as PostT[]).map((p) => [p.id, p]));
  const commentMap = new Map(((comments.data ?? []) as unknown as CommentT[]).map((c) => [c.id, c]));

  return reports.map((r): ModReport => {
    let excerpt: string | null = null;
    let author: ModAuthor | null = null;
    let href: string | null = null;
    if (r.target_type === "topic") {
      const t = topicMap.get(r.target_id);
      if (t) { excerpt = t.title; author = t.author; href = `/forum/${t.id}`; }
    } else if (r.target_type === "post") {
      const p = postMap.get(r.target_id);
      if (p) { excerpt = p.body; author = p.author; href = `/forum/${p.topic_id}`; }
    } else {
      const c = commentMap.get(r.target_id);
      if (c) { excerpt = c.body; author = c.author; href = c.chapter ? `/course/${c.chapter.slug}` : null; }
    }
    return {
      id: r.id, target_type: r.target_type, target_id: r.target_id,
      reason: r.reason, resolved: r.resolved, created_at: r.created_at,
      reporter: r.reporter, target_excerpt: excerpt, target_author: author, target_href: href,
    };
  });
}

// ------------------------------------------------------------------
// Mutações — wrappers finos sobre as RPCs da 0015.
// Chamadas apenas pelas server actions (actions/admin-panel.ts).
// ------------------------------------------------------------------

type Result = { ok: true } | { error: string };

async function rpcVoid(
  fn: string,
  args: Record<string, unknown>,
  client?: DB
): Promise<Result> {
  const supabase = await db(client);
  const { error } = await supabase.rpc(fn, args);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function adminSetPlan(userId: string, plan: SubscriptionPlan, days?: number) {
  return rpcVoid("admin_set_plan", { p_user: userId, p_plan_slug: plan, p_days: days ?? null });
}
export async function adminActivateSubscription(userId: string) {
  return rpcVoid("admin_activate_subscription", { p_user: userId });
}
export async function adminCancelSubscription(userId: string, immediate = false) {
  return rpcVoid("admin_cancel_subscription", { p_user: userId, p_immediate: immediate });
}
export async function adminExpireSubscription(userId: string) {
  return rpcVoid("admin_expire_subscription", { p_user: userId });
}
export async function adminRenewSubscription(userId: string, days?: number) {
  return rpcVoid("admin_renew_subscription", { p_user: userId, p_days: days ?? null });
}
export async function adminGrantLifetime(userId: string) {
  return rpcVoid("admin_grant_lifetime", { p_user: userId });
}
export async function adminDeleteUser(userId: string) {
  return rpcVoid("admin_delete_user", { p_user: userId });
}
export async function adminResetProgress(userId: string) {
  return rpcVoid("admin_reset_progress", { p_user: userId });
}
export async function adminSetFeatured(topicId: number, featured: boolean) {
  return rpcVoid("set_featured", { p_topic: topicId, p_featured: featured });
}
export async function adminSetLock(topicId: number, locked: boolean) {
  return rpcVoid("set_lock", { p_topic: topicId, p_locked: locked });
}
export async function adminResolveReport(reportId: number, resolved: boolean) {
  return rpcVoid("admin_resolve_report", { p_report: reportId, p_resolved: resolved });
}

/** Auditoria de ações que acontecem fora de RPC (ex.: exclusão de conteúdo). */
export async function logAdminEvent(
  event: string,
  opts: {
    targetUser?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    details?: Record<string, unknown>;
  } = {},
  client?: DB
): Promise<void> {
  const supabase = await db(client);
  await supabase.rpc("log_admin_event", {
    p_event: event,
    p_target_user: opts.targetUser ?? null,
    p_target_type: opts.targetType ?? null,
    p_target_id: opts.targetId ?? null,
    p_details: opts.details ?? {},
  });
}

// ------------------------------------------------------------------
// Suporte (Etapa de refinamentos) — canal oficial de atendimento
// ------------------------------------------------------------------

export interface SupportRow {
  id: number;
  user_id: string | null;
  user_name: string | null;
  user_nickname: string | null;
  user_avatar_url: string | null;
  user_email: string | null;
  user_plan: string | null;
  subject: string | null;
  body: string;
  answered: boolean;
  answered_at: string | null;
  created_at: string;
  total_count: number;
}

export type SupportFilter = "todas" | "abertas" | "respondidas";

/** Lista as mensagens de suporte com os dados de quem escreveu. */
export async function listSupport(
  status: SupportFilter = "todas",
  page = 0,
  client?: DB
): Promise<{ rows: SupportRow[]; total: number }> {
  const supabase = await db(client);
  const { data, error } = await supabase.rpc("admin_list_support", {
    p_status: status,
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: page * ADMIN_PAGE_SIZE,
  });
  if (error || !data) return { rows: [], total: 0 };
  const rows = data as SupportRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}
