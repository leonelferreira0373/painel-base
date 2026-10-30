// A colagem de imagens dentro do texto do blog: várias imagens da biblioteca numa grelha com um formato pronto à escolha (duas colunas, três, quatro ou seis numa vista, mosaico, uma grande e duas, faixa, carrossel) e uma legenda por baixo. Guarda só os identificadores, o formato e a legenda; no HTML escreve-se «<div data-colagem data-ids="…" data-modelo="…">» com as imagens lá dentro (ver lib/blog-html.ts, que também a desenha no ficheiro exportado).
"use client";

import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useContext, useRef, type CSSProperties } from "react";
import { estiloDaCelula, estiloDaColagem, MODELOS_DE_COLAGEM, type ModeloDeColagem } from "@/lib/blog-colagem";
import { ContextoDeImagens } from "./ImagemDoBlog";
import { aspetoDaLegendaNoHtml, ATRIBUTO_DO_ASPETO_DA_LEGENDA } from "@/lib/blog-legenda";
import { eventoDasFerramentas } from "./AreaDeTexto";
import { LegendaDaFigura } from "./LegendaDaFigura";

export interface AtributosDaColagem {
  ids: string[];
  modelo: ModeloDeColagem;
  /** A descrição das imagens (o texto alternativo de cada uma). */
  alt: string;
  legenda: string;
  /** O aspeto da legenda (alinhamento, tamanho, cor…). */
  legendaEstilo: string;
}

/** A miniatura de um formato (desenhada com o mesmo CSS da colagem), para escolher sem ler. */
export function PreviaDoFormato({ modelo }: { modelo: ModeloDeColagem }) {
  const n = MODELOS_DE_COLAGEM.find((m) => m.id === modelo)?.ideal ?? 3;
  return (
    <span aria-hidden className="block h-8 w-11 overflow-hidden text-kumo-default" style={{ ...(estiloDaColagem(modelo, n) as CSSProperties), gap: 2, overflow: "hidden" }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="bg-current opacity-25" style={{ ...(estiloDaCelula(modelo, i, n) as CSSProperties), aspectRatio: "auto", height: "100%", minHeight: 0, borderRadius: 2, ...(modelo === "carrossel" ? { flex: "0 0 30%" } : {}) }} />
      ))}
    </span>
  );
}

function VistaDaColagem({ node, selected, updateAttributes }: NodeViewProps) {
  const urls = useContext(ContextoDeImagens);
  const { ids, modelo, alt, legenda, legendaEstilo } = node.attrs as AtributosDaColagem;
  const presentes = ids.filter((id) => urls.get(id));
  const faixa = useRef<HTMLDivElement>(null);
  const andar = (sentido: 1 | -1) => faixa.current?.scrollBy({ left: sentido * faixa.current.clientWidth, behavior: "smooth" });
  return (
    <NodeViewWrapper>
      <figure className="relative m-0">
        <div ref={faixa} style={estiloDaColagem(modelo, presentes.length) as CSSProperties} className={`rounded-xl ${selected ? "ring-2 ring-kumo-brand ring-offset-2" : ""}`}>
          {presentes.map((id, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={id} src={urls.get(id)} alt={alt} draggable={false} style={estiloDaCelula(modelo, i, presentes.length) as CSSProperties} />
          ))}
          {presentes.length === 0 && <span className="text-sm text-kumo-subtle">Colagem sem imagens</span>}
        </div>
        {modelo === "carrossel" && presentes.length > 1 && (
          <>
            <button type="button" contentEditable={false} aria-label="Imagem anterior" onClick={() => andar(-1)} className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md bg-kumo-base/90 text-kumo-default shadow-sm ring ring-kumo-line active:scale-90">
              <ChevronLeft className="size-5 stroke-[1.75]" />
            </button>
            <button type="button" contentEditable={false} aria-label="Imagem seguinte" onClick={() => andar(1)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md bg-kumo-base/90 text-kumo-default shadow-sm ring ring-kumo-line active:scale-90">
              <ChevronRight className="size-5 stroke-[1.75]" />
            </button>
          </>
        )}
        <LegendaDaFigura valor={legenda} selecionada={selected} aoMudar={(v) => updateAttributes({ legenda: v })} estilo={legendaEstilo} aoMudarEstilo={(v) => updateAttributes({ legendaEstilo: v })} />
      </figure>
    </NodeViewWrapper>
  );
}

export const ColagemDoBlog = Node.create({
  name: "colagemDoBlog",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      ids: { default: [], parseHTML: (e: HTMLElement) => (e.getAttribute("data-ids") ?? "").split(",").filter(Boolean) },
      modelo: { default: "duas", parseHTML: (e: HTMLElement) => e.getAttribute("data-modelo") || "duas" },
      alt: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-alt") ?? "" },
      legenda: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-legenda") ?? "" },
      legendaEstilo: ATRIBUTO_DO_ASPETO_DA_LEGENDA,
    };
  },
  parseHTML() {
    return [{ tag: "div[data-colagem]" }];
  },
  renderHTML({ node }) {
    const { ids, modelo, alt, legenda, legendaEstilo } = node.attrs as AtributosDaColagem;
    return ["div", { "data-colagem": "", "data-modelo": modelo, "data-ids": ids.join(","), "data-alt": alt, ...(legenda ? { "data-legenda": legenda } : {}), ...aspetoDaLegendaNoHtml(legendaEstilo) }, ...ids.map((id) => ["img", { src: `biblioteca:${id}`, "data-bib-colagem": id, alt }] as const)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VistaDaColagem, { stopEvent: eventoDasFerramentas });
  },
});
