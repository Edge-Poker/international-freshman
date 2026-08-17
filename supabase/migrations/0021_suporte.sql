-- =====================================================================
-- 0021 — SUPORTE (canal oficial de atendimento)
--
-- Reaproveita a tabela public.support_messages, que já existia desde a
-- 0001 e nunca havia sido usada. Nada é recriado: só acrescentamos o
-- assunto e as RPCs de leitura/baixa para o painel administrativo.
--
-- Substitui o botão flutuante de WhatsApp por um canal com histórico:
-- a mensagem chega vinculada à conta (nickname, plano, e-mail), sem
-- precisar pedir esses dados ao usuário.
--
-- Rode DEPOIS de 0001..0020. Idempotente.
-- =====================================================================

-- ------------------------------------------------------------
-- 1) Campos novos
-- ------------------------------------------------------------
alter table public.support_messages add column if not exists subject text;
alter table public.support_messages add column if not exists answered_at timestamptz;

create index if not exists idx_support_recent
  on public.support_messages (answered, created_at desc);

-- ------------------------------------------------------------
-- 2) Envio pelo usuário — a RLS já permite inserir em nome próprio
--    (policy support_insert, da 0001). Contas banidas não enviam.
-- ------------------------------------------------------------
drop policy if exists "support_insert" on public.support_messages;
create policy "support_insert" on public.support_messages
  for insert with check (auth.uid() = user_id and not public.is_banned());

-- ------------------------------------------------------------
-- 3) Painel: listar mensagens com os dados de quem escreveu
-- ------------------------------------------------------------
create or replace function public.admin_list_support(
  p_status text default 'todas',   -- todas | abertas | respondidas
  p_limit  integer default 30,
  p_offset integer default 0
) returns table (
  id bigint,
  user_id uuid,
  user_name text,
  user_nickname text,
  user_avatar_url text,
  user_email text,
  user_plan text,
  subject text,
  body text,
  answered boolean,
  answered_at timestamptz,
  created_at timestamptz,
  total_count bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();

  return query
  select
    s.id, s.user_id, p.name, p.nickname, p.avatar_url, u.email::text, p.plan,
    s.subject, s.body, s.answered, s.answered_at, s.created_at,
    count(*) over ()
  from public.support_messages s
  left join public.profiles p on p.id = s.user_id
  left join auth.users u on u.id = s.user_id
  where (case p_status
    when 'abertas'     then not s.answered
    when 'respondidas' then s.answered
    else true end)
  order by s.answered asc, s.created_at desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
end; $$;

-- ------------------------------------------------------------
-- 4) Painel: marcar como respondida / reabrir
-- ------------------------------------------------------------
create or replace function public.admin_set_support_answered(
  p_id bigint, p_answered boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  update public.support_messages
     set answered = p_answered,
         answered_at = case when p_answered then now() else null end
   where id = p_id;
  perform public.log_admin_event('suporte_atualizado', null, 'support', p_id::text,
    jsonb_build_object('answered', p_answered));
end; $$;

-- ------------------------------------------------------------
-- 5) Permissões — mesmo padrão das demais RPCs administrativas
-- ------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_list_support(text,integer,integer)',
    'public.admin_set_support_answered(bigint,boolean)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
