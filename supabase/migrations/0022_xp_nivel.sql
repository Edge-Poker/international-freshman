-- =====================================================================
-- 0022 — XP E NÍVEL FUNCIONAIS
--
-- Problemas que esta migration resolve:
--   1. O XP era somado no app a cada vez que a aula era marcada como
--      concluída — desmarcar e marcar de novo inflava o número. Como a
--      aba Jogadores ordena por XP, isso distorcia o ranking.
--   2. profiles.level nunca era atualizado: todo mundo ficava "nível 1"
--      para sempre, um número decorativo na tela.
--
-- Como passa a funcionar:
--   • O XP é CALCULADO a partir do progresso real, não incrementado.
--     Assim é impossível farmar: refazer algo não gera XP novo, e o
--     valor se autocorrige se o progresso mudar (inclusive no reset).
--        50 XP por aula concluída        (40 aulas  = 2000)
--       300 XP por prova aprovada        (4 provas  = 1200)
--       total possível = 3200 XP
--   • O nível vem do XP, com faixas progressivas (cada nível exige
--     um pouco mais que o anterior).
--
-- Rode DEPOIS de 0001..0021. Idempotente.
-- =====================================================================

-- ------------------------------------------------------------
-- 1) XP = função do progresso real
-- ------------------------------------------------------------
create or replace function public.compute_xp(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select
    coalesce((
      select count(*) * 50 from public.lesson_progress
      where user_id = p_user and status = 'concluido'
    ), 0)
    +
    coalesce((
      select count(*) * 300 from public.exam_results
      where user_id = p_user and passed
    ), 0);
$$;

-- ------------------------------------------------------------
-- 2) Nível = faixa de XP (progressivo: 300, 400, 500, 600, 700)
--       nível 1 →      0 XP
--       nível 2 →    300
--       nível 3 →    700
--       nível 4 →  1 200
--       nível 5 →  1 800
--       nível 6 →  2 500
--       nível 7 →  3 200  (máximo: curso e provas completos)
-- ------------------------------------------------------------
create or replace function public.compute_level(p_xp integer)
returns integer language sql immutable set search_path = public as $$
  select case
    when coalesce(p_xp, 0) >= 3200 then 7
    when coalesce(p_xp, 0) >= 2500 then 6
    when coalesce(p_xp, 0) >= 1800 then 5
    when coalesce(p_xp, 0) >= 1200 then 4
    when coalesce(p_xp, 0) >=  700 then 3
    when coalesce(p_xp, 0) >=  300 then 2
    else 1
  end;
$$;

/** XP em que o próximo nível começa (null quando já está no topo). */
create or replace function public.level_threshold(p_level integer)
returns integer language sql immutable set search_path = public as $$
  select case p_level
    when 1 then 0
    when 2 then 300
    when 3 then 700
    when 4 then 1200
    when 5 then 1800
    when 6 then 2500
    when 7 then 3200
    else null
  end;
$$;

-- ------------------------------------------------------------
-- 3) Sincronização: recalcula xp e level do usuário
-- ------------------------------------------------------------
create or replace function public.sync_xp_level(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_xp integer;
begin
  v_xp := public.compute_xp(p_user);
  update public.profiles
     set xp = v_xp,
         level = public.compute_level(v_xp)
   where id = p_user;
end; $$;

create or replace function public.on_progress_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_xp_level(coalesce(new.user_id, old.user_id));
  return null;
end; $$;

-- dispara ao concluir/desmarcar aula e ao registrar resultado de prova
drop trigger if exists trg_xp_from_progress on public.lesson_progress;
create trigger trg_xp_from_progress
  after insert or update or delete on public.lesson_progress
  for each row execute procedure public.on_progress_xp();

drop trigger if exists trg_xp_from_exam on public.exam_results;
create trigger trg_xp_from_exam
  after insert or update or delete on public.exam_results
  for each row execute procedure public.on_progress_xp();

-- ------------------------------------------------------------
-- 4) O reset de progresso continua zerando tudo: como o XP agora é
--    derivado, basta recalcular ao final (o core já zera as tabelas).
-- ------------------------------------------------------------
create or replace function public._reset_progress_core(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.lesson_progress  where user_id = p_user;
  delete from public.exam_results     where user_id = p_user;
  delete from public.study_sessions   where user_id = p_user;
  delete from public.daily_streaks    where user_id = p_user;
  delete from public.reading_history  where user_id = p_user;
  delete from public.favorites        where user_id = p_user;
  delete from public.forum_favorites  where user_id = p_user;
  delete from public.user_badges      where user_id = p_user;
  delete from public.highlighted_texts where user_id = p_user;

  update public.profiles
    set chapters_done = 0, rank_parts = 0, xp = 0, level = 1,
        streak_days = 0, last_study_at = null, four_aces_at = null
  where id = p_user;

  -- garante coerência caso algo tenha sobrado
  perform public.sync_xp_level(p_user);
end; $$;

-- ------------------------------------------------------------
-- 5) Correção retroativa: recalcula todo mundo com a regra nova
--    (quem tinha XP inflado volta ao valor real)
-- ------------------------------------------------------------
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.sync_xp_level(r.id);
  end loop;
end $$;
