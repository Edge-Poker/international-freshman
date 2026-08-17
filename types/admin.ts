/**
 * Tipos do domínio administrativo (Etapa 2).
 *
 * Espelham as RPCs da migration 0015. Nenhum componente monta
 * consultas próprias: tudo chega já agregado pelo banco via
 * lib/admin.ts, no mesmo padrão de types/subscription.ts.
 */
import type { Plan, Subscription, SubscriptionPlan } from "@/types/subscription";

/** Cards do dashboard (admin_dashboard_stats). */
export interface AdminDashboardStats {
  total_users: number;
  active_users_7d: number;
  new_today: number;
  new_week: number;
  banned: number;
  silenced: number;
  subs_active: number;
  subs_pending: number;
  subs_canceled: number;
  subs_expired: number;
  subs_lifetime: number;
  plan_free: number;
  plan_pro: number;
  plan_vitalicio: number;
}

/** Filtros da tabela de usuários. */
export type AdminUserStatusFilter =
  | "todos" | "ativos" | "pendentes" | "banidos" | "silenciados";
export type AdminUserPlanFilter = "todos" | "mensal" | "anual" | "vitalicio";

/** Linha da tabela de usuários (admin_list_users). */
export interface AdminUserRow {
  id: string;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  email: string | null;
  plan: SubscriptionPlan;
  is_admin: boolean;
  is_banned: boolean;
  is_silenced: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  sub_status: string | null;
  sub_interval: string | null;
  sub_period_end: string | null;
  posts_count: number;
  comments_count: number;
  total_count: number;
}

/** Perfil completo dentro do detalhe (to_jsonb de profiles). */
export interface AdminUserProfile {
  id: string;
  name: string | null;
  nickname: string | null;
  bio: string | null;
  avatar_url: string | null;
  plan: SubscriptionPlan;
  xp: number;
  level: number;
  streak_days: number;
  chapters_done: number;
  rank_parts: number;
  is_admin: boolean;
  is_banned: boolean;
  is_silenced: boolean;
  created_at: string;
}

/** Detalhe de um usuário (admin_get_user). */
export interface AdminUserDetail {
  profile: AdminUserProfile;
  email: string | null;
  last_sign_in_at: string | null;
  subscription: (Subscription & { plan: Plan }) | null;
  counts: {
    topics: number;
    replies: number;
    comments: number;
    chapters_done: number;
    favorites_course: number;
    favorites_forum: number;
    exams_passed: number;
  };
}

/** Filtros da página de assinaturas. */
export type AdminSubscriptionFilter =
  | "todas" | "ativas" | "pendentes" | "canceladas" | "expiradas" | "vitalicias";

/** Linha da tabela de assinaturas (admin_list_subscriptions). */
export interface AdminSubscriptionRow {
  id: number;
  user_id: string;
  user_name: string | null;
  user_nickname: string | null;
  user_avatar_url: string | null;
  user_email: string | null;
  plan_slug: SubscriptionPlan;
  plan_title: string;
  plan_interval: "monthly" | "yearly" | "lifetime";
  status: string;
  grants_access: boolean;
  cancel_at_period_end: boolean;
  started_at: string;
  period_end: string | null;
  provider: string | null;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  total_count: number;
}

/** Eventos registrados em admin_logs (lista aberta para o futuro). */
export type AdminLogEvent =
  | "login"
  | "cadastro"
  | "alteracao_plano"
  | "assinatura_ativada"
  | "assinatura_renovada"
  | "assinatura_cancelada"
  | "assinatura_expirada"
  | "banimento"
  | "desbanimento"
  | "silenciamento"
  | "remocao_silencio"
  | "conta_excluida"
  | "progresso_resetado"
  | "conteudo_excluido"
  | "topico_fixado"
  | "topico_destacado"
  | "topico_sem_destaque"
  | "topico_fechado"
  | "topico_reaberto"
  | "denuncia_resolvida"
  | "denuncia_reaberta"
  | "pagamento_aprovado"   // futuro (Mercado Pago)
  | "pagamento_recusado"   // futuro (Mercado Pago)
  | (string & {});

/** Linha da tabela de logs (admin_list_logs). */
export interface AdminLogRow {
  id: number;
  event: AdminLogEvent;
  created_at: string;
  details: Record<string, unknown>;
  target_type: string | null;
  target_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_nickname: string | null;
  actor_avatar_url: string | null;
  target_user_id: string | null;
  target_name: string | null;
  target_nickname: string | null;
  total_count: number;
}

/** Abas e ordenações da moderação. */
export type ModerationTab = "posts" | "comentarios" | "denuncias";
export type ModerationSort = "recentes" | "curtidos" | "comentados" | "denunciados";

/** Autor resumido reutilizado nas listas de moderação. */
export interface ModAuthor {
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  chapters_done: number | null;
  rank_parts: number | null;
  is_admin: boolean | null;
}

/** Tópico na moderação (com flags administrativas). */
export interface ModTopic {
  id: number;
  title: string;
  body: string;
  score: number;
  reply_count: number;
  created_at: string;
  pinned_until: string | null;
  is_locked: boolean;
  is_featured: boolean;
  reports_open: number;
  author: ModAuthor | null;
}

/** Resposta de fórum ou comentário de aula na moderação. */
export interface ModComment {
  id: number;
  kind: "reply" | "comment";
  body: string;
  score: number | null;
  created_at: string;
  /** tópico (reply) ou capítulo (comment) de origem */
  parent_id: number;
  parent_label: string;
  author: ModAuthor | null;
}

/** Denúncia com o conteúdo-alvo hidratado. */
export interface ModReport {
  id: number;
  target_type: "topic" | "post" | "comment";
  target_id: number;
  reason: string | null;
  resolved: boolean;
  created_at: string;
  reporter: ModAuthor | null;
  target_excerpt: string | null;
  target_author: ModAuthor | null;
  /** link interno para abrir o conteúdo (quando ainda existe) */
  target_href: string | null;
}
