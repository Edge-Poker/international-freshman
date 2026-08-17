-- ============================================================
-- INTERNATIONAL FRESHMAN — perfil + seed do curso (migration 0004)
-- Adiciona chapters_done ao profile e popula parts/chapters,
-- para que o progresso e a % do curso funcionem.
-- GERADO por scripts/gen-seed.ts a partir de content/course.ts.
-- Nao edite a mao: rode `npx tsx scripts/gen-seed.ts > supabase/migrations/0004_perfil_e_curso.sql`.
-- Rode DEPOIS de 0001, 0002 e 0003.
-- ============================================================

alter table public.profiles add column if not exists chapters_done integer not null default 0;

insert into public.parts (slug, title, subtitle, position) values ('part-1', 'Part I', 'Landing', 1)
  on conflict (slug) do update set title = excluded.title, subtitle = excluded.subtitle, position = excluded.position;
insert into public.parts (slug, title, subtitle, position) values ('part-2', 'Part II', 'Finding your footing', 2)
  on conflict (slug) do update set title = excluded.title, subtitle = excluded.subtitle, position = excluded.position;
insert into public.parts (slug, title, subtitle, position) values ('part-3', 'Part III', 'Standing on your own', 3)
  on conflict (slug) do update set title = excluded.title, subtitle = excluded.subtitle, position = excluded.position;
insert into public.parts (slug, title, subtitle, position) values ('part-4', 'Part IV', 'Building the career', 4)
  on conflict (slug) do update set title = excluded.title, subtitle = excluded.subtitle, position = excluded.position;

insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-1'), 'introduction', 'Introduction', 'The conversation nobody sat you down for: why getting in was the easy part, and what this guide is actually going to tell you.', 4, 1, true)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-1'), 'nobody-warns-you-about-this-part', 'Chapter 1. Nobody Warns You About This Part', 'The first weeks, the freeze, and the comfort trap — why almost every international student goes through the same shock, and how not to let it run too long.', 6, 2, true)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-1'), 'nobody-is-going-to-save-you-here', 'Chapter 2. Nobody Is Going to Save You Here', 'How the American university system actually works: choosing professors over classes, reading your own degree, and why office hours are an advantage.', 7, 3, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-2'), 'you-are-who-youre-around', 'Chapter 3. You Are Who You''re Around', 'The three types of people you need, the comfortable circle going nowhere, and how to build real relationships instead of fake networking.', 6, 1, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-2'), 'being-there-is-not-enough', 'Chapter 4. Being There Is Not Enough', 'Clubs and organizations done right: quality over quantity, why events are not entertainment, and how leadership goes to whoever stays.', 5, 2, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-2'), 'you-dont-have-a-time-problem', 'Chapter 5. You Don''t Have a Time Problem', 'Getting it out of your head, planning the week before it starts, and protecting your energy rather than just your hours.', 4, 3, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-3'), 'nobody-taught-you-how-to-live', 'Chapter 6. Nobody Taught You How to Live', 'The vacation mindset, money, and the kind of independence nobody prepares you for before you land.', 4, 1, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-3'), 'you-dont-need-to-have-it-figured-out', 'Chapter 7. You Don''t Need to Have It Figured Out', 'The overthinking trap, the major you chose without really knowing, and how to ask better questions about your direction.', 4, 2, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-4'), 'your-resume-starts-before-you-write-it', 'Chapter 8. Your Resume Starts Before You Write It', 'What a resume actually is, the language that works, and how to build a LinkedIn profile before you have "real" experience.', 4, 1, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-4'), 'get-the-job-on-campus-first', 'Chapter 9. Get the Job on Campus First', 'The visa piece, why campus work is about more than money, and the specific roles worth chasing in your first year.', 4, 2, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-4'), 'the-clock-you-dont-know-is-ticking', 'Chapter 10. The Clock You Don''t Know Is Ticking', 'CPT and OPT in plain language: how each one works, the mistake that erases your eligibility, and the timeline you cannot miss.', 4, 3, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-4'), 'the-internship-nobody-handed-you', 'Chapter 11. The Internship Nobody Handed You', 'The reality for international students, the applications-only trap, how the search actually works, and the coffee chat.', 4, 4, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-4'), 'the-stuff-that-happens-inside-your-head', 'Chapter 12. The Stuff That Happens Inside Your Head', 'Imposter syndrome far from home, the weight of other people''s expectations, and why your mental health is not extra credit.', 4, 5, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;
insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ((select id from public.parts where slug = 'part-4'), 'conclusion', 'Conclusion', 'The version of you that arrived without this book, and what to do with the four years in front of you.', 4, 6, false)
  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;

