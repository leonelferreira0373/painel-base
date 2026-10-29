// Verifica as regras de código do projeto que o TypeScript e os testes não apanham. Corre com `npm run padroes` e no CI.
// As regras estão explicadas em docs/PADROES-DE-CODIGO.md. Uma linha com `padroes-ignorar` não é verificada (use com moderação e explique porquê).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const IGNORAR_PASTAS = new Set(["node_modules", ".next", ".next-build", "out", ".git", "vendor"]);

/** Ficheiros (ou pastas, terminadas em /) onde uma regra não se aplica, e porquê. */
const EXCECOES = {
  coresFixas: [
    ["src/components/graficos/", "o ECharts só aceita cores literais; as cores do tema escuro vêm de `paraEscuro`"],
    ["src/lib/export/pdf.ts", "o PDF é sempre claro"],
    ["src/lib/tema.ts", "a cor da barra do navegador não aceita variáveis CSS"],
    ["src/dados/aparencia.ts", "as cores de origem de cada tema são os dados que o utilizador personaliza, não estilos"],
    ["src/app/layout.tsx", "`themeColor` do navegador não aceita variáveis CSS"],
    ["src/components/SeletorDeCor.tsx", "um seletor de cor desenha as cores que se escolhem"],
    ["src/dados/predefinicoes.ts", "as cores de cada predefinição são dados do aspeto, como as de aparencia.ts"],
    ["src/lib/comprovativos.ts", "o comprovativo é uma imagem desenhada num canvas, com as cores de um recibo"],
  ],
  inputCru: [
    ["src/components/auth/CampoSenha.tsx", "o campo de palavra-passe tem o botão «Mostrar» dentro do campo, que o Input do Kumo não permite"],
    ["src/components/super/CampoIban.tsx", "o campo do IBAN tem o prefixo da moeda («AO06», «PT50») fixo dentro do campo, que o Input do Kumo não permite"],
  ],
  setaGlifo: [["src/dados/atalhos.ts", "é a tecla «seta para a direita» do teclado, não um caminho entre ecrãs"]],
  htmlEmTexto: [["src/app/layout.tsx", "o script do tema tem de correr antes de pintar; com next/script só corre depois do JavaScript e o tema piscava"]],
  base64: [["src/lib/extract/", "ler anexos em base64 de e-mails (.eml) faz parte do formato"], ["src/lib/analysis/", "testes que montam e-mails com anexos"]],
};

/** Nomes que nunca devem aparecer no código (por exemplo, o nome de um cliente). Acrescente os do seu projeto em scripts/padroes.json. */
let proibidas = [];
try {
  proibidas = JSON.parse(readFileSync(join(raiz, "scripts", "padroes.json"), "utf8")).proibidas ?? [];
} catch {
  /* sem ficheiro: nenhuma palavra proibida */
}

const problemas = [];
const aviso = (ficheiro, linha, regra, texto) => problemas.push(`${ficheiro}${linha ? `:${linha}` : ""}  [${regra}]  ${texto}`);

function percorrer(pasta, saida = []) {
  for (const nome of readdirSync(pasta)) {
    if (IGNORAR_PASTAS.has(nome)) continue;
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) percorrer(caminho, saida);
    else saida.push(caminho);
  }
  return saida;
}

const ficheiros = percorrer(raiz).map((f) => ({ abs: f, rel: relative(raiz, f).split(sep).join("/") }));
const excecao = (lista, rel) => lista.some(([prefixo]) => (prefixo.endsWith("/") ? rel.startsWith(prefixo) : rel === prefixo));

for (const { abs, rel } of ficheiros) {
  // 1. Nada de ficheiros HTML: as páginas são componentes React (App Router).
  if (/\.html?$/i.test(rel)) aviso(rel, 0, "html", "ficheiros HTML não são permitidos; escreva uma página/um componente em src/app ou src/components");

  if (!/\.(ts|tsx|css|mjs|md|json|yml|yaml)$/.test(rel) || rel === "package-lock.json" || rel === "scripts/verificar-padroes.mjs") continue;
  const texto = readFileSync(abs, "utf8");
  const linhas = texto.split(/\r?\n/);
  const codigo = /^src\/.*\.(ts|tsx)$/.test(rel) && !/\.test\.ts$/.test(rel);

  linhas.forEach((l, i) => {
    if (l.includes("padroes-ignorar")) return;
    const n = i + 1;
    // 2. Nada de base64 embutido (imagens, fontes, ficheiros): os ficheiros vão em public/ ou como componentes SVG.
    if (!rel.endsWith(".md") && /;base64,/.test(l) && !excecao(EXCECOES.base64, rel)) aviso(rel, n, "base64", "dados em base64 embutidos; ponha o ficheiro em public/ ou use um ícone/SVG em componente");
    if (/\b(btoa|atob)\(|Buffer\.from\([^)]*base64/.test(l) && /^src\//.test(rel) && !excecao(EXCECOES.base64, rel)) aviso(rel, n, "base64", "codificação base64 no código da aplicação");
    // 3. Nada de HTML em texto: nada de dangerouslySetInnerHTML/innerHTML.
    if (codigo && !excecao(EXCECOES.htmlEmTexto, rel) && /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML/.test(l)) aviso(rel, n, "html-em-texto", "não injete HTML; use componentes (para scripts, next/script)");
    // 4. Cores só pelos tokens do tema (Kumo), para o tema escuro funcionar sem trabalho extra.
    // (os logótipos de marcas externas, em <path fill="#...">, têm cores próprias e ficam de fora)
    if (codigo && !excecao(EXCECOES.coresFixas, rel) && !/<path\s+fill="#[0-9a-fA-F]{3,8}"/.test(l) && /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\brgba?\(|\bhsla?\(/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)) aviso(rel, n, "cor-fixa", "use as cores do tema (text-kumo-*, bg-kumo-*, ring-kumo-*) em vez de uma cor fixa");
    // 5. Sem rasto de depuração.
    if (codigo && /\bconsole\.(log|debug)\(/.test(l)) aviso(rel, n, "console", "tire o console.log");
    // 8. Nada do glifo «→» no texto da interface: os caminhos entre ecrãs escrevem-se «A > B» e passam por <Frase>, que desenha o chevron SVG.
    if (codigo && !excecao(EXCECOES.setaGlifo, rel) && !/^\s*(\/\/|\*|\/\*)/.test(l) && /→/.test(l.replace(/\s\/\/.*$/, ""))) aviso(rel, n, "seta-glifo", "não escreva «→»; escreva «A > B» e mostre o texto com <Frase> (chevron SVG)");
    // 10. Nada de <input> nem <textarea> à mão: use o Input/InputArea do Kumo (ou CampoDePesquisa dentro de cartões). Os de ficheiro escondidos são a exceção, porque o navegador só abre o seletor de ficheiros por eles.
    if (codigo && !/^\s*(\/\/|\*|\/\*)/.test(l) && /<(input|textarea)[\s>]/.test(l) && !/type="file"/.test(l) && !excecao(EXCECOES.inputCru, rel)) aviso(rel, n, "input-cru", "use o Input do Kumo (ou CampoDePesquisa); não escreva <input> à mão");
    // 9. Nada de controlos nativos do navegador (hora, data, cor, setas do número, select): o aspeto muda de sistema para sistema. Há seletores próprios em src/components.
    if (codigo && !/^\s*(\/\/|\*|\/\*)/.test(l) && /type="(time|date|datetime-local|month|week|color|range|number)"|<select[\s>]/.test(l)) aviso(rel, n, "controlo-nativo", "controlo nativo do navegador; use SeletorDeHora, SeletorDeData, SeletorDeDataHora, EscolhaDeCor, Select do Kumo ou um campo de texto com inputMode");
    // 6. Sem nomes proibidos (por exemplo, de clientes).
    for (const p of proibidas) if (l.toLowerCase().includes(p.toLowerCase())) aviso(rel, n, "nome-proibido", `contém «${p}»`);
  });

  // 7. Todo o ficheiro de código começa por um comentário a dizer para que serve.
  if (codigo && !/^\s*(\/\/|\/\*)/.test(texto)) aviso(rel, 1, "comentario-inicial", "o ficheiro tem de começar por um comentário a dizer para que serve");
}

if (problemas.length) {
  console.error(`${problemas.length} problema(s) de padrões:\n\n${problemas.join("\n")}\n\nVeja docs/PADROES-DE-CODIGO.md.`);
  process.exit(1);
}
console.log(`padrões: ${ficheiros.length} ficheiros verificados, sem problemas`);
