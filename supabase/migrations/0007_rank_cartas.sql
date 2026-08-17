-- ============================================================
-- INTERNATIONAL FRESHMAN — rank por ano academico (migration 0007)
-- profiles.rank_parts guarda quantas partes CONSECUTIVAS o
-- usuario completou (0 a 4), comecando da Parte I:
--   0 = Freshman | 1 = Sophomore | 2 = Junior | 3 = Senior | 4 = Graduate
-- Exibido por components/profile/rank-badge.tsx.
-- Recalculado pelo mesmo trigger do progresso.
-- Rode DEPOIS de 0001..0006.
-- ============================================================

alter table public.profiles add column if not exists rank_parts integer not null default 0;

-- quantas partes consecutivas (a partir da Parte I) estao 100% concluidas
create or replace function public.compute_rank(p_user uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  v_rank integer := 0;
  v_part record;
  v_total integer;
  v_done integer;
begin
  for v_part in select id from public.parts order by position loop
    select count(*) into v_total from public.chapters where part_id = v_part.id;
    select count(*) into v_done
      from public.lesson_progress lp
      join public.chapters c on c.id = lp.chapter_id
      where lp.user_id = p_user and lp.status = 'concluido' and c.part_id = v_part.id;
    if v_total > 0 and v_done = v_total then
      v_rank := v_rank + 1;
    else
      exit;
    end if;
  end loop;
  return v_rank;
end; $$;

-- trigger unico: mantem chapters_done E rank_parts
create or replace function public.sync_chapters_done()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  v_user := coalesce(new.user_id, old.user_id);
  update public.profiles set
    chapters_done = (
      select count(*) from public.lesson_progress
      where user_id = v_user and status = 'concluido'
    ),
    rank_parts = public.compute_rank(v_user)
  where id = v_user;
  return null;
end; $$;

-- recalcula para quem ja tem progresso salvo
update public.profiles pr set rank_parts = public.compute_rank(pr.id)
  where exists (select 1 from public.lesson_progress lp where lp.user_id = pr.id);
