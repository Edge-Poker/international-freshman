-- ============================================================
-- INTERNATIONAL FRESHMAN — Forum completo (migration 0003)
-- Evolui as tabelas de forum: fotos, votos (like/dislike),
-- contagem de respostas, busca full-text e bucket de imagens.
-- Rode este arquivo no SQL Editor DEPOIS do 0001 e do 0002.
-- ============================================================

-- ---------- TOPICOS (a "pergunta" / mensagem principal) ----------
alter table public.forum_topics add column if not exists images text[] not null default '{}';
alter table public.forum_topics add column if not exists score integer not null default 0;
alter table public.forum_topics add column if not exists reply_count integer not null default 0;

-- busca full-text em portugues (titulo + corpo)
alter table public.forum_topics drop column if exists search;
alter table public.forum_topics add column search tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(body,'')), 'B')
  ) stored;
create index if not exists idx_ftopics_search on public.forum_topics using gin(search);
create index if not exists idx_ftopics_recent on public.forum_topics(created_at desc);

-- ---------- POSTS (as respostas / comentarios) ----------
alter table public.forum_posts drop column if exists likes;
alter table public.forum_posts add column if not exists images text[] not null default '{}';
alter table public.forum_posts add column if not exists score integer not null default 0;

alter table public.forum_posts drop column if exists search;
alter table public.forum_posts add column search tsvector
  generated always as (to_tsvector('english', coalesce(body,''))) stored;
create index if not exists idx_fposts_search on public.forum_posts using gin(search);

-- ---------- VOTOS (um por usuario, por alvo; permite trocar/desfazer) ----------
create table if not exists public.forum_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('topic','post')),
  target_id bigint not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
alter table public.forum_votes enable row level security;
drop policy if exists "votes_select" on public.forum_votes;
drop policy if exists "votes_own" on public.forum_votes;
create policy "votes_select" on public.forum_votes for select using (true);
create policy "votes_own" on public.forum_votes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Voto atomico: insere, troca ou desfaz e ajusta o score ----------
create or replace function public.cast_vote(p_type text, p_id bigint, p_value smallint)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_existing smallint;
  v_score integer;
begin
  if auth.uid() is null then raise exception 'nao autenticado'; end if;
  if p_type not in ('topic','post') then raise exception 'alvo invalido'; end if;
  if p_value not in (-1, 1) then raise exception 'voto invalido'; end if;

  select value into v_existing from public.forum_votes
    where user_id = auth.uid() and target_type = p_type and target_id = p_id;

  if v_existing is null then
    insert into public.forum_votes(user_id, target_type, target_id, value)
      values (auth.uid(), p_type, p_id, p_value);
    if p_type = 'topic' then
      update public.forum_topics set score = score + p_value where id = p_id returning score into v_score;
    else
      update public.forum_posts set score = score + p_value where id = p_id returning score into v_score;
    end if;
  elsif v_existing = p_value then
    delete from public.forum_votes
      where user_id = auth.uid() and target_type = p_type and target_id = p_id;
    if p_type = 'topic' then
      update public.forum_topics set score = score - p_value where id = p_id returning score into v_score;
    else
      update public.forum_posts set score = score - p_value where id = p_id returning score into v_score;
    end if;
  else
    update public.forum_votes set value = p_value
      where user_id = auth.uid() and target_type = p_type and target_id = p_id;
    if p_type = 'topic' then
      update public.forum_topics set score = score + (2 * p_value) where id = p_id returning score into v_score;
    else
      update public.forum_posts set score = score + (2 * p_value) where id = p_id returning score into v_score;
    end if;
  end if;
  return v_score;
end; $$;

-- ---------- Trigger: manter reply_count do topico ----------
create or replace function public.bump_reply_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_topics set reply_count = reply_count + 1 where id = new.topic_id;
  elsif tg_op = 'DELETE' then
    update public.forum_topics set reply_count = greatest(reply_count - 1, 0) where id = old.topic_id;
  end if;
  return null;
end; $$;
drop trigger if exists trg_reply_count on public.forum_posts;
create trigger trg_reply_count
  after insert or delete on public.forum_posts
  for each row execute procedure public.bump_reply_count();

-- ---------- Busca: topicos que batem no titulo/corpo OU tem resposta que bate ----------
create or replace function public.search_forum(q text)
returns setof public.forum_topics language sql stable set search_path = public as $$
  select * from public.forum_topics
  where id in (
    select t.id from public.forum_topics t
      where t.search @@ websearch_to_tsquery('english', q)
    union
    select p.topic_id from public.forum_posts p
      where p.search @@ websearch_to_tsquery('english', q)
  )
  order by created_at desc;
$$;

-- ---------- Bucket de imagens do forum ----------
insert into storage.buckets (id, name, public)
  values ('forum-images', 'forum-images', true)
  on conflict (id) do nothing;

drop policy if exists "forum_images_read" on storage.objects;
drop policy if exists "forum_images_upload" on storage.objects;
create policy "forum_images_read" on storage.objects
  for select using (bucket_id = 'forum-images');
create policy "forum_images_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'forum-images');
