// A imagem da biblioteca dentro do texto do blog (para o editor visual): guarda o identificador do ficheiro, o texto alternativo, a largura, o alinhamento, o texto ao lado, a legenda, a proporção escolhida, a rotação e o espelho, uma ligação e as etiquetas postas sobre ela (como as do Instagram e as do painel do Hotel Miragem: clica-se na foto, escreve-se o título e as especificações, arrasta-se o ponto). O endereço vem das imagens da biblioteca que a página já carregou. No HTML escreve-se «<img data-bib="ID">» com os «data-*» de cada escolha (ver lib/blog-html.ts e lib/blog-figuras.ts, que desenham o mesmo no ficheiro exportado).
"use client";

import { Button, Input, InputArea } from "@cloudflare/kumo";
import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Link2, Trash2, X } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as EventoDeRato } from "react";
import { estiloDoObjeto, temTransformacao } from "@/lib/blog-objetos";
import { especificacoes, etiquetaNova, etiquetasPublicas, ladoDoCartao, lerEtiquetas, LIMITES_ETIQUETA, limitarPercentagem, lugarDaEtiqueta, pontoDaImagem, type EtiquetaDeImagem } from "@/lib/etiquetas-imagem";
import { aspetoDaLegendaNoHtml, ATRIBUTO_DO_ASPETO_DA_LEGENDA } from "@/lib/blog-legenda";
import { eventoDasFerramentas } from "./AreaDeTexto";
import { LegendaDaFigura } from "./LegendaDaFigura";

/** O endereço (blob) de cada imagem da biblioteca, pelo identificador. */
export const ContextoDeImagens = createContext<Map<string, string>>(new Map());

export type AlinhamentoDaImagem = "esquerda" | "centro" | "direita";

export interface AtributosDaImagem {
  id: string;
  alt: string;
  /** A largura em percentagem do texto. */
  largura: number;
  alinhar: AlinhamentoDaImagem;
  /** O texto passa ao lado da imagem (só com a imagem à esquerda ou à direita). */
  envolver: boolean;
  /** A legenda por baixo da imagem (como nos livros de texto). */
  legenda: string;
  /** O aspeto da legenda (alinhamento, tamanho, cor…). */
  legendaEstilo: string;
  /** A proporção escolhida («16 / 9»); vazia é a da própria imagem. */
  proporcao: string;
  /** A proporção da imagem (largura / altura), guardada quando se corta ou se roda. */
  razao: number | null;
  rotacao: number;
  espelhoH: boolean;
  espelhoV: boolean;
  /** Para onde vai quem toca na imagem. */
  ligacao: string;
  etiquetas: EtiquetaDeImagem[];
  /** Só no editor: está a pôr etiquetas na imagem. Não se guarda. */
  marcar: boolean;
}

const JUSTIFICAR: Record<AlinhamentoDaImagem, string> = { esquerda: "justify-start", centro: "justify-center", direita: "justify-end" };

/** A etiqueta como se vê no texto e no ficheiro exportado: o ponto e, ao passar o rato, focar ou tocar, o cartão com o título e as especificações. */
function EtiquetaPublicada({ e, lugar }: { e: EtiquetaDeImagem; lugar: { esquerda: number; topo: number } }) {
  const lado = ladoDoCartao(lugar);
  const linhas = especificacoes(e.texto);
  const pares = linhas.filter((l) => l.nome);
  const soltas = linhas.filter((l) => !l.nome);
  return (
    <span className={`marca marca-${lado.vertical} marca-${lado.horizontal}`} style={{ left: `${lugar.esquerda}%`, top: `${lugar.topo}%` }} tabIndex={0} aria-label={e.titulo}>
      <i className="marca-ponto" />
      <span className="marca-cartao" role="tooltip">
        <b>
          {e.url ? (
            <a href={e.url} target="_blank" rel="noopener noreferrer">
              {e.titulo}
            </a>
          ) : (
            e.titulo
          )}
        </b>
        {pares.length > 0 && (
          <dl>
            {pares.map((l, i) => (
              <span key={i} style={{ display: "contents" }}>
                <dt>{l.nome}</dt>
                <dd>{l.valor}</dd>
              </span>
            ))}
          </dl>
        )}
        {soltas.map((l, i) => (
          <p key={i}>{l.valor}</p>
        ))}
      </span>
    </span>
  );
}

function VistaDaImagem({ node, selected, updateAttributes }: NodeViewProps) {
  const urls = useContext(ContextoDeImagens);
  const a = node.attrs as AtributosDaImagem;
  const src = urls.get(a.id);
  const [natural, setNatural] = useState<number>();
  const razao = a.razao ?? natural;
  const t = { proporcao: a.proporcao, razao, rotacao: a.rotacao, espelhoH: a.espelhoH, espelhoV: a.espelhoV };
  const comCaixa = temTransformacao(t);
  const { caixa, objeto } = estiloDoObjeto(t);
  const etiquetas = useMemo(() => lerEtiquetas(a.etiquetas), [a.etiquetas]);
  const moldura = useRef<HTMLDivElement>(null);
  const [ativa, setAtiva] = useState<string | null>(null);
  const [arrasto, setArrasto] = useState<{ id: string; x: number; y: number } | null>(null);
  const [apagar, setApagar] = useState(false);
  const aMarcar = a.marcar && selected;

  // a proporção da imagem fica guardada assim que há corte ou rotação (o ficheiro exportado precisa dela)
  useEffect(() => {
    if (comCaixa && a.razao == null && natural) updateAttributes({ razao: natural });
  }, [comCaixa, a.razao, natural]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!aMarcar) setAtiva(null);
  }, [aMarcar]);

  const guardar = (lista: EtiquetaDeImagem[]) => updateAttributes({ etiquetas: lista });
  const mudarAtiva = (parcial: Partial<EtiquetaDeImagem>) => guardar(etiquetas.map((e) => (e.id === ativa ? { ...e, ...parcial } : e)));
  const emPercentagem = (ev: { clientX: number; clientY: number }) => {
    const r = moldura.current?.getBoundingClientRect();
    return r && r.width > 0 && r.height > 0 ? { esquerda: ((ev.clientX - r.left) / r.width) * 100, topo: ((ev.clientY - r.top) / r.height) * 100 } : null;
  };
  const pousar = (ev: EventoDeRato<HTMLDivElement>) => {
    const lugar = emPercentagem(ev);
    if (!lugar) return;
    const p = pontoDaImagem(lugar, t);
    const nova = etiquetaNova(`e${Date.now().toString(36)}`, p.x, p.y);
    guardar([...etiquetas, nova]);
    setAtiva(nova.id);
  };

  const flutuar = a.envolver && a.alinhar !== "centro";
  const flutuacao = flutuar ? { float: a.alinhar === "esquerda" ? ("left" as const) : ("right" as const), width: `${a.largura}%`, margin: a.alinhar === "esquerda" ? "0.3em 1.25rem 0.5rem 0" : "0.3em 0 0.5rem 1.25rem" } : undefined;
  const anel = selected ? "ring-2 ring-kumo-brand" : "";
  const imagem = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={a.alt} draggable={false} onLoad={(ev) => setNatural(ev.currentTarget.naturalWidth / ev.currentTarget.naturalHeight)} style={comCaixa ? (objeto as CSSProperties) : { width: "100%", height: "auto", display: "block" }} className={comCaixa ? "" : `rounded-lg ${anel}`} />
  ) : (
    <span className="text-sm text-kumo-subtle">Imagem em falta</span>
  );
  const lugares = etiquetas.map((e) => ({ e, lugar: lugarDaEtiqueta(arrasto?.id === e.id ? { x: arrasto.x, y: arrasto.y } : e, t) }));
  const escolhida = ativa ? lugares.find((l) => l.e.id === ativa) : undefined;

  return (
    <NodeViewWrapper className={flutuar ? "" : `flex ${JUSTIFICAR[a.alinhar] ?? JUSTIFICAR.centro}`} style={flutuacao}>
      <figure className="m-0" style={flutuar ? undefined : { width: `${a.largura}%` }}>
        <div ref={moldura} className="relative">
          {comCaixa ? (
            <div style={caixa as CSSProperties} className={anel}>
              {imagem}
            </div>
          ) : (
            imagem
          )}
          {a.ligacao && !aMarcar && (
            <span className="pointer-events-none absolute right-2 top-2 grid size-7 place-items-center rounded-md bg-kumo-base/90 text-kumo-default shadow-sm ring ring-kumo-line">
              <Link2 className="size-4 stroke-[1.75]" />
            </span>
          )}
          {aMarcar ? (
            <>
              {/* clicar na foto põe uma etiqueta; arrasta-se o ponto para o mover; com o ponto escolhido as setas também o movem */}
              <div data-nao-pm className="absolute inset-0 z-10 cursor-crosshair" onClick={pousar} role="presentation" />
              {lugares.map(({ e, lugar }, i) =>
                lugar ? (
                  <button
                    key={e.id}
                    type="button"
                    data-nao-pm
                    aria-label={`Etiqueta ${i + 1}${e.titulo ? `: ${e.titulo}` : ""}`}
                    aria-pressed={e.id === ativa}
                    onClick={(ev) => (ev.stopPropagation(), setAtiva(e.id), setApagar(false))}
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      ev.currentTarget.setPointerCapture(ev.pointerId);
                      setAtiva(e.id);
                    }}
                    onPointerMove={(ev) => {
                      if (!ev.currentTarget.hasPointerCapture(ev.pointerId)) return;
                      const l = emPercentagem(ev);
                      if (l) setArrasto({ id: e.id, ...pontoDaImagem(l, t) });
                    }}
                    onPointerUp={(ev) => {
                      ev.currentTarget.releasePointerCapture(ev.pointerId);
                      if (arrasto?.id === e.id) guardar(etiquetas.map((x) => (x.id === e.id ? { ...x, x: arrasto.x, y: arrasto.y } : x)));
                      setArrasto(null);
                    }}
                    onKeyDown={(ev) => {
                      const passo = ev.shiftKey ? 5 : 0.5;
                      const d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[ev.key];
                      if (!d) return;
                      ev.preventDefault();
                      guardar(etiquetas.map((x) => (x.id === e.id ? { ...x, x: limitarPercentagem(x.x + d[0]), y: limitarPercentagem(x.y + d[1]) } : x)));
                    }}
                    className={`absolute z-20 grid size-7 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none place-items-center rounded-md bg-white text-xs font-semibold text-neutral-900 shadow-md ring-2 transition-transform active:cursor-grabbing ${e.id === ativa ? "scale-110 ring-kumo-brand" : "ring-white/70"}`}
                    style={{ left: `${lugar.esquerda}%`, top: `${lugar.topo}%` }}
                  >
                    {i + 1}
                  </button>
                ) : null,
              )}
              {escolhida?.lugar && (
                <div data-nao-pm className="absolute z-30" style={{ left: `${escolhida.lugar.esquerda}%`, top: `${escolhida.lugar.topo}%` }}>
                  {(() => {
                    const lado = ladoDoCartao(escolhida.lugar);
                    return (
                      <div className={`absolute flex w-72 max-w-[78vw] flex-col gap-2 rounded-2xl bg-kumo-base p-3 text-kumo-default shadow-xl ring ring-kumo-line ${lado.vertical === "baixo" ? "top-6" : "bottom-6"} ${lado.horizontal === "esquerda" ? "-left-3" : lado.horizontal === "direita" ? "-right-3" : "left-1/2 -translate-x-1/2"}`}>
                        <div className="flex items-center gap-2">
                          <Input aria-label="Título da etiqueta" size="sm" autoFocus placeholder="Título" maxLength={LIMITES_ETIQUETA.titulo} value={escolhida.e.titulo} onChange={(ev) => mudarAtiva({ titulo: ev.target.value })} onKeyDown={(ev) => ev.key === "Escape" && setAtiva(null)} autoComplete="off" className="min-w-0 flex-1" />
                          <Button variant="ghost" shape="square" size="sm" aria-label="Fechar" icon={<X className="size-4" />} onClick={() => setAtiva(null)} />
                        </div>
                        <InputArea aria-label="Especificações" minRows={3} maxLength={LIMITES_ETIQUETA.texto} placeholder={"Área: 42 m²\nVista: jardim\nCama: king size"} value={escolhida.e.texto} onValueChange={(v) => mudarAtiva({ texto: v })} />
                        <Input aria-label="Ligação (opcional)" size="sm" placeholder="Ligação (opcional)" value={escolhida.e.url ?? ""} onChange={(ev) => mudarAtiva({ url: ev.target.value || undefined })} autoComplete="off" />
                        <div className="flex justify-end">
                          <Button
                            variant={apagar ? "primary" : "secondary"}
                            size="sm"
                            icon={<Trash2 className="size-4" />}
                            onClick={() => {
                              if (!apagar) return setApagar(true);
                              guardar(etiquetas.filter((x) => x.id !== escolhida.e.id));
                              setAtiva(null);
                              setApagar(false);
                            }}
                          >
                            {apagar ? "Confirmar: apagar" : "Apagar"}
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          ) : (
            etiquetasPublicas(etiquetas).map((e) => {
              const lugar = lugarDaEtiqueta(e, t);
              return lugar ? <EtiquetaPublicada key={e.id} e={e} lugar={lugar} /> : null;
            })
          )}
        </div>
        <LegendaDaFigura valor={a.legenda} selecionada={selected} aoMudar={(v) => updateAttributes({ legenda: v })} estilo={a.legendaEstilo} aoMudarEstilo={(v) => updateAttributes({ legendaEstilo: v })} />
      </figure>
    </NodeViewWrapper>
  );
}

export const ImagemDoBlog = Node.create({
  name: "imagemDoBlog",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      id: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-bib") ?? "" },
      alt: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("alt") ?? "" },
      largura: { default: 100, parseHTML: (e: HTMLElement) => Number(e.getAttribute("data-largura")) || 100 },
      alinhar: { default: "centro", parseHTML: (e: HTMLElement) => e.getAttribute("data-alinhar") || "centro" },
      envolver: { default: false, parseHTML: (e: HTMLElement) => e.getAttribute("data-envolver") === "1" },
      legenda: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-legenda") ?? "" },
      legendaEstilo: ATRIBUTO_DO_ASPETO_DA_LEGENDA,
      proporcao: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-proporcao") ?? "" },
      razao: { default: null, parseHTML: (e: HTMLElement) => Number(e.getAttribute("data-razao")) || null },
      rotacao: { default: 0, parseHTML: (e: HTMLElement) => Number(e.getAttribute("data-rotacao")) || 0 },
      espelhoH: { default: false, parseHTML: (e: HTMLElement) => e.getAttribute("data-espelho-h") === "1" },
      espelhoV: { default: false, parseHTML: (e: HTMLElement) => e.getAttribute("data-espelho-v") === "1" },
      ligacao: { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-ligacao") ?? "" },
      etiquetas: { default: [], parseHTML: (e: HTMLElement) => lerEtiquetas(e.getAttribute("data-etiquetas") ?? "") },
      marcar: { default: false, rendered: false },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-bib]" }];
  },
  renderHTML({ node }) {
    const a = node.attrs as AtributosDaImagem;
    return [
      "img",
      {
        src: `biblioteca:${a.id}`,
        "data-bib": a.id,
        alt: a.alt,
        "data-largura": String(a.largura),
        "data-alinhar": a.alinhar,
        ...(a.envolver ? { "data-envolver": "1" } : {}),
        ...(a.legenda ? { "data-legenda": a.legenda } : {}),
        ...aspetoDaLegendaNoHtml(a.legendaEstilo),
        ...(a.proporcao ? { "data-proporcao": a.proporcao } : {}),
        ...(a.razao && (a.proporcao || a.rotacao) ? { "data-razao": String(a.razao) } : {}),
        ...(a.rotacao ? { "data-rotacao": String(a.rotacao) } : {}),
        ...(a.espelhoH ? { "data-espelho-h": "1" } : {}),
        ...(a.espelhoV ? { "data-espelho-v": "1" } : {}),
        ...(a.ligacao ? { "data-ligacao": a.ligacao } : {}),
        ...(a.etiquetas?.length ? { "data-etiquetas": JSON.stringify(a.etiquetas) } : {}),
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VistaDaImagem, { stopEvent: eventoDasFerramentas });
  },
});
