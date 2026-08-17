# How to Be an International Freshman — plataforma de curso

Plataforma de curso online para estudantes internacionais, construída a partir do
ebook *How to Be an International Freshman*.

Stack: **Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · Framer Motion ·
Supabase (Auth + Postgres + Storage) · Zod**. Pronta para deploy na Vercel.

> **Origem:** este repositório é uma adaptação da plataforma EDGE Poker. Toda a
> engenharia (auth, leitor, fórum, chat, provas, gamificação, painel admin,
> billing, RLS) foi reaproveitada; o tema, o conteúdo, as rotas e a interface
> foram reescritos. Os comentários do código seguem em português.

## Estado atual

O `npm run build` passa e as 34 rotas geram. **O conteúdo integral do ebook já está
carregado** (introdução + 12 capítulos + conclusão).

### Curso

14 leituras agrupadas em 4 partes — o agrupamento alimenta o rank:

| Parte | Tema | Leituras |
| --- | --- | --- |
| I | Landing | Introdução, Cap. 1–2 |
| II | Finding your footing | Cap. 3–5 |
| III | Standing on your own | Cap. 6–7 |
| IV | Building the career | Cap. 8–12, Conclusão |

Grátis no plano Free: Introdução e Capítulo 1.

### O que já funciona

- **Landing** (`app/page.tsx`): hero com o mapa do currículo animado, pilares,
  currículo completo, depoimentos (placeholders), planos e FAQ.
- **Auth** completa via Supabase: login, cadastro, recuperação de senha, OAuth
  Google e GitHub, confirmação de e-mail, captcha Turnstile.
- **Leitor de aulas** estilo Notion: tema claro/escuro, tamanho de fonte e largura
  ajustáveis (persistidos), favoritar, marcar como concluído, cronômetro de estudo.
- **Provas**: 4 provas (uma por parte), 6 questões, 70% para passar, correção no
  servidor, desbloqueio progressivo das partes.
- **Gamificação**: XP, nível, streak, badges e **rank por ano acadêmico** —
  Freshman → Sophomore → Junior → Senior → Graduate (`components/profile/rank-badge.tsx`).
- **Fórum**: tópicos, respostas, votos, menções `@nickname`, anexos, fixar,
  denúncias e busca full-text (configurada em **inglês**).
- **Social**: perfis públicos `/u/[nickname]`, seguir, bloquear, chat privado,
  diretório de estudantes ranqueado por XP.
- **Painel admin**: usuários, moderação, assinaturas, financeiro com gráficos,
  suporte e logs de auditoria.
- **Billing**: planos, checkout, webhook com validação de assinatura, histórico.
- **Segurança**: RLS em todas as tabelas, gating por middleware, o corpo das aulas
  nunca vai para o banco (migration 0023).

## O que falta antes de lançar

1. **Revisar o texto extraído.** O conteúdo foi convertido do PDF para markdown
   automaticamente e revisado por amostragem (395 parágrafos, 73 subtítulos, 38
   citações, sem artefatos de bloco). Vale uma leitura final capítulo a capítulo
   em `content/course.ts` — sobretudo quebras de parágrafo em trechos longos.
2. **Revisar as provas.** As 24 questões de `content/exams.ts` foram escritas a
   partir do texto real, mas confira as da Parte IV (CPT/OPT, SSN, 20h semanais):
   são as únicas que dependem de regras que mudam com o tempo.
3. **Gateway de pagamento.** A integração é **Mercado Pago**, que cobra em **BRL**,
   enquanto a interface exibe **USD** (`lib/format.ts`, constante `CURRENCY`).
   Para vender a estudantes internacionais, o caminho natural é trocar por Stripe:
   o acoplamento está isolado em `lib/mercadopago.ts` + `lib/billing.ts` +
   `app/api/webhooks/mercadopago/route.ts`.
4. **Placeholders**: e-mail de suporte (`lib/support.ts`), domínio
   (`app/layout.tsx`, `metadataBase`), depoimentos da landing (são ilustrativos),
   nome da marca (`components/brand-logo.tsx`, constante `BRAND`).

### Preços

Estão na faixa de **validação** definida no documento de produto — $9 mensal, $19
anual, $29 vitalício (`supabase/migrations/0019_precos_planos.sql`, a UI nunca fixa
preço no frontend). O plano pós-validação previsto é $29–$49, e até $79+ no bundle
com vídeo.

## Como rodar

1. Crie um projeto no [Supabase](https://supabase.com) e rode as migrations de
   `supabase/migrations` **em ordem numérica** (0001 → 0026) no SQL Editor.
2. Em Authentication → Providers, ative Email, Google e GitHub.
3. Copie `.env.example` para `.env.local` e preencha as chaves.
4. `npm install && npm run dev` → http://localhost:3000

O primeiro usuário vira admin marcando `is_admin = true` na tabela `profiles`.

### Alterar o curso

`content/course.ts` é a fonte única — estrutura **e** texto. O corpo das aulas nunca
vai para o banco (decisão de segurança da migration 0023): o servidor lê direto do
arquivo. Se mudar título, resumo, ordem ou `isFree`, regenere o seed:

```
npx tsx scripts/gen-seed.ts > supabase/migrations/0004_perfil_e_curso.sql
```

Ou popule um banco já existente:

```
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-curso.ts
```

**Nunca altere um slug existente** — o progresso salvo depende dele.

### Fontes

`app/layout.tsx` usa stacks de sistema para o repo buildar offline. Para tipografia
premium (Archivo/Inter/JetBrains) no deploy, troque por `next/font/google` — o
comentário no topo do arquivo mostra como.

## Estrutura

```
app/            rotas: (auth), (app)/dashboard|course|forum|exam|admin..., pricing
components/     ui, landing, course, forum, chat, profile, billing, admin, exam
actions/        server actions, uma por domínio
content/        course.ts (estrutura + corpo) · exams.ts (banco de questões, server-only)
lib/            regras de negócio, acesso, billing, integrações, supabase/
supabase/       migrations 0001..0026
scripts/        gen-seed.ts (gera a 0004) · seed-curso.ts (popula um banco existente)
```

### Notas de nomenclatura

Alguns identificadores internos ficaram em português, herdados do projeto de
origem, porque são referenciados em muitos pontos e não aparecem para o usuário:

- slugs de plano: `free`, `pro` (mensal), `anual`, `vitalicio`
- coluna `profiles.four_aces_at` — hoje significa "atingiu o rank Graduate"
- nomes de arquivo de migration (`0007_rank_cartas.sql` etc.)
