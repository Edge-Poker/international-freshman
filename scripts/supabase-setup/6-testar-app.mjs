/**
 * Passo 6 — testa o app rodando, autenticado de verdade.
 *
 * Faz login pela API de auth do Supabase, monta o cookie no formato que o
 * @supabase/ssr le no servidor e busca cada rota protegida, conferindo o
 * HTML que volta. E o teste que faltava: ate aqui as telas logadas so
 * tinham passado por build.
 *
 * Suba o dev server antes:  npm run dev
 *   node scripts/supabase-setup/6-testar-app.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { refAlvo } from "./lib.mjs";

const ref = refAlvo();
// Aponta para producao com BASE_URL=https://... ; sem isso, testa o local.
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const env = fs.readFileSync(path.join(os.homedir(), ".freshman-admin-login"), "utf8");
const email = env.match(/email: (.+)/)[1].trim();
const senha = env.match(/senha: (.+)/)[1].trim();

const anon = fs.readFileSync(
  path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", ".env.local"), "utf8"
).match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();

// 1) login
const r = await fetch(`https://${ref}.supabase.co/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: anon, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password: senha }),
});
const sessao = await r.json();
if (!r.ok) { console.error("Login falhou:", JSON.stringify(sessao).slice(0, 300)); process.exit(1); }
console.log(`Login OK como ${email}\n`);

// 2) cookie no formato do @supabase/ssr 0.5 (base64- + chunks de 3180)
const bruto = "base64-" + Buffer.from(JSON.stringify(sessao)).toString("base64");
const nome = `sb-${ref}-auth-token`;
const pedacos = bruto.match(/.{1,3180}/g);
const cookie = pedacos.length === 1
  ? `${nome}=${pedacos[0]}`
  : pedacos.map((p, i) => `${nome}.${i}=${p}`).join("; ");

const texto = (html) => {
  const semScript = html.replace(/<script[\s\S]*?<\/script>/g, "");
  return semScript.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
                  .replace(/\s+/g, " ").trim();
};

let falhas = 0;
async function testar(rota, deveConter, naoDeveConter = []) {
  const res = await fetch(BASE + rota, { headers: { cookie }, redirect: "manual" });
  const html = res.status === 200 ? await res.text() : "";
  const t = texto(html);
  const faltando = deveConter.filter((s) => !t.includes(s));
  const indevido = naoDeveConter.filter((s) => t.includes(s));
  const ok = res.status === 200 && !faltando.length && !indevido.length;
  if (!ok) falhas++;
  console.log(`  ${ok ? "PASSA" : "FALHA"}  ${rota}  [${res.status}]`);
  if (faltando.length) console.log(`         faltou: ${faltando.join(" | ")}`);
  if (indevido.length) console.log(`         nao deveria aparecer: ${indevido.join(" | ")}`);
  if (res.status !== 200 && res.status !== 404)
    console.log(`         redirecionou para: ${res.headers.get("location")}`);
  return t;
}

console.log("=== rotas autenticadas ===");
await testar("/dashboard", ["Welcome back", "Overall progress", "Freshman", "Progress by part"]);
await testar("/course", ["The course", "Chapter 1. Nobody Warns You About This Part", "Part IV"]);
await testar("/saved", ["Saved"]);
await testar("/forum", ["Forum", "Academics", "Campus Life", "Career & Work"]);
await testar("/students", ["Students", "admin"]);
await testar("/messages", ["Messages"]);
await testar("/notifications", ["Notifications"]);
await testar("/settings", ["Account settings"]);
await testar("/subscription", ["My subscription"]);
await testar("/support", ["Support"]);
await testar("/u/admin", ["admin", "Freshman"]);

console.log("\n=== leitor (conteudo real do ebook) ===");
const cap = await testar("/course/introduction", [
  "Introduction",
  "If I had known what I know now when I arrived",
  "You have four years",
]);
console.log(`         ${cap.length} caracteres renderizados`);
// Parte IV so abre depois de passar na prova da Parte III: o esperado
// aqui e justamente o bloqueio, nao o conteudo.
await testar("/course/the-clock-you-dont-know-is-ticking", [
  "Chapter locked",
  "you need to pass the Part 3 exam",
]);

console.log("\n=== gating do plano free ===");
// admin tem acesso liberado por ser admin; conferimos que a prova abre
await testar("/exam/1", ["Part I Exam", "Landing"]);

console.log("\n=== painel administrativo ===");
await testar("/admin", ["Users", "Total users", "Moderation"]);
await testar("/admin/users", ["Users", "admin"]);
await testar("/admin/finance", ["Monthly revenue"]);
await testar("/admin/moderation", ["Moderation"]);
await testar("/admin/subscriptions", ["Active"]);
await testar("/admin/support", ["Support"]);
await testar("/admin/logs", ["Audit logs"]);

console.log("\n=== rotas publicas ===");
await testar("/", ["The guide", "no one gave you", "Introduction"]);
await testar("/pricing", ["Free", "Monthly", "Yearly", "Lifetime", "$9", "$19", "$29"],
  ["Monthly $0"]); // o card do gratuito nao pode se chamar "Monthly"

console.log(falhas ? `\n${falhas} rota(s) com problema.` : "\nTodas as rotas passaram.");
process.exit(falhas ? 1 : 0);
