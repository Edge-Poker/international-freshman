-- =====================================================================
-- 0018 — REFINAMENTOS (Etapa de ajustes pré-Mercado Pago)
--
-- Cobre as partes do prompt que exigem banco:
--   5. reset de conta pelo próprio usuário (RPC self-service) e
--      unificação do reset admin para apagar TAMBÉM favoritos,
--      conquistas e favoritos do fórum;
--   6. novo usuário segue automaticamente os admins + backfill
--      idempotente para as contas já existentes;
--   7. notificação de novo tópico de quem eu sigo;
--   8. discussão fechada (is_locked) passa a bloquear respostas de
--      NÃO-admin no banco (enforcement real, antes só cosmético);
--   9. provas: retake livre já funciona no app; aqui só garantimos
--      que best_score/passed/attempts nunca regridam, via trigger,
--      protegendo o histórico mesmo contra escrita fora do fluxo.
--
-- Tudo aditivo e idempotente. NÃO toca em Mercado Pago, webhook,
-- gating de página (o gating do curso é aplicado na UI nesta etapa)
-- nem na estrutura de assinaturas.
-- =====================================================================

-- ------------------------------------------------------------
-- 5) RESET DE PROGRESSO — função compartilhada + wrappers
--
-- Uma função central (_reset_progress_core) executa a limpeza; o
-- reset admin e o self-service reusam a MESMA lógica, sem duplicar.
-- Apaga só progresso/gamificação; preserva conta, assinatura, posts,
-- comentários, follows, perfil e configurações.
-- ------------------------------------------------------------
create or replace function public._reset_progress_core(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.lesson_progress  where user_id = p_user;
  delete from public.exam_results     where user_id = p_user;
  delete from public.study_sessions   where user_id = p_user;
  delete from public.daily_streaks    where user_id = p_user;
  delete from public.reading_history  where user_id = p_user;
  delete from public.favorites        where user_id = p_user;  -- favoritos do curso
  delete from public.forum_favorites  where user_id = p_user;  -- favoritos do fórum
  delete from public.user_badges      where user_id = p_user;  -- conquistas
  delete from public.highlighted_texts where user_id = p_user; -- destaques de leitura

  update public.profiles
    set chapters_done = 0, rank_parts = 0, xp = 0, level = 1,
        streak_days = 0, last_study_at = null, four_aces_at = null
  where id = p_user;
end; $$;

-- admin: agora delega ao core (comportamento ampliado p/ favoritos e conquistas)
create or replace function public.admin_reset_progress(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  perform public._reset_progress_core(p_user);
  perform public.log_admin_event('progresso_resetado', p_user, 'user', p_user::text);
end; $$;

-- self-service: o próprio usuário reinicia o próprio progresso
create or replace function public.reset_my_progress()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  perform public._reset_progress_core(v_uid);
  -- auditoria: registra como ação do próprio usuário (ator = alvo)
  perform public.log_admin_event('progresso_resetado', v_uid, 'user', v_uid::text,
    jsonb_build_object('origem', 'self_service'));
end; $$;

-- ------------------------------------------------------------
-- 9) PROVAS — protege o histórico: best_score/passed/attempts
--    nunca regridem, independentemente de como a linha for escrita.
--    O app já faz retake livre; isto é um cinto de segurança no banco.
-- ------------------------------------------------------------
create or replace function public.guard_exam_history()
returns trigger language plpgsql set search_path = public as $$
begin
  new.best_score := greatest(new.best_score, old.best_score);
  new.attempts   := greatest(new.attempts, old.attempts);
  -- uma vez aprovado, sempre aprovado; preserva a data da 1ª aprovação
  if old.passed then
    new.passed := true;
    new.passed_at := coalesce(old.passed_at, new.passed_at);
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_exam_history on public.exam_results;
create trigger trg_guard_exam_history
  before update on public.exam_results
  for each row execute procedure public.guard_exam_history();

-- ------------------------------------------------------------
-- 6) SEGUIR ADMINISTRADORES AUTOMATICAMENTE
--
-- Novo usuário não-admin passa a seguir todos os admins. Como o
-- profile nasce sem is_admin=true, disparamos no INSERT de profiles
-- (após handle_new_user) e também tratamos o backfill de quem já
-- existe. on conflict do nothing garante zero duplicação.
-- ------------------------------------------------------------
create or replace function public.follow_all_admins(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.follows (follower_id, followed_id)
  select p_user, a.id
    from public.profiles a
   where a.is_admin = true
     and a.id <> p_user
  on conflict (follower_id, followed_id) do nothing;
end; $$;

create or replace function public.on_profile_created_follow_admins()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(new.is_admin, false) then
    perform public.follow_all_admins(new.id);
  end if;
  return null;
end; $$;
drop trigger if exists trg_follow_admins on public.profiles;
create trigger trg_follow_admins
  after insert on public.profiles
  for each row execute procedure public.on_profile_created_follow_admins();

-- backfill idempotente: todo não-admin existente passa a seguir todo admin
insert into public.follows (follower_id, followed_id)
select p.id, a.id
  from public.profiles p
  cross join public.profiles a
 where a.is_admin = true
   and p.is_admin = false
   and p.id <> a.id
on conflict (follower_id, followed_id) do nothing;

-- ------------------------------------------------------------
-- 7) NOTIFICAÇÃO DE NOVO TÓPICO DE QUEM EU SIGO
--
-- Ao publicar um tópico, cada seguidor do autor recebe uma
-- notificação que abre o tópico. Respeita bloqueio e a preferência
-- notify_mentions (mesmo canal das menções/respostas). Exception-safe.
-- ------------------------------------------------------------
create or replace function public.notify_followers_new_topic()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_autor text;
begin
  select nickname into v_autor from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, title, body, url, kind)
  select
    f.follower_id,
    coalesce('@' || v_autor, 'Alguém') || ' publicou um novo tópico',
    left(new.title, 120),
    '/forum/' || new.id,
    'topic'
  from public.follows f
  join public.profiles pr on pr.id = f.follower_id
  where f.followed_id = new.user_id
    and f.follower_id <> new.user_id
    and pr.notify_mentions = true
    and not public.blocked_between(new.user_id, f.follower_id)
    and not (pr.notify_only_mutuals and not exists (
      select 1 from public.follows f2
      where f2.follower_id = new.user_id and f2.followed_id = f.follower_id));
  return null;
exception when others then
  return null; -- nunca derruba a publicação por causa de notificação
end; $$;
drop trigger if exists trg_notify_followers_topic on public.forum_topics;
create trigger trg_notify_followers_topic
  after insert on public.forum_topics
  for each row execute procedure public.notify_followers_new_topic();

-- ------------------------------------------------------------
-- 8) DISCUSSÃO FECHADA BLOQUEIA RESPOSTA (enforcement no banco)
--
-- Até aqui is_locked era só um selo administrativo. Agora, ao
-- inserir uma resposta, se o tópico estiver fechado e o autor não
-- for admin, a operação é barrada. Admin ainda pode responder (para
-- moderar/encerrar formalmente). Complementa a trava visual na UI.
-- ------------------------------------------------------------
create or replace function public.enforce_topic_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_locked boolean;
begin
  select is_locked into v_locked from public.forum_topics where id = new.topic_id;
  if coalesce(v_locked, false) and not public.is_admin() then
    raise exception 'Esta discussão foi fechada pela moderação e não aceita novas respostas.'
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;
drop trigger if exists trg_enforce_topic_lock on public.forum_posts;
create trigger trg_enforce_topic_lock
  before insert on public.forum_posts
  for each row execute procedure public.enforce_topic_lock();

-- ------------------------------------------------------------
-- 4) NOTIFICAÇÕES — persistem após lidas (a UI só remove o destaque)
--    e ficam capadas nas 20 mais recentes por usuário. A poda roda
--    no insert: ao passar de 20, apaga apenas as MAIS ANTIGAS.
-- ------------------------------------------------------------
create or replace function public.prune_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.notifications
   where user_id = new.user_id
     and id not in (
       select id from public.notifications
        where user_id = new.user_id
        order by created_at desc, id desc
        limit 20
     );
  return null;
end; $$;
drop trigger if exists trg_prune_notifications on public.notifications;
create trigger trg_prune_notifications
  after insert on public.notifications
  for each row execute procedure public.prune_notifications();

-- ------------------------------------------------------------
-- Permissões das novas RPCs chamáveis pelo cliente
-- ------------------------------------------------------------
revoke all on function public.reset_my_progress() from public, anon;
grant execute on function public.reset_my_progress() to authenticated, service_role;
-- funções internas (core/backfill/triggers) não são expostas ao cliente
revoke all on function public._reset_progress_core(uuid) from public, anon, authenticated;
grant execute on function public._reset_progress_core(uuid) to service_role;
revoke all on function public.follow_all_admins(uuid) from public, anon, authenticated;
grant execute on function public.follow_all_admins(uuid) to service_role;
