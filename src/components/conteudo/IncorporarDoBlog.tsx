// Uma incorporação dentro do texto do blog: um vídeo do YouTube ou do Vimeo, uma faixa do Spotify, um mapa ou, para qualquer outra ligação, um cartão. Guarda o endereço, o tipo e a proporção; no HTML escreve-se «<div data-incorporar="…">» (ver lib/blog-incorporar.ts, que decide o que cada ligação é, e lib/blog-html.ts, que o desenha no ficheiro exportado).
"use client";

import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Globe } from "lucide-react";
import type { TipoDeIncorporacao } from "@/lib/blog-incorporar";
import { aspetoDaLegendaNoHtml, ATRIBUTO_DO_ASPETO_DA_LEGENDA } from "@/lib/blog-legenda";
import { eventoDasFerramentas } from "./AreaDeTexto";
import { LegendaDaFigura } from "./LegendaDaFigura";

export interface AtributosDaIncorporacao {
  tipo: TipoDeIncorporacao;
  url: string;
  src: string;
  proporcao: string;
  titulo: string;
  legenda: string;
  /** O aspeto da legenda (alinhamento, tamanho, cor…). */
  legendaEstilo: string;
}

function VistaDaIncorporacao({ node, selected, updateAttributes }: NodeViewProps) {
  const { tipo, url, src, proporcao, titulo, legenda, legendaEstilo } = node.attrs as AtributosDaIncorporacao;
  const anel = selected ? "ring-2 ring-kumo-brand ring-offset-2" : "";
  return (
    <NodeViewWrapper className="my-3">
      <figure className="m-0">
        {tipo === "ligacao" ? (
          <span className={`flex items-center gap-3 rounded-lg p-3 ring ring-kumo-line ${anel}`}>
            <Globe className="size-5 shrink-0 stroke-[1.75] text-kumo-subtle" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-kumo-default">{titulo}</span>
              <span className="block truncate text-xs text-kumo-subtle">{url}</span>
            </span>
          </span>
        ) : (
          <div className={`relative overflow-hidden rounded-lg bg-kumo-tint ${anel}`} style={{ aspectRatio: proporcao || "16 / 9" }}>
            <iframe src={src} title={titulo} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" className="absolute inset-0 size-full border-0" />
            {/* sem escolher a incorporação, o clique é do texto (o quadro não o apanha); escolhida, o quadro fica utilizável */}
            {!selected && <span aria-hidden className="absolute inset-0" />}
          </div>
        )}
        <LegendaDaFigura valor={legenda} selecionada={selected} aoMudar={(v) => updateAttributes({ legenda: v })} estilo={legendaEstilo} aoMudarEstilo={(v) => updateAttributes({ legendaEstilo: v })} />
      </figure>
    </NodeViewWrapper>
  );
}

export const IncorporarDoBlog = Node.create({
  name: "incorporarDoBlog",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      tipo: { default: "ligacao", parseHTML: (e: HTMLElement) => e.getAttribute("data-incorporar") || "ligacao" },
      url: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-url") ?? "" },
      src: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-src") ?? "" },
      proporcao: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-proporcao") ?? "" },
      titulo: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-titulo") ?? "" },
      legenda: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-legenda") ?? "" },
      legendaEstilo: ATRIBUTO_DO_ASPETO_DA_LEGENDA,
    };
  },
  parseHTML() {
    return [{ tag: "div[data-incorporar]" }];
  },
  renderHTML({ node }) {
    const a = node.attrs as AtributosDaIncorporacao;
    return ["div", { "data-incorporar": a.tipo, "data-url": a.url, "data-src": a.src, "data-proporcao": a.proporcao, "data-titulo": a.titulo, ...(a.legenda ? { "data-legenda": a.legenda } : {}), ...aspetoDaLegendaNoHtml(a.legendaEstilo) }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VistaDaIncorporacao, { stopEvent: eventoDasFerramentas });
  },
});
