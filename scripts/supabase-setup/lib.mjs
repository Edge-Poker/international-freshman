/**
 * Cliente minimo da Management API do Supabase.
 *
 * TRAVA DE SEGURANCA: o token de acesso pessoal alcanca TODOS os projetos
 * da conta, inclusive bancos de producao de outros produtos. Por isso
 * toda chamada que escreve passa por assertRefPermitido(), que so libera
 * o ref gravado em .target-ref. Qualquer outro ref aborta o processo.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TARGET_FILE = path.join(HERE, ".target-ref");
const TOKEN_FILE = path.join(os.homedir(), ".supabase-pat");
const API = "https://api.supabase.com";

export function token() {
  if (!fs.existsSync(TOKEN_FILE)) {
    console.error(
      `Token nao encontrado em ${TOKEN_FILE}.\n` +
      `Gere um em https://supabase.com/dashboard/account/tokens e salve com:\n` +
      `  printf '%s' 'sbp_SEU_TOKEN' > ~/.supabase-pat && chmod 600 ~/.supabase-pat`
    );
    process.exit(1);
  }
  const t = fs.readFileSync(TOKEN_FILE, "utf8").trim();
  if (!t.startsWith("sbp_")) {
    console.error("O conteudo de ~/.supabase-pat nao parece um token (deve comecar com 'sbp_').");
    process.exit(1);
  }
  return t;
}

export async function api(method, rota, body) {
  const res = await fetch(`${API}${rota}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  if (!res.ok) {
    const msg = typeof dados === "string" ? dados : (dados?.message ?? JSON.stringify(dados));
    throw new Error(`${method} ${rota} -> ${res.status}: ${msg}`);
  }
  return dados;
}

/** O unico ref que este setup pode modificar. */
export function refAlvo() {
  if (!fs.existsSync(TARGET_FILE)) return null;
  return fs.readFileSync(TARGET_FILE, "utf8").trim() || null;
}

export function gravarRefAlvo(ref) {
  fs.writeFileSync(TARGET_FILE, ref + "\n");
}

export function assertRefPermitido(ref) {
  const alvo = refAlvo();
  if (!alvo) {
    console.error("ABORTADO: nenhum projeto-alvo definido (.target-ref vazio).");
    process.exit(1);
  }
  if (ref !== alvo) {
    console.error(
      `ABORTADO: tentativa de escrever no projeto '${ref}', mas o alvo autorizado ` +
      `e '${alvo}'. Nenhuma alteracao foi feita.`
    );
    process.exit(1);
  }
}

/** Executa SQL no projeto — so no alvo autorizado. */
export async function sql(ref, query) {
  assertRefPermitido(ref);
  return api("POST", `/v1/projects/${ref}/database/query`, { query });
}
