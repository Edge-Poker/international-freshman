-- ============================================================
-- INTERNATIONAL FRESHMAN — seed de dados estaticos (planos, badges, forum)
-- As PARTES e CAPITULOS sao inseridos pelo script scripts/seed-curso.ts,
-- que le content/course.ts (fonte unica de verdade da estrutura).
--
-- SLUGS DOS PLANOS: 'free' | 'pro' (mensal) | 'anual' | 'vitalicio'.
-- Sao chaves INTERNAS, herdadas do projeto de origem e referenciadas em
-- lib/mercadopago.ts, actions/billing.ts, o webhook e o painel admin.
-- NAO renomeie sem atualizar todos esses pontos — o texto exibido ao
-- usuario vem sempre de title/description/features, que estao em ingles.
--
-- PRECOS: price_cents em centavos. Os valores batem com a landing page,
-- mas o gateway integrado (Mercado Pago) cobra em BRL — ver README.
-- ============================================================

insert into public.plans (slug, title, price_cents, interval, features) values
  ('free',      'Free',     0,    'monthly', '["Introduction and Chapter 1","Basic progress tracking"]'),
  ('pro',       'Monthly',  900,  'monthly', '["Full guide","Notes and highlights","Forum","Exams and ranks"]'),
  ('vitalicio', 'Lifetime', 2900, 'lifetime','["Everything in Yearly","Permanent access","All future updates"]')
on conflict (slug) do nothing;

insert into public.badges (slug, title, description, icon) values
  ('first-chapter',   'Wheels Down',     'Finished your first chapter', 'play'),
  ('part-1',          'Landed',          'Finished Part I',             'flag'),
  ('part-2',          'Finding Footing', 'Finished Part II',            'compass'),
  ('part-3',          'On Your Own',     'Finished Part III',           'key'),
  ('week-1',          'First Week',      'Studied 7 days in total',     'flame'),
  ('streak-30',       '30 Days',         'Kept a 30-day streak',        'calendar'),
  ('streak-100',      '100 Days',        'Kept a 100-day streak',       'crown'),
  ('course-complete', 'Graduate',        'Finished the whole guide',    'graduation-cap')
on conflict (slug) do nothing;

insert into public.achievements (slug, title, description, xp_reward) values
  ('chapter-100', 'Chapter cleared', 'Finish a chapter',      50),
  ('part-100',    'Part cleared',    'Finish an entire part', 300),
  ('week-study',  'Full week',       'Study 7 days',          200)
on conflict (slug) do nothing;

insert into public.forum_categories (slug, title, description, position) values
  ('academics',   'Academics',         'Classes, professors, advising, exams and study strategy',    1),
  ('campus-life', 'Campus Life',       'Housing, clubs, friendships and everything outside class',   2),
  ('money',       'Money & Logistics', 'Banking, budgeting, phones, transport and daily life admin', 3),
  ('career',      'Career & Work',     'Resumes, on-campus jobs, CPT and OPT, internships',          4),
  ('introduce',   'Introduce Yourself','New here? Tell us where you came from',                      5)
on conflict (slug) do nothing;
