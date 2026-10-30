// As propriedades do texto escolhido, à mão: ao selecionar texto aparece por cima da seleção uma barra com o negrito, o itálico, o sublinhado, o riscado, a ligação, a cor, o realce, o tamanho, o alinhamento e o limpar a formatação. Nada de abrir menus lá em cima para o que se faz a toda a hora.
"use client";

import { DropdownMenu } from "@cloudflare/kumo";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, Highlighter, Italic, Link2, RemoveFormatting, Strikethrough, Underline } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { CORES_DE_GRAFICO } from "@/lib/cores-graficos";
import { EscolherCor } from "../EscolherCor";
import { CartaoFlutuante } from "../Flutuantes";
import { BotaoIcone, CartaoDeIcone, MenuDeIcone, type IconeDeBotao } from "../ui";
import { CORES_DE_REALCE, LigacaoDoTexto, PEQUENO, TamanhoDoTexto } from "./PecasDoTexto";

const ALINHAMENTOS: { id: "left" | "center" | "right" | "justify"; rotulo: string; icone: IconeDeBotao }[] = [
  { id: "left", rotulo: "À esquerda", icone: AlignLeft },
  { id: "center", rotulo: "Ao centro", icone: AlignCenter },
  { id: "right", rotulo: "À direita", icone: AlignRight },
  { id: "justify", rotulo: "Justificado", icone: AlignJustify },
];

interface Posicao {
  top: number;
  /** O meio da seleção, na folha. */
  centro: number;
}

export function BarraDaSelecao({ editor, raiz }: { editor: Editor; raiz: RefObject<HTMLDivElement | null> }) {
  const [pos, setPos] = useState<Posicao | null>(null);
  const [, setTique] = useState(0);
  const barra = useRef<HTMLDivElement>(null);
  const arrastar = useRef(false);
  const [largura, setLargura] = useState(0);
  // a barra nunca sai da folha, nem num ecrã estreito: o meio ajusta-se à largura que ela tem
  useLayoutEffect(() => {
    if (barra.current && barra.current.offsetWidth !== largura) setLargura(barra.current.offsetWidth);
  });

  useEffect(() => {
    const calcular = () => {
      const { selection } = editor.state;
      const base = raiz.current?.getBoundingClientRect();
      // só texto escolhido (uma imagem, uma tabela ou o cursor sem seleção têm as suas barras)
      if (!base || arrastar.current || !(selection instanceof TextSelection) || selection.empty || editor.isActive("codeBlock")) return setPos(null);
      try {
        const a = editor.view.coordsAtPos(selection.from);
        const b = editor.view.coordsAtPos(selection.to);
        const meio = (Math.min(a.left, b.left) + Math.max(a.right, b.right)) / 2 - base.left;
        setPos({ top: Math.min(a.top, b.top) - base.top - 46, centro: meio });
      } catch {
        setPos(null);
      }
    };
    const atualizar = () => {
      calcular();
      setTique((t) => t + 1);
    };
    const descer = () => {
      arrastar.current = true;
      setPos(null);
    };
    const subir = () => {
      if (!arrastar.current) return;
      arrastar.current = false;
      window.setTimeout(atualizar, 0);
    };
    const dom = editor.view.dom;
    dom.addEventListener("mousedown", descer);
    window.addEventListener("mouseup", subir);
    editor.on("selectionUpdate", atualizar);
    editor.on("update", atualizar);
    return () => {
      dom.removeEventListener("mousedown", descer);
      window.removeEventListener("mouseup", subir);
      editor.off("selectionUpdate", atualizar);
      editor.off("update", atualizar);
    };
  }, [editor, raiz]);

  // a barra esconde-se quando o foco saiu do texto e dela e nenhum menu dela está aberto
  useEffect(() => {
    if (!pos) return;
    const t = window.setInterval(() => {
      const aberto = !!barra.current?.querySelector("[data-popup-open]");
      if (!aberto && !editor.view.hasFocus() && !barra.current?.contains(document.activeElement)) setPos(null);
    }, 600);
    return () => window.clearInterval(t);
  }, [pos, editor]);

  if (!pos) return null;
  const folhaLarga = raiz.current?.getBoundingClientRect().width ?? 0;
  const metade = Math.min(largura || 340, Math.max(0, folhaLarga - 16)) / 2;
  const esquerda = Math.max(metade + 8, Math.min(folhaLarga - metade - 8, pos.centro));
  const fazer = () => editor.chain().focus();
  const a = editor.getAttributes("textStyle");
  const alinhar = (ALINHAMENTOS.find((x) => editor.isActive({ textAlign: x.id })) ?? ALINHAMENTOS[0]).id;
  const alinhamentoAtual = ALINHAMENTOS.find((x) => x.id === alinhar) ?? ALINHAMENTOS[0];
  const ligacao = editor.isActive("link");

  return (
    <CartaoFlutuante
      ref={barra}
      role="toolbar"
      aria-label="Propriedades do texto escolhido"
      // os botões não tiram a seleção do texto
      onMouseDown={(ev) => {
        if (!(ev.target instanceof HTMLInputElement)) ev.preventDefault();
      }}
      className="sem-barra absolute z-40 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto p-1"
      style={{ top: pos.top, left: esquerda }}
    >
      <BotaoIcone dica="Negrito" icone={Bold} tamanho="sm" className={PEQUENO} ligado={editor.isActive("bold")} aoClicar={() => fazer().toggleBold().run()} />
      <BotaoIcone dica="Itálico" icone={Italic} tamanho="sm" className={PEQUENO} ligado={editor.isActive("italic")} aoClicar={() => fazer().toggleItalic().run()} />
      <BotaoIcone dica="Sublinhado" icone={Underline} tamanho="sm" className={PEQUENO} ligado={editor.isActive("underline")} aoClicar={() => fazer().toggleUnderline().run()} />
      <BotaoIcone dica="Riscado" icone={Strikethrough} tamanho="sm" className={PEQUENO} ligado={editor.isActive("strike")} aoClicar={() => fazer().toggleStrike().run()} />
      <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-kumo-line" />
      <TamanhoDoTexto editor={editor} tamanho={a.fontSize as string | undefined} pequeno />
      <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-kumo-line" />
      <CartaoDeIcone dica="Cor do texto" icone={Baseline} tamanho="sm" className={PEQUENO} ativo={!!a.color}>
        <EscolherCor alternar cor={(a.color as string | undefined) ?? null} aoMudar={(hex) => (hex ? fazer().setColor(hex).run() : fazer().unsetColor().run())} cores={CORES_DE_GRAFICO} padrao="#171717" rotuloDeVoltar="Cor original" />
      </CartaoDeIcone>
      <CartaoDeIcone dica="Realce" icone={Highlighter} tamanho="sm" className={PEQUENO} ativo={editor.isActive("highlight")}>
        <EscolherCor alternar cor={(editor.getAttributes("highlight").color as string | undefined) ?? null} aoMudar={(hex) => (hex ? fazer().setHighlight({ color: hex }).run() : fazer().unsetHighlight().run())} cores={CORES_DE_REALCE} padrao="#fef08a" rotuloDeVoltar="Tirar o realce" />
      </CartaoDeIcone>
      <CartaoDeIcone dica="Ligação" icone={Link2} tamanho="sm" className={PEQUENO} ativo={ligacao} largura="w-[min(320px,calc(100vw-2rem))]">
        <LigacaoDoTexto editor={editor} href={ligacao ? (editor.getAttributes("link").href as string | undefined) : undefined} />
      </CartaoDeIcone>
      <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-kumo-line" />
      <MenuDeIcone dica="Alinhamento" icone={alinhamentoAtual.icone} tamanho="sm" className={PEQUENO} ativo={alinhar !== "left"}>
        {ALINHAMENTOS.map((x) => (
          <DropdownMenu.CheckboxItem key={x.id} closeOnClick checked={alinhar === x.id} onCheckedChange={() => (alinhar === x.id ? fazer().unsetTextAlign().run() : fazer().setTextAlign(x.id).run())}>
            {x.rotulo}
          </DropdownMenu.CheckboxItem>
        ))}
      </MenuDeIcone>
      <BotaoIcone dica="Limpar a formatação" icone={RemoveFormatting} tamanho="sm" className={PEQUENO} aoClicar={() => fazer().limparFormatacao().run()} />
    </CartaoFlutuante>
  );
}
