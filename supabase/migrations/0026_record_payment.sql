-- =====================================================================
-- 0026 — REGISTRO DE PAGAMENTO VIA RPC (robusto)
--
-- SINTOMA
-- Após um pagamento real aprovado, a assinatura ativou (RPC
-- activate_subscription, security definer), mas a tabela payments
-- ficou vazia — então o dashboard financeiro não registrou a venda.
--
-- CAUSA
-- O webhook gravava em payments com INSERT direto pelo client
-- service_role. Esse caminho depende de a chave service_role estar
-- correta na Vercel E de a RLS permitir a escrita. A ativação da
-- assinatura funciona porque é uma função security definer; o INSERT
-- direto, não.
--
-- SOLUÇÃO
-- Uma RPC security definer dedicada a registrar o pagamento. Rodando
-- com privilégios da função (como a de ativação), ela escreve em
-- payments independentemente da RLS e de qual chave chama. O webhook
-- passa a chamar esta RPC em vez do INSERT direto. Idempotente pelo
-- par (provider, provider_payment_id).
--
-- Rode DEPOIS de 0001..0025. Idempotente.
-- =====================================================================

create or replace function public.record_payment(
  p_user uuid,
  p_plan_slug text,
  p_provider text,
  p_provider_payment_id text,
  p_amount_cents integer,
  p_status text,
  p_paid_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  -- valida status contra o CHECK da tabela
  if p_status not in ('approved','pending','rejected','refunded','chargeback') then
    p_status := 'pending';
  end if;

  -- idempotência: se o pagamento já existe, atualiza o status
  select id into v_id from public.payments
    where provider = p_provider and provider_payment_id = p_provider_payment_id;

  if v_id is null then
    insert into public.payments (
      user_id, plan_slug, provider, provider_payment_id,
      amount_cents, currency, status, paid_at, metadata
    ) values (
      p_user, p_plan_slug, p_provider, p_provider_payment_id,
      coalesce(p_amount_cents, 0), 'BRL', p_status, p_paid_at,
      coalesce(p_metadata, '{}'::jsonb)
    ) returning id into v_id;
  else
    update public.payments set
      status = p_status,
      amount_cents = coalesce(p_amount_cents, amount_cents),
      paid_at = coalesce(p_paid_at, paid_at),
      metadata = coalesce(p_metadata, metadata)
    where id = v_id;
  end if;

  return v_id;
end; $$;

revoke all on function public.record_payment(uuid,text,text,text,integer,text,timestamptz,jsonb)
  from public, anon;
grant execute on function public.record_payment(uuid,text,text,text,integer,text,timestamptz,jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- BACKFILL — registra o pagamento que já ativou assinatura mas não
-- entrou em payments. Reconstrói a partir das assinaturas ativas do
-- Mercado Pago que ainda não têm pagamento correspondente.
-- O valor vem do preço atual do plano (aproximação para o histórico).
-- ---------------------------------------------------------------------
insert into public.payments (
  user_id, subscription_id, plan_slug, provider, provider_payment_id,
  amount_cents, currency, status, paid_at, metadata
)
select
  s.user_id, s.id, pl.slug, s.provider, s.provider_payment_id,
  pl.price_cents, 'BRL', 'approved', coalesce(s.started_at, s.created_at),
  jsonb_build_object('backfill', true)
from public.subscriptions s
join public.plans pl on pl.id = s.plan_id
where s.provider = 'mercadopago'
  and s.provider_payment_id is not null
  and not exists (
    select 1 from public.payments p
    where p.provider = s.provider
      and p.provider_payment_id = s.provider_payment_id
  );
