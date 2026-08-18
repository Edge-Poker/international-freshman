/**
 * Passo 5 — configura o auth e cria um usuario admin de teste.
 *
 * O usuario e criado ja confirmado (email_confirm: true), que e o que o
 * gatilho da migration 0024 escuta para criar o perfil. Assim da para
 * testar sem depender de SMTP.
 *
 *   node scripts/supabase-setup/5-auth-e-admin.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { api, sql, refAlvo } from "./lib.mjs";

const ref = refAlvo();
const SITE = "http://localhost:3000";
const EMAIL = "admin@teste.local";

console.log("=== config de auth ===");
await api("PATCH", `/v1/projects/${ref}/config/auth`, {
  site_url: SITE,
  uri_allow_list: [`${SITE}/**`, `${SITE}/auth/callback`, `${SITE}/reset-password`].join(","),
  mailer_autoconfirm: false, // confirmacao de e-mail continua ligada
});
const cfg = await api("GET", `/v1/projects/${ref}/config/auth`);
console.log(`  site_url: ${cfg.site_url}`);
console.log(`  redirects: ${cfg.uri_allow_list}`);
console.log(`  confirmacao de e-mail exigida: ${!cfg.mailer_autoconfirm}`);
console.log(`  signup habilitado: ${!cfg.disable_signup}`);

console.log("\n=== usuario admin de teste ===");
const keys = await api("GET", `/v1/projects/${ref}/api-keys?reveal=true`);
const service = keys.find((k) => k.name === "service_role" || k.type === "secret");
if (!service?.api_key) { console.error("service_role key nao veio na resposta."); process.exit(1); }

const senha = Array.from(crypto.randomBytes(18))
  .map((b) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62]).join("");

const res = await fetch(`https://${ref}.supabase.co/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: service.api_key,
    Authorization: `Bearer ${service.api_key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: EMAIL,
    password: senha,
    email_confirm: true,
    user_metadata: { name: "Admin de Teste", nickname: "admin" },
  }),
});
const user = await res.json();
if (!res.ok) { console.error("Falha ao criar usuario:", JSON.stringify(user).slice(0, 300)); process.exit(1); }
console.log(`  criado: ${EMAIL} (${user.id})`);

// o gatilho da 0024 roda no insert com email ja confirmado
const perfil = await sql(ref, `select id, name, nickname, chapters_done, rank_parts, plan
                               from profiles where id = '${user.id}'`);
if (!perfil.length) { console.error("  FALHA: o gatilho nao criou o perfil."); process.exit(1); }
console.log(`  perfil criado pelo gatilho: nickname=${perfil[0].nickname} plano=${perfil[0].plan}`);

await sql(ref, `update profiles set is_admin = true where id = '${user.id}'`);
console.log("  promovido a admin");

const arq = path.join(os.homedir(), ".freshman-admin-login");
fs.writeFileSync(arq, `email: ${EMAIL}\nsenha: ${senha}\n`, { mode: 0o600 });
console.log(`\nCredenciais salvas em ${arq}`);
