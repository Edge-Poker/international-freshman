/**
 * Cria o repositorio no GitHub e envia o codigo.
 *
 * Le o token de ~/.github-token (fora do repo, nunca versionado).
 * O `gh` nao esta disponivel nesta maquina, entao falamos direto com a
 * API REST e usamos o git para o push.
 *
 *   node scripts/deploy/github.mjs --check   # so verifica conta e escopos
 *   node scripts/deploy/github.mjs           # cria o repo e envia
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const NOME_REPO = "international-freshman";
const DESCRICAO =
  "Plataforma de curso para estudantes internacionais, a partir do ebook How to Be an International Freshman";
const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..");

const token = fs.readFileSync(path.join(os.homedir(), ".github-token"), "utf8").trim();

async function api(metodo, rota, corpo) {
  const res = await fetch("https://api.github.com" + rota, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await res.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { ok: res.ok, status: res.status, dados, headers: res.headers };
}

// ---------- 1. quem e o dono do token ----------
const eu = await api("GET", "/user");
if (!eu.ok) {
  console.error(`Token invalido (${eu.status}):`, eu.dados?.message ?? eu.dados);
  process.exit(1);
}
const login = eu.dados.login;
const escopos = eu.headers.get("x-oauth-scopes") ?? "(nao informado)";
console.log(`conta   : ${login}${eu.dados.name ? " (" + eu.dados.name + ")" : ""}`);
console.log(`escopos : ${escopos}`);

if (!/\brepo\b/.test(escopos)) {
  console.error("\nO token nao tem o escopo 'repo'. Sem ele nao da para criar nem enviar.");
  process.exit(1);
}

// ---------- 2. o repositorio ja existe? ----------
const existente = await api("GET", `/repos/${login}/${NOME_REPO}`);
console.log(`repo    : ${NOME_REPO} ${existente.ok ? "JA EXISTE" : "livre"}`);

if (process.argv.includes("--check")) {
  console.log("\n(apenas verificacao, nada foi criado)");
  process.exit(0);
}

// ---------- 3. criar ----------
let htmlUrl;
if (existente.ok) {
  console.log("\nUsando o repositorio que ja existe.");
  htmlUrl = existente.dados.html_url;
} else {
  const criado = await api("POST", "/user/repos", {
    name: NOME_REPO,
    description: DESCRICAO,
    private: false,
    has_issues: true,
    has_wiki: false,
    auto_init: false,
  });
  if (!criado.ok) {
    console.error(`Falha ao criar (${criado.status}):`, criado.dados?.message ?? criado.dados);
    process.exit(1);
  }
  htmlUrl = criado.dados.html_url;
  console.log(`\nRepositorio criado: ${htmlUrl}`);
}

// ---------- 4. enviar ----------
// O token vai na URL do push e NAO fica gravado: o remoto salvo usa a URL
// limpa, e o envio usa a autenticada uma unica vez.
const git = (...args) =>
  execFileSync("git", args, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const limpa = `https://github.com/${login}/${NOME_REPO}.git`;
const autenticada = `https://${token}@github.com/${login}/${NOME_REPO}.git`;

const remotos = git("remote").split("\n").filter(Boolean);
if (remotos.includes("origin")) git("remote", "set-url", "origin", limpa);
else git("remote", "add", "origin", limpa);

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const commits = git("rev-list", "--count", "HEAD");
console.log(`enviando ${commits} commits do branch '${branch}'...`);

try {
  execFileSync("git", ["push", "-u", autenticada, `${branch}:${branch}`], {
    cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  console.error("Push falhou:", (e.stderr || e.message).replace(token, "***"));
  process.exit(1);
}
// O push foi para a URL autenticada, nao para o remoto nomeado, entao o
// git nao criou a referencia origin/<branch>. Buscamos antes de apontar
// o upstream, senao ele reclama que a referencia nao existe.
git("fetch", "origin");
git("branch", `--set-upstream-to=origin/${branch}`, branch);

console.log(`\nPronto: ${htmlUrl}`);
