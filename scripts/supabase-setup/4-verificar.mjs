/**
 * Passo 4 — confere o que ficou no banco e escreve o .env.local.
 *
 *   node scripts/supabase-setup/4-verificar.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { api, sql, refAlvo, HERE } from "./lib.mjs";

const ref = refAlvo();
const q = async (s) => (await sql(ref, s));

console.log("=== estrutura ===");
const t = await q(`select count(*)::int n from information_schema.tables where table_schema='public'`);
const f = await q(`select count(*)::int n from information_schema.routines where routine_schema='public'`);
const pol = await q(`select count(*)::int n from pg_policies where schemaname='public'`);
console.log(`  tabelas: ${t[0].n} | funcoes: ${f[0].n} | policies RLS: ${pol[0].n}`);

const semRls = await q(`select tablename from pg_tables t where schemaname='public'
  and not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=t.tablename and c.relrowsecurity)`);
console.log(`  tabelas sem RLS: ${semRls.length ? semRls.map(r=>r.tablename).join(", ") : "nenhuma"}`);

console.log("\n=== conteudo ===");
for (const [rot, s] of [
  ["parts", "select count(*)::int n from parts"],
  ["chapters", "select count(*)::int n from chapters"],
  ["planos", "select count(*)::int n from plans"],
  ["categorias do forum", "select count(*)::int n from forum_categories"],
  ["badges", "select count(*)::int n from badges"],
]) console.log(`  ${rot}: ${(await q(s))[0].n}`);

const gratis = await q(`select slug from chapters where is_free order by position`);
console.log(`  gratis: ${gratis.map(r=>r.slug).join(", ")}`);
const planos = await q(`select slug,title,price_cents,interval from plans order by price_cents`);
for (const p of planos) console.log(`  plano ${p.slug}: ${p.title} $${(p.price_cents/100).toFixed(2)} (${p.interval})`);

console.log("\n=== storage ===");
const b = await q(`select id, public from storage.buckets order by id`);
for (const x of b) console.log(`  bucket ${x.id} (publico: ${x.public})`);

console.log("\n=== chaves ===");
const keys = await api("GET", `/v1/projects/${ref}/api-keys`);
const anon = keys.find((k) => k.name === "anon" || k.type === "publishable");
if (!anon) { console.error("Nao achei a anon key. Chaves:", keys.map(k=>k.name)); process.exit(1); }

const env = `# Gerado por scripts/supabase-setup — projeto ${ref}
NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon.api_key}

NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Captcha desligado (o codigo so ativa se esta variavel existir)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=

# Pagamento: ver README antes de ligar (Mercado Pago cobra em BRL,
# a interface exibe USD)
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
MERCADOPAGO_TEST_MODE=1
`;
const dest = path.join(HERE, "..", "..", ".env.local");
fs.writeFileSync(dest, env);
console.log(`  anon key obtida, .env.local escrito (${anon.name ?? anon.type})`);
console.log(`  URL: https://${ref}.supabase.co`);
