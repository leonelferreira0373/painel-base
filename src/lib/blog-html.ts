// O texto de um artigo do blog como HTML (o que o editor visual escreve e lê) e o que se tira dele sem DOM: o texto simples, a primeira imagem, o SEO automático e o ficheiro HTML para exportar. As imagens da biblioteca escrevem-se «<img data-bib="ID">» e só se trocam pelo endereço quando se mostram. Funções puras.
import { slugDe, tempoDeLeitura, type Artigo } from "./blog";
import { cssDe, estiloDaCelula, estiloDaColagem, type ModeloDeColagem } from "./blog-colagem";
import { htmlDaFigura } from "./blog-figuras";
import { figcaptionHtml, lerAspetoDaLegenda } from "./blog-legenda";
import { alinharDoTitulo, estiloDoTituloEmLinha } from "./blog-titulo";
import { comCorte, estiloDoObjeto, temTransformacao } from "./blog-objetos";
import { htmlDaIncorporacao, type TipoDeIncorporacao } from "./blog-incorporar";
import { lerEtiquetas } from "./etiquetas-imagem";
import { CSS_DO_ARTIGO } from "./blog-css";

const ENTIDADES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

export const escaparHtml = (t: string): string => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** O texto do HTML, sem etiquetas (cada parágrafo, título ou item fica separado por um espaço). */
export function textoDoHtml(html: string): string {
  return html
    .replace(/<(?:br|hr)\b[^>]*>|<\/(?:p|h[1-6]|li|blockquote|pre|tr|figure)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTIDADES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** O identificador da primeira imagem da biblioteca que está no texto. */
export const primeiraImagemDoHtml = (html: string): string | undefined => /<img\b[^>]*\bdata-bib(?:-colagem)?="([^"]+)"/i.exec(html)?.[1];

// ---------- artigos antigos, escritos em Markdown ----------

const ligacaoSegura = (url: string | undefined): string | undefined => (url && /^(https?:\/\/|mailto:|\/)/i.test(url.trim()) ? url.trim() : undefined);

function emLinha(texto: string): string {
  return escaparHtml(texto)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t: string, u: string) => (ligacaoSegura(u.replace(/&amp;/g, "&")) !== undefined ? `<a href="${u}">${t}</a>` : t));
}

const IMAGEM = /!\[([^\]]*)\]\(biblioteca:([^)\s]+)\)/g;

/** Um parágrafo de Markdown; as imagens da biblioteca saem do parágrafo e ficam como blocos. */
function paragrafoMd(texto: string): string {
  const partes: string[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(IMAGEM)) {
    const antes = texto.slice(ultimo, m.index).trim();
    if (antes) partes.push(`<p>${emLinha(antes)}</p>`);
    partes.push(`<img data-bib="${escaparHtml(m[2])}" alt="${escaparHtml(m[1])}">`);
    ultimo = (m.index ?? 0) + m[0].length;
  }
  const resto = texto.slice(ultimo).trim();
  if (resto) partes.push(`<p>${emLinha(resto)}</p>`);
  return partes.join("");
}

/** O Markdown de um artigo antigo em HTML (títulos # ## ### passam a h2 h3 h4, como o blog sempre os mostrou). */
export function markdownParaHtml(md: string): string {
  const linhas = md.replace(/\r\n/g, "\n").split("\n");
  const saida: string[] = [];
  let i = 0;
  const eLista = (l: string) => /^\s*([-*]|\d+\.)\s/.test(l);
  while (i < linhas.length) {
    const l = linhas[i];
    if (l.trim() === "") {
      i++;
    } else if (l.startsWith("```")) {
      const codigo: string[] = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith("```")) codigo.push(linhas[i++]);
      i++;
      saida.push(`<pre><code>${escaparHtml(codigo.join("\n"))}</code></pre>`);
    } else if (/^#{1,3}\s/.test(l)) {
      const nivel = /^#+/.exec(l)![0].length + 1;
      saida.push(`<h${nivel}>${emLinha(l.replace(/^#+\s*/, ""))}</h${nivel}>`);
      i++;
    } else if (/^---+$/.test(l.trim())) {
      saida.push("<hr>");
      i++;
    } else if (l.startsWith(">")) {
      const citacao: string[] = [];
      while (i < linhas.length && linhas[i].startsWith(">")) citacao.push(linhas[i++].replace(/^>\s?/, ""));
      saida.push(`<blockquote><p>${emLinha(citacao.join(" "))}</p></blockquote>`);
    } else if (eLista(l)) {
      const ordenada = /^\s*\d+\./.test(l);
      const itens: string[] = [];
      while (i < linhas.length && eLista(linhas[i])) itens.push(linhas[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const etiqueta = ordenada ? "ol" : "ul";
      saida.push(`<${etiqueta}>${itens.map((t) => `<li><p>${emLinha(t)}</p></li>`).join("")}</${etiqueta}>`);
    } else {
      const par: string[] = [];
      while (i < linhas.length && linhas[i].trim() !== "" && !/^(#{1,3}\s|```|>|---+$)/.test(linhas[i]) && !eLista(linhas[i])) par.push(linhas[i++]);
      saida.push(paragrafoMd(par.join(" ")));
    }
  }
  return saida.join("");
}

/** O HTML do artigo: o que o editor guardou ou, num artigo antigo, o Markdown convertido. */
export const htmlDoArtigo = (a: Pick<Artigo, "html" | "conteudo">): string => a.html ?? markdownParaHtml(a.conteudo);

// ---------- SEO ----------

export interface SeoDoArtigo {
  titulo: string;
  descricao: string;
  endereco: string;
  /** O identificador da imagem de partilha: a escolhida, a capa ou a primeira do texto. */
  imagem?: string;
  indexar: boolean;
}

const cortar = (texto: string, maximo: number) => {
  if (texto.length <= maximo) return texto;
  const corte = texto.slice(0, maximo - 1);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(" "), maximo / 2)).trimEnd()}…`;
};

/** O que o SEO é sem ninguém mexer: o título (até 60 letras), o início do texto (até 155), o endereço do título e a imagem da capa ou a primeira do texto. */
export function seoAutomatico(a: Pick<Artigo, "titulo" | "conteudo" | "html" | "capa">): SeoDoArtigo {
  return { titulo: cortar(a.titulo.trim(), 60), descricao: cortar(a.conteudo.trim(), 155), endereco: slugDe(a.titulo), imagem: a.capa ?? primeiraImagemDoHtml(a.html ?? ""), indexar: true };
}

/** O SEO que vale: o que a pessoa escreveu no lugar do automático, campo a campo. */
export function seoDoArtigo(a: Pick<Artigo, "titulo" | "conteudo" | "html" | "capa" | "slug" | "resumo" | "seo">): SeoDoArtigo {
  const auto = seoAutomatico(a);
  return { titulo: a.seo?.titulo?.trim() || auto.titulo, descricao: a.resumo.trim() || auto.descricao, endereco: a.slug.trim() || auto.endereco, imagem: a.seo?.imagem ?? auto.imagem, indexar: a.seo?.indexar !== false };
}

// ---------- mostrar e exportar ----------

const tamanhoLegivel = (bytes: number): string => (bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`);

/** As imagens, as colagens, o áudio, o vídeo e os documentos da biblioteca com o endereço de cada um, a largura, o alinhamento, o texto ao lado e a legenda que o editor guardou. */
export function mostrarImagens(html: string, urlDe: (id: string) => string | undefined): string {
  const atributoDe = (etiqueta: string, nome: string) => new RegExp(`\\b${nome}="([^"]*)"`, "i").exec(etiqueta)?.[1];
  /** A legenda de uma figura, com o aspeto que o editor guardou. */
  const legendaDe = (texto: string | undefined, etiqueta: string) => figcaptionHtml(texto, lerAspetoDaLegenda(atributoDe(etiqueta, "data-legenda-estilo")), "center", escaparHtml);
  const comFicheiros = html.replace(/<div\b[^>]*\bdata-ficheiro="[^"]*"[^>]*>(?:<\/div>)?/gi, (etiqueta) => {
    const tipo = atributoDe(etiqueta, "data-ficheiro");
    const id = atributoDe(etiqueta, "data-id") ?? "";
    const src = urlDe(id);
    if (!src) return "";
    const nome = atributoDe(etiqueta, "data-nome") ?? "";
    const legenda = legendaDe(atributoDe(etiqueta, "data-legenda"), etiqueta);
    if (tipo === "audio") return `<figure style="margin:1em 0"><audio controls src="${escaparHtml(src)}" style="width:100%"></audio>${legendaDe(atributoDe(etiqueta, "data-legenda") || nome, etiqueta)}</figure>`;
    if (tipo === "video") {
      const t = { proporcao: atributoDe(etiqueta, "data-proporcao") || undefined, razao: Number(atributoDe(etiqueta, "data-razao")) || undefined, rotacao: Number(atributoDe(etiqueta, "data-rotacao")) || 0, espelhoH: atributoDe(etiqueta, "data-espelho-h") === "1", espelhoV: atributoDe(etiqueta, "data-espelho-v") === "1" };
      const fonte = escaparHtml(comCorte(src, Number(atributoDe(etiqueta, "data-inicio")) || 0, Number(atributoDe(etiqueta, "data-fim")) || 0));
      const mudo = atributoDe(etiqueta, "data-sem-audio") === "1" ? " muted" : "";
      if (!temTransformacao(t)) return `<figure style="margin:1em 0"><video controls playsinline${mudo} src="${fonte}" style="width:100%;border-radius:8px"></video>${legenda}</figure>`;
      const { caixa, objeto } = estiloDoObjeto(t);
      return `<figure style="margin:1em 0"><div style="${cssDe(caixa)}"><video controls playsinline${mudo} src="${fonte}" style="${cssDe(objeto)}"></video></div>${legenda}</figure>`;
    }
    const tamanho = Number(atributoDe(etiqueta, "data-tamanho")) || 0;
    const icone = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>';
    return `<p style="margin:1em 0"><a href="${escaparHtml(src)}" download="${nome}" style="display:inline-flex;align-items:center;gap:.55em;max-width:100%;padding:.6em .9em;border:1px solid rgba(127,127,127,.5);border-radius:6px;text-decoration:none;color:inherit">${icone}<span style="min-width:0;overflow-wrap:anywhere">${nome}${tamanho ? ` <small style="opacity:.7">(${tamanhoLegivel(tamanho)})</small>` : ""}</span></a></p>`;
  });
  const comIncorporacoes = comFicheiros.replace(/<div\b[^>]*\bdata-incorporar="[^"]*"[^>]*>(?:<\/div>)?/gi, (etiqueta) => {
    const texto = (nome: string) => (atributoDe(etiqueta, nome) ?? "").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return htmlDaIncorporacao({ tipo: (atributoDe(etiqueta, "data-incorporar") ?? "ligacao") as TipoDeIncorporacao, src: texto("data-src"), proporcao: texto("data-proporcao"), titulo: texto("data-titulo"), url: texto("data-url") }, texto("data-legenda"), lerAspetoDaLegenda(atributoDe(etiqueta, "data-legenda-estilo")));
  });
  const comColagens = comIncorporacoes.replace(/<div\b[^>]*\bdata-colagem[^>]*>[\s\S]*?<\/div>/gi, (bloco) => {
    const ids = (atributoDe(bloco, "data-ids") ?? "").split(",").filter((id) => urlDe(id));
    if (ids.length === 0) return "";
    const modelo = (atributoDe(bloco, "data-modelo") ?? "duas") as ModeloDeColagem;
    const alt = atributoDe(bloco, "data-alt") ?? "";
    const imagens = ids.map((id, i) => `<img src="${escaparHtml(urlDe(id)!)}" alt="${alt}" style="${cssDe(estiloDaCelula(modelo, i, ids.length))}">`).join("");
    return `<figure style="margin:1em 0"><div style="${cssDe(estiloDaColagem(modelo, ids.length))}">${imagens}</div>${legendaDe(atributoDe(bloco, "data-legenda"), bloco)}</figure>`;
  });
  return comColagens.replace(/<img\b[^>]*\bdata-bib="([^"]+)"[^>]*>/gi, (etiqueta, id: string) => {
    const src = urlDe(id);
    if (!src) return "";
    const razao = Number(atributoDe(etiqueta, "data-razao"));
    return htmlDaFigura({
      src,
      alt: atributoDe(etiqueta, "alt") ?? "",
      largura: Math.min(100, Math.max(10, Number(atributoDe(etiqueta, "data-largura")) || 100)),
      alinhar: atributoDe(etiqueta, "data-alinhar") ?? "centro",
      envolver: atributoDe(etiqueta, "data-envolver") === "1",
      legenda: atributoDe(etiqueta, "data-legenda"),
      legendaAspeto: lerAspetoDaLegenda(atributoDe(etiqueta, "data-legenda-estilo")),
      ligacao: ligacaoSegura(atributoDe(etiqueta, "data-ligacao")?.replace(/&amp;/g, "&")),
      etiquetas: lerEtiquetas((atributoDe(etiqueta, "data-etiquetas") ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&")),
      transformacao: { proporcao: atributoDe(etiqueta, "data-proporcao") || undefined, razao: razao > 0 ? razao : undefined, rotacao: Number(atributoDe(etiqueta, "data-rotacao")) || 0, espelhoH: atributoDe(etiqueta, "data-espelho-h") === "1", espelhoV: atributoDe(etiqueta, "data-espelho-v") === "1" },
    });
  });
}

/** O cabeçalho do artigo (título, subtítulo, linhas e alinhamento) como HTML. */
export function cabecalhoHtml(a: Pick<Artigo, "titulo" | "cabecalho">): string {
  const c = a.cabecalho;
  return `<header style="text-align:${alinharDoTitulo(c)};${c?.linhas ? "border-top:1px solid #888;border-bottom:1px solid #888;padding:1em 0;" : ""}margin-bottom:1.5em"><h1 style="${estiloDoTituloEmLinha(c, escaparHtml)}">${escaparHtml(a.titulo)}</h1>${c?.subtitulo ? `<p class="destaque" style="margin:.6em 0 0">${escaparHtml(c.subtitulo)}</p>` : ""}</header>`;
}

/** O artigo pronto a mostrar (cabeçalho, capa e texto), com as imagens e os ficheiros nos seus endereços. */
export function corpoHtml(a: Artigo, urlDe: (id: string) => string | undefined): string {
  const capa = a.capa ? urlDe(a.capa) : undefined;
  return `${cabecalhoHtml(a)}\n${capa ? `<img src="${escaparHtml(capa)}" alt="" style="max-width:100%;height:auto;border-radius:8px;margin-bottom:1.2em">\n` : ""}${mostrarImagens(htmlDoArtigo(a), urlDe)}`;
}

/** A data como se lê numa notícia («19 de outubro de 2026»). */
export const dataDeLeitura = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
};

/** O aspeto da página de leitura: o caminho, o título, uma linha com as etiquetas, a data e o tempo de leitura, a capa estreita e o texto numa coluna só (o formato das notícias do BC). As cores e a letra vêm de variáveis, por isso um site põe as suas. */
export const CSS_DA_LEITURA = `
:root { --leitura-cor: #171717; --leitura-suave: rgb(23 23 23 / 0.55); --leitura-fundo: #fcfcfb; --leitura-letra: system-ui, -apple-system, "Segoe UI", sans-serif; }
body { margin: 0; background: var(--leitura-fundo); color: var(--leitura-cor); font-family: var(--leitura-letra); }
.leitura { max-width: 45rem; margin: 0 auto; padding: 68px 24px 100px; box-sizing: border-box; }
.leitura-migalhas ol { display: flex; flex-wrap: wrap; gap: 0 8px; margin: 0; padding: 0; list-style: none; font-size: 0.86rem; line-height: 1.5; font-weight: 500; color: var(--leitura-suave); }
.leitura-migalhas li + li::before { content: "/"; margin-right: 8px; opacity: 0.7; }
.leitura-migalhas a { color: inherit; text-decoration: none; }
.leitura-migalhas a:hover { text-decoration: underline; text-underline-offset: 3px; }
.leitura-migalhas [aria-current] { color: var(--leitura-cor); }
.leitura-cabecalho { margin: 24px 0 8px; }
.leitura-nota { margin: 0 0 44px; font-size: 0.9rem; line-height: 1.5; color: var(--leitura-suave); }
.leitura-capa { width: min(100%, 420px); margin: 24px auto; aspect-ratio: 4 / 5; overflow: hidden; border-radius: 8px; background: rgb(23 23 23 / 0.06); }
.leitura-capa img { display: block; width: 100%; height: 100%; object-fit: cover; }
.leitura .blog-corpo { min-height: 0; }
@media (max-width: 640px) { .leitura { padding: 40px 20px 72px; } .leitura-nota { margin-bottom: 32px; } }
@media print { .leitura { max-width: none; padding: 0; } .leitura-migalhas { display: none; } }
`;

/** A página de leitura de um artigo: caminho, cabeçalho, linha de dados, capa e texto. `migalhas` são os passos do caminho antes do título (sem endereço, ficam em texto). */
export function leituraHtml(a: Artigo, urlDe: (id: string) => string | undefined, migalhas: { rotulo: string; href?: string }[] = [{ rotulo: "Início" }, { rotulo: "Artigos" }]): string {
  const capa = a.capa ? urlDe(a.capa) : undefined;
  const caminho = [...migalhas.map((m) => `<li>${m.href ? `<a href="${escaparHtml(m.href)}">${escaparHtml(m.rotulo)}</a>` : escaparHtml(m.rotulo)}</li>`), `<li aria-current="page">${escaparHtml(a.titulo)}</li>`].join("");
  const nota = [a.etiquetas.slice(0, 3).join(", "), dataDeLeitura(a.publicado ?? a.criado), `${tempoDeLeitura(a.conteudo)} min de leitura`].filter(Boolean).join(" · ");
  return `<nav class="leitura-migalhas" aria-label="Caminho"><ol>${caminho}</ol></nav>\n<div class="leitura-cabecalho">${cabecalhoHtml(a)}</div>\n<p class="leitura-nota">${escaparHtml(nota)}</p>\n${capa ? `<figure class="leitura-capa"><img src="${escaparHtml(capa)}" alt=""></figure>\n` : ""}<article class="blog-corpo">\n${mostrarImagens(htmlDoArtigo(a), urlDe)}\n</article>`;
}

/** O artigo como ficheiro HTML completo, com o SEO e a partilha (Open Graph) no cabeçalho. `urlDe` dá o endereço das imagens (para exportar, as imagens vão dentro do ficheiro); `fontes` traz as ligações e o CSS das fontes que o artigo usa. */
export function paraHtml(a: Artigo, urlDe: (id: string) => string | undefined, endereco?: string, fontes?: { links: string; css: string }): string {
  const seo = seoDoArtigo(a);
  const imagem = seo.imagem ? urlDe(seo.imagem) : undefined;
  const meta = [
    `<meta name="description" content="${escaparHtml(seo.descricao)}">`,
    `<meta name="robots" content="${seo.indexar ? "index,follow" : "noindex,nofollow"}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${escaparHtml(seo.titulo)}">`,
    `<meta property="og:description" content="${escaparHtml(seo.descricao)}">`,
    ...(imagem ? [`<meta property="og:image" content="${escaparHtml(imagem)}">`] : []),
    ...(endereco ? [`<link rel="canonical" href="${escaparHtml(endereco)}">`] : []),
    ...(a.etiquetas.length ? [`<meta name="keywords" content="${escaparHtml(a.etiquetas.join(", "))}">`] : []),
    `<meta property="article:published_time" content="${a.publicado ?? a.criado}">`,
    `<meta property="article:modified_time" content="${a.atualizado}">`,
  ];
  return `<!doctype html>\n<html lang="pt-PT">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${escaparHtml(seo.titulo)}</title>\n${meta.join("\n")}\n${fontes?.links ?? ""}\n<style>${CSS_DA_LEITURA}${fontes?.css ?? ""}${CSS_DO_ARTIGO}</style>\n</head>\n<body>\n<main class="leitura">\n${leituraHtml(a, urlDe)}\n</main>\n</body>\n</html>\n`;
}
