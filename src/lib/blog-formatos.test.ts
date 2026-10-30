// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { CSS_DO_ARTIGO } from "./blog-css";
import { AnimacaoDoTexto, ANIMACOES_DO_TEXTO, ColunasDoBlog, FormatosDoParagrafo, TIPOS_DE_LINHA } from "./blog-formatos";

let editor: Editor | null = null;
afterEach(() => editor?.destroy());
const abrir = (html: string) => (editor = new Editor({ element: document.createElement("div"), extensions: [StarterKit, FormatosDoParagrafo, ColunasDoBlog, AnimacaoDoTexto], content: html }));

describe("letra capitular", () => {
  it("liga, muda de linhas e desliga no parágrafo onde está o cursor", () => {
    const ed = abrir("<p>Era uma vez.</p><p>Outro parágrafo.</p>");
    ed.commands.setTextSelection(3);
    ed.commands.updateAttributes("paragraph", { capitular: 3 });
    expect(ed.getHTML()).toBe('<p class="capitular capitular-3">Era uma vez.</p><p>Outro parágrafo.</p>');
    ed.commands.updateAttributes("paragraph", { capitular: 4, capitularCor: "#dc2626" });
    expect(ed.getHTML()).toBe('<p class="capitular capitular-4" style="--cap-cor: #dc2626;">Era uma vez.</p><p>Outro parágrafo.</p>');
    ed.commands.updateAttributes("paragraph", { capitular: 0 });
    expect(ed.getHTML()).toBe("<p>Era uma vez.</p><p>Outro parágrafo.</p>");
  });
  it("lê-se outra vez do HTML guardado, com as linhas e a cor", () => {
    const ed = abrir('<p class="capitular capitular-2" style="--cap-cor: #2563eb">Era uma vez.</p>');
    ed.commands.setTextSelection(3);
    expect(ed.getAttributes("paragraph")).toMatchObject({ capitular: 2, capitularCor: "#2563eb" });
  });
});

describe("destaque e legenda", () => {
  it("ficam como classe do parágrafo e voltam ao normal", () => {
    const ed = abrir("<p>Texto.</p>");
    ed.commands.setTextSelection(2);
    ed.commands.updateAttributes("paragraph", { variante: "destaque" });
    expect(ed.getHTML()).toBe('<p class="destaque">Texto.</p>');
    ed.commands.updateAttributes("paragraph", { variante: "legenda" });
    expect(ed.getHTML()).toBe('<p class="legenda">Texto.</p>');
    ed.commands.updateAttributes("paragraph", { variante: "" });
    expect(ed.getHTML()).toBe("<p>Texto.</p>");
  });
});

describe("colunas", () => {
  it("juntam vários parágrafos, mudam de número e desfazem-se", () => {
    const ed = abrir("<p>Um.</p><p>Dois.</p>");
    ed.chain().selectAll().wrapIn("colunasDoBlog", { n: 2 }).run();
    // o editor deixa sempre um parágrafo vazio depois de um bloco, para se poder continuar a escrever
    const sem = () => ed.getHTML().replace(/<p><\/p>$/, "");
    expect(sem()).toBe('<div data-colunas="2"><p>Um.</p><p>Dois.</p></div>');
    ed.commands.updateAttributes("colunasDoBlog", { n: 3 });
    expect(sem()).toBe('<div data-colunas="3"><p>Um.</p><p>Dois.</p></div>');
    ed.commands.setTextSelection(3);
    ed.commands.desfazerColunas();
    expect(sem()).toBe("<p>Um.</p><p>Dois.</p>");
  });
});

describe("folha de estilo", () => {
  it("tem as regras de cada formato", () => {
    for (const regra of ["p.capitular::first-letter", "capitular-4", "p.destaque", "p.legenda", 'div[data-colunas="2"]', "column-rule"]) expect(CSS_DO_ARTIGO).toContain(regra);
  });
});

describe("linhas e animações", () => {
  it("a linha tem tipos e volta a lê-los do HTML", () => {
    expect(TIPOS_DE_LINHA.map((l) => l.id)).toEqual(["", "tracejada", "pontilhada", "dupla", "grossa", "ornamento"]);
    const ed = abrir("<p>a</p><hr class=\"linha-dupla\"><p>b</p>");
    expect(ed.getHTML()).toContain('<hr class="linha-dupla">');
    ed.commands.setNodeSelection(3);
    ed.commands.updateAttributes("horizontalRule", { linha: "ornamento" });
    expect(ed.getHTML()).toContain('<hr class="linha-ornamento">');
    ed.commands.updateAttributes("horizontalRule", { linha: "" });
    expect(ed.getHTML()).toContain("<hr>");
  });
  it("o texto ganha e perde uma animação", () => {
    expect(ANIMACOES_DO_TEXTO.map((a) => a.id)).toContain("subir");
    const ed = abrir("<p>Olá mundo</p>");
    ed.chain().selectAll().setMark("animacaoDoTexto", { tipo: "subir" }).run();
    expect(ed.getHTML()).toBe('<p><span data-anim="subir">Olá mundo</span></p>');
    ed.chain().selectAll().unsetMark("animacaoDoTexto").run();
    expect(ed.getHTML()).toBe("<p>Olá mundo</p>");
    expect(abrir('<p><span data-anim="pulsar">x</span></p>').getHTML()).toContain('data-anim="pulsar"');
  });
});
