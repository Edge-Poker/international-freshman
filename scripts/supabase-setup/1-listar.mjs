/**
 * Passo 1 — SOMENTE LEITURA. Lista organizacoes e projetos existentes,
 * para confirmarmos onde criar o projeto novo e, principalmente, quais
 * projetos NAO devem ser tocados.
 *
 *   node scripts/supabase-setup/1-listar.mjs
 */
import { api } from "./lib.mjs";

const orgs = await api("GET", "/v1/organizations");
const projetos = await api("GET", "/v1/projects");

console.log("\n=== ORGANIZACOES ===");
for (const o of orgs) console.log(`  ${o.id}  ${o.name}`);

console.log("\n=== PROJETOS EXISTENTES (nao serao tocados) ===");
if (!projetos.length) console.log("  (nenhum)");
for (const p of projetos) {
  console.log(`  ${p.id}  ${p.name}  [${p.region}]  status=${p.status}  org=${p.organization_id}`);
}

const ativos = projetos.filter((p) => p.status === "ACTIVE_HEALTHY").length;
console.log(`\n${projetos.length} projeto(s), ${ativos} ativo(s).`);
console.log("O plano free permite 2 projetos ativos por organizacao.");
