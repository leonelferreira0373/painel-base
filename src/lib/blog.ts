// O blog do painel: o que se guarda de cada artigo e as funções puras (endereço, tempo de leitura e etiquetas). Os artigos ficam no navegador, na mesma biblioteca que os ficheiros e as imagens. O texto, o SEO e a exportação em HTML estão em blog-html.ts.
import type { AspetoDoTitulo } from "./blog-titulo";
import type { Enquadramento } from "./enquadramento";

export interface Artigo {
  id: string;
  titulo: string;
  /** O endereço do artigo, sem acentos nem espaços. */
  slug: string;
  resumo: string;
  /** O texto simples do artigo (para o tempo de leitura, a pesquisa e a descrição automática). Num artigo antigo, que não tem `html`, é o Markdown em que foi escrito. */
  conteudo: string;
  /** O artigo como o editor visual o escreve (as imagens da biblioteca levam «data-bib» com o id do ficheiro). */
  html?: string;
  /** A imagem de capa: o id de um ficheiro da biblioteca. */
  capa?: string;
  /** Como a capa se mostra na moldura (zoom e ponto). */
  capaEnquadramento?: Enquadramento;
  /** O cabeçalho do artigo: o título ao centro, as linhas à volta do título e o subtítulo (a abertura, em destaque). */
  cabecalho?: AspetoDoTitulo & { linhas?: boolean; subtitulo?: string };
  /** O que a pessoa escolheu no lugar do SEO automático (o título da página, o tema e a imagem de partilha) e se os motores de pesquisa podem indexar o artigo. */
  seo?: { titulo?: string; imagem?: string; indexar?: boolean; tema?: string };
  etiquetas: string[];
  estado: "rascunho" | "publicado";
  criado: string;
  atualizado: string;
  publicado?: string;
}

/** «Olá, Mundo! 2026» → «ola-mundo-2026». */
export function slugDe(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Minutos de leitura, a 200 palavras por minuto (pelo menos 1). */
export function tempoDeLeitura(texto: string): number {
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}

/** «a, b ,, c» → [«a», «b», «c»], sem repetidos (sem distinguir maiúsculas). */
export function lerEtiquetas(texto: string): string[] {
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const t of texto.split(",").map((x) => x.trim()).filter(Boolean)) {
    const chave = t.toLowerCase();
    if (!vistas.has(chave)) (vistas.add(chave), out.push(t));
  }
  return out;
}

/** Um artigo novo e vazio. */
export function artigoNovo(id: string, agora = new Date().toISOString()): Artigo {
  return { id, titulo: "", slug: "", resumo: "", conteudo: "", etiquetas: [], estado: "rascunho", criado: agora, atualizado: agora };
}
