-- ============================================================
-- INTERNATIONAL FRESHMAN — precos e beneficios (migration 0019)
-- Ajusta valores comerciais e textos exibidos na pagina /pricing
-- (a UI le tudo da tabela plans). Apenas UPDATE, nada estrutural.
-- Rode DEPOIS de 0001..0018.
--
-- Os slugs sao internos e continuam em portugues por compatibilidade
-- com o codigo de billing — ver o cabecalho de 0002_seed.sql.
-- ============================================================

-- Precos (em centavos). Ajuste aqui: a UI nunca fixa preco no frontend.
-- Faixa de VALIDACAO ($9-$19) definida no documento de produto. Depois de
-- validado, o plano previsto e $29-$49, e ate $79+ no bundle com video.
update public.plans set price_cents = 900  where slug = 'pro';        -- Monthly  $9
update public.plans set price_cents = 1900 where slug = 'anual';      -- Yearly   $19
update public.plans set price_cents = 2900 where slug = 'vitalicio';  -- Lifetime $29

-- Plano gratuito: capitulo 1 + dashboard limitado
update public.plans set description =
  'The Introduction and Chapter 1, plus a limited dashboard.'
  where slug = 'free';
update public.plans set features =
  '["Introduction and Chapter 1","Limited dashboard"]'::jsonb
  where slug = 'free';

update public.plans set features =
  '["Everything in Monthly","Two months free","One payment per year","Priority on new features"]'::jsonb
  where slug = 'anual';

update public.plans set features =
  '["Everything in Yearly","Permanent access","All future updates","Priority on new features"]'::jsonb
  where slug = 'vitalicio';

update public.plans set description =
  'Full access for a whole year, for well under the monthly price.'
  where slug = 'anual';
update public.plans set description =
  'One payment, access forever, all future updates and priority on new features.'
  where slug = 'vitalicio';
