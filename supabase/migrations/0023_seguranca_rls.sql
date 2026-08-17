-- =====================================================================
-- 0023 — CORREÇÃO DE SEGURANÇA (vazamento de conteúdo pela API)
--
-- PROBLEMA ENCONTRADO
-- A chave publishable do Supabase é pública por natureza: ela aparece
-- no navegador de qualquer visitante, e isso é esperado. Quem protege
-- os dados é a RLS. Só que várias tabelas estavam com política de
-- leitura aberta (`using (true)`), inclusive `chapters`, que guardava
-- o texto integral das 40 aulas em body_md. Resultado: qualquer pessoa
-- com a chave conseguia baixar o curso inteiro, o fórum e a lista de
-- usuários, sem conta e sem assinatura.
--
-- ESTRATÉGIA
-- 1. Tirar o conteúdo do banco. O app NUNCA lê body_md: as aulas são
--    renderizadas de content/curso.ts, no servidor, que não vai para o
--    navegador. A cópia no banco era dado morto — e dado morto que
--    vaza é só passivo. Removida a coluna, não há o que roubar.
-- 2. Fechar a leitura das demais tabelas: conteúdo de assinante exige
--    assinatura; o resto exige, no mínimo, estar autenticado.
--
-- Rode DEPOIS de 0001..0022. Idempotente.
-- =====================================================================

-- ------------------------------------------------------------
-- 1) O CONTEÚDO SAI DO BANCO
--    A coluna `search` é gerada a partir de body_md e some junto.
--    Nada no app usa nenhuma das duas (verificado).
-- ------------------------------------------------------------
alter table public.chapters drop column if exists search;
alter table public.chapters drop column if exists body_md;

-- ------------------------------------------------------------
-- 2) QUEM TEM ACESSO PREMIUM (espelha lib/access.ts no banco)
--    Admin sempre tem; os demais precisam de assinatura vigente.
-- ------------------------------------------------------------
create or replace function public.tem_acesso_premium()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.is_admin
        or exists (
          select 1
          from public.subscriptions s
          join public.plans pl on pl.id = s.plan_id
          where s.user_id = p.id
            and public.subscription_grants_access(
                  s.status, s.ends_at, s.current_period_end, pl.interval)
        )
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

-- ------------------------------------------------------------
-- 3) ESTRUTURA DO CURSO — só para quem está autenticado.
--    (Títulos e resumos; o texto das aulas não mora mais aqui.)
-- ------------------------------------------------------------
drop policy if exists "parts_select" on public.parts;
create policy "parts_select" on public.parts
  for select using (auth.uid() is not null);

drop policy if exists "chapters_select" on public.chapters;
create policy "chapters_select" on public.chapters
  for select using (auth.uid() is not null);

-- ------------------------------------------------------------
-- 4) FÓRUM — conteúdo de assinante, exige assinatura para LER.
--    Antes qualquer visitante anônimo conseguia baixar tudo.
-- ------------------------------------------------------------
drop policy if exists "topics_select" on public.forum_topics;
create policy "topics_select" on public.forum_topics
  for select using (public.tem_acesso_premium());

drop policy if exists "posts_select" on public.forum_posts;
create policy "posts_select" on public.forum_posts
  for select using (public.tem_acesso_premium());

drop policy if exists "votes_select" on public.forum_votes;
create policy "votes_select" on public.forum_votes
  for select using (public.tem_acesso_premium());

drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (public.tem_acesso_premium());

drop policy if exists "fcat_select" on public.forum_categories;
create policy "fcat_select" on public.forum_categories
  for select using (auth.uid() is not null);

-- ------------------------------------------------------------
-- 5) PERFIS — só para autenticados. Antes, a lista completa de
--    usuários (nome, @, plano, quem é admin) era pública.
-- ------------------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);

-- ------------------------------------------------------------
-- 6) GAMIFICAÇÃO — sem motivo para ser pública.
-- ------------------------------------------------------------
drop policy if exists "badges_select" on public.badges;
create policy "badges_select" on public.badges
  for select using (auth.uid() is not null);

drop policy if exists "user_badges_select" on public.user_badges;
create policy "user_badges_select" on public.user_badges
  for select using (auth.uid() is not null);

drop policy if exists "achievements_select" on public.achievements;
create policy "achievements_select" on public.achievements
  for select using (auth.uid() is not null);

drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows
  for select using (auth.uid() is not null);

-- ------------------------------------------------------------
-- 7) PLANOS seguem públicos DE PROPÓSITO: a página /planos precisa
--    exibir preços para quem ainda não tem conta. São dados
--    comerciais, feitos para serem vistos.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 8) CADASTRO — a checagem de nickname livre acontece ANTES de
--    existir sessão, e com perfis fechados ela pararia de funcionar.
--    Esta função responde apenas "está livre?", sem expor nada.
-- ------------------------------------------------------------
create or replace function public.nickname_disponivel(p_nick text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.profiles where lower(nickname) = lower(trim(p_nick))
  );
$$;

revoke all on function public.nickname_disponivel(text) from public;
grant execute on function public.nickname_disponivel(text) to anon, authenticated, service_role;
