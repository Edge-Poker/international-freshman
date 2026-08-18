/**
 * Tira screenshots do site rodando e reporta o CSS que o navegador de
 * fato aplicou.
 *
 * Existe porque duas vezes seguidas um problema puramente visual passou
 * despercebido: o build passava, o HTML estava certo, o CSS era servido
 * com 200 — e a pagina aparecia sem estilo nenhum no navegador. Sem
 * renderizar de verdade nao da para afirmar que a interface esta certa.
 *
 * Suba o dev server antes:  npm run dev
 *   npm run shot                 # landing, desktop + mobile
 *   npm run shot -- /pricing     # outra rota
 */
import puppeteer from "puppeteer";
import path from "node:path";
import os from "node:os";

const rota = process.argv[2] ?? "/";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const saida = process.env.SHOT_DIR ?? path.join(os.homedir(), "Downloads");
const nome = rota === "/" ? "landing" : rota.replace(/\W+/g, "-").replace(/^-|-$/g, "");

const navegador = await puppeteer.launch({ headless: "new" });
const problemas = [];

async function capturar(rotulo, viewport, esperaMs = 0) {
  const p = await navegador.newPage();
  await p.setViewport(viewport);
  p.on("requestfailed", (r) =>
    problemas.push(`${rotulo}: ${r.failure()?.errorText} ${r.url().slice(0, 100)}`)
  );
  p.on("console", (m) => {
    if (/Refused|blocked|Content Security/i.test(m.text()))
      problemas.push(`${rotulo}: ${m.text().slice(0, 160)}`);
  });

  await p.goto(BASE + rota, { waitUntil: "networkidle0", timeout: 60000 });
  if (esperaMs) await new Promise((r) => setTimeout(r, esperaMs));

  const estilo = await p.evaluate(() => {
    let regras = 0;
    for (const f of document.styleSheets) { try { regras += f.cssRules.length; } catch {} }
    const b = getComputedStyle(document.body);
    return { regras, fundo: b.backgroundColor, fonte: b.fontFamily.split(",")[0] };
  });

  // Sem CSS o body fica branco e a fonte vira serifada: sinal de alarme.
  if (estilo.regras < 50) problemas.push(`${rotulo}: so ${estilo.regras} regras de CSS aplicadas`);
  if (/rgba?\(0, 0, 0, 0\)|rgb\(255, 255, 255\)/.test(estilo.fundo))
    problemas.push(`${rotulo}: body sem cor de fundo (${estilo.fundo})`);

  const arquivo = path.join(saida, `freshman-${nome}-${rotulo}.png`);
  await p.screenshot({ path: arquivo });
  console.log(`${rotulo.padEnd(8)} ${estilo.regras} regras | fundo ${estilo.fundo} | ${estilo.fonte} -> ${arquivo}`);
  await p.close();
}

await capturar("desktop", { width: 1440, height: 900, deviceScaleFactor: 2 }, 4800);
await capturar("mobile", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

await navegador.close();
if (problemas.length) {
  console.log("\nProblemas:");
  for (const p of problemas) console.log("  " + p);
  process.exit(1);
}
console.log("\nSem problemas de renderizacao.");
