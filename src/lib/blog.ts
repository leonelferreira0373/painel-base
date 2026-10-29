// O blog do painel: o que se guarda de cada artigo e as funções puras (endereço, tempo de leitura, etiquetas e exportação para Markdown). Os artigos ficam no navegador, na mesma biblioteca que os ficheiros e as imagens.

export interface Artigo {
  id: string;
  titulo: string;
  /** O endereço do artigo, sem acentos nem espaços. */
  slug: string;
  resumo: string;
  /** O texto em Markdown (as imagens da biblioteca escrevem-se «![texto](biblioteca:ID)»). */
  conteudo: string;
  /** A imagem de capa: o id de um ficheiro da biblioteca. */
  capa?: string;
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

/** O artigo como ficheiro Markdown, com o cabeçalho (título, endereço, etiquetas, estado e datas) no início. */
export function paraMarkdown(a: Artigo): string {
  const linha = (k: string, v: string) => `${k}: ${JSON.stringify(v)}`;
  const cabecalho = ["---", linha("titulo", a.titulo), linha("slug", a.slug), linha("resumo", a.resumo), `etiquetas: [${a.etiquetas.map((e) => JSON.stringify(e)).join(", ")}]`, linha("estado", a.estado), linha("atualizado", a.atualizado), ...(a.publicado ? [linha("publicado", a.publicado)] : []), "---", ""];
  return `${cabecalho.join("\n")}\n# ${a.titulo}\n\n${a.conteudo}\n`;
}

/** Um artigo novo e vazio. */
export function artigoNovo(id: string, agora = new Date().toISOString()): Artigo {
  return { id, titulo: "", slug: "", resumo: "", conteudo: "", etiquetas: [], estado: "rascunho", criado: agora, atualizado: agora };
}
