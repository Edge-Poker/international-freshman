/**
 * Publica o site na Vercel.
 *
 * Le o token de ~/.vercel-token e as chaves do .env.local. Usa a CLI
 * (devDependency) para vincular, cadastrar as variaveis e publicar.
 *
 *   node scripts/deploy/vercel.mjs --check   # so identifica a conta
 *   node scripts/deploy/vercel.mjs --env     # so cadastra as variaveis
 *   node scripts/deploy/vercel.mjs           # vincula, variaveis e deploy
 *
 * Variaveis enviadas: apenas as duas do Supabase. A anon key e publica
 * por design (protegida por RLS no banco). As credenciais de pagamento
 * ficam de fora: o checkout responde que ainda nao esta habilitado.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const PROJETO = "international-freshman";
const token = fs.readFileSync(path.join(os.homedir(), ".vercel-token"), "utf8").trim();

/** Roda a CLI da Vercel com o token, devolvendo a saida. */
function vercel(args, opts = {}) {
  return execFileSync("npx", ["vercel", ...args, "--token", token], {
    cwd: RAIZ,
    encoding: "utf8",
    stdio: ["ignore", "pipe", opts.mostrarErro ? "inherit" : "pipe"],
    maxBuffer: 20 * 1024 * 1024,
    ...opts,
  }).trim();
}

// ---------- de quem e o token ----------
let quem;
try {
  quem = vercel(["whoami"]);
} catch (e) {
  console.error("Token da Vercel invalido:", (e.stderr || e.message).replace(token, "***").slice(0, 300));
  process.exit(1);
}
console.log(`conta Vercel: ${quem}`);
if (process.argv.includes("--check")) process.exit(0);

// ---------- variaveis de ambiente ----------
const envLocal = fs.readFileSync(path.join(RAIZ, ".env.local"), "utf8");
const ler = (chave) => envLocal.match(new RegExp(`^${chave}=(.+)$`, "m"))?.[1].trim();

const VARS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const valores = Object.fromEntries(VARS.map((v) => [v, ler(v)]));
for (const [k, v] of Object.entries(valores)) {
  if (!v) { console.error(`Faltando ${k} no .env.local`); process.exit(1); }
}

function cadastrarVars() {
  for (const alvo of ["production", "preview", "development"]) {
    for (const [chave, valor] of Object.entries(valores)) {
      try {
        // remove antes para o comando ser idempotente
        execFileSync("npx", ["vercel", "env", "rm", chave, alvo, "--yes", "--token", token],
          { cwd: RAIZ, stdio: "ignore" });
      } catch { /* nao existia, tudo bem */ }
      execFileSync("npx", ["vercel", "env", "add", chave, alvo, "--token", token],
        { cwd: RAIZ, input: valor + "\n", encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] });
      console.log(`  ${chave} -> ${alvo}`);
    }
  }
}

if (process.argv.includes("--env")) {
  console.log("\ncadastrando variaveis:");
  cadastrarVars();
  process.exit(0);
}

// ---------- vincular o projeto ----------
console.log(`\nvinculando o projeto '${PROJETO}'...`);
vercel(["link", "--yes", "--project", PROJETO], { mostrarErro: true });

console.log("\ncadastrando variaveis:");
cadastrarVars();

// ---------- publicar ----------
console.log("\npublicando (pode levar alguns minutos)...");
const saida = vercel(["--prod", "--yes"], { mostrarErro: true });
const url = saida.split("\n").filter((l) => l.startsWith("https://")).pop() ?? saida;
console.log(`\nNo ar: ${url}`);
