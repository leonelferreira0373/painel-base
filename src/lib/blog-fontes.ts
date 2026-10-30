// Os tipos de letra do blog: mais de duzentas famílias já disponíveis (as do Google Fonts, que só se descarregam quando se usam, e as do sistema) e as que a pessoa carrega (TTF, OTF, WOFF, WOFF2 ou um ZIP com várias). Aqui estão o catálogo, os nomes, o que se tira do nome de um ficheiro de fonte, as famílias que um artigo usa e o que o ficheiro exportado precisa para as mostrar. Funções puras; o que toca no navegador (carregar, registar) está em components/conteudo/useFontes.ts.

export type CategoriaDeFonte = "sistema" | "sem-serifa" | "serifa" | "display" | "manuscrita" | "mono";

export interface Fonte {
  nome: string;
  categoria: CategoriaDeFonte;
}

export const ROTULO_DA_CATEGORIA: Record<CategoriaDeFonte, string> = { sistema: "Sistema", "sem-serifa": "Sem serifa", serifa: "Serifa", display: "Títulos", manuscrita: "Manuscrita", mono: "Máquina de escrever" };

const lista = (categoria: CategoriaDeFonte, nomes: string): Fonte[] => nomes.split(",").map((n) => ({ nome: n.trim(), categoria }));

export const FONTES: Fonte[] = [
  ...lista("sistema", "Georgia, Times New Roman, Arial, Verdana, Trebuchet MS, Tahoma, Courier New, Palatino Linotype"),
  ...lista(
    "sem-serifa",
    "Roboto, Open Sans, Montserrat, Lato, Poppins, Inter, Nunito, Nunito Sans, Raleway, Ubuntu, Rubik, Work Sans, Mukta, PT Sans, Noto Sans, Source Sans 3, Fira Sans, Barlow, Quicksand, Karla, DM Sans, Manrope, Josefin Sans, Mulish, Heebo, Oxygen, Cabin, Hind, Titillium Web, Arimo, Catamaran, Exo 2, Asap, Maven Pro, Varela Round, Overpass, Signika, Archivo, Libre Franklin, Public Sans, IBM Plex Sans, Outfit, Plus Jakarta Sans, Lexend, Sora, Urbanist, Red Hat Display, Be Vietnam Pro, Albert Sans, Figtree, Epilogue, Space Grotesk, Syne, Jost, Kanit, Prompt, Sarabun, Assistant, Questrial, Didact Gothic, Tajawal, Cairo, Almarai, Readex Pro, Onest, Instrument Sans, Schibsted Grotesk, Geologica, Golos Text, Bricolage Grotesque, Hanken Grotesk, Commissioner, Dosis, Abel, Chivo, Encode Sans, Lexend Deca, Reddit Sans, Atkinson Hyperlegible, Alegreya Sans, Fira Sans Condensed, Barlow Condensed, Roboto Condensed, Open Sans Condensed",
  ),
  ...lista(
    "serifa",
    "Playfair Display, Merriweather, Lora, PT Serif, Noto Serif, Source Serif 4, Libre Baskerville, Crimson Text, Crimson Pro, EB Garamond, Cormorant Garamond, Cormorant, Bitter, Roboto Slab, Zilla Slab, Arvo, Domine, Cardo, Vollkorn, Spectral, Gelasio, Literata, Newsreader, Fraunces, DM Serif Display, DM Serif Text, Abril Fatface, Bodoni Moda, Libre Caslon Text, Old Standard TT, Alegreya, Cinzel, Josefin Slab, Slabo 27px, Rokkitt, Noticia Text, Playfair Display SC, Prata, Rufina, Gilda Display, Lustria, Marcellus, Trirong, Tinos, Frank Ruhl Libre, Neuton, Quattrocento, Sorts Mill Goudy, Cormorant Infant, Petrona, Brygada 1918, Young Serif, Instrument Serif, Gloock, Ibarra Real Nova, Besley, Eczar, Inknut Antiqua, Playfair, Libre Bodoni, Bodoni Moda SC, Chonburi, Yeseva One, Cormorant SC, Cormorant Upright",
  ),
  ...lista(
    "display",
    "Anton, Bebas Neue, Oswald, Fjalla One, Pathway Gothic One, Teko, Saira, Righteous, Bangers, Fredoka, Baloo 2, Titan One, Passion One, Alfa Slab One, Bungee, Staatliches, Archivo Black, Black Ops One, Russo One, Monoton, Fugaz One, Chewy, Luckiest Guy, Press Start 2P, Orbitron, Audiowide, Rajdhani, Squada One, Bowlby One, Shrikhand, Rammetto One, Ultra, Limelight, Poiret One, Cinzel Decorative, Unica One, Michroma, Racing Sans One, Faster One, Gravitas One, Oleo Script, Concert One, Lilita One, Carter One, Sigmar One, Rubik Mono One, Climate Crisis, Bagel Fat One, Dela Gothic One, Rampart One, Lobster, Lobster Two, Abril Fatface, Big Shoulders Display, Six Caps, League Gothic, Alumni Sans, Tilt Neon, Gasoek One, Rubik Glitch, Rubik Bubbles",
  ),
  ...lista(
    "manuscrita",
    "Pacifico, Dancing Script, Caveat, Satisfy, Great Vibes, Sacramento, Kaushan Script, Shadows Into Light, Indie Flower, Amatic SC, Courgette, Cookie, Parisienne, Allura, Alex Brush, Homemade Apple, Reenie Beanie, Covered By Your Grace, Nothing You Could Do, Rock Salt, Gloria Hallelujah, Patrick Hand, Architects Daughter, Handlee, Marck Script, Yellowtail, Tangerine, Italianno, Pinyon Script, Mr Dafoe, Norican, Damion, Kristi, Over the Rainbow, Just Another Hand, Gochi Hand, Neucha, Comic Neue, Bad Script, Caveat Brush, La Belle Aurore, Zeyada, Permanent Marker, Marker Felt, Merienda, Sriracha, Kalam, Architects Daughter, Playwrite IT Moderna, Shantell Sans",
  ),
  ...lista(
    "mono",
    "Roboto Mono, Source Code Pro, Fira Code, JetBrains Mono, IBM Plex Mono, Space Mono, Inconsolata, Ubuntu Mono, PT Mono, Courier Prime, Anonymous Pro, Cousine, Overpass Mono, DM Mono, Red Hat Mono, Azeret Mono, Martian Mono, Share Tech Mono, VT323, Cutive Mono, Major Mono Display, Nova Mono, Oxygen Mono, Syne Mono, B612 Mono, Xanh Mono",
  ),
].filter((f, i, todas) => todas.findIndex((x) => x.nome === f.nome) === i);

const GENERICA: Record<CategoriaDeFonte, string> = { sistema: "sans-serif", "sem-serifa": "sans-serif", serifa: "serif", display: "sans-serif", manuscrita: "cursive", mono: "monospace" };

/** Escreve um nome de família para o CSS («"Playfair Display", serif»). */
export const familiaCss = (nome: string, categoria: CategoriaDeFonte | "carregada" = "sem-serifa"): string => `"${nome}", ${categoria === "carregada" ? "sans-serif" : GENERICA[categoria]}`;

/** O endereço do CSS do Google Fonts com a família (normal e negrito, com e sem itálico; o que a família não tiver fica de fora). */
export const urlDoGoogle = (nome: string): string => `https://fonts.googleapis.com/css?family=${encodeURIComponent(nome).replace(/%20/g, "+")}:400,400i,700,700i&display=swap`;

/** O mesmo, só com as letras do próprio nome: uma descarga minúscula para o nome aparecer na sua letra na lista. */
export const urlDaPrevia = (nome: string): string => `https://fonts.googleapis.com/css?family=${encodeURIComponent(nome).replace(/%20/g, "+")}&text=${encodeURIComponent(nome)}&display=swap`;

export const fontePorNome = (nome: string): Fonte | undefined => FONTES.find((f) => f.nome === nome);

// ---------- fontes carregadas pela pessoa ----------

export const PASTA_DAS_FONTES = "Tipos de letra";
export const EXTENSOES_DE_FONTE = ["ttf", "otf", "woff", "woff2"];

const extensaoDe = (nome: string) => nome.split(".").pop()?.toLowerCase() ?? "";
export const eFicheiroDeFonte = (nome: string): boolean => EXTENSOES_DE_FONTE.includes(extensaoDe(nome)) && !nome.startsWith("._");
export const eZip = (nome: string): boolean => extensaoDe(nome) === "zip";

const PALAVRAS_DE_ESTILO = /[-_ ]?(regular|normal|bold|semibold|extrabold|black|heavy|medium|light|extralight|thin|italic|oblique|book|roman|\d{3})\b/gi;

/** O nome da família tirado do nome do ficheiro: «Playfair-BoldItalic.ttf» → «Playfair». */
export function familiaDoFicheiro(nome: string): string {
  const base = nome.replace(/\.[^.]+$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
  const limpo = base
    .replace(PALAVRAS_DE_ESTILO, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return limpo || base.replace(/[-_]+/g, " ").trim() || "Tipo de letra";
}

/** O peso e o estilo que o nome do ficheiro diz («Bold», «Italic»…). */
export function descritoresDoFicheiro(nome: string): { weight: string; style: string } {
  const n = nome.toLowerCase();
  const peso = /thin|hairline/.test(n) ? "100" : /extralight|ultralight/.test(n) ? "200" : /light/.test(n) ? "300" : /semibold|demibold/.test(n) ? "600" : /extrabold|ultrabold/.test(n) ? "800" : /black|heavy/.test(n) ? "900" : /bold/.test(n) ? "700" : /medium/.test(n) ? "500" : "400";
  return { weight: peso, style: /italic|oblique/.test(n) ? "italic" : "normal" };
}

// ---------- o que um artigo usa ----------

/** As famílias de letra que o HTML do artigo usa (a primeira de cada «font-family»), sem repetir. */
export function familiasDoHtml(html: string, extras: (string | undefined)[] = []): string[] {
  const nomes: string[] = [];
  const juntar = (valor: string) => {
    const nome = valor.trim().replace(/^['"]|['"]$/g, "").split(/['"]?\s*,/)[0].replace(/^['"]|['"]$/g, "").trim();
    if (nome && !nomes.includes(nome)) nomes.push(nome);
  };
  for (const m of html.replace(/&quot;/g, "'").matchAll(/font-family:\s*([^;"]+)/gi)) juntar(m[1]);
  for (const e of extras) if (e) juntar(e.replace(/&quot;/g, "'"));
  return nomes;
}

/** O que o ficheiro HTML exportado precisa para mostrar as fontes do Google que o artigo usa (as carregadas pela pessoa vão dentro, em @font-face). */
export const ligacoesDeFontes = (familias: string[]): string => familias.filter((n) => fontePorNome(n) && fontePorNome(n)!.categoria !== "sistema").map((n) => `<link rel="stylesheet" href="${urlDoGoogle(n)}">`).join("\n");
