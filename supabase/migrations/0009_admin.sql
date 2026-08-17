-- ============================================================
-- INTERNATIONAL FRESHMAN — administracao e moderacao (migration 0009)
-- 1) Banimento de contas (imposto no banco, nao so na tela)
-- 2) Fixar posts do forum por 1h, 24h, 1 semana ou indefinido
-- 3) Selo de verificado: quem e admin (is_admin) ganha o selo
-- Como criar um admin: rode no SQL Editor
--   update public.profiles set is_admin = true where nickname = 'SEUNICK';
-- Rode DEPOIS de 0001..0008.
-- ============================================================

-- ---------- BANIMENTO ----------
alter table public.profiles add column if not exists is_banned boolean not null default false;

create or replace function public.is_banned() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select is_banned from public.profiles where id = auth.uid()), false) $$;

-- admin bane/desbane; nao pode banir a si mesmo nem outro admin
create or replace function public.set_ban(p_user uuid, p_banned boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'apenas administradores'; end if;
  if p_user = auth.uid() then raise exception 'nao da para banir a si mesmo'; end if;
  if exists (select 1 from public.profiles where id = p_user and is_admin) then
    raise exception 'nao da para banir outro administrador';
  end if;
  update public.profiles set is_banned = p_banned where id = p_user;
end; $$;

-- contas banidas nao conseguem mais escrever (regra no banco)
drop policy if exists "topics_insert" on public.forum_topics;
create policy "topics_insert" on public.forum_topics
  for insert with check (auth.uid() = user_id and not public.is_banned());

drop policy if exists "posts_insert" on public.forum_posts;
create policy "posts_insert" on public.forum_posts
  for insert with check (auth.uid() = user_id and not public.is_banned());

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id and not public.is_banned());

drop policy if exists "msg_insert" on public.messages;
create policy "msg_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and not public.is_banned()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)
    )
  );

drop policy if exists "votes_own" on public.forum_votes;
create policy "votes_own" on public.forum_votes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and not public.is_banned());

-- ---------- FIXAR POSTS ----------
alter table public.forum_topics add column if not exists pinned_until timestamptz;
create index if not exists idx_ftopics_pinned on public.forum_topics(pinned_until)
  where pinned_until is not null;

-- opcoes: '1h', '24h', '1w', 'forever', 'unpin'
create or replace function public.set_pin(p_topic bigint, p_option text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'apenas administradores'; end if;
  if p_option not in ('1h', '24h', '1w', 'forever', 'unpin') then
    raise exception 'opcao invalida';
  end if;
  update public.forum_topics set pinned_until = case p_option
    when '1h' then now() + interval '1 hour'
    when '24h' then now() + interval '24 hours'
    when '1w' then now() + interval '7 days'
    when 'forever' then timestamptz '9999-01-01'
    else null
  end
  where id = p_topic;
end; $$;
