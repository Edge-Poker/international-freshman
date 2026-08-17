-- ============================================================
-- INTERNATIONAL FRESHMAN — tempo estudado e streak (migration 0006)
-- Funcao que registra segundos de leitura, marca o dia no
-- calendario de estudo e recalcula o streak (dias seguidos).
-- Rode DEPOIS de 0001..0005.
-- ============================================================

create or replace function public.log_study_time(p_chapter_slug text, p_seconds integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_chapter integer;
  v_streak integer := 0;
  v_day date;
begin
  if auth.uid() is null then raise exception 'nao autenticado'; end if;
  -- limite de seguranca: cada batida registra no maximo 10 minutos
  if p_seconds is null or p_seconds < 0 or p_seconds > 600 then
    raise exception 'tempo invalido';
  end if;

  select id into v_chapter from public.chapters where slug = p_chapter_slug;
  if v_chapter is null then raise exception 'capitulo nao encontrado'; end if;

  -- soma o tempo na aula (cria o registro como "em andamento" se nao existir)
  insert into public.lesson_progress (user_id, chapter_id, status, seconds_studied, updated_at)
  values (auth.uid(), v_chapter, 'em_andamento', p_seconds, now())
  on conflict (user_id, chapter_id) do update set
    seconds_studied = public.lesson_progress.seconds_studied + excluded.seconds_studied,
    status = case
      when public.lesson_progress.status = 'nao_iniciado' then 'em_andamento'
      else public.lesson_progress.status
    end,
    updated_at = now();

  -- marca o dia de hoje no calendario de estudo
  insert into public.daily_streaks (user_id, day)
  values (auth.uid(), current_date)
  on conflict do nothing;

  -- streak: conta dias seguidos terminando hoje (ou ontem, se hoje ainda nao estudou)
  v_day := current_date;
  if not exists (select 1 from public.daily_streaks where user_id = auth.uid() and day = v_day) then
    v_day := current_date - 1;
  end if;
  while exists (select 1 from public.daily_streaks where user_id = auth.uid() and day = v_day) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  update public.profiles
    set streak_days = v_streak, last_study_at = now()
    where id = auth.uid();
end; $$;
