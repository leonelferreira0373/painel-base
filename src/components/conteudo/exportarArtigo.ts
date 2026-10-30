// Exportar um artigo do blog: o ficheiro HTML completo (com as imagens, o áudio, o vídeo, os documentos e as fontes carregadas lá dentro, e as fontes do Google por ligação) e o PDF (o artigo abre-se na janela de impressão do navegador, escolhendo «Guardar como PDF»: assim sai igual ao que se vê, com as colunas, as letras e as imagens).
"use client";

import type { ItemDaBiblioteca } from "@/lib/biblioteca";
import { slugDe, type Artigo } from "@/lib/blog";
import { PASTA_DAS_FONTES } from "@/lib/blog-fontes";
import { htmlDoArtigo, paraHtml } from "@/lib/blog-html";
import { descarregarBlob } from "./GestorDeFicheiros";
import { emDados, fontesParaExportar } from "./useFontes";

/** O ficheiro HTML do artigo, com tudo o que a biblioteca lhe deu lá dentro. */
export async function htmlParaExportar(a: Artigo, ficheiros: ItemDaBiblioteca[]): Promise<string> {
  const html = htmlDoArtigo(a);
  const ids = new Set([...html.matchAll(/data-(?:bib|bib-colagem|id)="([^"]+)"/g)].map((m) => m[1]).concat(a.capa ?? [], a.seo?.imagem ?? []));
  const dados = new Map<string, string>();
  for (const id of ids) {
    const i = ficheiros.find((x) => x.id === id);
    if (i?.blob) dados.set(id, await emDados(i.blob));
  }
  const fontes = await fontesParaExportar(
    html,
    a.cabecalho?.fonte,
    ficheiros.filter((f) => f.pasta === PASTA_DAS_FONTES),
  );
  return paraHtml({ ...a, html }, (id) => dados.get(id), undefined, fontes);
}

/** Descarrega o artigo como ficheiro HTML. */
export async function exportarHtml(a: Artigo, ficheiros: ItemDaBiblioteca[]): Promise<void> {
  descarregarBlob(`${a.slug || slugDe(a.titulo) || "artigo"}.html`, new Blob([await htmlParaExportar(a, ficheiros)], { type: "text/html" }));
}

/** Abre o artigo para imprimir (em A4, com margens) e guardar em PDF. */
export async function exportarPdf(a: Artigo, ficheiros: ItemDaBiblioteca[]): Promise<void> {
  const html = (await htmlParaExportar(a, ficheiros)).replace("</style>", "@page{size:A4;margin:16mm}</style>");
  const quadro = document.createElement("iframe");
  quadro.setAttribute("aria-hidden", "true");
  quadro.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  await new Promise<void>((resolver) => {
    quadro.onload = () => resolver();
    quadro.srcdoc = html;
    document.body.appendChild(quadro);
  });
  const janela = quadro.contentWindow;
  if (!janela) return quadro.remove();
  try {
    await janela.document.fonts.ready;
  } catch {
    /* sem a API das fontes: imprime-se logo */
  }
  // dá tempo às imagens e às fontes do Google de chegarem
  await new Promise((r) => window.setTimeout(r, 700));
  janela.focus();
  janela.print();
  window.setTimeout(() => quadro.remove(), 60_000);
}
