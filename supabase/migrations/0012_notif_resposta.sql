-- ============================================================
-- INTERNATIONAL FRESHMAN — notificação de resposta no fórum (migration 0012)
-- 1) Notificações passam a ter um "tipo" (kind) para separar
--    menções/respostas (aba Notificações) de mensagens (que
--    passam a notificar SÓ na aba Mensagens).
-- 2) notify_user grava o kind; mensagens deixam de virar
--    notificação na central.
-- 3) Ao responder uma postagem, o autor do tópico recebe
--    automaticamente uma notificação de resposta (estilo Twitter),
--    sem duplicar quando a resposta também menciona o autor.
-- Rode DEPOIS de 0001..0011.
-- ============================================================

alter table public.notifications add column if not exists kind text not null default 'mention';

-- notify_user agora recebe e grava o kind; mensagens NÃO entram na central
create or replace function public.notify_user(
  p_user uuid, p_title text, p_body text, p_url text, p_kind text
) returns void language plpgsql security definer set search_path = public as $$
declare v_prefs record;
begin
  if auth.uid() is null or p_user is null or p_user = auth.uid() then return; end if;
  if public.blocked_between(auth.uid(), p_user) then return; end if;
  -- mensagens privadas notificam apenas na aba Mensagens (badge), nunca na central
  if p_kind = 'message' then return; end if;

  select notify_messages, notify_mentions, notify_only_mutuals
    into v_prefs from public.profiles where id = p_user;
  if v_prefs is null then return; end if;
  if p_kind in ('mention', 'reply') and not v_prefs.notify_mentions then return; end if;
  if v_prefs.notify_only_mutuals then
    if not (
      exists (select 1 from public.follows where follower_id = p_user and followed_id = auth.uid())
      and exists (select 1 from public.follows where follower_id = auth.uid() and followed_id = p_user)
    ) then return; end if;
  end if;
  insert into public.notifications (user_id, title, body, url, kind)
    values (p_user, p_title, p_body, p_url, p_kind);
end; $$;

-- resposta em postagem: avisa o autor do tópico automaticamente
create or replace function public.notify_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_topic record;
  v_autor_resp text;
begin
  select t.user_id, t.title into v_topic
    from public.forum_topics t where t.id = new.topic_id;
  if v_topic.user_id is null or v_topic.user_id = new.user_id then
    return null; -- respondeu a própria postagem: não notifica
  end if;
  select nickname into v_autor_resp from public.profiles where id = new.user_id;

  -- respeita bloqueio e preferências (via notify_user seria com auth.uid();
  -- aqui inserimos direto porque estamos no contexto do trigger)
  if public.blocked_between(new.user_id, v_topic.user_id) then return null; end if;
  if not exists (
    select 1 from public.profiles
    where id = v_topic.user_id and notify_mentions
  ) then return null; end if;
  if exists (
    select 1 from public.profiles p
    where p.id = v_topic.user_id and p.notify_only_mutuals
      and not (
        exists (select 1 from public.follows where follower_id = v_topic.user_id and followed_id = new.user_id)
        and exists (select 1 from public.follows where follower_id = new.user_id and followed_id = v_topic.user_id)
      )
  ) then return null; end if;

  insert into public.notifications (user_id, title, body, url, kind)
  values (
    v_topic.user_id,
    coalesce('@' || v_autor_resp, 'Alguém') || ' respondeu sua postagem',
    left(new.body, 120),
    '/forum/' || new.topic_id,
    'reply'
  );
  return null;
end; $$;
drop trigger if exists trg_notify_reply on public.forum_posts;
create trigger trg_notify_reply
  after insert on public.forum_posts
  for each row execute procedure public.notify_reply();
