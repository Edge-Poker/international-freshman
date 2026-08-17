-- =====================================================================
-- 0017 — HOTFIX: listagens do painel admin vazias no Supabase real.
--
-- Causa raiz: auth.users.email é VARCHAR(255) no Supabase, mas
-- admin_list_users e admin_list_subscriptions declaram a coluna de
-- retorno como TEXT. O RETURN QUERY do plpgsql valida a estrutura de
-- forma estrita e falha com:
--   "structure of query does not match function result type
--    Returned type character varying(255) does not match expected
--    type text"
-- O serviço engole o erro da RPC e o painel renderiza "0 contas".
--
-- Correção: cast explícito u.email::text no SELECT de saída das duas
-- funções. Nenhuma outra linha muda; create or replace preserva owner
-- e grants. Dashboard (jsonb) e admin_get_user (jsonb) nunca foram
-- afetados porque retornam jsonb, sem checagem estrutural de colunas.
--
-- Aplicar no SQL Editor após a 0016. Idempotente.
-- =====================================================================

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
    p.id, p.name, p.nickname, p.avatar_url, u.email::text,
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
    s.id, s.user_id, p.name, p.nickname, p.avatar_url, u.email::text,
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
