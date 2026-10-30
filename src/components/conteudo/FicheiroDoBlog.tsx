// Um áudio, um vídeo ou um documento da biblioteca dentro do texto do blog: o áudio e o vídeo têm o seu leitor (e uma legenda), o documento um botão para o transferir com o nome e o tamanho. O vídeo tem as suas ferramentas (tocar nele mostra-as em cima): proporção pronta, rodar, espelhar, sem som e cortar (de que segundo a que segundo toca). Guarda só o identificador do ficheiro e as escolhas; no HTML escreve-se «<div data-ficheiro="audio|video|documento" data-id="…">» (ver lib/blog-html.ts, que também o desenha no ficheiro exportado).
"use client";

import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { FileText } from "lucide-react";
import { useContext, useRef, useState, type CSSProperties } from "react";
import { formatarTamanho } from "@/lib/biblioteca";
import { comCorte, estiloDoObjeto, temTransformacao } from "@/lib/blog-objetos";
import { aspetoDaLegendaNoHtml, ATRIBUTO_DO_ASPETO_DA_LEGENDA } from "@/lib/blog-legenda";
import { eventoDasFerramentas } from "./AreaDeTexto";
import { LegendaDaFigura } from "./LegendaDaFigura";
import { ContextoDeImagens } from "./ImagemDoBlog";

export type TipoDeFicheiro = "audio" | "video" | "documento";

export interface AtributosDoFicheiro {
  tipo: TipoDeFicheiro;
  id: string;
  nome: string;
  tamanho: number;
  legenda: string;
  /** O aspeto da legenda (alinhamento, tamanho, cor…). */
  legendaEstilo: string;
  /** Só no vídeo. */
  proporcao: string;
  razao: number | null;
  rotacao: number;
  espelhoH: boolean;
  espelhoV: boolean;
  semAudio: boolean;
  /** Os segundos em que o vídeo começa e acaba de tocar (0: o princípio; vazio: o fim). */
  inicio: number;
  fim: number;
}

/** Que tipo de ficheiro da biblioteca é (pelo tipo MIME). */
export const tipoDoFicheiro = (mime: string): TipoDeFicheiro => (mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : "documento");

function VistaDoFicheiro({ node, selected, updateAttributes }: NodeViewProps) {
  const urls = useContext(ContextoDeImagens);
  const a = node.attrs as AtributosDoFicheiro;
  const src = urls.get(a.id);
  const [natural, setNatural] = useState<number>();
  const video = useRef<HTMLVideoElement>(null);
  const anel = selected ? "ring-2 ring-kumo-brand ring-offset-2" : "";
  const t = { proporcao: a.proporcao, razao: a.razao ?? natural, rotacao: a.rotacao, espelhoH: a.espelhoH, espelhoV: a.espelhoV };
  const comCaixa = temTransformacao(t);
  const { caixa, objeto } = estiloDoObjeto(t);
  return (
    <NodeViewWrapper className="my-3">
      {!src ? (
        <span className="text-sm text-kumo-subtle">Ficheiro em falta: {a.nome}</span>
      ) : a.tipo === "audio" ? (
        <audio controls src={src} className={`w-full rounded-lg ${anel}`} />
      ) : a.tipo === "video" ? (
        <div style={comCaixa ? (caixa as CSSProperties) : { position: "relative" }} className={`overflow-hidden rounded-lg ${anel}`}>
          <video
            ref={video}
            controls
            playsInline
            muted={a.semAudio}
            src={comCorte(src, a.inicio, a.fim)}
            style={comCaixa ? (objeto as CSSProperties) : { width: "100%", display: "block" }}
            onLoadedMetadata={(ev) => {
              setNatural(ev.currentTarget.videoWidth / ev.currentTarget.videoHeight);
              if (comCaixa && a.razao == null) updateAttributes({ razao: ev.currentTarget.videoWidth / ev.currentTarget.videoHeight });
            }}
            onTimeUpdate={(ev) => a.fim > 0 && ev.currentTarget.currentTime >= a.fim && ev.currentTarget.pause()}
          />
        </div>
      ) : (
        <a href={src} download={a.nome} contentEditable={false} className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm text-kumo-default no-underline ring ring-kumo-line hover:bg-kumo-tint ${anel}`}>
          <FileText className="size-5 stroke-[1.75]" />
          <span className="font-medium">{a.nome}</span>
          {a.tamanho > 0 && <span className="text-kumo-subtle">{formatarTamanho(a.tamanho)}</span>}
        </a>
      )}
      {a.tipo !== "documento" && <LegendaDaFigura valor={a.legenda} selecionada={selected} aoMudar={(v) => updateAttributes({ legenda: v })} estilo={a.legendaEstilo} aoMudarEstilo={(v) => updateAttributes({ legendaEstilo: v })} />}
    </NodeViewWrapper>
  );
}

export const FicheiroDoBlog = Node.create({
  name: "ficheiroDoBlog",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      tipo: { default: "documento", parseHTML: (e: HTMLElement) => e.getAttribute("data-ficheiro") || "documento" },
      id: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-id") ?? "" },
      nome: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-nome") ?? "" },
      tamanho: { default: 0, parseHTML: (e: HTMLElement) => Number(e.getAttribute("data-tamanho")) || 0 },
      legenda: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-legenda") ?? "" },
      legendaEstilo: ATRIBUTO_DO_ASPETO_DA_LEGENDA,
      proporcao: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-proporcao") ?? "" },
      razao: { default: null, parseHTML: (e: HTMLElement) => Number(e.getAttribute("data-razao")) || null },
      rotacao: { default: 0, parseHTML: (e: HTMLElement) => Number(e.getAttribute("data-rotacao")) || 0 },
      espelhoH: { default: false, parseHTML: (e: HTMLElement) => e.getAttribute("data-espelho-h") === "1" },
      espelhoV: { default: false, parseHTML: (e: HTMLElement) => e.getAttribute("data-espelho-v") === "1" },
      semAudio: { default: false, parseHTML: (e: HTMLElement) => e.getAttribute("data-sem-audio") === "1" },
      inicio: { default: 0, parseHTML: (e: HTMLElement) => Number(e.getAttribute("data-inicio")) || 0 },
      fim: { default: 0, parseHTML: (e: HTMLElement) => Number(e.getAttribute("data-fim")) || 0 },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-ficheiro]" }];
  },
  renderHTML({ node }) {
    const a = node.attrs as AtributosDoFicheiro;
    return [
      "div",
      {
        "data-ficheiro": a.tipo,
        "data-id": a.id,
        "data-nome": a.nome,
        "data-tamanho": String(a.tamanho),
        "data-legenda": a.legenda,
        ...aspetoDaLegendaNoHtml(a.legendaEstilo),
        ...(a.proporcao ? { "data-proporcao": a.proporcao } : {}),
        ...(a.razao && (a.proporcao || a.rotacao) ? { "data-razao": String(a.razao) } : {}),
        ...(a.rotacao ? { "data-rotacao": String(a.rotacao) } : {}),
        ...(a.espelhoH ? { "data-espelho-h": "1" } : {}),
        ...(a.espelhoV ? { "data-espelho-v": "1" } : {}),
        ...(a.semAudio ? { "data-sem-audio": "1" } : {}),
        ...(a.inicio > 0 ? { "data-inicio": String(a.inicio) } : {}),
        ...(a.fim > 0 ? { "data-fim": String(a.fim) } : {}),
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VistaDoFicheiro, { stopEvent: eventoDasFerramentas });
  },
});
