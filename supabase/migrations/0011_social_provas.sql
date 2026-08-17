-- ============================================================
-- INTERNATIONAL FRESHMAN — social e provas (migration 0011)
-- Silenciar, bloquear, seguidores, menções/notificações,
-- favoritos do fórum, preferências e sistema de provas.
-- Rode DEPOIS de 0001..0010.
-- ============================================================

-- ---------- PERFIL: novas colunas ----------
alter table public.profiles add column if not exists is_silenced boolean not null default false;
alter table public.profiles add column if not exists notify_messages boolean not null default true;
alter table public.profiles add column if not exists notify_mentions boolean not null default true;
alter table public.profiles add column if not exists notify_only_mutuals boolean not null default false;
-- four_aces_at: nome herdado do projeto de origem (poker). Hoje marca
-- quando o usuario atingiu o rank GRADUATE, ao passar na prova final.
-- Mantido para nao renumerar/reescrever as migrations que o referenciam.
alter table public.profiles add column if not exists four_aces_at timestamptz;

create or replace function public.is_silenced() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select is_silenced from public.profiles where id = auth.uid()), false) $$;

-- admin silencia/dessilencia (mesmas protecoes do ban)
create or replace function public.set_silence(p_user uuid, p_silenced boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'apenas administradores'; end if;
  if p_user = auth.uid() then raise exception 'não dá para silenciar a si mesmo'; end if;
  if exists (select 1 from public.profiles where id = p_user and is_admin) then
    raise exception 'não dá para silenciar outro administrador';
  end if;
  update public.profiles set is_silenced = p_silenced where id = p_user;
end; $$;

-- ---------- BLOQUEIOS ----------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint block_distinto check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks_select_own" on public.blocks;
drop policy if exists "blocks_write_own" on public.blocks;
create policy "blocks_select_own" on public.blocks
  for select using (auth.uid() = blocker_id);
create policy "blocks_write_own" on public.blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

create or replace function public.blocked_between(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from public.blocks
     where (blocker_id = p_a and blocked_id = p_b)
        or (blocker_id = p_b and blocked_id = p_a)
   ) $$;

-- ---------- SEGUIDORES ----------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follow_distinto check (follower_id <> followed_id)
);
alter table public.follows enable row level security;
drop policy if exists "follows_select" on public.follows;
drop policy if exists "follows_write_own" on public.follows;
create policy "follows_select" on public.follows for select using (true);
create policy "follows_write_own" on public.follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- ---------- SILENCIADO NÃO ESCREVE (regras no banco) ----------
drop policy if exists "topics_insert" on public.forum_topics;
create policy "topics_insert" on public.forum_topics
  for insert with check (auth.uid() = user_id and not public.is_banned() and not public.is_silenced());

drop policy if exists "posts_insert" on public.forum_posts;
create policy "posts_insert" on public.forum_posts
  for insert with check (auth.uid() = user_id and not public.is_banned() and not public.is_silenced());

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id and not public.is_banned() and not public.is_silenced());

-- mensagens: silenciado não envia; par bloqueado não conversa
drop policy if exists "msg_insert" on public.messages;
create policy "msg_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and not public.is_banned()
    and not public.is_silenced()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a, c.user_b)
        and not public.blocked_between(c.user_a, c.user_b)
    )
  );

-- abrir conversa: respeita silêncio e bloqueio
create or replace function public.get_or_create_conversation(p_other uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_a uuid; v_b uuid; v_id bigint;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if p_other is null or p_other = auth.uid() then raise exception 'conversa inválida'; end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'usuário não encontrado';
  end if;
  if public.is_silenced() then
    raise exception 'sua conta está silenciada pela moderação';
  end if;
  if public.blocked_between(auth.uid(), p_other) then
    raise exception 'não é possível iniciar esta conversa';
  end if;
  v_a := least(auth.uid(), p_other);
  v_b := greatest(auth.uid(), p_other);
  select id into v_id from public.conversations where user_a = v_a and user_b = v_b;
  if v_id is null then
    insert into public.conversations (user_a, user_b) values (v_a, v_b) returning id into v_id;
  end if;
  return v_id;
end; $$;

-- ---------- NOTIFICAÇÕES ----------
alter table public.notifications add column if not exists url text;

-- criação centralizada: respeita preferências, privacidade e bloqueios
create or replace function public.notify_user(
  p_user uuid, p_title text, p_body text, p_url text, p_kind text
) returns void language plpgsql security definer set search_path = public as $$
declare v_prefs record;
begin
  if auth.uid() is null or p_user is null or p_user = auth.uid() then return; end if;
  if public.blocked_between(auth.uid(), p_user) then return; end if;
  select notify_messages, notify_mentions, notify_only_mutuals
    into v_prefs from public.profiles where id = p_user;
  if v_prefs is null then return; end if;
  if p_kind = 'message' and not v_prefs.notify_messages then return; end if;
  if p_kind = 'mention' and not v_prefs.notify_mentions then return; end if;
  if v_prefs.notify_only_mutuals then
    if not (
      exists (select 1 from public.follows where follower_id = p_user and followed_id = auth.uid())
      and exists (select 1 from public.follows where follower_id = auth.uid() and followed_id = p_user)
    ) then return; end if;
  end if;
  insert into public.notifications (user_id, title, body, url)
    values (p_user, p_title, p_body, p_url);
end; $$;

-- ---------- FAVORITOS DO FÓRUM ----------
create table if not exists public.forum_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id bigint not null references public.forum_topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);
alter table public.forum_favorites enable row level security;
drop policy if exists "ffav_own" on public.forum_favorites;
create policy "ffav_own" on public.forum_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- PROVAS ----------
create table if not exists public.exam_results (
  user_id uuid not null references public.profiles(id) on delete cascade,
  part integer not null check (part between 1 and 4),
  attempts integer not null default 0,
  last_score integer not null default 0,
  best_score integer not null default 0,
  passed boolean not null default false,
  passed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, part)
);
alter table public.exam_results enable row level security;
drop policy if exists "exam_own" on public.exam_results;
create policy "exam_own" on public.exam_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- conquista Os 4 Ases ao passar na prova final
create or replace function public.award_four_aces()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.part = 4 and new.passed then
    update public.profiles set four_aces_at = coalesce(four_aces_at, now())
      where id = new.user_id;
    insert into public.user_badges (user_id, badge_id)
      select new.user_id, b.id from public.badges b where b.slug = 'curso-completo'
      on conflict do nothing;
  end if;
  return null;
end; $$;
drop trigger if exists trg_four_aces on public.exam_results;
create trigger trg_four_aces
  after insert or update on public.exam_results
  for each row execute procedure public.award_four_aces();
