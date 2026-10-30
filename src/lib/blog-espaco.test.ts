// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { EspacoQuebraFormatacao } from "./blog-espaco";

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

const abrir = (html: string) => {
  editor = new Editor({ element: document.createElement("div"), extensions: [StarterKit, TextStyle, Color, Highlight.configure({ multicolor: true }), EspacoQuebraFormatacao], content: html });
  return editor;
};
/** Escreve como o teclado: primeiro o plugin (que pode tratar o espaço), senão insere o texto. */
const escrever = (ed: Editor, texto: string) => {
  for (const c of texto) {
    const { from, to } = ed.state.selection;
    const tratado = ed.view.someProp("handleTextInput", (f) => f(ed.view, from, to, c, () => ed.state.tr.insertText(c, from, to)));
    if (!tratado) ed.view.dispatch(ed.state.tr.insertText(c, from, to));
  }
};
const fim = (ed: Editor) => ed.commands.setTextSelection(ed.state.doc.content.size - 1);

describe("o espaço corta a formatação", () => {
  it("o espaço a seguir a uma palavra a negrito é simples e o que vem depois também", () => {
    const ed = abrir("<p><strong>ola</strong></p>");
    fim(ed);
    escrever(ed, " mundo");
    expect(ed.getHTML()).toBe("<p><strong>ola</strong> mundo</p>");
  });
  it("vale para o riscado e para o sublinhado ligados no botão antes de escrever", () => {
    const ed = abrir("<p>ola</p>");
    fim(ed);
    escrever(ed, " ");
    ed.chain().toggleStrike().run();
    escrever(ed, "novembro");
    expect(ed.getHTML()).toBe("<p>ola <s>novembro</s></p>");
    escrever(ed, " e depois");
    expect(ed.getHTML()).toBe("<p>ola <s>novembro</s> e depois</p>");
  });
  it("no meio de uma frase a negrito o espaço não a parte", () => {
    const ed = abrir("<p><strong>ola mundo</strong></p>");
    ed.commands.setTextSelection(4);
    escrever(ed, " ");
    expect(ed.getHTML()).toBe("<p><strong>ola  mundo</strong></p>");
  });
  it("o tamanho e a cor continuam depois do espaço", () => {
    const ed = abrir('<p><span style="color: rgb(220, 38, 38)"><strong>ola</strong></span></p>');
    fim(ed);
    escrever(ed, " mundo");
    expect(ed.getHTML()).toBe('<p><span style="color: rgb(220, 38, 38);"><strong>ola</strong> mundo</span></p>');
  });
  it("um texto que chega de uma vez com o espaço lá dentro: antes do espaço leva a formatação, depois não", () => {
    const ed = abrir("<p><strong>ola</strong></p>");
    fim(ed);
    const { from, to } = ed.state.selection;
    const tratado = ed.view.someProp("handleTextInput", (f) => f(ed.view, from, to, "do e mais", () => ed.state.tr));
    expect(tratado).toBe(true);
    expect(ed.getHTML()).toBe("<p><strong>olado</strong> e mais</p>");
  });
  it("sem formatação o espaço escreve-se como sempre", () => {
    const ed = abrir("<p>ola</p>");
    fim(ed);
    escrever(ed, " mundo");
    expect(ed.getHTML()).toBe("<p>ola mundo</p>");
  });
});
