// O SEO de um artigo tal como o editor o mostra, ao vivo: o título e a descrição que valem (o que a pessoa escreveu ou, sem isso, o automático), o tema, os temas que se propõem e a pontuação. Junta o texto do artigo (blog-html.ts) com as regras da nota (seo-pontuacao.ts).
import type { Artigo } from "./blog";
import { htmlDoArtigo, seoAutomatico, textoDoHtml } from "./blog-html";
import { analisarSeo, descricaoAutomatica, sugerirTemas, type ResultadoDoSeo } from "./seo-pontuacao";

export interface SeoAoVivo {
  /** O título que aparece na pesquisa. */
  titulo: string;
  descricao: string;
  /** O tema escolhido (ou, sem escolha, o primeiro que se propõe). */
  tema: string;
  /** Os temas que se propõem, a partir do título e do texto. */
  temas: string[];
  indexar: boolean;
  resultado: ResultadoDoSeo;
}

export function seoAoVivo(a: Artigo): SeoAoVivo {
  const html = htmlDoArtigo(a);
  const texto = textoDoHtml(html);
  const temas = sugerirTemas(a.titulo, texto);
  const tema = a.seo?.tema ?? temas[0] ?? "";
  const titulo = a.seo?.titulo?.trim() || seoAutomatico(a).titulo;
  const descricao = a.resumo.trim() || descricaoAutomatica(texto);
  const indexar = a.seo?.indexar !== false;
  return { titulo, descricao, tema, temas, indexar, resultado: analisarSeo({ titulo, descricao, html, tema, capa: !!a.capa, indexar }) };
}
