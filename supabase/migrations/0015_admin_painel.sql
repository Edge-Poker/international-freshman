-- ============================================================
-- INTERNATIONAL FRESHMAN — painel administrativo (migration 0015)
-- Etapa 2: leitura agregada para o painel, auditoria (logs),
-- ações administrativas por usuário e moderação estendida.
--
-- NÃO altera nenhuma funcionalidade existente:
--   • todas as mudanças são aditivas e idempotentes;
--   • reutiliza is_admin(), subscription_grants_access(),
--     sync_profile_plan() e activate_subscription() da 0014;
--   • nenhum trigger novo interfere no fluxo do usuário comum
--     (os de auditoria são à prova de falha: nunca propagam erro).
--
-- Rode DEPOIS de 0001..0014.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Guarda-chuva: exige admin dentro das RPCs do painel.
--    (mesma regra de set_ban/set_silence/set_pin — a checagem
--    vive no banco, nunca só no frontend)
-- ------------------------------------------------------------
create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'apenas administradores';
  end if;
end; $$;

-- ------------------------------------------------------------
-- 1) AUDITORIA — admin_logs
--    Estrutura completa desde já; eventos de pagamento entram
--    nas próximas etapas usando exatamente esta tabela.
-- ------------------------------------------------------------
create table if not exists public.admin_logs (
  id bigserial primary key,
  event text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_type text,          -- ex.: 'user' | 'topic' | 'post' | 'comment' | 'subscription' | 'report'
  target_id text,            -- id do alvo como texto (uuid ou bigint)
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_logs_created on public.admin_logs (created_at desc);
create index if not exists idx_admin_logs_event on public.admin_logs (event, created_at desc);
create index if not exists idx_admin_logs_actor on public.admin_logs (actor_id, created_at desc);
create index if not exists idx_admin_logs_target on public.admin_logs (target_user_id, created_at desc);

alter table public.admin_logs enable row level security;
drop policy if exists "admin_logs_select" on public.admin_logs;
create policy "admin_logs_select" on public.admin_logs
  for select using (public.is_admin());
-- escrita direta: negada (sem policy). Só as funções abaixo escrevem.

-- registrador central. À prova de falha: auditoria nunca derruba a ação.
create or replace function public.log_admin_event(
  p_event text,
  p_target_user uuid default null,
  p_target_type text default null,
  p_target_id text default null,
  p_details jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.admin_logs (event, actor_id, target_user_id, target_type, target_id, details)
  values (p_event, auth.uid(), p_target_user, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
exception when others then
  null; -- nunca propaga erro de log para a operação principal
end; $$;

-- ------------------------------------------------------------
-- 1.1) Eventos de autenticação (cadastro e login)
--      Triggers separados dos existentes — não tocam em
--      handle_new_user. Sempre à prova de falha.
-- ------------------------------------------------------------
create or replace function public.log_signup_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.admin_logs (event, actor_id, target_user_id, target_type, target_id, details)
    values ('cadastro', new.id, null, 'user', new.id::text,
            jsonb_build_object('email', new.email));
  exception when others then null;
  end;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_log on auth.users;
create trigger on_auth_user_created_log
  after insert on auth.users
  for each row execute procedure public.log_signup_event();

create or replace function public.log_login_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.admin_logs (event, actor_id, target_user_id, target_type, target_id)
    values ('login', new.id, null, 'user', new.id::text);
  exception when others then null;
  end;
  return new;
end; $$;

drop trigger if exists on_auth_user_login_log on auth.users;
create trigger on_auth_user_login_log
  after update of last_sign_in_at on auth.users
  for each row
  when (old.last_sign_in_at is distinct from new.last_sign_in_at)
  execute procedure public.log_login_event();

-- ------------------------------------------------------------
-- 1.2) Auditoria automática de mudanças sensíveis no perfil
--      (banimento, silenciamento, plano). Captura tanto o
--      painel novo quanto os botões já existentes no perfil,
--      sem modificar set_ban/set_silence.
-- ------------------------------------------------------------
create or replace function public.log_profile_admin_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if old.is_banned is distinct from new.is_banned then
      insert into public.admin_logs (event, actor_id, target_user_id, target_type, target_id, details)
      values (case when new.is_banned then 'banimento' else 'desbanimento' end,
              auth.uid(), new.id, 'user', new.id::text,
              jsonb_build_object('nickname', new.nickname));
    end if;
    if old.is_silenced is distinct from new.is_silenced then
      insert into public.admin_logs (event, actor_id, target_user_id, target_type, target_id, details)
      values (case when new.is_silenced then 'silenciamento' else 'remocao_silencio' end,
              auth.uid(), new.id, 'user', new.id::text,
              jsonb_build_object('nickname', new.nickname));
    end if;
    if old.plan is distinct from new.plan then
      insert into public.admin_logs (event, actor_id, target_user_id, target_type, target_id, details)
      values ('alteracao_plano', auth.uid(), new.id, 'user', new.id::text,
              jsonb_build_object('de', old.plan, 'para', new.plan, 'nickname', new.nickname));
    end if;
  exception when others then null;
  end;
  return null;
end; $$;

drop trigger if exists trg_log_profile_admin on public.profiles;
create trigger trg_log_profile_admin
  after update on public.profiles
  for each row
  when (old.is_banned is distinct from new.is_banned
     or old.is_silenced is distinct from new.is_silenced
     or old.plan is distinct from new.plan)
  execute procedure public.log_profile_admin_changes();

-- ------------------------------------------------------------
-- 2) MODERAÇÃO ESTENDIDA — destacar e fechar discussão
--    (mesmo padrão de set_pin da 0009). A coluna is_featured é
--    aditiva e ainda não muda a listagem do fórum dos usuários;
--    o destaque visual público entra numa etapa futura.
-- ------------------------------------------------------------
alter table public.forum_topics add column if not exists is_featured boolean not null default false;
create index if not exists idx_ftopics_featured on public.forum_topics (is_featured)
  where is_featured;

create or replace function public.set_featured(p_topic bigint, p_featured boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  update public.forum_topics set is_featured = p_featured where id = p_topic;
  perform public.log_admin_event(
    case when p_featured then 'topico_destacado' else 'topico_sem_destaque' end,
    null, 'topic', p_topic::text);
end; $$;

create or replace function public.set_lock(p_topic bigint, p_locked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  update public.forum_topics set is_locked = p_locked where id = p_topic;
  perform public.log_admin_event(
    case when p_locked then 'topico_fechado' else 'topico_reaberto' end,
    null, 'topic', p_topic::text);
end; $$;

-- resolver/reabrir denúncia (reports hoje só tem SELECT para admin)
create or replace function public.admin_resolve_report(p_report bigint, p_resolved boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  update public.reports set resolved = p_resolved where id = p_report;
  perform public.log_admin_event(
    case when p_resolved then 'denuncia_resolvida' else 'denuncia_reaberta' end,
    null, 'report', p_report::text);
end; $$;

-- ------------------------------------------------------------
-- 3) ASSINATURAS — ações administrativas POR USUÁRIO
--    Reutilizam as primitivas da 0014 (activate_subscription e
--    subscription_grants_access) e o trigger de sincronização
--    do cache profiles.plan. Concessões manuais usam
--    provider = 'manual' com id idempotente por usuário.
-- ------------------------------------------------------------

-- assinatura mais relevante do usuário (a que concede acesso;
-- senão, a mais recente). Uso interno do painel.
create or replace function public.admin_pick_subscription(p_user uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select s.id
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.user_id = p_user
  order by public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval) desc,
           (pl.interval = 'lifetime') desc,
           coalesce(s.current_period_end, s.ends_at) desc nulls first,
           s.id desc
  limit 1;
$$;

-- Alterar plano. 'free' encerra o acesso; demais ativam/trocam a
-- assinatura manual do usuário (idempotente por 'manual-<uuid>').
create or replace function public.admin_set_plan(
  p_user uuid,
  p_plan_slug text,
  p_days integer default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_interval text; v_end timestamptz;
begin
  perform public.assert_admin();

  if p_plan_slug = 'free' then
    update public.subscriptions s set status = 'expired', cancel_at_period_end = false
    from public.plans pl
    where pl.id = s.plan_id and s.user_id = p_user
      and public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval);
    perform public.log_admin_event('assinatura_expirada', p_user, 'subscription', null,
      jsonb_build_object('motivo', 'plano alterado para free'));
    return;
  end if;

  select interval into v_interval from public.plans where slug = p_plan_slug;
  if v_interval is null then raise exception 'plano inexistente: %', p_plan_slug; end if;

  v_end := case v_interval
    when 'lifetime' then null
    when 'yearly'   then now() + make_interval(days => coalesce(p_days, 365))
    else                 now() + make_interval(days => coalesce(p_days, 30))
  end;

  perform public.activate_subscription(
    p_user, p_plan_slug, 'manual', null, 'manual-' || p_user::text, null, v_end,
    jsonb_build_object('origem', 'painel_admin'));

  perform public.log_admin_event('assinatura_ativada', p_user, 'subscription', null,
    jsonb_build_object('plano', p_plan_slug, 'vigencia_ate', v_end));
end; $$;

-- Ativar (reativar) a assinatura existente do usuário.
create or replace function public.admin_activate_subscription(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_interval text; v_end timestamptz;
begin
  perform public.assert_admin();
  v_id := public.admin_pick_subscription(p_user);
  if v_id is null then
    raise exception 'Usuário não possui assinatura. Use "Alterar plano" para criar uma.';
  end if;

  select pl.interval, coalesce(s.current_period_end, s.ends_at)
    into v_interval, v_end
  from public.subscriptions s join public.plans pl on pl.id = s.plan_id
  where s.id = v_id;

  -- vigência já vencida em plano recorrente: reabre um novo ciclo a partir de agora
  if v_interval <> 'lifetime' and (v_end is null or v_end <= now()) then
    v_end := now() + case when v_interval = 'yearly'
      then make_interval(days => 365) else make_interval(days => 30) end;
  end if;

  update public.subscriptions
    set status = 'active', cancel_at_period_end = false,
        current_period_end = case when v_interval = 'lifetime' then current_period_end else v_end end
  where id = v_id;

  perform public.log_admin_event('assinatura_ativada', p_user, 'subscription', v_id::text);
end; $$;

-- Cancelar: por padrão no fim do período; imediato encerra já.
create or replace function public.admin_cancel_subscription(
  p_user uuid, p_immediate boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform public.assert_admin();
  v_id := public.admin_pick_subscription(p_user);
  if v_id is null then raise exception 'Usuário não possui assinatura.'; end if;

  if p_immediate then
    update public.subscriptions set status = 'canceled', cancel_at_period_end = false where id = v_id;
  else
    update public.subscriptions set cancel_at_period_end = true where id = v_id;
  end if;

  perform public.log_admin_event('assinatura_cancelada', p_user, 'subscription', v_id::text,
    jsonb_build_object('imediato', p_immediate));
end; $$;

-- Expirar: encerra a vigência agora (fim sem renovação).
create or replace function public.admin_expire_subscription(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform public.assert_admin();
  v_id := public.admin_pick_subscription(p_user);
  if v_id is null then raise exception 'Usuário não possui assinatura.'; end if;

  update public.subscriptions set status = 'expired', cancel_at_period_end = false where id = v_id;
  perform public.log_admin_event('assinatura_expirada', p_user, 'subscription', v_id::text);
end; $$;

-- Renovar: estende a vigência (30d mensal / 365d anual, ou p_days).
create or replace function public.admin_renew_subscription(
  p_user uuid, p_days integer default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_interval text; v_base timestamptz; v_end timestamptz;
begin
  perform public.assert_admin();
  v_id := public.admin_pick_subscription(p_user);
  if v_id is null then raise exception 'Usuário não possui assinatura.'; end if;

  select pl.interval, greatest(coalesce(s.current_period_end, s.ends_at, now()), now())
    into v_interval, v_base
  from public.subscriptions s join public.plans pl on pl.id = s.plan_id
  where s.id = v_id;

  if v_interval = 'lifetime' then
    update public.subscriptions set status = 'active', cancel_at_period_end = false where id = v_id;
  else
    v_end := v_base + make_interval(days => coalesce(p_days,
      case when v_interval = 'yearly' then 365 else 30 end));
    update public.subscriptions
      set status = 'active', cancel_at_period_end = false, current_period_end = v_end
    where id = v_id;
  end if;

  perform public.log_admin_event('assinatura_renovada', p_user, 'subscription', v_id::text,
    jsonb_build_object('vigencia_ate', v_end));
end; $$;

-- Transformar em vitalício (atalho sobre admin_set_plan).
create or replace function public.admin_grant_lifetime(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  perform public.admin_set_plan(p_user, 'vitalicio', null);
end; $$;

-- ------------------------------------------------------------
-- 4) CONTA E PROGRESSO
-- ------------------------------------------------------------

-- Excluir conta: remove o usuário do auth (cascateia para
-- profiles e todo o conteúdo). Protegido contra si mesmo e
-- contra outros admins, como set_ban.
create or replace function public.admin_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_nick text; v_name text; v_email text;
begin
  perform public.assert_admin();
  if p_user = auth.uid() then raise exception 'não dá para excluir a própria conta por aqui'; end if;
  if exists (select 1 from public.profiles where id = p_user and is_admin) then
    raise exception 'não dá para excluir a conta de outro administrador';
  end if;

  select nickname, name into v_nick, v_name from public.profiles where id = p_user;
  select email into v_email from auth.users where id = p_user;

  -- registra ANTES da exclusão; o alvo vira null pelo on delete set null,
  -- mas o snapshot fica preservado em details.
  perform public.log_admin_event('conta_excluida', p_user, 'user', p_user::text,
    jsonb_build_object('nickname', v_nick, 'name', v_name, 'email', v_email));

  delete from auth.users where id = p_user;
end; $$;

-- Resetar progresso do curso: aulas, provas, streaks, sessões e
-- caches do perfil. Não apaga conteúdo criado (posts, notas,
-- favoritos) — isso é moderação, não progresso.
create or replace function public.admin_reset_progress(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();

  delete from public.lesson_progress  where user_id = p_user;
  delete from public.exam_results     where user_id = p_user;
  delete from public.study_sessions   where user_id = p_user;
  delete from public.daily_streaks    where user_id = p_user;
  delete from public.reading_history  where user_id = p_user;

  update public.profiles
    set chapters_done = 0, rank_parts = 0, xp = 0, level = 1,
        streak_days = 0, last_study_at = null, four_aces_at = null
  where id = p_user;

  perform public.log_admin_event('progresso_resetado', p_user, 'user', p_user::text);
end; $$;

-- ------------------------------------------------------------
-- 5) LEITURA AGREGADA DO PAINEL
--    (security definer para juntar auth.users — e-mail e último
--    login — que não são visíveis via RLS comum)
-- ------------------------------------------------------------

-- 5.1 Dashboard
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.assert_admin();

  select jsonb_build_object(
    'total_users',     (select count(*) from public.profiles),
    'active_users_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'new_today',       (select count(*) from public.profiles where created_at >= date_trunc('day', now())),
    'new_week',        (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'banned',          (select count(*) from public.profiles where is_banned),
    'silenced',        (select count(*) from public.profiles where is_silenced),
    'subs_active', (
      select count(*) from public.subscriptions s join public.plans pl on pl.id = s.plan_id
      where public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval)
        and pl.interval <> 'lifetime'),
    'subs_pending', (
      select count(*) from public.subscriptions where status in ('past_due','incomplete')),
    'subs_canceled', (
      select count(*) from public.subscriptions where status = 'canceled'),
    'subs_expired', (
      select count(*) from public.subscriptions s join public.plans pl on pl.id = s.plan_id
      where s.status = 'expired'
         or (s.status = 'active'
             and not public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval))),
    'subs_lifetime', (
      select count(*) from public.subscriptions s join public.plans pl on pl.id = s.plan_id
      where pl.interval = 'lifetime'
        and public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval)),
    'plan_free',      (select count(*) from public.profiles where plan = 'free'),
    'plan_pro',       (select count(*) from public.profiles where plan = 'pro'),
    'plan_vitalicio', (select count(*) from public.profiles where plan = 'vitalicio')
  ) into v;

  return v;
end; $$;

-- 5.2 Lista de usuários (busca + filtros + paginação)
--     p_status: todos | ativos | pendentes | banidos | silenciados
--     p_plan:   todos | mensal | anual | vitalicio
create or replace function public.admin_list_users(
  p_search text default null,
  p_status text default 'todos',
  p_plan   text default 'todos',
  p_limit  integer default 20,
  p_offset integer default 0
) returns table (
  id uuid, name text, nickname text, avatar_url text, email text,
  plan text, is_admin boolean, is_banned boolean, is_silenced boolean,
  created_at timestamptz, last_sign_in_at timestamptz,
  sub_status text, sub_interval text, sub_period_end timestamptz,
  posts_count bigint, comments_count bigint, total_count bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();

  return query
  select
    p.id, p.name, p.nickname, p.avatar_url, u.email,
    p.plan, p.is_admin, p.is_banned, p.is_silenced,
    p.created_at, u.last_sign_in_at,
    sub.status, sub.interval, coalesce(sub.current_period_end, sub.ends_at),
    (select count(*) from public.forum_topics t where t.user_id = p.id)
      + (select count(*) from public.forum_posts fp where fp.user_id = p.id),
    (select count(*) from public.comments c where c.user_id = p.id),
    count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select s.status, s.current_period_end, s.ends_at, pl.interval,
           public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval) as grants
    from public.subscriptions s join public.plans pl on pl.id = s.plan_id
    where s.user_id = p.id
    order by public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval) desc,
             (pl.interval = 'lifetime') desc,
             coalesce(s.current_period_end, s.ends_at) desc nulls first,
             s.id desc
    limit 1
  ) sub on true
  where
    (p_search is null or p_search = ''
      or p.name ilike '%' || p_search || '%'
      or p.nickname ilike '%' || p_search || '%'
      or u.email ilike '%' || p_search || '%')
    and (case p_status
      when 'ativos'       then p.plan <> 'free'
      when 'pendentes'    then p.plan = 'free' and sub.status in ('past_due','incomplete')
      when 'banidos'      then p.is_banned
      when 'silenciados'  then p.is_silenced
      else true end)
    and (case p_plan
      when 'mensal'    then p.plan <> 'free' and sub.interval = 'monthly'
      when 'anual'     then p.plan <> 'free' and sub.interval = 'yearly'
      when 'vitalicio' then p.plan = 'vitalicio'
      else true end)
  order by p.created_at desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
end; $$;

-- 5.3 Detalhe completo de um usuário
create or replace function public.admin_get_user(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.assert_admin();

  select jsonb_build_object(
    'profile', to_jsonb(p) - 'search',
    'email', u.email,
    'last_sign_in_at', u.last_sign_in_at,
    'subscription', (
      select to_jsonb(s) || jsonb_build_object('plan', to_jsonb(pl))
      from public.subscriptions s join public.plans pl on pl.id = s.plan_id
      where s.id = public.admin_pick_subscription(p.id)),
    'counts', jsonb_build_object(
      'topics',   (select count(*) from public.forum_topics t where t.user_id = p.id),
      'replies',  (select count(*) from public.forum_posts fp where fp.user_id = p.id),
      'comments', (select count(*) from public.comments c where c.user_id = p.id),
      'chapters_done', (select count(*) from public.lesson_progress lp
                        where lp.user_id = p.id and lp.status = 'concluido'),
      'favorites_course', (select count(*) from public.favorites f where f.user_id = p.id),
      'favorites_forum',  (select count(*) from public.forum_favorites ff where ff.user_id = p.id),
      'exams_passed', (select count(*) from public.exam_results er
                       where er.user_id = p.id and er.passed))
  ) into v
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user;

  return v; -- null quando o usuário não existe
end; $$;

-- 5.4 Lista de assinaturas (busca + filtro + paginação)
--     p_status: todas | ativas | pendentes | canceladas | expiradas | vitalicias
create or replace function public.admin_list_subscriptions(
  p_search text default null,
  p_status text default 'todas',
  p_limit  integer default 20,
  p_offset integer default 0
) returns table (
  id bigint, user_id uuid, user_name text, user_nickname text,
  user_avatar_url text, user_email text,
  plan_slug text, plan_title text, plan_interval text,
  status text, grants_access boolean, cancel_at_period_end boolean,
  started_at timestamptz, period_end timestamptz,
  provider text, provider_subscription_id text, provider_customer_id text,
  total_count bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();

  return query
  select
    s.id, s.user_id, p.name, p.nickname, p.avatar_url, u.email,
    pl.slug, pl.title, pl.interval,
    s.status,
    public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval),
    s.cancel_at_period_end,
    s.started_at, coalesce(s.current_period_end, s.ends_at),
    s.provider, s.provider_subscription_id, s.provider_customer_id,
    count(*) over ()
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  join public.profiles p on p.id = s.user_id
  join auth.users u on u.id = s.user_id
  where
    (p_search is null or p_search = ''
      or p.name ilike '%' || p_search || '%'
      or p.nickname ilike '%' || p_search || '%'
      or u.email ilike '%' || p_search || '%'
      or s.provider_subscription_id ilike '%' || p_search || '%'
      or s.provider_customer_id ilike '%' || p_search || '%')
    and (case p_status
      when 'ativas' then
        public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval)
        and pl.interval <> 'lifetime'
      when 'vitalicias' then
        public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval)
        and pl.interval = 'lifetime'
      when 'pendentes'  then s.status in ('past_due','incomplete')
      when 'canceladas' then s.status = 'canceled'
      when 'expiradas'  then s.status = 'expired'
        or (s.status = 'active'
            and not public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval))
      else true end)
  order by s.created_at desc, s.id desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
end; $$;

-- 5.5 Logs (busca + filtro por evento + paginação)
create or replace function public.admin_list_logs(
  p_search text default null,
  p_event  text default null,
  p_limit  integer default 30,
  p_offset integer default 0
) returns table (
  id bigint, event text, created_at timestamptz, details jsonb,
  target_type text, target_id text,
  actor_id uuid, actor_name text, actor_nickname text, actor_avatar_url text,
  target_user_id uuid, target_name text, target_nickname text,
  total_count bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();

  return query
  select
    l.id, l.event, l.created_at, l.details, l.target_type, l.target_id,
    l.actor_id, a.name, a.nickname, a.avatar_url,
    l.target_user_id, t.name, t.nickname,
    count(*) over ()
  from public.admin_logs l
  left join public.profiles a on a.id = l.actor_id
  left join public.profiles t on t.id = l.target_user_id
  where
    (p_event is null or p_event = '' or p_event = 'todos' or l.event = p_event)
    and (p_search is null or p_search = ''
      or l.event ilike '%' || p_search || '%'
      or a.nickname ilike '%' || p_search || '%'
      or a.name ilike '%' || p_search || '%'
      or t.nickname ilike '%' || p_search || '%'
      or t.name ilike '%' || p_search || '%'
      or l.details::text ilike '%' || p_search || '%')
  order by l.created_at desc, l.id desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
end; $$;

-- ------------------------------------------------------------
-- 6) PERMISSÕES DE EXECUÇÃO
--    • RPCs do painel: só usuários autenticados (e todas ainda
--      revalidam is_admin internamente via assert_admin).
--    • Endurecimento: as RPCs de gateway da 0014 deixam de ser
--      executáveis pelo cliente comum — passam a ser exclusivas
--      do service role (webhook futuro) e das funções admin
--      acima. Nenhuma UI existente as chamava; nada quebra.
-- ------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.assert_admin()',
    'public.log_admin_event(text,uuid,text,text,jsonb)',
    'public.set_featured(bigint,boolean)',
    'public.set_lock(bigint,boolean)',
    'public.admin_resolve_report(bigint,boolean)',
    'public.admin_pick_subscription(uuid)',
    'public.admin_set_plan(uuid,text,integer)',
    'public.admin_activate_subscription(uuid)',
    'public.admin_cancel_subscription(uuid,boolean)',
    'public.admin_expire_subscription(uuid)',
    'public.admin_renew_subscription(uuid,integer)',
    'public.admin_grant_lifetime(uuid)',
    'public.admin_delete_user(uuid)',
    'public.admin_reset_progress(uuid)',
    'public.admin_dashboard_stats()',
    'public.admin_list_users(text,text,text,integer,integer)',
    'public.admin_get_user(uuid)',
    'public.admin_list_subscriptions(text,text,integer,integer)',
    'public.admin_list_logs(text,text,integer,integer)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

revoke all on function public.activate_subscription(uuid,text,text,text,text,text,timestamptz,jsonb) from public, anon, authenticated;
revoke all on function public.renew_subscription(text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.cancel_subscription(text,text,boolean) from public, anon, authenticated;
revoke all on function public.expire_subscription(text,text) from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid,text,text,text,text,text,timestamptz,jsonb) to service_role;
grant execute on function public.renew_subscription(text,text,timestamptz) to service_role;
grant execute on function public.cancel_subscription(text,text,boolean) to service_role;
grant execute on function public.expire_subscription(text,text) to service_role;
