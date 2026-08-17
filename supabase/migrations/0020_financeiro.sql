-- =====================================================================
-- 0020 — MÓDULO FINANCEIRO (painel administrativo)
--
-- Cria APENAS a camada de leitura/agregação financeira. Não integra
-- gateway, não processa pagamento, não cria webhook: a fonte de dados
-- é a tabela public.payments (criada na 0016), que hoje está vazia e
-- será alimentada pelo webhook do gateway na etapa seguinte.
--
-- Toda agregação acontece no banco (uma chamada por indicador/série),
-- para o painel escalar com milhares de usuários sem N+1 no app.
--
-- Definições adotadas (conforme especificação do produto):
--   • Receita Mensal  = valor aprovado recebido no MÊS CORRENTE
--   • Receita Anual   = valor aprovado nos ÚLTIMOS 12 MESES
--   • Receita Total   = todo o valor aprovado desde o início
--   • Ticket médio    = receita total ÷ nº de pagantes distintos
-- Só entram pagamentos com status 'approved' (pending/rejected/
-- refunded/chargeback nunca contam como receita).
--
-- Rode DEPOIS de 0001..0019. Idempotente.
-- =====================================================================

-- ------------------------------------------------------------
-- 1) VISÃO GERAL — todos os indicadores numa única chamada
-- ------------------------------------------------------------
create or replace function public.admin_finance_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
  v_total_cents bigint;
  v_pagantes bigint;
begin
  perform public.assert_admin();

  select coalesce(sum(amount_cents), 0)
    into v_total_cents
    from public.payments where status = 'approved';

  select count(distinct user_id)
    into v_pagantes
    from public.payments where status = 'approved';

  select jsonb_build_object(
    -- receita (em centavos; a UI formata)
    'revenue_month_cents', (
      select coalesce(sum(amount_cents), 0) from public.payments
      where status = 'approved'
        and coalesce(paid_at, created_at) >= date_trunc('month', now())),
    'revenue_year_cents', (
      select coalesce(sum(amount_cents), 0) from public.payments
      where status = 'approved'
        and coalesce(paid_at, created_at) > now() - interval '12 months'),
    'revenue_total_cents', v_total_cents,

    -- ticket médio = receita total ÷ pagantes distintos (0 se não houver)
    'paying_users', v_pagantes,
    'avg_ticket_cents', case when v_pagantes > 0
      then round(v_total_cents::numeric / v_pagantes)::bigint else 0 end,

    -- assinaturas ativas (vigentes, incluindo vitalícias)
    'subs_active', (
      select count(*) from public.subscriptions s
      join public.plans pl on pl.id = s.plan_id
      where public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval)),

    -- usuários por nível de acesso
    'users_free',    (select count(*) from public.profiles where plan = 'free'),
    'users_premium', (select count(*) from public.profiles where plan <> 'free'),

    -- receita e volume por plano (fonte: pagamentos aprovados)
    'by_plan', (
      select coalesce(jsonb_agg(x order by x->>'slug'), '[]'::jsonb) from (
        select jsonb_build_object(
                 'slug', coalesce(pay.plan_slug, 'desconhecido'),
                 'title', coalesce(pl.title, initcap(coalesce(pay.plan_slug, 'desconhecido'))),
                 'interval', pl.interval,
                 'revenue_cents', sum(pay.amount_cents),
                 'sales', count(*)
               ) as x
        from public.payments pay
        left join public.plans pl on pl.slug = pay.plan_slug
        where pay.status = 'approved'
        group by pay.plan_slug, pl.title, pl.interval
      ) t),

    -- distribuição de assinaturas vigentes por plano (independe de pagamento)
    'subs_by_plan', (
      select coalesce(jsonb_agg(y order by y->>'slug'), '[]'::jsonb) from (
        select jsonb_build_object(
                 'slug', pl.slug,
                 'title', pl.title,
                 'interval', pl.interval,
                 'count', count(*)
               ) as y
        from public.subscriptions s
        join public.plans pl on pl.id = s.plan_id
        where public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval)
        group by pl.slug, pl.title, pl.interval
      ) t2),

    -- plano mais vendido (por nº de pagamentos aprovados)
    'best_seller', (
      select jsonb_build_object(
               'slug', pay.plan_slug,
               'title', coalesce(pl.title, initcap(coalesce(pay.plan_slug,''))),
               'sales', count(*))
      from public.payments pay
      left join public.plans pl on pl.slug = pay.plan_slug
      where pay.status = 'approved'
      group by pay.plan_slug, pl.title
      order by count(*) desc
      limit 1),

    -- sinaliza à UI se já existe qualquer dado financeiro
    'has_data', (select exists (select 1 from public.payments where status = 'approved'))
  ) into v;

  return v;
end; $$;

-- ------------------------------------------------------------
-- 2) SÉRIE: receita ao longo do tempo (gráfico de linha)
--    Devolve TODOS os meses do intervalo, inclusive os zerados,
--    para o gráfico não ficar com buracos.
-- ------------------------------------------------------------
create or replace function public.admin_finance_revenue_series(p_months integer default 12)
returns table (bucket date, revenue_cents bigint, sales bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();

  return query
  with meses as (
    select generate_series(
      date_trunc('month', now()) - make_interval(months => greatest(p_months, 1) - 1),
      date_trunc('month', now()),
      interval '1 month'
    )::date as bucket
  )
  select
    m.bucket,
    coalesce(sum(p.amount_cents), 0)::bigint,
    count(p.id)::bigint
  from meses m
  left join public.payments p
    on p.status = 'approved'
   and date_trunc('month', coalesce(p.paid_at, p.created_at))::date = m.bucket
  group by m.bucket
  order by m.bucket;
end; $$;

-- ------------------------------------------------------------
-- 3) SÉRIE: novas assinaturas por período (gráfico de linha)
-- ------------------------------------------------------------
create or replace function public.admin_finance_new_subs_series(p_months integer default 12)
returns table (bucket date, novas bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();

  return query
  with meses as (
    select generate_series(
      date_trunc('month', now()) - make_interval(months => greatest(p_months, 1) - 1),
      date_trunc('month', now()),
      interval '1 month'
    )::date as bucket
  )
  select
    m.bucket,
    count(s.id)::bigint
  from meses m
  left join public.subscriptions s
    on date_trunc('month', coalesce(s.created_at, s.started_at))::date = m.bucket
  group by m.bucket
  order by m.bucket;
end; $$;

-- ------------------------------------------------------------
-- 4) Permissões — mesmo padrão das demais RPCs administrativas:
--    nunca expostas a anon; a própria função revalida is_admin.
-- ------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_finance_overview()',
    'public.admin_finance_revenue_series(integer)',
    'public.admin_finance_new_subs_series(integer)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
