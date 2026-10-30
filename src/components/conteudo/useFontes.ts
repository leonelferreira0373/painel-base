// Os tipos de letra no navegador: ligar o CSS do Google Fonts de uma família (só quando se usa), carregar as fontes da pessoa (TTF, OTF, WOFF, WOFF2 ou um ZIP com várias) para a biblioteca e registá-las para o texto as poder usar, e juntar ao ficheiro exportado o que ele precisa para mostrar as fontes do artigo.
"use client";

import JSZip from "jszip";
import { useCallback, useEffect, useMemo } from "react";
import { useArmazem } from "@/lib/armazem";
import { eImagem, nomeUnico, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { descritoresDoFicheiro, eFicheiroDeFonte, eZip, familiaDoFicheiro, familiasDoHtml, ligacoesDeFontes, PASTA_DAS_FONTES, urlDaPrevia, urlDoGoogle } from "@/lib/blog-fontes";
import { identificador } from "@/lib/conta";

const ligadas = new Set<string>();

/** Liga ao documento o CSS do Google Fonts de uma família (uma só vez); com `previa`, só as letras do nome. */
export function carregarFonteGoogle(nome: string, previa = false): void {
  if (typeof document === "undefined") return;
  const url = previa ? urlDaPrevia(nome) : urlDoGoogle(nome);
  if (ligadas.has(url)) return;
  ligadas.add(url);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = url;
  document.head.appendChild(l);
}

const registadas = new Set<string>();

/** Regista uma fonte da biblioteca no documento, com o peso e o estilo que o nome do ficheiro diz. */
async function registarFonte(item: ItemDaBiblioteca): Promise<void> {
  if (!item.blob || registadas.has(item.id)) return;
  registadas.add(item.id);
  try {
    const d = descritoresDoFicheiro(item.nome);
    const face = new FontFace(familiaDoFicheiro(item.nome), await item.blob.arrayBuffer(), { weight: d.weight, style: d.style });
    await face.load();
    document.fonts.add(face);
  } catch {
    registadas.delete(item.id);
  }
}

export const emDados = (b: Blob): Promise<string> =>
  new Promise((resolver, rejeitar) => {
    const r = new FileReader();
    r.onload = () => resolver(String(r.result));
    r.onerror = () => rejeitar(r.error);
    r.readAsDataURL(b);
  });

/** Os ficheiros de fonte que uma pessoa largou: os soltos e os de dentro de cada ZIP. */
async function ficheirosDeFonte(ficheiros: File[]): Promise<File[]> {
  const saida: File[] = [];
  for (const f of ficheiros) {
    if (eFicheiroDeFonte(f.name)) saida.push(f);
    else if (eZip(f.name)) {
      const zip = await JSZip.loadAsync(f);
      for (const entrada of Object.values(zip.files)) {
        const nome = entrada.name.split("/").pop() ?? "";
        if (entrada.dir || entrada.name.startsWith("__MACOSX") || !eFicheiroDeFonte(nome)) continue;
        saida.push(new File([await entrada.async("blob")], nome));
      }
    }
  }
  return saida;
}

/** As fontes que a pessoa carregou (ficam na biblioteca, na pasta «Tipos de letra») já registadas, e a função que carrega mais. */
export function useFontesCarregadas() {
  const { itens, guardar } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const fontes = useMemo(() => itens.filter((i) => i.pasta === PASTA_DAS_FONTES && eFicheiroDeFonte(i.nome) && !!i.blob), [itens]);
  useEffect(() => {
    for (const f of fontes) void registarFonte(f);
  }, [fontes]);
  const familias = useMemo(() => [...new Set(fontes.map((f) => familiaDoFicheiro(f.nome)))].sort((a, b) => a.localeCompare(b)), [fontes]);
  /** Guarda os ficheiros de fonte (e os de dentro dos ZIP); devolve quantos eram fontes. */
  const carregar = useCallback(
    async (ficheiros: File[]): Promise<number> => {
      const todas = await ficheirosDeFonte(ficheiros);
      const atuais = [...itens];
      for (const f of todas) {
        const novo: ItemDaBiblioteca = { id: identificador(), nome: nomeUnico(atuais, PASTA_DAS_FONTES, f.name), tipo: f.type || "font/ttf", tamanho: f.size, criado: new Date().toISOString(), pasta: PASTA_DAS_FONTES, blob: f };
        atuais.push(novo);
        await guardar(novo);
      }
      return todas.length;
    },
    [itens, guardar],
  );
  return { fontes, familias, carregar };
}

/** Faz com que o editor tenha já carregadas as fontes do Google que o artigo usa. */
export function useFontesDoArtigo(html: string, fonteDoTitulo?: string): void {
  useEffect(() => {
    for (const nome of familiasDoHtml(html, [fonteDoTitulo])) carregarFonteGoogle(nome);
  }, [html, fonteDoTitulo]);
}

/** O que o ficheiro exportado precisa para mostrar as fontes do artigo: as do Google por ligação e as da pessoa dentro do ficheiro. */
export async function fontesParaExportar(html: string, fonteDoTitulo: string | undefined, fontes: ItemDaBiblioteca[]): Promise<{ links: string; css: string }> {
  const usadas = familiasDoHtml(html, [fonteDoTitulo]);
  const css: string[] = [];
  for (const f of fontes) {
    const familia = familiaDoFicheiro(f.nome);
    if (!usadas.includes(familia) || !f.blob) continue;
    const d = descritoresDoFicheiro(f.nome);
    css.push(`@font-face{font-family:"${familia}";src:url(${await emDados(f.blob)});font-weight:${d.weight};font-style:${d.style}}`);
  }
  return { links: ligacoesDeFontes(usadas), css: css.join("\n") };
}

export { eImagem };
