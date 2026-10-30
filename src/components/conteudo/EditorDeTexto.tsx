// O editor de texto do blog, visual (o que se vê é o que sai): uma folha em branco, sem linhas, com as ferramentas em cima numa só fila que rola na horizontal e, à direita, o espaço dos três pontos (as opções do artigo). Por baixo está o TipTap (ProseMirror), um editor sem aspeto próprio: aqui só se desenham os botões (ícones SVG, sem caixa: ligados ficam com um fundo suave). Texto, tamanhos, cores, alinhamento, listas, ligações e imagens (com largura, alinhamento e texto alternativo quando uma está escolhida). Cada botão liga e desliga: carregar uma vez põe, carregar outra vez tira.
"use client";

import { Button, DropdownMenu, Input, Popover, Tooltip } from "@cloudflare/kumo";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableRow } from "@tiptap/extension-table";
import { ESTILOS_DE_TABELA, estiloDeTabela } from "@/lib/blog-tabela";
import { CabecalhoDoBlog, CelulaDoBlog, TabelaDoBlog } from "./TabelaDoBlog";
import { CORES_DE_REALCE, LigacaoDoTexto, TamanhoDoTexto } from "./PecasDoTexto";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChevronDown, Ellipsis, ListTodo, SlidersHorizontal, Search, ArrowDownUp, CaseSensitive, IndentDecrease, IndentIncrease, Info, RemoveFormatting, SeparatorHorizontal, Subscript, Superscript, PaintBucket, Palette, PanelLeft, PanelTop, ALargeSmall, AlignCenter, AlignJustify, AlignLeft, AlignRight, BetweenHorizontalEnd, BetweenHorizontalStart, BetweenVerticalEnd, BetweenVerticalStart, Baseline, Bold, Captions, Code, Columns2, Crop, FlipHorizontal2, FlipVertical2, Film, FileText, Globe, Grid2x2X, Heading, Highlighter, ImagePlus, Italic, LayoutGrid, LayoutPanelLeft, LetterText, Link2, List, ListChecks, ListOrdered, Maximize2, Merge, Minus, Music, Paperclip, Plus, Quote, Redo2, RotateCw, Scissors, CirclePlay, Split, Strikethrough, Table2, Tags, TextSelect, Trash2, Type, Underline, Undo2, Volume2, VolumeX, WrapText } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CORES_DE_GRAFICO } from "@/lib/cores-graficos";
import { MODELOS_DE_COLAGEM, type ModeloDeColagem } from "@/lib/blog-colagem";
import { CSS_DO_ARTIGO } from "@/lib/blog-css";
import { proximaRotacao, PROPORCOES } from "@/lib/blog-objetos";
import { EspacoQuebraFormatacao } from "@/lib/blog-espaco";
import { ANIMACOES_DO_TEXTO, AnimacaoDoTexto, ColunasDoBlog, FormatosDoParagrafo, TIPOS_DE_LINHA } from "@/lib/blog-formatos";
import { incorporacaoDe } from "@/lib/blog-incorporar";
import { EscolherCor } from "../EscolherCor";
import { EscolhaDeOpcoes } from "../conta/Pecas";
import { MenuCartao, PopupCartao } from "../Flutuantes";
import { BotaoIcone, CartaoDeIcone as CartaoDeIconeBase, MenuDeIcone as MenuDeIconeBase, type IconeDeBotao } from "../ui";
import { ColagemDoBlog, PreviaDoFormato, type AtributosDaColagem } from "./ColagemDoBlog";
import { EscolherTipoDeLetra } from "./EscolherTipoDeLetra";
import { FicheiroDoBlog, type AtributosDoFicheiro, type TipoDeFicheiro } from "./FicheiroDoBlog";
import { IncorporarDoBlog } from "./IncorporarDoBlog";
import { AcoesAoPassar } from "./AcoesAoPassar";
import { BarraDaSelecao } from "./BarraDaSelecao";
import { BarraDeLocalizar } from "./BarraDeLocalizar";
import { OpcoesDaTabela } from "./OpcoesDaTabela";
import { Localizar } from "./Localizar";
import { CaixaDoBlog, EspacamentoDoTexto, QuebraDePagina, Sobrescrito, Subscrito } from "./ExtensoesDoTexto";
import { ESPACAMENTOS_DE_LINHA, ESPACOS_ANTES, MODOS_DE_CAIXA, TONS_DE_CAIXA } from "@/lib/blog-texto";
import { ContextoDeImagens, ImagemDoBlog, type AlinhamentoDaImagem, type AtributosDaImagem } from "./ImagemDoBlog";

/** Os estilos do texto: o parágrafo normal, o de destaque (grande, em serifa) e a legenda (pequena), e os títulos. */
const ESTILOS: { id: string; nivel: 0 | 2 | 3 | 4; variante: "" | "destaque" | "legenda"; rotulo: string }[] = [
  { id: "normal", nivel: 0, variante: "", rotulo: "Texto normal" },
  { id: "destaque", nivel: 0, variante: "destaque", rotulo: "Destaque" },
  { id: "legenda", nivel: 0, variante: "legenda", rotulo: "Legenda" },
  { id: "t1", nivel: 2, variante: "", rotulo: "Título 1" },
  { id: "t2", nivel: 3, variante: "", rotulo: "Título 2" },
  { id: "t3", nivel: 4, variante: "", rotulo: "Título 3" },
];
const LINHAS_DA_CAPITULAR = ["Sem", "2 linhas", "3 linhas", "4 linhas"];
const ALINHAMENTOS: { id: "left" | "center" | "right" | "justify"; rotulo: string; icone: IconeDeBotao }[] = [
  { id: "left", rotulo: "À esquerda", icone: AlignLeft },
  { id: "center", rotulo: "Ao centro", icone: AlignCenter },
  { id: "right", rotulo: "À direita", icone: AlignRight },
  { id: "justify", rotulo: "Justificado", icone: AlignJustify },
];
const LARGURAS = [25, 50, 75, 100];
const IMAGEM_ALINHAMENTOS: { id: AlinhamentoDaImagem; rotulo: string; icone: IconeDeBotao }[] = [
  { id: "esquerda", rotulo: "Imagem à esquerda", icone: AlignLeft },
  { id: "centro", rotulo: "Imagem ao centro", icone: AlignCenter },
  { id: "direita", rotulo: "Imagem à direita", icone: AlignRight },
];

// As extensões e as propriedades são criadas uma só vez: o TipTap compara-as a cada render e, se forem novas, reconfigura o editor a meio de uma tecla (a letra deixava de entrar).
const EXTENSOES = [
  StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true } }),
  TextStyle,
  FontSize,
  Color,
  FontFamily,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Placeholder.configure({ placeholder: "Escreva aqui…" }),
  CharacterCount,
  ImagemDoBlog,
  FicheiroDoBlog,
  IncorporarDoBlog,
  AnimacaoDoTexto,
  TabelaDoBlog,
  TableRow,
  CabecalhoDoBlog,
  CelulaDoBlog,
  TaskList,
  TaskItem.configure({ nested: true }),
  ColagemDoBlog,
  ColunasDoBlog,
  FormatosDoParagrafo,
  EspacoQuebraFormatacao,
  EspacamentoDoTexto,
  Sobrescrito,
  Subscrito,
  QuebraDePagina,
  CaixaDoBlog,
  Localizar,
];
const PROPRIEDADES = { attributes: { class: "blog-corpo", lang: "pt-PT", spellcheck: "true", "aria-label": "Texto do artigo" } };

/** Os botões da fila: 36 px com ícone de 20 px e traço fino. */
const GRANDE = "[&_svg]:size-5 [&_svg]:stroke-[1.75]";
const MenuDeIcone = (p: Omit<React.ComponentProps<typeof MenuDeIconeBase>, "tamanho" | "className">) => <MenuDeIconeBase {...p} tamanho="base" className={GRANDE} />;
const CartaoDeIcone = (p: Omit<React.ComponentProps<typeof CartaoDeIconeBase>, "tamanho" | "className">) => <CartaoDeIconeBase {...p} tamanho="base" className={GRANDE} />;

/** A linha fina que separa um grupo de ferramentas do seguinte (edição, estilo, texto, parágrafo, inserir). */
const Divisor = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-kumo-line" />;

/** Um menu cujo botão diz o que está escolhido («Texto normal», «Título 1»), como o do estilo no Google Docs. */
function MenuComRotulo({ dica, rotulo, ativo = false, largura = "w-32", children }: { dica: string; rotulo: string; ativo?: boolean; largura?: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <Tooltip
        content={dica}
        render={
          <DropdownMenu.Trigger
            render={
              <Button variant="ghost" size="base" aria-label={dica} className={`${largura} justify-between gap-1 px-2 text-sm font-medium transition-transform active:scale-95 data-[popup-open]:!bg-black/[0.09] dark:data-[popup-open]:!bg-white/15 ${ativo ? "!bg-black/[0.06] dark:!bg-white/10" : ""}`}>
                <span className="truncate">{rotulo}</span>
                <ChevronDown className="size-4 shrink-0 opacity-60" />
              </Button>
            }
          />
        }
      />
      <MenuCartao>{children}</MenuCartao>
    </DropdownMenu>
  );
}

/** Um cartão cujo botão diz o que está escolhido (o tipo de letra). */
function CartaoComRotulo({ dica, rotulo, ativo = false, largura = "w-36", cartao = "w-[min(340px,calc(100vw-2rem))]", children }: { dica: string; rotulo: string; ativo?: boolean; largura?: string; cartao?: string; children: ReactNode }) {
  return (
    <Popover.Root>
      <Tooltip
        content={dica}
        render={
          <Popover.Trigger
            render={
              <Button variant="ghost" size="base" aria-label={dica} className={`${largura} justify-between gap-1 px-2 text-sm font-medium transition-transform active:scale-95 data-[popup-open]:!bg-black/[0.09] dark:data-[popup-open]:!bg-white/15 ${ativo ? "!bg-black/[0.06] dark:!bg-white/10" : ""}`}>
                <span className="truncate">{rotulo}</span>
                <ChevronDown className="size-4 shrink-0 opacity-60" />
              </Button>
            }
          />
        }
      />
      <PopupCartao alinhar="start" className={`${cartao} p-3`}>
        {children}
      </PopupCartao>
    </Popover.Root>
  );
}

/** Um botão da fila de ferramentas: com a formatação ligada onde está o cursor fica com um fundo suave (nunca uma caixa com contorno). */
function Botao({ dica, icone, ativo = false, desativado = false, aoClicar }: { dica: string; icone: IconeDeBotao; ativo?: boolean; desativado?: boolean; aoClicar: () => void }) {
  return <BotaoIcone dica={dica} icone={icone} tamanho="base" className={GRANDE} ligado={ativo} desativado={desativado} aoClicar={aoClicar} />;
}

/** A grelha onde se passa o rato (ou o dedo) para escolher quantas linhas e colunas tem a tabela. */
function GradeDeTabela({ aoEscolher }: { aoEscolher: (linhas: number, colunas: number) => void }) {
  const [sobre, setSobre] = useState<[number, number]>([0, 0]);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Tamanho da tabela" onMouseLeave={() => setSobre([0, 0])}>
        {Array.from({ length: 36 }, (_, i) => {
          const l = Math.floor(i / 6) + 1;
          const c = (i % 6) + 1;
          return <button key={i} type="button" aria-label={`${l} linhas por ${c} colunas`} onMouseEnter={() => setSobre([l, c])} onFocus={() => setSobre([l, c])} onClick={() => aoEscolher(l, c)} className={`aspect-square w-full rounded-[3px] ring-1 transition-colors ${l <= sobre[0] && c <= sobre[1] ? "bg-kumo-brand/25 ring-kumo-brand/60" : "bg-kumo-base ring-kumo-line hover:bg-kumo-tint"}`} />;
        })}
      </div>
      <span className="text-center text-sm tabular-nums text-kumo-subtle">{sobre[0] > 0 ? `${sobre[0]} × ${sobre[1]}` : "Escolha o tamanho"}</span>
    </div>
  );
}

/** O campo da incorporação: escreve-se uma ligação (YouTube, Vimeo, Spotify, Google Maps…) ou um lugar («Hotel Miragem, Luanda») e diz-se o que vai sair. */
function IncorporarCampo({ editor }: { editor: Editor }) {
  const [texto, setTexto] = useState("");
  const i = incorporacaoDe(texto);
  const que = !i ? "" : i.tipo === "mapa" ? `Mapa: ${i.titulo}` : i.tipo === "ligacao" ? `Ligação: ${i.titulo}` : i.titulo;
  const inserir = () => {
    if (!i) return;
    editor.chain().focus().insertContent({ type: "incorporarDoBlog", attrs: { tipo: i.tipo, url: i.url, src: i.src, proporcao: i.proporcao, titulo: i.titulo, legenda: "" } }).run();
    setTexto("");
  };
  return (
    <div className="flex flex-col gap-3">
      <Input label="Ligação ou lugar" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="youtube.com/…  ou  Hotel Miragem, Luanda" autoComplete="off" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), inserir())} />
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-kumo-subtle">{que}</span>
        <Button variant="primary" size="sm" disabled={!i} onClick={inserir}>
          Inserir
        </Button>
      </div>
    </div>
  );
}

/** O corte do vídeo: de que segundo a que segundo toca (vazio: do princípio ao fim). */
function CorteDoVideo({ editor, inicio, fim }: { editor: Editor; inicio: number; fim: number }) {
  const [a, setA] = useState(inicio > 0 ? String(inicio) : "");
  const [b, setB] = useState(fim > 0 ? String(fim) : "");
  const numero = (v: string) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0;
  };
  const guardar = (ini: string, f: string) => editor.chain().focus().updateAttributes("ficheiroDoBlog", { inicio: numero(ini), fim: numero(f) }).run();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Começa (s)" inputMode="decimal" value={a} placeholder="0" onChange={(e) => (setA(e.target.value), guardar(e.target.value, b))} autoComplete="off" />
        <Input label="Acaba (s)" inputMode="decimal" value={b} placeholder="fim" onChange={(e) => (setB(e.target.value), guardar(a, e.target.value))} autoComplete="off" />
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" disabled={!a && !b} onClick={() => (setA(""), setB(""), guardar("", ""))}>
          Repor o vídeo inteiro
        </Button>
      </div>
    </div>
  );
}

/** A letra capitular do parágrafo onde está o cursor: quantas linhas ocupa e a cor. */
function CapitularDoParagrafo({ editor, linhas, cor }: { editor: Editor; linhas: number; cor?: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <EscolhaDeOpcoes rotulo="Letra capitular" opcoes={LINHAS_DA_CAPITULAR} personalizar={false} valor={[LINHAS_DA_CAPITULAR[linhas === 0 ? 0 : linhas - 1]]} aoMudar={(v) => editor.chain().focus().updateAttributes("paragraph", { capitular: Math.max(0, LINHAS_DA_CAPITULAR.indexOf(v[0] ?? "") + (LINHAS_DA_CAPITULAR.indexOf(v[0] ?? "") > 0 ? 1 : 0)) }).run()} />
      {linhas > 0 && <EscolherCor alternar cor={cor ?? null} aoMudar={(hex) => editor.chain().focus().updateAttributes("paragraph", { capitularCor: hex }).run()} cores={CORES_DE_GRAFICO} padrao="#dc2626" rotuloDeVoltar="Cor do texto" />}
    </div>
  );
}

/** Os botões de formatação. Só se desenham com o editor já criado: o estado dos botões (negrito ligado, tamanho atual…) vem de um gancho que, criado antes do editor, só acordava à primeira alteração. */
function Ferramentas({ editor, aoLocalizar, aoPedirImagem, aoPedirColagem, aoPedirFicheiro }: { editor: Editor; aoLocalizar: (substituir: boolean) => void; aoPedirImagem: () => void; aoPedirColagem: (modo: "nova" | "mais", modelo?: ModeloDeColagem) => void; aoPedirFicheiro: (tipo: TipoDeFicheiro) => void }) {
  const e = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            negrito: ed.isActive("bold"),
            italico: ed.isActive("italic"),
            sublinhado: ed.isActive("underline"),
            riscado: ed.isActive("strike"),
            codigo: ed.isActive("code"),
            citacao: ed.isActive("blockquote"),
            lista: ed.isActive("bulletList"),
            numerada: ed.isActive("orderedList"),
            ligacao: ed.isActive("link"),
            href: (ed.getAttributes("link").href as string | undefined) ?? "",
            nivel: ([2, 3, 4] as const).find((n) => ed.isActive("heading", { level: n })) ?? 0,
            alinhar: ALINHAMENTOS.find((a) => ed.isActive({ textAlign: a.id }))?.id ?? "left",
            tamanho: ed.getAttributes("textStyle").fontSize as string | undefined,
            cor: ed.getAttributes("textStyle").color as string | undefined,
            realce: ed.getAttributes("highlight").color as string | undefined,
            desfazer: ed.can().undo(),
            refazer: ed.can().redo(),
            imagem: ed.isActive("imagemDoBlog") ? (ed.getAttributes("imagemDoBlog") as AtributosDaImagem) : null,
            colagem: ed.isActive("colagemDoBlog") ? (ed.getAttributes("colagemDoBlog") as AtributosDaColagem) : null,
            variante: (ed.getAttributes("paragraph").variante as string | undefined) ?? "",
            capitular: (ed.getAttributes("paragraph").capitular as number | undefined) ?? 0,
            capitularCor: ed.getAttributes("paragraph").capitularCor as string | null | undefined,
            colunas: ed.isActive("colunasDoBlog") ? (ed.getAttributes("colunasDoBlog").n as number) : 0,
            letra: ed.getAttributes("textStyle").fontFamily as string | undefined,
            tabela: ed.isActive("table"),
            linhaDoTexto: (ed.getAttributes("paragraph").linha ?? ed.getAttributes("heading").linha ?? null) as number | null,
            antesDoTexto: (ed.getAttributes("paragraph").antes ?? ed.getAttributes("heading").antes ?? null) as number | null,
            sobrescrito: ed.isActive("sobrescrito"),
            subscrito: ed.isActive("subscrito"),
            caixa: ed.isActive("caixaDoBlog") ? (ed.getAttributes("caixaDoBlog").tom as string) : "",
            estiloDaTabela: ed.isActive("table") ? estiloDeTabela(ed.getAttributes("table").estilo) : "",
            fundoDaCelula: (ed.getAttributes("tableCell").fundo ?? ed.getAttributes("tableHeader").fundo ?? null) as string | null,
            ficheiro: ed.isActive("ficheiroDoBlog") ? (ed.getAttributes("ficheiroDoBlog") as AtributosDoFicheiro) : null,
            animacao: ed.isActive("animacaoDoTexto") ? (ed.getAttributes("animacaoDoTexto").tipo as string) : "",
            linha: ed.isActive("horizontalRule"),
            tarefas: ed.isActive("taskList"),
          }
        : null,
  });
  const fazer = () => editor.chain().focus();
  if (!e) return null;
  const alinhamentoAtual = ALINHAMENTOS.find((a) => a.id === e.alinhar) ?? ALINHAMENTOS[0];

  return (
    <>
      {e.imagem && (
        <span className="mr-3 flex items-center gap-1">
          {IMAGEM_ALINHAMENTOS.map((a) => (
            <Botao key={a.id} dica={a.rotulo} icone={a.icone} ativo={e.imagem?.alinhar === a.id} aoClicar={() => fazer().updateAttributes("imagemDoBlog", { alinhar: a.id }).run()} />
          ))}
          <Botao dica="Texto ao lado da imagem" icone={WrapText} ativo={e.imagem.envolver} aoClicar={() => fazer().updateAttributes("imagemDoBlog", e.imagem?.envolver ? { envolver: false } : { envolver: true, alinhar: e.imagem?.alinhar === "centro" ? "esquerda" : e.imagem?.alinhar, largura: Math.min(e.imagem?.largura ?? 50, 60) }).run()} />
          <MenuDeIcone dica="Largura da imagem" icone={Maximize2}>
            {LARGURAS.map((l) => (
              <DropdownMenu.CheckboxItem key={l} closeOnClick checked={e.imagem?.largura === l} onCheckedChange={() => fazer().updateAttributes("imagemDoBlog", { largura: l }).run()}>
                {l}%
              </DropdownMenu.CheckboxItem>
            ))}
          </MenuDeIcone>
          <MenuDeIcone dica="Proporção da imagem" icone={Crop} ativo={!!e.imagem.proporcao}>
            {PROPORCOES.map((p) => (
              <DropdownMenu.CheckboxItem key={p.id} closeOnClick checked={(e.imagem?.proporcao ?? "") === p.id} onCheckedChange={() => fazer().updateAttributes("imagemDoBlog", { proporcao: p.id }).run()}>
                {p.rotulo}
              </DropdownMenu.CheckboxItem>
            ))}
          </MenuDeIcone>
          <Botao dica="Rodar a imagem" icone={RotateCw} ativo={!!e.imagem.rotacao} aoClicar={() => fazer().updateAttributes("imagemDoBlog", { rotacao: proximaRotacao(e.imagem?.rotacao) }).run()} />
          <Botao dica="Espelhar na horizontal" icone={FlipHorizontal2} ativo={e.imagem.espelhoH} aoClicar={() => fazer().updateAttributes("imagemDoBlog", { espelhoH: !e.imagem?.espelhoH }).run()} />
          <Botao dica="Espelhar na vertical" icone={FlipVertical2} ativo={e.imagem.espelhoV} aoClicar={() => fazer().updateAttributes("imagemDoBlog", { espelhoV: !e.imagem?.espelhoV }).run()} />
          <CartaoDeIcone dica="Ligação da imagem" icone={Link2} ativo={!!e.imagem.ligacao} largura="w-[min(320px,calc(100vw-2rem))]">
            <Input label="Para onde vai quem toca na imagem" value={e.imagem.ligacao} placeholder="https://" onChange={(ev) => fazer().updateAttributes("imagemDoBlog", { ligacao: ev.target.value }).run()} autoComplete="off" />
          </CartaoDeIcone>
          <Botao dica="Etiquetas na imagem" icone={Tags} ativo={e.imagem.marcar} aoClicar={() => fazer().updateAttributes("imagemDoBlog", { marcar: !e.imagem?.marcar }).run()} />
          <CartaoDeIcone dica="Texto alternativo da imagem" icone={Captions} largura="w-[min(320px,calc(100vw-2rem))]">
            <Input label="Texto alternativo" value={e.imagem.alt} onChange={(ev) => fazer().updateAttributes("imagemDoBlog", { alt: ev.target.value }).run()} autoComplete="off" />
          </CartaoDeIcone>
          <Botao dica="Tirar a imagem" icone={Trash2} aoClicar={() => fazer().deleteSelection().run()} />
        </span>
      )}
      {e.ficheiro?.tipo === "video" && (
        <span className="mr-3 flex items-center gap-1">
          <MenuDeIcone dica="Proporção do vídeo" icone={Crop} ativo={!!e.ficheiro.proporcao}>
            {PROPORCOES.map((p) => (
              <DropdownMenu.CheckboxItem key={p.id} closeOnClick checked={(e.ficheiro?.proporcao ?? "") === p.id} onCheckedChange={() => fazer().updateAttributes("ficheiroDoBlog", { proporcao: p.id }).run()}>
                {p.rotulo}
              </DropdownMenu.CheckboxItem>
            ))}
          </MenuDeIcone>
          <Botao dica="Rodar o vídeo" icone={RotateCw} ativo={!!e.ficheiro.rotacao} aoClicar={() => fazer().updateAttributes("ficheiroDoBlog", { rotacao: proximaRotacao(e.ficheiro?.rotacao) }).run()} />
          <Botao dica="Espelhar na horizontal" icone={FlipHorizontal2} ativo={e.ficheiro.espelhoH} aoClicar={() => fazer().updateAttributes("ficheiroDoBlog", { espelhoH: !e.ficheiro?.espelhoH }).run()} />
          <Botao dica="Espelhar na vertical" icone={FlipVertical2} ativo={e.ficheiro.espelhoV} aoClicar={() => fazer().updateAttributes("ficheiroDoBlog", { espelhoV: !e.ficheiro?.espelhoV }).run()} />
          <Botao dica={e.ficheiro.semAudio ? "Pôr o som" : "Tirar o som"} icone={e.ficheiro.semAudio ? VolumeX : Volume2} ativo={e.ficheiro.semAudio} aoClicar={() => fazer().updateAttributes("ficheiroDoBlog", { semAudio: !e.ficheiro?.semAudio }).run()} />
          <CartaoDeIcone dica="Cortar o vídeo" icone={Scissors} ativo={e.ficheiro.inicio > 0 || e.ficheiro.fim > 0} largura="w-[min(300px,calc(100vw-2rem))]">
            <CorteDoVideo editor={editor} inicio={e.ficheiro.inicio} fim={e.ficheiro.fim} />
          </CartaoDeIcone>
          <Botao dica="Tirar o vídeo" icone={Trash2} aoClicar={() => fazer().deleteSelection().run()} />
        </span>
      )}
      {e.colagem && (
        <span className="mr-3 flex items-center gap-1">
          <MenuDeIcone dica="Formato da colagem" icone={LayoutPanelLeft}>
            {MODELOS_DE_COLAGEM.map((m) => (
              <DropdownMenu.CheckboxItem key={m.id} closeOnClick checked={e.colagem?.modelo === m.id} onCheckedChange={() => fazer().updateAttributes("colagemDoBlog", { modelo: m.id }).run()}>
                {m.rotulo}
              </DropdownMenu.CheckboxItem>
            ))}
          </MenuDeIcone>
          <Botao dica="Acrescentar imagens à colagem" icone={ImagePlus} aoClicar={() => aoPedirColagem("mais")} />
          <CartaoDeIcone dica="Texto alternativo das imagens" icone={Captions} largura="w-[min(320px,calc(100vw-2rem))]">
            <Input label="Texto alternativo" value={e.colagem.alt} onChange={(ev) => fazer().updateAttributes("colagemDoBlog", { alt: ev.target.value }).run()} autoComplete="off" />
          </CartaoDeIcone>
          <Botao dica="Tirar a colagem" icone={Trash2} aoClicar={() => fazer().deleteSelection().run()} />
        </span>
      )}
      {e.tabela && (
        <span className="mr-3 flex items-center gap-1">
          <MenuDeIcone dica="Estilo da tabela" icone={Palette}>
            {ESTILOS_DE_TABELA.map((s) => (
              <DropdownMenu.CheckboxItem key={s.id} closeOnClick checked={e.estiloDaTabela === s.id} onCheckedChange={() => fazer().updateAttributes("table", { estilo: s.id }).run()}>
                {s.rotulo}
              </DropdownMenu.CheckboxItem>
            ))}
          </MenuDeIcone>
          <CartaoDeIcone dica="Cor da célula" icone={PaintBucket} ativo={!!e.fundoDaCelula}>
            <EscolherCor alternar cor={e.fundoDaCelula} aoMudar={(hex) => fazer().setCellAttribute("fundo", hex).run()} cores={CORES_DE_REALCE} padrao="#fef08a" rotuloDeVoltar="Tirar a cor da célula" />
          </CartaoDeIcone>
          <Botao dica="Linha de cabeçalho" icone={PanelTop} aoClicar={() => fazer().toggleHeaderRow().run()} />
          <Botao dica="Coluna de cabeçalho" icone={PanelLeft} aoClicar={() => fazer().toggleHeaderColumn().run()} />
          <CartaoDeIcone dica="Opções da tabela" icone={SlidersHorizontal} largura="w-[min(360px,calc(100vw-2rem))]">
            <OpcoesDaTabela editor={editor} posicao={null} />
          </CartaoDeIcone>
        </span>
      )}
      {/* 1. edição */}
      <Botao dica="Desfazer" icone={Undo2} desativado={!e.desfazer} aoClicar={() => fazer().undo().run()} />
      <Botao dica="Refazer" icone={Redo2} desativado={!e.refazer} aoClicar={() => fazer().redo().run()} />
      <Botao dica="Selecionar todo o texto" icone={TextSelect} aoClicar={() => fazer().selectAll().run()} />
      <Botao dica="Localizar e substituir (Ctrl+F)" icone={Search} aoClicar={() => aoLocalizar(false)} />
      <Divisor />
      {/* 2. estilo, tipo de letra e tamanho */}
      <MenuComRotulo dica="Estilo do texto" rotulo={ESTILOS.find((s) => (s.nivel > 0 ? e.nivel === s.nivel : e.nivel === 0 && e.variante === s.variante))?.rotulo ?? "Texto normal"} ativo={e.nivel > 0 || e.variante !== ""} largura="w-32">
        {ESTILOS.map((s) => (
          <DropdownMenu.CheckboxItem
            key={s.id}
            closeOnClick
            checked={s.nivel > 0 ? e.nivel === s.nivel : e.nivel === 0 && e.variante === s.variante}
            onCheckedChange={() => (s.nivel > 0 ? fazer().toggleHeading({ level: s.nivel as 2 | 3 | 4 }).run() : fazer().setParagraph().updateAttributes("paragraph", { variante: e.variante === s.variante ? "" : s.variante }).run())}
          >
            {s.rotulo}
          </DropdownMenu.CheckboxItem>
        ))}
      </MenuComRotulo>
      <CartaoComRotulo dica="Tipo de letra" rotulo={e.letra ? (e.letra.split(",")[0] ?? "").replace(/["']/g, "").trim() || "Tipo de letra" : "Tipo de letra"} ativo={!!e.letra}>
        <EscolherTipoDeLetra valor={e.letra ?? null} aoEscolher={(f) => (f ? fazer().setFontFamily(f).run() : fazer().unsetFontFamily().run())} />
      </CartaoComRotulo>
      <TamanhoDoTexto editor={editor} tamanho={e.tamanho} />
      <Divisor />
      {/* 3. texto: o que se faz a toda a hora fica à vista; o resto, em «Mais formatação» */}
      <Botao dica="Negrito" icone={Bold} ativo={e.negrito} aoClicar={() => fazer().toggleBold().run()} />
      <Botao dica="Itálico" icone={Italic} ativo={e.italico} aoClicar={() => fazer().toggleItalic().run()} />
      <Botao dica="Sublinhado" icone={Underline} ativo={e.sublinhado} aoClicar={() => fazer().toggleUnderline().run()} />
      <Botao dica="Riscado" icone={Strikethrough} ativo={e.riscado} aoClicar={() => fazer().toggleStrike().run()} />
      <CartaoDeIcone dica="Cor do texto" icone={Baseline} ativo={!!e.cor}>
        <EscolherCor alternar cor={e.cor ?? null} aoMudar={(hex) => (hex ? fazer().setColor(hex).run() : fazer().unsetColor().run())} cores={CORES_DE_GRAFICO} padrao="#171717" rotuloDeVoltar="Cor original" />
      </CartaoDeIcone>
      <CartaoDeIcone dica="Realce" icone={Highlighter} ativo={!!e.realce}>
        <EscolherCor alternar cor={e.realce ?? null} aoMudar={(hex) => (hex ? fazer().setHighlight({ color: hex }).run() : fazer().unsetHighlight().run())} cores={CORES_DE_REALCE} padrao="#fef08a" rotuloDeVoltar="Tirar o realce" />
      </CartaoDeIcone>
      <MenuDeIcone dica="Mais formatação" icone={Ellipsis} ativo={e.sobrescrito || e.subscrito || !!e.animacao}>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Posição</DropdownMenu.Label>
          <DropdownMenu.CheckboxItem closeOnClick checked={e.sobrescrito} onCheckedChange={() => fazer().alternarSobrescrito().run()}>
            Sobrescrito
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem closeOnClick checked={e.subscrito} onCheckedChange={() => fazer().alternarSubscrito().run()}>
            Subscrito
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Group>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Maiúsculas e minúsculas</DropdownMenu.Label>
          {MODOS_DE_CAIXA.map((m) => (
            <DropdownMenu.Item key={m.id} onClick={() => fazer().mudarCaixa(m.id).run()}>
              {m.rotulo}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Group>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Animação do texto</DropdownMenu.Label>
          <DropdownMenu.CheckboxItem closeOnClick checked={!e.animacao} onCheckedChange={() => fazer().unsetMark("animacaoDoTexto").run()}>
            Sem animação
          </DropdownMenu.CheckboxItem>
          {ANIMACOES_DO_TEXTO.map((n) => (
            <DropdownMenu.CheckboxItem key={n.id} closeOnClick checked={e.animacao === n.id} onCheckedChange={() => (e.animacao === n.id ? fazer().unsetMark("animacaoDoTexto").run() : fazer().setMark("animacaoDoTexto", { tipo: n.id }).run())}>
              {n.rotulo}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Group>
        <DropdownMenu.Item icon={<RemoveFormatting className="size-4" />} onClick={() => fazer().limparFormatacao().run()}>
          Limpar a formatação
        </DropdownMenu.Item>
      </MenuDeIcone>
      <Divisor />
      {/* 4. parágrafo: alinhar e avançar, espaçamento, listas, citação, colunas e letra capitular */}
      <MenuDeIcone dica="Alinhar e avançar" icone={alinhamentoAtual.icone} ativo={e.alinhar !== "left"}>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Alinhar</DropdownMenu.Label>
          {ALINHAMENTOS.map((a) => (
            <DropdownMenu.CheckboxItem key={a.id} closeOnClick checked={e.alinhar === a.id} onCheckedChange={() => (e.alinhar === a.id ? fazer().unsetTextAlign().run() : fazer().setTextAlign(a.id).run())}>
              {a.rotulo}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Group>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Avançar</DropdownMenu.Label>
          <DropdownMenu.Item icon={<IndentIncrease className="size-4" />} onClick={() => fazer().avancar(1).run()}>
            Aumentar o avanço
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<IndentDecrease className="size-4" />} onClick={() => fazer().avancar(-1).run()}>
            Diminuir o avanço
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </MenuDeIcone>
      <MenuDeIcone dica="Espaçamento do parágrafo" icone={ArrowDownUp} ativo={e.linhaDoTexto !== null || e.antesDoTexto !== null}>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Entre as linhas</DropdownMenu.Label>
          {ESPACAMENTOS_DE_LINHA.map((s) => (
            <DropdownMenu.CheckboxItem key={s.rotulo} closeOnClick checked={e.linhaDoTexto === s.valor} onCheckedChange={() => fazer().definirEspacoDeLinha(s.valor).run()}>
              {s.rotulo}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Group>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Antes do parágrafo</DropdownMenu.Label>
          {ESPACOS_ANTES.map((s) => (
            <DropdownMenu.CheckboxItem key={s.rotulo} closeOnClick checked={e.antesDoTexto === s.valor} onCheckedChange={() => fazer().definirEspacoAntes(s.valor).run()}>
              {s.rotulo}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Group>
      </MenuDeIcone>
      <MenuDeIcone dica="Listas" icone={e.numerada ? ListOrdered : e.tarefas ? ListChecks : List} ativo={e.lista || e.numerada || e.tarefas}>
        <DropdownMenu.CheckboxItem closeOnClick checked={e.lista} onCheckedChange={() => fazer().toggleBulletList().run()}>
          Lista com marcas
        </DropdownMenu.CheckboxItem>
        <DropdownMenu.CheckboxItem closeOnClick checked={e.numerada} onCheckedChange={() => fazer().toggleOrderedList().run()}>
          Lista numerada
        </DropdownMenu.CheckboxItem>
        <DropdownMenu.CheckboxItem closeOnClick checked={e.tarefas} onCheckedChange={() => fazer().toggleTaskList().run()}>
          Lista de tarefas
        </DropdownMenu.CheckboxItem>
      </MenuDeIcone>
      <Botao dica="Citação" icone={Quote} ativo={e.citacao} aoClicar={() => fazer().toggleBlockquote().run()} />
      <Botao dica="Código" icone={Code} ativo={e.codigo} aoClicar={() => fazer().toggleCode().run()} />
      <MenuDeIcone dica="Colunas" icone={Columns2} ativo={e.colunas > 0}>
        <DropdownMenu.CheckboxItem closeOnClick checked={e.colunas === 0} onCheckedChange={() => editor.chain().focus().desfazerColunas().run()}>
          Uma coluna
        </DropdownMenu.CheckboxItem>
        {[2, 3].map((n) => (
          <DropdownMenu.CheckboxItem key={n} closeOnClick checked={e.colunas === n} onCheckedChange={() => (e.colunas > 0 ? fazer().updateAttributes("colunasDoBlog", { n }).run() : fazer().wrapIn("colunasDoBlog", { n }).run())}>
            {n === 2 ? "Duas colunas" : "Três colunas"}
          </DropdownMenu.CheckboxItem>
        ))}
      </MenuDeIcone>
      <CartaoDeIcone dica="Letra capitular" icone={LetterText} ativo={e.capitular > 0} largura="w-[min(260px,calc(100vw-2rem))]">
        <CapitularDoParagrafo editor={editor} linhas={e.capitular} cor={e.capitularCor} />
      </CartaoDeIcone>
      <Divisor />
      {/* 5. inserir: o que precisa de um cartão (ligação, tabela, incorporar) fica à vista; o resto, em «Inserir» */}
      <CartaoDeIcone dica="Ligação" icone={Link2} ativo={e.ligacao} largura="w-[min(320px,calc(100vw-2rem))]">
        <LigacaoDoTexto editor={editor} href={e.href} />
      </CartaoDeIcone>
      <Botao dica="Imagem" icone={ImagePlus} aoClicar={aoPedirImagem} />
      {e.tabela ? (
        <MenuDeIcone dica="Tabela" icone={Table2} ativo>
          <DropdownMenu.Item icon={<BetweenHorizontalStart className="size-4" />} onClick={() => fazer().addRowBefore().run()}>
            Linha acima
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<BetweenHorizontalEnd className="size-4" />} onClick={() => fazer().addRowAfter().run()}>
            Linha abaixo
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<BetweenVerticalStart className="size-4" />} onClick={() => fazer().addColumnBefore().run()}>
            Coluna à esquerda
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<BetweenVerticalEnd className="size-4" />} onClick={() => fazer().addColumnAfter().run()}>
            Coluna à direita
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<Heading className="size-4" />} onClick={() => fazer().toggleHeaderRow().run()}>
            Linha de cabeçalho
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<Merge className="size-4" />} onClick={() => fazer().mergeCells().run()}>
            Juntar células
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<Split className="size-4" />} onClick={() => fazer().splitCell().run()}>
            Separar célula
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<Trash2 className="size-4" />} onClick={() => fazer().deleteRow().run()}>
            Apagar a linha
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<Trash2 className="size-4" />} onClick={() => fazer().deleteColumn().run()}>
            Apagar a coluna
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<Grid2x2X className="size-4" />} variant="danger" onClick={() => fazer().deleteTable().run()}>
            Apagar a tabela
          </DropdownMenu.Item>
        </MenuDeIcone>
      ) : (
        <CartaoDeIcone dica="Tabela" icone={Table2} largura="w-[240px]">
          <GradeDeTabela aoEscolher={(linhas, colunas) => fazer().insertTable({ rows: linhas, cols: colunas, withHeaderRow: true }).run()} />
        </CartaoDeIcone>
      )}
      <CartaoDeIcone dica="Incorporar vídeo, mapa ou ligação" icone={Globe} largura="w-[min(340px,calc(100vw-2rem))]">
        <IncorporarCampo editor={editor} />
      </CartaoDeIcone>
      <MenuDeIcone dica="Inserir" icone={Plus}>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Multimédia</DropdownMenu.Label>
          <DropdownMenu.Item icon={<LayoutGrid className="size-4" />} onClick={() => aoPedirColagem("nova")}>
            Colagem de imagens
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<Film className="size-4" />} onClick={() => aoPedirFicheiro("video")}>
            Vídeo
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<Music className="size-4" />} onClick={() => aoPedirFicheiro("audio")}>
            Áudio
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={<FileText className="size-4" />} onClick={() => aoPedirFicheiro("documento")}>
            Documento
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Linha divisória</DropdownMenu.Label>
          {TIPOS_DE_LINHA.map((l) => (
            <DropdownMenu.Item key={l.id || "fina"} onClick={() => (e.linha ? fazer().updateAttributes("horizontalRule", { linha: l.id }).run() : fazer().insertContent({ type: "horizontalRule", attrs: { linha: l.id } }).run())}>
              {l.rotulo}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Group>
        <DropdownMenu.Group>
          <DropdownMenu.Label>Caixa de destaque</DropdownMenu.Label>
          {TONS_DE_CAIXA.map((c) => (
            <DropdownMenu.CheckboxItem key={c.id} closeOnClick checked={e.caixa === c.id} onCheckedChange={() => fazer().alternarCaixa(c.id).run()}>
              {c.rotulo}
            </DropdownMenu.CheckboxItem>
          ))}
          {e.caixa !== "" && <DropdownMenu.Item onClick={() => fazer().tirarCaixa().run()}>Tirar a caixa</DropdownMenu.Item>}
        </DropdownMenu.Group>
        <DropdownMenu.Item icon={<SeparatorHorizontal className="size-4" />} onClick={() => fazer().inserirQuebraDePagina().run()}>
          Quebra de página
        </DropdownMenu.Item>
      </MenuDeIcone>
    </>
  );
}

export interface PropriedadesDoEditor {
  /** O texto com que o editor abre (depois disso quem manda é o editor). */
  html: string;
  /** Chama-se a cada alteração, com o HTML e o texto simples. */
  aoMudar: (html: string, texto: string) => void;
  /** O endereço de cada imagem da biblioteca. */
  urls: Map<string, string>;
  /** O que fica no princípio da fila de ferramentas (o botão de voltar). */
  inicio?: ReactNode;
  /** O que fica à direita, fora da fila que rola (o menu dos três pontos). */
  extras?: ReactNode;
  /** O que fica na folha antes do texto (a capa e o título). */
  topo?: ReactNode;
  aoPedirImagem: () => void;
  /** Pede as imagens de uma colagem: uma colagem nova, ou mais imagens para a que está escolhida. */
  aoPedirColagem: (modo: "nova" | "mais", modelo?: ModeloDeColagem) => void;
  /** Pede um áudio, um vídeo ou um documento da biblioteca. */
  aoPedirFicheiro: (tipo: TipoDeFicheiro) => void;
  /** Entrega o editor (para a página inserir a imagem escolhida). */
  aoCriar?: (editor: Editor) => void;
}

export function EditorDeTexto({ html, aoMudar, urls, inicio, extras, topo, aoPedirImagem, aoPedirColagem, aoPedirFicheiro, aoCriar }: PropriedadesDoEditor) {
  const mudar = useRef(aoMudar);
  mudar.current = aoMudar;
  const folha = useRef<HTMLDivElement>(null);
  const [localizar, setLocalizar] = useState<{ substituir: boolean } | null>(null);
  // Ctrl+F localiza e Ctrl+H substitui, quando o cursor está no artigo (fora dele valem os atalhos do navegador)
  useEffect(() => {
    const aoTeclar = (ev: KeyboardEvent) => {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || (ev.key !== "f" && ev.key !== "h")) return;
      if (!folha.current?.contains(document.activeElement) && !document.querySelector('[role="search"][aria-label="Localizar e substituir"]')?.contains(document.activeElement)) return;
      ev.preventDefault();
      setLocalizar({ substituir: ev.key === "h" });
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: EXTENSOES,
    content: html,
    editorProps: PROPRIEDADES,
    onUpdate: ({ editor: ed }) => mudar.current(ed.getHTML(), ed.getText({ blockSeparator: " " })),
  });
  useEffect(() => {
    if (editor) aoCriar?.(editor);
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{CSS_DO_ARTIGO}</style>
      <div className="sticky top-0 z-20 -mx-4 bg-kumo-canvas px-4 py-2 sm:-mx-6 sm:px-6">
        {/* no telemóvel há duas filas: em cima voltar, publicar e o menu; por baixo, as ferramentas com a largura toda (a fila rola de lado e esbate no fim) */}
        <div className="mx-auto flex max-w-[62rem] flex-wrap items-center gap-1 sm:flex-nowrap">
          {inicio && <div className="shrink-0 max-sm:order-1">{inicio}</div>}
          {/* as ferramentas ficam ao centro; se não couberem, a fila começa no princípio e rola (as margens automáticas dos extremos deixam de contar) */}
          <div
            className="sem-barra flex min-w-0 flex-1 items-center gap-1 overflow-x-auto max-sm:order-3 max-sm:basis-full max-sm:[mask-image:linear-gradient(to_right,transparent,black_8px,black_calc(100%-28px),transparent)] [&>*]:shrink-0 [&>:first-child]:ml-auto [&>:last-child]:mr-auto"
            role="toolbar"
            aria-label="Formatação do texto"
            // carregar num botão não tira o cursor do texto: a formatação aplica-se logo e o que se escreve a seguir já a leva
            onMouseDown={(ev) => (ev.target as HTMLElement).closest("button") && ev.preventDefault()}
          >
            {editor && <Ferramentas editor={editor} aoLocalizar={(substituir) => setLocalizar({ substituir })} aoPedirImagem={aoPedirImagem} aoPedirColagem={aoPedirColagem} aoPedirFicheiro={aoPedirFicheiro} />}
          </div>
          {extras && <div className="shrink-0 max-sm:order-2 max-sm:ml-auto">{extras}</div>}
        </div>
      </div>
      <ContextoDeImagens.Provider value={urls}>
        <div ref={folha} className="relative mx-auto w-full max-w-[46rem] pb-24" onClick={(ev) => ev.target === ev.currentTarget && editor?.commands.focus("end")}>
          {topo}
          <EditorContent editor={editor} />
          {editor && <BarraDaSelecao editor={editor} raiz={folha} />}
          {editor && localizar && <BarraDeLocalizar editor={editor} comSubstituir={localizar.substituir} aoFechar={() => (setLocalizar(null), editor.commands.focus())} />}
          {editor && <AcoesAoPassar editor={editor} raiz={folha} aoPedirImagem={aoPedirImagem} aoPedirColagem={aoPedirColagem} aoPedirFicheiro={aoPedirFicheiro} />}
        </div>
      </ContextoDeImagens.Provider>
    </>
  );
}
