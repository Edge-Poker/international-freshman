/**
 * Valida as migrations sem Docker, sem nuvem e sem senha de admin.
 *
 * Sobe um Postgres de verdade em modo usuario (pacote embedded-postgres),
 * recria o minimo do ambiente Supabase (supabase-shim.sql), aplica as
 * migrations em ordem e roda um teste funcional dos gatilhos — que e onde
 * os bugs de verdade se escondem, porque `create or replace function` nao
 * valida o corpo no momento da criacao.
 *
 * Uso:
 *   npm i -D embedded-postgres
 *   node scripts/db-test/run.mjs
 *
 * NAO substitui um Supabase real: nao ha PostgREST nem GoTrue aqui, entao
 * as policies de RLS sao criadas mas nao exercitadas de ponta a ponta.
 */
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIG = path.join(HERE, "..", "..", "supabase", "migrations");
const DATA = path.join(HERE, ".pgdata");

let falhas = 0;
const check = (nome, ok, got) => {
  if (!ok) falhas++;
  console.log(`  ${ok ? "PASSA" : "FALHA"}  ${nome}${ok ? "" : `  -> ${got}`}`);
};

const pg = new EmbeddedPostgres({
  databaseDir: DATA,
  user: "postgres",
  password: "postgres",
  port: 54997,
  persistent: false,
});

fs.rmSync(DATA, { recursive: true, force: true });
await pg.initialise();
await pg.start();
await pg.createDatabase("freshman");
const c = pg.getPgClient("freshman");
await c.connect();
const q = async (s) => (await c.query(s)).rows;

// ---------- 1. migrations ----------
console.log("\n=== migrations ===");
await c.query(fs.readFileSync(path.join(HERE, "supabase-shim.sql"), "utf8"));
for (const f of fs.readdirSync(MIG).filter((x) => x.endsWith(".sql")).sort()) {
  try {
    await c.query(fs.readFileSync(path.join(MIG, f), "utf8"));
    console.log(`  OK    ${f}`);
  } catch (e) {
    falhas++;
    console.log(`  FALHA ${f}\n        ${e.message}`);
  }
}

// ---------- 2. estrutura ----------
console.log("\n=== estrutura ===");
const semRls = await q(`select tablename from pg_tables t where schemaname='public'
  and not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=t.tablename and c.relrowsecurity)`);
check("RLS ligada em todas as tabelas de public", semRls.length === 0,
  semRls.map((r) => r.tablename).join(", "));
check("parts semeadas", (await q("select count(*) n from parts"))[0].n === "4",
  (await q("select count(*) n from parts"))[0].n);
check("chapters semeados", (await q("select count(*) n from chapters"))[0].n === "14",
  (await q("select count(*) n from chapters"))[0].n);
check("4 planos", (await q("select count(*) n from plans"))[0].n === "4",
  (await q("select count(*) n from plans"))[0].n);

// ---------- 3. gatilhos ----------
console.log("\n=== cadastro ===");
await c.query(`insert into auth.users (id,email,raw_user_meta_data)
  values ('11111111-1111-1111-1111-111111111111','a@x.com','{"name":"Ana","nickname":"ana"}')`);
check("e-mail nao confirmado NAO cria perfil",
  (await q("select count(*) n from profiles"))[0].n === "0",
  (await q("select count(*) n from profiles"))[0].n);

await c.query(`update auth.users set email_confirmed_at=now() where email='a@x.com'`);
let r = await q("select nickname from profiles");
check("confirmar e-mail cria o perfil com nickname", r[0]?.nickname === "ana", r[0]?.nickname);

await c.query(`insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data)
  values ('22222222-2222-2222-2222-222222222222','b@x.com',now(),'{"nickname":"ANA"}')`);
r = await q(`select nickname from profiles where id='22222222-2222-2222-2222-222222222222'`);
check("colisao de nickname (case-insensitive) resolve", r[0]?.nickname === "ANA1", r[0]?.nickname);
check("nickname_disponivel respeita maiuscula/minuscula",
  (await q("select public.nickname_disponivel('AnA') v"))[0].v === false, "deu livre");

console.log("\n=== progresso, rank e XP ===");
const U = "11111111-1111-1111-1111-111111111111";
for (const part of [1, 2, 3, 4]) {
  const chs = await q(`select c.id from chapters c join parts p on p.id=c.part_id
                       where p.slug='part-${part}'`);
  for (const ch of chs)
    await c.query(`insert into lesson_progress (user_id,chapter_id,status)
                   values ('${U}',${ch.id},'concluido')`);
  if (part === 1) {
    r = await q(`select chapters_done, rank_parts from profiles where id='${U}'`);
    check("chapters_done acompanha as aulas concluidas", r[0].chapters_done === chs.length,
      r[0].chapters_done);
    check("rank so sobe com prova aprovada, nao com aula", r[0].rank_parts === 0, r[0].rank_parts);
  }
  await c.query(`insert into exam_results (user_id,part,passed,best_score,attempts)
                 values ('${U}',${part},true,90,1)`);
  if (part === 1) {
    r = await q(`select rank_parts from profiles where id='${U}'`);
    check("aprovar Parte I -> rank 1 (Sophomore)", r[0].rank_parts === 1, r[0].rank_parts);
  }
}
r = await q(`select rank_parts, four_aces_at, chapters_done, xp, level from profiles where id='${U}'`);
check("curso inteiro -> rank 4 (Graduate)", r[0].rank_parts === 4, r[0].rank_parts);
check("marca de Graduate gravada", r[0].four_aces_at !== null, r[0].four_aces_at);
check("chapters_done = 14", r[0].chapters_done === 14, r[0].chapters_done);
console.log(`         (XP ${r[0].xp}, nivel ${r[0].level})`);

console.log("\n=== acesso e billing ===");
r = await q(`select public.subscription_grants_access('active',null,now()+interval '10 days','monthly') a,
                    public.subscription_grants_access('active',null,now()-interval '1 day','monthly') b,
                    public.subscription_grants_access('active',null,null,'lifetime') l`);
check("mensal vigente da acesso", r[0].a === true, r[0].a);
check("mensal vencida NAO da acesso", r[0].b === false, r[0].b);
check("vitalicio da acesso sem data de fim", r[0].l === true, r[0].l);

console.log("\n=== busca do forum (ingles) ===");
const cat = (await q("select id from forum_categories limit 1"))[0].id;
await c.query(`insert into forum_topics (user_id,category_id,title,body)
  values ('${U}',${cat},'Applying for internships','searching for an internship this fall')`);
check("stemming ingles: 'internship' acha 'internships'",
  (await q(`select count(*) n from forum_topics
            where search @@ websearch_to_tsquery('english','internship')`))[0].n === "1", "0");

await c.end();
await pg.stop();
fs.rmSync(DATA, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} verificacao(oes) falharam.` : "\nTudo passou.");
process.exit(falhas ? 1 : 0);
