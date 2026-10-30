// As ações à mão no texto do blog, sem abrir menus: ao passar o rato num bloco (ou com o cursor lá dentro, no telemóvel) aparece à direita um «+» para adicionar um bloco depois dele e, nas imagens, nas colagens, nos vídeos, nas incorporações e nas tabelas, uma barra pequena em cima com o que mais se faz (alinhar, largura, proporção, rodar, espelhar, etiquetas, formato, linhas e colunas, apagar). Cada botão que muda um valor percorre as escolhas (uma carregada, a seguinte), por isso não há menus que fechem a barra.
"use client";

import { Button, DropdownMenu, Tooltip } from "@cloudflare/kumo";
import type { Editor } from "@tiptap/react";
import { AlignCenter, AlignLeft, Copy, AlignRight, BetweenHorizontalEnd, BetweenVerticalEnd, CheckSquare, Code, Columns2, Crop, FileText, FlipHorizontal2, Film, Grid2x2X, Heading, Heading1, Heading2, Heading3, ImagePlus, LayoutGrid, LayoutPanelLeft, List, ListOrdered, Maximize2, Minus, Music, Palette, PanelLeft, PanelTop, Plus, Quote, SlidersHorizontal, RotateCw, Table2, Tags, Text, Trash2, Volume2, VolumeX, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { MODELOS_DE_COLAGEM, type ModeloDeColagem } from "@/lib/blog-colagem";
import { PROPORCOES, proximaRotacao } from "@/lib/blog-objetos";
import { estiloDeTabela, proximoEstiloDeTabela, rotuloDoEstiloDeTabela, ESTILO_DE_TABELA_POR_OMISSAO } from "@/lib/blog-tabela";
import { CartaoFlutuante, MenuCartao } from "../Flutuantes";
import { CartaoDeIcone } from "../ui";
import { OpcoesDaTabela } from "./OpcoesDaTabela";
import { PEQUENO } from "./PecasDoTexto";
import type { AtributosDaColagem } from "./ColagemDoBlog";
import type { AtributosDoFicheiro, TipoDeFicheiro } from "./FicheiroDoBlog";
import type { AtributosDaImagem } from "./ImagemDoBlog";

const LARGURAS = [25, 50, 75, 100];
const depois = <T,>(lista: T[], atual: T): T => lista[(lista.indexOf(atual) + 1) % lista.length] ?? lista[0];

interface Alvo {
  el: HTMLElement;
  /** A posição do bloco no documento (antes dele) e o tipo. */
  pos: number;
  fim: number;
  tipo: string;
}

/** Um botão pequeno da barra: ícone, dica (com o valor de agora) e um fundo suave quando está ligado. */
function Mini({ dica, Icone, ligado = false, aoClicar }: { dica: string; Icone: LucideIcon; ligado?: boolean; aoClicar: () => void }) {
  return (
    <Tooltip content={dica} render={<Button variant="ghost" shape="square" size="sm" aria-label={dica} aria-pressed={ligado || undefined} onClick={aoClicar} className={`[&_svg]:size-4 [&_svg]:stroke-[1.75] active:scale-90 ${ligado ? "!bg-black/[0.09] dark:!bg-white/15" : ""}`} icon={<Icone />} />} />
  );
}

export function AcoesAoPassar({ editor, raiz, aoPedirImagem, aoPedirColagem, aoPedirFicheiro }: { editor: Editor; raiz: RefObject<HTMLDivElement | null>; aoPedirImagem: () => void; aoPedirColagem: (modo: "nova" | "mais", modelo?: ModeloDeColagem) => void; aoPedirFicheiro: (tipo: TipoDeFicheiro) => void }) {
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [, setTique] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);
  const saida = useRef(0);
  const sobre = useRef<HTMLElement | null>(null);

  /** O bloco de topo que tem este elemento DOM (ou `null`). */
  const blocoDe = (el: Element | null): Alvo | null => {
    if (!el || !(el instanceof HTMLElement) || !raiz.current?.contains(el)) return null;
    let achado: Alvo | null = null;
    editor.state.doc.forEach((no, pos) => {
      if (!achado && editor.view.nodeDOM(pos) === el) achado = { el, pos, fim: pos + no.nodeSize, tipo: no.type.name };
    });
    return achado;
  };
  const blocoDoCursor = (): Alvo | null => {
    const { from } = editor.state.selection;
    let achado: Alvo | null = null;
    editor.state.doc.forEach((no, pos) => {
      if (!achado && from >= pos && from <= pos + no.nodeSize) {
        const el = editor.view.nodeDOM(pos);
        if (el instanceof HTMLElement) achado = { el, pos, fim: pos + no.nodeSize, tipo: no.type.name };
      }
    });
    return achado;
  };

  useEffect(() => {
    const pai = raiz.current;
    if (!pai) return;
    const mover = (ev: MouseEvent) => {
      window.clearTimeout(saida.current);
      const topo = (ev.target as HTMLElement).closest(".ProseMirror > *");
      if (!topo || topo === sobre.current) return;
      const b = blocoDe(topo);
      if (b) {
        sobre.current = topo as HTMLElement;
        setAlvo(b);
      }
    };
    const sair = () => {
      window.clearTimeout(saida.current);
      saida.current = window.setTimeout(() => {
        if (!menuAberto) {
          sobre.current = null;
          setAlvo(blocoDoCursor());
        }
      }, 350);
    };
    const mexer = () => setTique((t) => t + 1);
    const seguirCursor = () => {
      if (!sobre.current) setAlvo(blocoDoCursor());
      setTique((t) => t + 1);
    };
    pai.addEventListener("mousemove", mover);
    pai.addEventListener("mouseleave", sair);
    editor.on("transaction", seguirCursor);
    editor.on("update", mexer);
    return () => {
      pai.removeEventListener("mousemove", mover);
      pai.removeEventListener("mouseleave", sair);
      editor.off("transaction", seguirCursor);
      editor.off("update", mexer);
      window.clearTimeout(saida.current);
    };
  }, [editor, raiz, menuAberto]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!alvo || !raiz.current || !alvo.el.isConnected) return null;
  // o bloco pode ter mudado de sítio ou de tipo desde que se escolheu
  const no = editor.state.doc.nodeAt(alvo.pos);
  if (!no) return null;
  const r = alvo.el.getBoundingClientRect();
  const base = raiz.current.getBoundingClientRect();
  const topo = r.top - base.top;
  const direita = base.right - r.right;
  // a barra fica por cima do bloco, fora dele (como no Canva); sem espaço por cima, fica lá dentro, no canto
  const fora = topo >= 48;

  const selecionar = () => editor.chain().focus().setNodeSelection(alvo.pos);
  const atualizar = (nome: string, attrs: Record<string, unknown>) => selecionar().updateAttributes(nome, attrs).run();
  const apagar = () => selecionar().deleteSelection().run();
  const duplicar = () => editor.chain().insertContentAt(alvo.fim, no.toJSON()).run();

  /** Põe um parágrafo vazio a seguir ao bloco e o cursor lá dentro (onde o novo bloco vai nascer). */
  const abrirDepois = () => editor.chain().insertContentAt(alvo.fim, { type: "paragraph" }).focus(alvo.fim + 1).run();
  const item = (rotulo: string, Icone: LucideIcon, acao: () => void): ReactNode => (
    <DropdownMenu.Item key={rotulo} icon={<Icone className="size-4" />} onClick={() => (abrirDepois(), acao())}>
      {rotulo}
    </DropdownMenu.Item>
  );

  let barra: ReactNode = null;
  let margens: ReactNode = null;
  const celula = no.type.name === "table" ? alvo.el.querySelector("tr:last-child td:last-child, tr:last-child th:last-child") : null;
  const naTabela = (acao: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => celula && acao(editor.chain().focus().setTextSelection(editor.view.posAtDOM(celula, 0))).run();
  if (no.type.name === "imagemDoBlog") {
    const a = no.attrs as AtributosDaImagem;
    barra = (
      <>
        <Mini dica="Imagem à esquerda" Icone={AlignLeft} ligado={a.alinhar === "esquerda"} aoClicar={() => atualizar("imagemDoBlog", { alinhar: "esquerda" })} />
        <Mini dica="Imagem ao centro" Icone={AlignCenter} ligado={a.alinhar === "centro"} aoClicar={() => atualizar("imagemDoBlog", { alinhar: "centro" })} />
        <Mini dica="Imagem à direita" Icone={AlignRight} ligado={a.alinhar === "direita"} aoClicar={() => atualizar("imagemDoBlog", { alinhar: "direita" })} />
        <Mini dica={`Largura: ${a.largura}%. Carregue para mudar`} Icone={Maximize2} aoClicar={() => atualizar("imagemDoBlog", { largura: depois(LARGURAS, a.largura) })} />
        <Mini dica={`Proporção: ${PROPORCOES.find((p) => p.id === a.proporcao)?.rotulo ?? "Original"}. Carregue para mudar`} Icone={Crop} ligado={!!a.proporcao} aoClicar={() => atualizar("imagemDoBlog", { proporcao: depois(PROPORCOES.map((p) => p.id), a.proporcao) })} />
        <Mini dica="Rodar a imagem" Icone={RotateCw} ligado={!!a.rotacao} aoClicar={() => atualizar("imagemDoBlog", { rotacao: proximaRotacao(a.rotacao) })} />
        <Mini dica="Espelhar na horizontal" Icone={FlipHorizontal2} ligado={a.espelhoH} aoClicar={() => atualizar("imagemDoBlog", { espelhoH: !a.espelhoH })} />
        <Mini dica="Etiquetas na imagem" Icone={Tags} ligado={a.marcar} aoClicar={() => atualizar("imagemDoBlog", { marcar: !a.marcar })} />
        <Mini dica="Duplicar" Icone={Copy} aoClicar={duplicar} />
        <Mini dica="Tirar a imagem" Icone={Trash2} aoClicar={apagar} />
      </>
    );
  } else if (no.type.name === "colagemDoBlog") {
    const a = no.attrs as AtributosDaColagem;
    const modelos = MODELOS_DE_COLAGEM.map((m) => m.id);
    barra = (
      <>
        <Mini dica={`Formato: ${MODELOS_DE_COLAGEM.find((m) => m.id === a.modelo)?.rotulo ?? ""}. Carregue para mudar`} Icone={LayoutPanelLeft} aoClicar={() => atualizar("colagemDoBlog", { modelo: depois(modelos, a.modelo) })} />
        <Mini dica="Acrescentar imagens" Icone={ImagePlus} aoClicar={() => (selecionar().run(), aoPedirColagem("mais"))} />
        <Mini dica="Duplicar" Icone={Copy} aoClicar={duplicar} />
        <Mini dica="Tirar a colagem" Icone={Trash2} aoClicar={apagar} />
      </>
    );
  } else if (no.type.name === "ficheiroDoBlog" && (no.attrs as AtributosDoFicheiro).tipo === "video") {
    const a = no.attrs as AtributosDoFicheiro;
    barra = (
      <>
        <Mini dica={`Proporção: ${PROPORCOES.find((p) => p.id === a.proporcao)?.rotulo ?? "Original"}. Carregue para mudar`} Icone={Crop} ligado={!!a.proporcao} aoClicar={() => atualizar("ficheiroDoBlog", { proporcao: depois(PROPORCOES.map((p) => p.id), a.proporcao) })} />
        <Mini dica="Rodar o vídeo" Icone={RotateCw} ligado={!!a.rotacao} aoClicar={() => atualizar("ficheiroDoBlog", { rotacao: proximaRotacao(a.rotacao) })} />
        <Mini dica="Espelhar na horizontal" Icone={FlipHorizontal2} ligado={a.espelhoH} aoClicar={() => atualizar("ficheiroDoBlog", { espelhoH: !a.espelhoH })} />
        <Mini dica={a.semAudio ? "Pôr o som" : "Tirar o som"} Icone={a.semAudio ? VolumeX : Volume2} ligado={a.semAudio} aoClicar={() => atualizar("ficheiroDoBlog", { semAudio: !a.semAudio })} />
        <Mini dica="Duplicar" Icone={Copy} aoClicar={duplicar} />
        <Mini dica="Tirar o vídeo" Icone={Trash2} aoClicar={apagar} />
      </>
    );
  } else if (["ficheiroDoBlog", "incorporarDoBlog"].includes(no.type.name)) {
    barra = <Mini dica="Tirar" Icone={Trash2} aoClicar={apagar} />;
  } else if (no.type.name === "table") {
    const estilo = estiloDeTabela(no.attrs.estilo);
    const cabecalhoDeLinha = no.firstChild?.firstChild?.type.name === "tableHeader";
    let cabecalhoDeColuna = no.childCount > 0;
    no.forEach((linha) => {
      if (linha.firstChild?.type.name !== "tableHeader") cabecalhoDeColuna = false;
    });
    barra = (
      <>
        <Mini dica={`Estilo: ${rotuloDoEstiloDeTabela(estilo)}. Carregue para mudar`} Icone={Palette} ligado={estilo !== ESTILO_DE_TABELA_POR_OMISSAO} aoClicar={() => editor.chain().command(({ tr }) => (tr.setNodeMarkup(alvo.pos, undefined, { ...no.attrs, estilo: proximoEstiloDeTabela(estilo) }), true)).run()} />
        <Mini dica="Linha de cabeçalho" Icone={PanelTop} ligado={cabecalhoDeLinha} aoClicar={() => naTabela((c) => c.toggleHeaderRow())} />
        <Mini dica="Coluna de cabeçalho" Icone={PanelLeft} ligado={cabecalhoDeColuna} aoClicar={() => naTabela((c) => c.toggleHeaderColumn())} />
        <CartaoDeIcone dica="Opções da tabela" icone={SlidersHorizontal} tamanho="sm" className={PEQUENO} largura="w-[min(360px,calc(100vw-2rem))]">
          <OpcoesDaTabela editor={editor} posicao={alvo.pos} />
        </CartaoDeIcone>
        <Mini dica="Duplicar" Icone={Copy} aoClicar={duplicar} />
        <Mini dica="Apagar a tabela" Icone={Grid2x2X} aoClicar={() => naTabela((c) => c.deleteTable())} />
      </>
    );
    margens = (
      <>
        <div className="absolute z-20" style={{ top: topo + r.height + 6, left: r.left - base.left + r.width / 2 - 14 }} onMouseEnter={() => window.clearTimeout(saida.current)}>
          <Tooltip content="Adicionar uma linha" render={<Button variant="secondary" shape="square" size="sm" aria-label="Adicionar uma linha" icon={<Plus className="size-4" />} className="active:scale-90" onClick={() => naTabela((c) => c.addRowAfter())} />} />
        </div>
        <div className="absolute z-20 hidden lg:block" style={{ top: topo + Math.max(40, r.height / 2 - 14), left: "100%", marginLeft: 10 }} onMouseEnter={() => window.clearTimeout(saida.current)}>
          <Tooltip content="Adicionar uma coluna" render={<Button variant="secondary" shape="square" size="sm" aria-label="Adicionar uma coluna" icon={<BetweenVerticalEnd className="size-4" />} className="active:scale-90" onClick={() => naTabela((c) => c.addColumnAfter())} />} />
        </div>
      </>
    );
  }

  return (
    <>
      {barra && (
        <CartaoFlutuante className="absolute z-30 flex gap-0.5 p-1" style={{ top: fora ? topo - 44 : topo + 8, right: fora ? direita : direita + 8 }} onMouseEnter={() => window.clearTimeout(saida.current)}>
          {barra}
        </CartaoFlutuante>
      )}
      {margens}
      <div className="absolute z-20 hidden lg:block" style={{ top: topo, left: "100%", marginLeft: 10 }} onMouseEnter={() => window.clearTimeout(saida.current)}>
        <DropdownMenu onOpenChange={setMenuAberto}>
          <Tooltip content="Adicionar um bloco" render={<DropdownMenu.Trigger render={<Button variant="secondary" shape="square" size="sm" aria-label="Adicionar um bloco" icon={<Plus className="size-4" />} className="active:scale-90" />} />} />
          <MenuCartao>
            {item("Texto", Text, () => editor.chain().setParagraph().run())}
            {item("Título 1", Heading1, () => editor.chain().toggleHeading({ level: 2 }).run())}
            {item("Título 2", Heading2, () => editor.chain().toggleHeading({ level: 3 }).run())}
            {item("Título 3", Heading3, () => editor.chain().toggleHeading({ level: 4 }).run())}
            {item("Destaque", Text, () => editor.chain().updateAttributes("paragraph", { variante: "destaque" }).run())}
            {item("Citação", Quote, () => editor.chain().toggleBlockquote().run())}
            {item("Lista", List, () => editor.chain().toggleBulletList().run())}
            {item("Lista numerada", ListOrdered, () => editor.chain().toggleOrderedList().run())}
            {item("Lista de tarefas", CheckSquare, () => editor.chain().toggleTaskList().run())}
            {item("Código", Code, () => editor.chain().toggleCodeBlock().run())}
            {item("Imagem", ImagePlus, aoPedirImagem)}
            {item("Colagem de imagens", LayoutGrid, () => aoPedirColagem("nova"))}
            {item("Vídeo", Film, () => aoPedirFicheiro("video"))}
            {item("Áudio", Music, () => aoPedirFicheiro("audio"))}
            {item("Documento", FileText, () => aoPedirFicheiro("documento"))}
            {item("Tabela", Table2, () => editor.chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
            {item("Colunas", Columns2, () => editor.chain().wrapIn("colunasDoBlog", { n: 2 }).run())}
            {item("Linha", Minus, () => editor.chain().setHorizontalRule().run())}
          </MenuCartao>
        </DropdownMenu>
      </div>
    </>
  );
}
