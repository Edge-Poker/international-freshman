-- =====================================================================
-- 0025 — IDEMPOTÊNCIA DA ATIVAÇÃO POR PAGAMENTO (Checkout Pro)
--
-- CONTEXTO
-- O Checkout Pro gera um provider_payment_id por compra (não um
-- provider_subscription_id, que é do produto de Assinaturas). A RPC
-- activate_subscription (0014) só desduplicava por subscription_id;
-- com pagamentos avulsos, o Mercado Pago reenvia a mesma notificação
-- algumas vezes, e isso criaria assinaturas repetidas.
--
-- Esta migration adiciona uma sobrecarga que também desduplica por
-- provider_payment_id, sem alterar a função original. O webhook chama
-- exatamente esta assinatura (com p_provider_payment_id).
--
-- Rode DEPOIS de 0001..0024. Idempotente.
-- =====================================================================

-- índice que garante um pagamento único por provedor a nível de dados
create unique index if not exists subscriptions_provider_payment_uidx
  on public.subscriptions (provider, provider_payment_id)
  where provider is not null and provider_payment_id is not null;

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

  -- idempotência 1: mesma assinatura de provedor (produto Assinaturas)
  if p_provider_subscription_id is not null then
    select id into v_id from public.subscriptions
      where provider = p_provider
        and provider_subscription_id = p_provider_subscription_id;
  end if;

  -- idempotência 2: mesmo pagamento (Checkout Pro reenvia a notificação)
  if v_id is null and p_provider_payment_id is not null then
    select id into v_id from public.subscriptions
      where provider = p_provider
        and provider_payment_id = p_provider_payment_id;
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
