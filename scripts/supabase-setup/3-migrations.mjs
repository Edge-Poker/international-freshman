/**
 * Passo 3 — aplica as migrations no projeto-alvo, em ordem numerica.
 *
 * Cada arquivo vai como uma chamada. Na primeira falha o script para:
 * as migrations dependem umas das outras, entao seguir depois de um erro
 * so produziria erros em cascata sem sentido.
 *
 *   node scripts/supabase-setup/3-migrations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { sql, refAlvo, HERE } from "./lib.mjs";

const MIG = path.join(HERE, "..", "..", "supabase", "migrations");
const ref = refAlvo();
if (!ref) { console.error("Nenhum projeto-alvo. Rode o passo 2 antes."); process.exit(1); }

console.log(`Alvo: ${ref}\n`);
const arquivos = fs.readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();

for (const f of arquivos) {
  const query = fs.readFileSync(path.join(MIG, f), "utf8");
  try {
    await sql(ref, query);
    console.log(`  OK    ${f}`);
  } catch (e) {
    console.error(`  FALHA ${f}`);
    console.error(`        ${e.message.slice(0, 500)}`);
    console.error("\nParando aqui: as migrations seguintes dependem desta.");
    process.exit(1);
  }
}
console.log(`\n${arquivos.length} migrations aplicadas.`);
