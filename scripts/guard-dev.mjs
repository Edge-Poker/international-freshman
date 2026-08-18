/**
 * Impede `next build` de rodar com o `next dev` ligado.
 *
 * Os dois escrevem no mesmo diretorio .next. O build apaga e reescreve
 * tudo, e o dev server continua apontando para chunks que deixaram de
 * existir: o CSS passa a responder 404 e a pagina aparece como HTML cru,
 * sem estilo nenhum. O servidor nao morre, entao nada denuncia o
 * problema, e o sintoma parece bug de navegador.
 *
 * Isso aconteceu tres vezes neste projeto e custou dois diagnosticos
 * errados. Roda automaticamente como `prebuild`.
 */
import { execSync } from "node:child_process";

let rodando = "";
try {
  rodando = execSync("pgrep -f 'next dev' 2>/dev/null || true").toString().trim();
} catch {
  // pgrep ausente (outro SO): sem guarda, segue o build
}

if (rodando) {
  console.error(
    "\n  BUILD BLOQUEADO: existe um `next dev` rodando (pid " +
      rodando.split("\n").join(", ") +
      ").\n\n" +
      "  Build e dev compartilham o diretorio .next. Rodar os dois juntos\n" +
      "  quebra o dev server: o CSS passa a dar 404 e a pagina fica sem\n" +
      "  estilo, sem nenhum erro visivel no terminal.\n\n" +
      "  Pare o dev primeiro:\n" +
      "    pkill -f 'next dev'\n\n" +
      "  Depois do build, para voltar ao dev:\n" +
      "    rm -rf .next && npm run dev\n"
  );
  process.exit(1);
}
