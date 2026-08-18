-- ============================================================
-- INTERNATIONAL FRESHMAN — modelagem completa do banco (Supabase/Postgres)
-- Migration 0001: tabelas, relacionamentos, indices e RLS
-- ============================================================

-- ---------- PERFIS ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  -- @handle publico do usuario: aparece no forum, no chat e em /u/[nickname].
  -- Fica nulo ate o usuario escolher um (o trigger da 0024 preenche a partir
  -- do metadata do cadastro e resolve colisao somando um numero).
  nickname text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free','pro','vitalicio')),
  xp integer not null default 0,
  level integer not null default 1,
  streak_days integer not null default 0,
  last_study_at timestamptz,
  is_admin boolean not null default false,
  is_moderator boolean not null default false,
  created_at timestamptz not null default now()
);

-- Unicidade do nickname SEM diferenciar maiuscula/minuscula: e assim que
-- public.nickname_disponivel (0023) e o trigger da 0024 comparam, e o
-- cadastro depende de receber erro de unique para avisar "ja esta em uso".
-- Multiplos NULL sao permitidos, entao quem ainda nao escolheu nao conflita.
create unique index idx_profiles_nickname_lower
  on public.profiles (lower(nickname));

-- cria o profile automaticamente no signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'avatar_url');
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- ---------- ESTRUTURA DO CURSO ----------
create table public.parts (
  id serial primary key,
  slug text unique not null,
  title text not null,
  subtitle text,
  position integer not null
);

create table public.chapters (
  id serial primary key,
  part_id integer not null references public.parts(id) on delete cascade,
  slug text unique not null,
  title text not null,
  summary text,
  body_md text,            -- conteudo em markdown
  est_minutes integer not null default 15,
  position integer not null,
  is_free boolean not null default false
);
create index idx_chapters_part on public.chapters(part_id, position);

-- busca full text (portugues)
alter table public.chapters add column search tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_md,'')), 'C')
  ) stored;
create index idx_chapters_search on public.chapters using gin(search);

-- ---------- PROGRESSO ----------
create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id integer not null references public.chapters(id) on delete cascade,
  status text not null default 'nao_iniciado' check (status in ('nao_iniciado','em_andamento','concluido')),
  seconds_studied integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

create table public.study_sessions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id integer references public.chapters(id) on delete set null,
  started_at timestamptz not null default now(),
  seconds integer not null default 0
);
create index idx_sessions_user on public.study_sessions(user_id, started_at desc);

create table public.daily_streaks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

create table public.reading_history (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id integer not null references public.chapters(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

-- ---------- INTERACAO COM CONTEUDO ----------
create table public.notes (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id integer not null references public.chapters(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notes_user_chapter on public.notes(user_id, chapter_id);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id integer not null references public.chapters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

create table public.highlighted_texts (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id integer not null references public.chapters(id) on delete cascade,
  quote text not null,
  created_at timestamptz not null default now()
);
create index idx_highlights_user on public.highlighted_texts(user_id, chapter_id);

-- ---------- GAMIFICACAO ----------
create table public.badges (
  id serial primary key,
  slug text unique not null,
  title text not null,
  description text,
  icon text
);

create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id integer not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.achievements (
  id serial primary key,
  slug text unique not null,
  title text not null,
  description text,
  xp_reward integer not null default 0
);

-- ---------- FORUM E COMENTARIOS ----------
create table public.forum_categories (
  id serial primary key,
  slug text unique not null,
  title text not null,
  description text,
  position integer not null default 0
);

create table public.forum_topics (
  id bigserial primary key,
  category_id integer not null references public.forum_categories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_topics_category on public.forum_topics(category_id, created_at desc);

create table public.forum_posts (
  id bigserial primary key,
  topic_id bigint not null references public.forum_topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_posts_topic on public.forum_posts(topic_id, created_at);

create table public.comments (
  id bigserial primary key,
  chapter_id integer not null references public.chapters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_comments_chapter on public.comments(chapter_id, created_at);

create table public.reports (
  id bigserial primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('topic','post','comment')),
  target_id bigint not null,
  reason text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- PLANOS, NOTIFICACOES, SUPORTE ----------
create table public.plans (
  id serial primary key,
  slug text unique not null,
  title text not null,
  price_cents integer not null,
  interval text not null check (interval in ('monthly','yearly','lifetime')),
  features jsonb not null default '[]'
);

create table public.subscriptions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id integer not null references public.plans(id),
  status text not null default 'active' check (status in ('active','canceled','past_due')),
  started_at timestamptz not null default now(),
  ends_at timestamptz
);
create index idx_subs_user on public.subscriptions(user_id);

create table public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notif_user on public.notifications(user_id, read, created_at desc);

create table public.support_messages (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  body text not null,
  answered boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.parts enable row level security;
alter table public.chapters enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.study_sessions enable row level security;
alter table public.daily_streaks enable row level security;
alter table public.reading_history enable row level security;
alter table public.notes enable row level security;
alter table public.favorites enable row level security;
alter table public.highlighted_texts enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.achievements enable row level security;
alter table public.forum_categories enable row level security;
alter table public.forum_topics enable row level security;
alter table public.forum_posts enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.support_messages enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

-- perfis: leitura publica (nome/avatar no forum), escrita propria
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- conteudo do curso: leitura para autenticados, escrita so admin
create policy "parts_select" on public.parts for select using (true);
create policy "parts_admin" on public.parts for all using (public.is_admin());
create policy "chapters_select" on public.chapters for select using (true);
create policy "chapters_admin" on public.chapters for all using (public.is_admin());

-- dados do usuario: cada um ve e edita so o seu
create policy "progress_own" on public.lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_own" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "streaks_own" on public.daily_streaks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "history_own" on public.reading_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_own" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorites_own" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "highlights_own" on public.highlighted_texts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- gamificacao: leitura publica, atribuicao via service role
create policy "badges_select" on public.badges for select using (true);
create policy "user_badges_select" on public.user_badges for select using (true);
create policy "achievements_select" on public.achievements for select using (true);

-- forum: leitura para todos autenticados, escrita propria, moderacao
create policy "fcat_select" on public.forum_categories for select using (true);
create policy "fcat_admin" on public.forum_categories for all using (public.is_admin());
create policy "topics_select" on public.forum_topics for select using (true);
create policy "topics_insert" on public.forum_topics for insert with check (auth.uid() = user_id);
create policy "topics_update_own" on public.forum_topics for update using (auth.uid() = user_id or public.is_admin());
create policy "topics_delete" on public.forum_topics for delete using (auth.uid() = user_id or public.is_admin());
create policy "posts_select" on public.forum_posts for select using (true);
create policy "posts_insert" on public.forum_posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on public.forum_posts for update using (auth.uid() = user_id or public.is_admin());
create policy "posts_delete" on public.forum_posts for delete using (auth.uid() = user_id or public.is_admin());
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_delete" on public.comments for delete using (auth.uid() = user_id or public.is_admin());
create policy "reports_insert" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "reports_admin" on public.reports for select using (public.is_admin());

-- planos e assinaturas
create policy "plans_select" on public.plans for select using (true);
create policy "subs_own" on public.subscriptions for select using (auth.uid() = user_id);

-- notificacoes e suporte
create policy "notif_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notif_update_own" on public.notifications for update using (auth.uid() = user_id);
create policy "support_insert" on public.support_messages for insert with check (auth.uid() = user_id);
create policy "support_own" on public.support_messages for select using (auth.uid() = user_id or public.is_admin());
