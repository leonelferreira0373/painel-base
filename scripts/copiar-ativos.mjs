// Copia para public/vendor os ficheiros que o navegador precisa de ir buscar (worker do PDF e motor de OCR com os idiomas), para que NADA saia do domínio:
// o analista carrega ficheiros e eles nunca chegam a um servidor nem a uma CDN de terceiros.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "public", "vendor");
mkdirSync(destino, { recursive: true });

function copiar(origem, nome) {
  if (!existsSync(origem)) {
    console.warn(`aviso: não encontrei ${origem}`);
    return;
  }
  copyFileSync(origem, join(destino, nome));
}

const nm = join(raiz, "node_modules");
copiar(join(nm, "pdfjs-dist", "build", "pdf.worker.min.mjs"), "pdf.worker.min.mjs");
copiar(join(nm, "tesseract.js", "dist", "worker.min.js"), "tesseract-worker.min.js");
for (const f of readdirSync(join(nm, "tesseract.js-core"))) {
  if (/^tesseract-core.*\.(wasm|js)$/.test(f)) copiar(join(nm, "tesseract.js-core", f), f);
}
for (const lang of ["por", "eng"]) {
  const pasta = join(nm, "@tesseract.js-data", lang, "4.0.0_best_int");
  copiar(join(pasta, `${lang}.traineddata.gz`), `${lang}.traineddata.gz`);
}
console.log("ativos copiados para public/vendor");
