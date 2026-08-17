-- =====================================================================
-- 0024 — CONTA SÓ EXISTE DEPOIS DE CONFIRMAR O E-MAIL
--
-- PROBLEMA
-- Até aqui, o perfil em public.profiles era criado no INSTANTE do
-- cadastro, antes de qualquer confirmação. Quem digitasse um endereço
-- inexistente não conseguia entrar, mas deixava uma conta fantasma:
-- aparecia no painel admin, ocupava nickname e poluía a base. Em
-- volume (bot de cadastro), isso vira lixo e consumo de e-mail à toa.
--
-- SOLUÇÃO
-- O gatilho passa a criar o perfil somente quando o e-mail estiver
-- confirmado. Ele agora também dispara no UPDATE de email_confirmed_at,
-- que é o momento em que a pessoa clica no link. Enquanto não confirmar,
-- existe apenas a linha em auth.users (interna do Supabase) — nada no
-- app: nem perfil, nem lista de usuários, nem @ reservado.
--
-- Continua funcionando com a confirmação DESLIGADA: nesse modo o
-- Supabase já grava email_confirmed_at no próprio cadastro, e o
-- perfil nasce na hora, como antes.
--
-- Rode DEPOIS de 0001..0023. Idempotente.
-- =====================================================================

-- ------------------------------------------------------------
-- 1) Criação do perfil condicionada à confirmação
--
-- Detalhe: como o nickname deixa de ser reservado no cadastro, duas
-- pessoas podem escolher o mesmo antes de confirmar. Quem confirmar
-- depois recebe um sufixo numérico em vez de ver o cadastro falhar.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_nick text;
  v_i integer := 0;
begin
  -- ainda não confirmou: não cria nada no app
  if new.email_confirmed_at is null then
    return new;
  end if;

  -- já tem perfil (ex.: update posterior do usuário): nada a fazer
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  v_base := nullif(trim(new.raw_user_meta_data->>'nickname'), '');
  v_nick := v_base;

  -- resolve colisão de nickname sem quebrar a confirmação
  while v_nick is not null
    and exists (select 1 from public.profiles where lower(nickname) = lower(v_nick))
  loop
    v_i := v_i + 1;
    v_nick := v_base || v_i::text;
  end loop;

  insert into public.profiles (id, name, nickname, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    v_nick,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end; $$;

-- o gatilho passa a ouvir também a confirmação do e-mail
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2) LIMPEZA — remove as contas fantasma que já existem
--    Apaga o perfil de quem nunca confirmou (a linha em auth.users
--    é tratada no passo 3). Contas confirmadas não são tocadas.
-- ------------------------------------------------------------
delete from public.profiles p
where exists (
  select 1 from auth.users u
  where u.id = p.id and u.email_confirmed_at is null
);

-- ------------------------------------------------------------
-- 3) FAXINA PERIÓDICA — remove cadastros abandonados
--    Só apaga quem não confirmou E foi criado há mais de 24 horas,
--    para nunca atingir alguém que acabou de se cadastrar e ainda
--    vai clicar no link.
-- ------------------------------------------------------------
create or replace function public.limpar_cadastros_nao_confirmados(p_horas integer default 24)
returns integer language plpgsql security definer set search_path = public as $$
declare v_qtd integer;
begin
  perform public.assert_admin();

  with removidos as (
    delete from auth.users u
    where u.email_confirmed_at is null
      and u.created_at < now() - make_interval(hours => greatest(p_horas, 1))
    returning u.id
  )
  select count(*) into v_qtd from removidos;

  perform public.log_admin_event('cadastros_limpos', null, 'auth', null,
    jsonb_build_object('removidos', v_qtd, 'horas', p_horas));

  return v_qtd;
end; $$;

revoke all on function public.limpar_cadastros_nao_confirmados(integer) from public, anon;
grant execute on function public.limpar_cadastros_nao_confirmados(integer) to authenticated, service_role;

-- limpeza inicial das contas fantasma antigas já existentes
delete from auth.users u
where u.email_confirmed_at is null
  and u.created_at < now() - interval '1 hour';
