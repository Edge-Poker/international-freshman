-- =====================================================================
-- 0016 — BILLING (Etapa 3): experiência de compra SEM gateway.
--
-- O que esta migration faz (tudo aditivo e idempotente):
--   1. plans.description — texto comercial exibido na página de planos
--      (a UI nunca usa preço/descrição fixos; tudo vem desta tabela).
--   2. Plano ANUAL — nova linha em plans (slug 'anual', interval yearly).
--   3. sync_profile_plan v2 — o cache profiles.plan tem CHECK
--      ('free','pro','vitalicio') e representa NÍVEL DE ACESSO, não o
--      plano comercial. Slugs novos passam a mapear pelo interval
--      (yearly → 'pro', lifetime → 'vitalicio'). Para os slugs já
--      existentes o comportamento é bit a bit idêntico ao da 0014.
--   4. payments — estrutura do histórico de pagamentos. NENHUM emissor
--      existe nesta etapa: a tabela nasce vazia e será alimentada pelo
--      webhook do gateway (etapa seguinte), que grava via service_role
--      (service_role ignora RLS). Cliente apenas LÊ o próprio histórico.
--
-- O que esta migration NÃO faz: Mercado Pago, webhook, preference,
-- processamento de pagamento, gating, cupom. (Escopo da Etapa 3.)
-- =====================================================================

-- ------------------------------------------------------------
-- 1) descrição comercial dos planos
-- ------------------------------------------------------------
alter table public.plans add column if not exists description text;

update public.plans set description =
  'The Introduction and Chapter 1 free, so you can see it before subscribing.'
  where slug = 'free';
update public.plans set description =
  'Full access to the guide, forum, notes and progress, billed monthly.'
  where slug = 'pro';
update public.plans set description =
  'One payment, permanent access and every future update.'
  where slug = 'vitalicio';

-- ------------------------------------------------------------
-- 2) plano ANUAL
--    Preço seed: R$ 348,00 (equivale a R$ 29/mês; ~25% abaixo do
--    mensal). Ajustável a qualquer momento por UPDATE — o frontend
--    sempre lê daqui.
-- ------------------------------------------------------------
insert into public.plans (slug, title, price_cents, interval, features, description)
values (
  'anual',
  'Yearly',
  1900,
  'yearly',
  '["Everything in Monthly","Two months free","One payment per year","Price locked for 12 months"]',
  'Full access for a whole year, for less than paying month to month.'
)
on conflict (slug) do nothing;

update public.plans set description =
  'Full access for a whole year, for less than paying month to month.'
  where slug = 'anual' and description is null;

-- ------------------------------------------------------------
-- 3) sync_profile_plan v2 — mapeia slugs novos pelo interval.
--    profiles.plan é cache de NÍVEL DE ACESSO (free/pro/vitalicio):
--    assinante do plano 'anual' tem acesso 'pro'. O plano comercial
--    real continua vindo de subscriptions → plans (é o que a página
--    de billing e o painel admin exibem).
--    create or replace preserva owner e grants da 0014.
-- ------------------------------------------------------------
create or replace function public.sync_profile_plan(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_slug text; v_interval text;
begin
  select pl.slug, pl.interval into v_slug, v_interval
  from public.subscriptions s
  join public.plans pl on pl.id = s.plan_id
  where s.user_id = p_user
    and public.subscription_grants_access(s.status, s.ends_at, s.current_period_end, pl.interval)
  order by (pl.interval = 'lifetime') desc,
           coalesce(s.current_period_end, s.ends_at) desc nulls first
  limit 1;

  update public.profiles
    set plan = case
      when v_slug is null then 'free'
      when v_slug in ('free', 'pro', 'vitalicio') then v_slug  -- comportamento 0014 intacto
      when v_interval = 'lifetime' then 'vitalicio'            -- slugs futuros lifetime
      else 'pro'                                               -- monthly/yearly novos (ex.: anual)
    end
    where id = p_user;
end; $$;

-- ------------------------------------------------------------
-- 4) payments — histórico de pagamentos (estrutura, sem emissores)
-- ------------------------------------------------------------
create table if not exists public.payments (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id bigint references public.subscriptions(id) on delete set null,
  plan_slug text,
  provider text,
  provider_payment_id text,
  amount_cents integer not null default 0,
  currency text not null default 'BRL',
  status text not null default 'pending'
    check (status in ('approved', 'pending', 'rejected', 'refunded', 'chargeback')),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.payments is
  'Histórico de pagamentos. Escrita EXCLUSIVA do webhook do gateway via '
  'service_role (ignora RLS). Nenhuma policy de escrita para o cliente, '
  'de propósito. Vazia até a integração do gateway.';

-- idempotência do webhook futuro: o mesmo pagamento nunca duplica
create unique index if not exists payments_provider_payment_uidx
  on public.payments (provider, provider_payment_id)
  where provider is not null and provider_payment_id is not null;

create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments
  for select using (auth.uid() = user_id or public.is_admin());

-- leitura para os papéis de app (RLS restringe as linhas); escrita fica
-- apenas com service_role/owner — nenhum grant de insert/update/delete.
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
grant usage, select on sequence public.payments_id_seq to service_role;
