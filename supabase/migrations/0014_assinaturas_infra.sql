-- ============================================================
-- INTERNATIONAL FRESHMAN — infraestrutura de assinaturas (migration 0014)
-- Etapa 1: fortalece a camada de dados. NÃO integra gateway,
-- NÃO cria checkout/webhook/UI. Apenas prepara a base.
--
-- Reutiliza as tabelas existentes (plans, subscriptions,
-- profiles.plan). NÃO recria nada — todas as alterações são
-- aditivas e idempotentes.
--
-- Rode DEPOIS de 0001..0013.
-- ============================================================

-- ------------------------------------------------------------
-- 1) SUBSCRIPTIONS — campos para integração futura com gateway
--    (adicionados só se ainda não existirem)
-- ------------------------------------------------------------
alter table public.subscriptions add column if not exists provider text;
alter table public.subscriptions add column if not exists provider_customer_id text;
alter table public.subscriptions add column if not exists provider_subscription_id text;
alter table public.subscriptions add column if not exists provider_payment_id text;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

-- status ganha 'expired' e 'incomplete' (mantém os já existentes).
-- Recria o CHECK de forma segura, sem recriar a tabela.
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('active','canceled','past_due','expired','incomplete'));

-- idempotência do webhook futuro: um id de assinatura do provedor é único
create unique index if not exists idx_subs_provider_sub
  on public.subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists idx_subs_user_status
  on public.subscriptions (user_id, status);

-- mantém updated_at coerente em qualquer escrita
create or replace function public.touch_subscription_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists trg_touch_subscription on public.subscriptions;
create trigger trg_touch_subscription
  before update on public.subscriptions
  for each row execute procedure public.touch_subscription_updated_at();

-- ------------------------------------------------------------
-- 2) FONTE DE VERDADE + CACHE
--    subscriptions é a verdade; profiles.plan é cache derivado.
--    Uma assinatura "concede acesso" quando está ativa e dentro
--    da validade (ou vitalícia / sem data de término).
-- ------------------------------------------------------------
create or replace function public.subscription_grants_access(
  p_status text, p_ends_at timestamptz, p_period_end timestamptz, p_interval text
) returns boolean language sql immutable set search_path = public as $$
  select p_status = 'active'
     and (
       p_interval = 'lifetime'
       or coalesce(p_period_end, p_ends_at) is null
       or coalesce(p_period_end, p_ends_at) > now()
     );
$$;

-- recalcula profiles.plan a partir da assinatura vigente do usuário.
-- Sem assinatura válida => 'free'. Prefere vitalícia; senão, a de
-- término mais distante.
create or replace function public.sync_profile_plan(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_slug text;
begin
  select pl.slug into v_slug
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.user_id = p_user
    and public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval)
  order by (pl.interval = 'lifetime') desc,
           coalesce(s.current_period_end, s.ends_at) desc nulls first
  limit 1;

  update public.profiles
    set plan = coalesce(v_slug, 'free')
    where id = p_user;
end; $$;

-- trigger: qualquer mudança em subscriptions ressincroniza o cache
create or replace function public.on_subscription_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_profile_plan(coalesce(new.user_id, old.user_id));
  return null;
end; $$;
drop trigger if exists trg_sync_plan on public.subscriptions;
create trigger trg_sync_plan
  after insert or update or delete on public.subscriptions
  for each row execute procedure public.on_subscription_change();

-- ------------------------------------------------------------
-- 3) RPCs de serviço (security definer) — a ÚNICA via de escrita
--    de assinatura. O cliente nunca faz insert/update direto.
--    Nesta etapa ficam prontas para o webhook/serviço chamar.
-- ------------------------------------------------------------

-- ativa (ou cria) a assinatura de um usuário para um plano (por slug)
create or replace function public.activate_subscription(
  p_user uuid,
  p_plan_slug text,
  p_provider text default null,
  p_provider_customer_id text default null,
  p_provider_subscription_id text default null,
  p_provider_payment_id text default null,
  p_current_period_end timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_plan_id integer; v_id bigint;
begin
  select id into v_plan_id from public.plans where slug = p_plan_slug;
  if v_plan_id is null then raise exception 'plano inexistente: %', p_plan_slug; end if;

  -- reaproveita a linha do mesmo provider_subscription_id, se houver (idempotência)
  if p_provider_subscription_id is not null then
    select id into v_id from public.subscriptions
      where provider = p_provider
        and provider_subscription_id = p_provider_subscription_id;
  end if;

  if v_id is null then
    insert into public.subscriptions (
      user_id, plan_id, status, started_at, current_period_end,
      provider, provider_customer_id, provider_subscription_id,
      provider_payment_id, metadata
    ) values (
      p_user, v_plan_id, 'active', now(), p_current_period_end,
      p_provider, p_provider_customer_id, p_provider_subscription_id,
      p_provider_payment_id, coalesce(p_metadata, '{}'::jsonb)
    ) returning id into v_id;
  else
    update public.subscriptions set
      plan_id = v_plan_id,
      status = 'active',
      current_period_end = p_current_period_end,
      provider_customer_id = coalesce(p_provider_customer_id, provider_customer_id),
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      cancel_at_period_end = false,
      metadata = coalesce(p_metadata, metadata)
    where id = v_id;
  end if;

  return v_id; -- o trigger já ressincronizou profiles.plan
end; $$;

-- renova o período (mantém ativa)
create or replace function public.renew_subscription(
  p_provider text, p_provider_subscription_id text, p_current_period_end timestamptz
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.subscriptions set
    status = 'active',
    current_period_end = p_current_period_end,
    cancel_at_period_end = false
  where provider = p_provider and provider_subscription_id = p_provider_subscription_id;
end; $$;

-- cancela: por padrão ao fim do período; imediato se p_immediate = true
create or replace function public.cancel_subscription(
  p_provider text, p_provider_subscription_id text, p_immediate boolean default false
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_immediate then
    update public.subscriptions set status = 'canceled', cancel_at_period_end = false
      where provider = p_provider and provider_subscription_id = p_provider_subscription_id;
  else
    update public.subscriptions set cancel_at_period_end = true
      where provider = p_provider and provider_subscription_id = p_provider_subscription_id;
  end if;
end; $$;

-- expira (fim de vigência sem renovação)
create or replace function public.expire_subscription(
  p_provider text, p_provider_subscription_id text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.subscriptions set status = 'expired'
    where provider = p_provider and provider_subscription_id = p_provider_subscription_id;
end; $$;

-- ------------------------------------------------------------
-- 4) RLS — usuário só LÊ a própria assinatura; nunca escreve.
--    Toda escrita ocorre via as funções security definer acima
--    (chamadas futuramente pelo webhook / service role).
-- ------------------------------------------------------------
alter table public.subscriptions enable row level security;

drop policy if exists "subs_own" on public.subscriptions;      -- select antigo
drop policy if exists "subs_select_own" on public.subscriptions;
drop policy if exists "subs_no_insert" on public.subscriptions;
drop policy if exists "subs_no_update" on public.subscriptions;
drop policy if exists "subs_no_delete" on public.subscriptions;

-- leitura: apenas a própria assinatura
create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- escrita direta do cliente: negada (sem policy de insert/update/delete
-- permissiva; as funções security definer contornam a RLS por design).

-- ------------------------------------------------------------
-- 5) Reconciliação inicial: garante que o cache bate com a verdade
--    para quem já tiver assinatura (no-op se a tabela estiver vazia).
-- ------------------------------------------------------------
do $$
declare r record;
begin
  for r in select distinct user_id from public.subscriptions loop
    perform public.sync_profile_plan(r.user_id);
  end loop;
end $$;
