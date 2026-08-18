/**
 * Passo 2 — cria o projeto e espera provisionar.
 *
 * Grava o ref em .target-ref: dali em diante, e o UNICO projeto que os
 * passos seguintes conseguem modificar (ver assertRefPermitido em lib.mjs).
 * A senha do banco vai para ~/.freshman-db-password, fora do repo.
 *
 *   node scripts/supabase-setup/2-criar.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { api, gravarRefAlvo, refAlvo } from "./lib.mjs";

const ORG = "wssnwxaegyxbthyrnhap";
const NOME = "international-freshman";
const REGIAO = "us-east-1";
const PROIBIDO = ["rbiwmimttgbmxbxklskb"]; // edge-poker, producao

if (refAlvo()) {
  console.error(`Ja existe um projeto-alvo (${refAlvo()}). Apague .target-ref para criar outro.`);
  process.exit(1);
}

// senha so com letras e numeros: evita qualquer problema de escape na
// connection string, sem perder entropia (62^32).
const senha = Array.from(crypto.randomBytes(32))
  .map((b) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62])
  .join("");

console.log(`Criando '${NOME}' em ${REGIAO}...`);
const proj = await api("POST", "/v1/projects", {
  organization_id: ORG,
  name: NOME,
  region: REGIAO,
  db_pass: senha,
});

if (PROIBIDO.includes(proj.id)) {
  console.error("ABORTADO: a API devolveu um ref proibido. Nada foi gravado.");
  process.exit(1);
}

gravarRefAlvo(proj.id);
const arquivoSenha = path.join(os.homedir(), ".freshman-db-password");
fs.writeFileSync(arquivoSenha, senha + "\n", { mode: 0o600 });

console.log(`  ref: ${proj.id}`);
console.log(`  senha do banco salva em ${arquivoSenha} (chmod 600)`);
console.log("\nAguardando provisionar (leva 1-3 min)...");

const inicio = Date.now();
let status = proj.status;
while (status !== "ACTIVE_HEALTHY") {
  if (Date.now() - inicio > 10 * 60 * 1000) {
    console.error(`\nTempo esgotado. Ultimo status: ${status}`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 10000));
  try {
    const p = await api("GET", `/v1/projects/${proj.id}`);
    if (p.status !== status) { status = p.status; console.log(`  status: ${status}`); }
    else process.stdout.write(".");
  } catch (e) {
    process.stdout.write("?"); // a API oscila enquanto provisiona
  }
}

console.log(`\nProjeto ativo em ${Math.round((Date.now() - inicio) / 1000)}s.`);
console.log(`URL: https://${proj.id}.supabase.co`);
