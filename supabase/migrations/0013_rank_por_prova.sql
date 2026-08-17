-- ============================================================
-- INTERNATIONAL FRESHMAN — rank por PROVA aprovada (migration 0013)
-- Antes, rank_parts contava partes com todas as aulas concluidas.
-- Agora conta partes cuja PROVA foi aprovada, de forma consecutiva
-- a partir da Parte I — que e o que o rank sempre significou
-- ("passei da parte"). Freshman -> Sophomore -> Junior -> Senior -> Graduate.
-- Rode DEPOIS de 0001..0012.
-- ============================================================

create or replace function public.compute_rank(p_user uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  v_rank integer := 0;
  p integer;
begin
  -- conta 1, 2, 3, 4 partes consecutivas com prova aprovada
  for p in 1..4 loop
    if exists (
      select 1 from public.exam_results
      where user_id = p_user and part = p and passed
    ) then
      v_rank := v_rank + 1;
    else
      exit;
    end if;
  end loop;
  return v_rank;
end; $$;

-- recalcular o rank a partir do resultado das provas
create or replace function public.sync_rank_from_exam()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set rank_parts = public.compute_rank(new.user_id)
    where id = new.user_id;
  return null;
end; $$;
drop trigger if exists trg_rank_from_exam on public.exam_results;
create trigger trg_rank_from_exam
  after insert or update on public.exam_results
  for each row execute procedure public.sync_rank_from_exam();

-- o trigger antigo (que mexia no rank ao concluir aula) volta a cuidar
-- só do contador de aulas concluídas, sem tocar no rank
create or replace function public.sync_chapters_done()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  v_user := coalesce(new.user_id, old.user_id);
  update public.profiles set chapters_done = (
    select count(*) from public.lesson_progress
    where user_id = v_user and status = 'concluido'
  ) where id = v_user;
  return null;
end; $$;

-- recalcular todo mundo uma vez com a nova regra
update public.profiles pr set rank_parts = public.compute_rank(pr.id);
