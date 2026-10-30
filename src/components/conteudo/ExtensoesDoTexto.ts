// O que o editor de blog acrescenta à formatação do TipTap: o espaço entre linhas e antes do parágrafo, o avanço, limpar a formatação, sobrescrito e subscrito, mudar as maiúsculas e minúsculas, as caixas de destaque e a quebra de página. Tudo fica no HTML (atributos «data-»), por isso o artigo exportado tem o mesmo aspeto.
import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import type { Mark as MarcaPM } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { aplicarCaixa, limitarAvanco, tomDeCaixa, type ModoDeCaixa } from "@/lib/blog-texto";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    espacamentoDoTexto: {
      definirEspacoDeLinha: (valor: number | null) => ReturnType;
      definirEspacoAntes: (valor: number | null) => ReturnType;
      avancar: (passo: 1 | -1) => ReturnType;
      limparFormatacao: () => ReturnType;
      mudarCaixa: (modo: ModoDeCaixa) => ReturnType;
    };
    sobrescrito: { alternarSobrescrito: () => ReturnType };
    subscrito: { alternarSubscrito: () => ReturnType };
    quebraDePagina: { inserirQuebraDePagina: () => ReturnType };
    caixaDoBlog: { alternarCaixa: (tom: string) => ReturnType; tirarCaixa: () => ReturnType };
  }
}

const BLOCOS = ["paragraph", "heading"];

/** Muda um atributo de todos os parágrafos e títulos tocados pela seleção. */
function noBlocos(tr: Transaction, nome: string, novo: (atual: unknown) => unknown) {
  const { from, to } = tr.selection;
  tr.doc.nodesBetween(from, to, (no, pos) => {
    if (BLOCOS.includes(no.type.name)) tr.setNodeMarkup(pos, undefined, { ...no.attrs, [nome]: novo(no.attrs[nome]) });
  });
}

const numeroDe = (v: string | null | undefined): number | null => {
  const n = Number.parseFloat(v ?? "");
  return Number.isFinite(n) ? n : null;
};

export const EspacamentoDoTexto = Extension.create({
  name: "espacamentoDoTexto",

  addGlobalAttributes() {
    return [
      {
        types: BLOCOS,
        attributes: {
          linha: {
            default: null,
            parseHTML: (el: HTMLElement) => numeroDe(el.style.lineHeight),
            renderHTML: (a: Record<string, unknown>) => (typeof a.linha === "number" ? { style: `line-height: ${a.linha}` } : {}),
          },
          antes: {
            default: null,
            parseHTML: (el: HTMLElement) => numeroDe(el.getAttribute("data-antes")),
            renderHTML: (a: Record<string, unknown>) => (typeof a.antes === "number" ? { "data-antes": a.antes, style: `margin-top: ${a.antes}em` } : {}),
          },
          avanco: {
            default: 0,
            parseHTML: (el: HTMLElement) => limitarAvanco(numeroDe(el.getAttribute("data-avanco")) ?? 0),
            renderHTML: (a: Record<string, unknown>) => (typeof a.avanco === "number" && a.avanco > 0 ? { "data-avanco": a.avanco, style: `margin-left: ${a.avanco * 2}rem` } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      definirEspacoDeLinha:
        (valor) =>
        ({ tr, dispatch }) => {
          if (dispatch) noBlocos(tr, "linha", () => valor);
          return true;
        },
      definirEspacoAntes:
        (valor) =>
        ({ tr, dispatch }) => {
          if (dispatch) noBlocos(tr, "antes", () => valor);
          return true;
        },
      // numa lista, o avanço é o nível da lista; no resto, é a margem do parágrafo
      avancar:
        (passo) =>
        ({ editor, commands, tr, dispatch }) => {
          for (const item of ["listItem", "taskItem"]) if (editor.isActive(item)) return passo > 0 ? commands.sinkListItem(item) : commands.liftListItem(item);
          if (dispatch) noBlocos(tr, "avanco", (v) => limitarAvanco((typeof v === "number" ? v : 0) + passo));
          return true;
        },
      limparFormatacao:
        () =>
        ({ chain }) =>
          chain()
            .unsetAllMarks()
            .clearNodes()
            .command(({ tr }) => {
              const { from, to } = tr.selection;
              tr.doc.nodesBetween(from, to, (no, pos) => {
                if (no.type.name === "paragraph") tr.setNodeMarkup(pos, undefined, {});
              });
              return true;
            })
            .run(),
      mudarCaixa:
        (modo) =>
        ({ state, tr, dispatch }) => {
          const { from, to, empty } = state.selection;
          if (empty) return false;
          if (dispatch) {
            const trocas: { de: number; ate: number; texto: string; marcas: readonly MarcaPM[] }[] = [];
            state.doc.nodesBetween(from, to, (no, pos) => {
              if (!no.isText || !no.text) return;
              const de = Math.max(from, pos);
              const ate = Math.min(to, pos + no.nodeSize);
              const original = no.text.slice(de - pos, ate - pos);
              const novo = aplicarCaixa(original, modo);
              if (novo !== original) trocas.push({ de, ate, texto: novo, marcas: no.marks });
            });
            // do fim para o princípio, para as posições de trás não mudarem
            for (const t of trocas.reverse()) tr.replaceWith(t.de, t.ate, state.schema.text(t.texto, t.marcas));
          }
          return true;
        },
    };
  },
});

export const Sobrescrito = Mark.create({
  name: "sobrescrito",
  excludes: "subscrito",
  parseHTML: () => [{ tag: "sup" }],
  renderHTML: ({ HTMLAttributes }) => ["sup", mergeAttributes(HTMLAttributes), 0],
  addCommands() {
    return { alternarSobrescrito: () => ({ commands }) => commands.toggleMark(this.name) };
  },
  addKeyboardShortcuts() {
    return { "Mod-.": () => this.editor.commands.alternarSobrescrito() };
  },
});

export const Subscrito = Mark.create({
  name: "subscrito",
  excludes: "sobrescrito",
  parseHTML: () => [{ tag: "sub" }],
  renderHTML: ({ HTMLAttributes }) => ["sub", mergeAttributes(HTMLAttributes), 0],
  addCommands() {
    return { alternarSubscrito: () => ({ commands }) => commands.toggleMark(this.name) };
  },
  addKeyboardShortcuts() {
    return { "Mod-,": () => this.editor.commands.alternarSubscrito() };
  },
});

/** A quebra de página: no ecrã é um filete a tracejado; ao imprimir ou exportar em PDF, a página muda ali. */
export const QuebraDePagina = Node.create({
  name: "quebraDePagina",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "div[data-quebra-de-pagina]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-quebra-de-pagina": "" })],
  addCommands() {
    return { inserirQuebraDePagina: () => ({ commands }) => commands.insertContent({ type: this.name }) };
  },
  addKeyboardShortcuts() {
    return { "Mod-Shift-Enter": () => this.editor.commands.inserirQuebraDePagina() };
  },
});

/** A caixa de destaque: um bloco com fundo suave e uma barra do lado (informação, atenção, sucesso, perigo ou nota) que leva qualquer texto lá dentro. */
export const CaixaDoBlog = Node.create({
  name: "caixaDoBlog",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      tom: {
        default: "info",
        parseHTML: (el: HTMLElement) => tomDeCaixa(el.getAttribute("data-caixa")),
        renderHTML: (a: Record<string, unknown>) => ({ "data-caixa": tomDeCaixa(a.tom) }),
      },
    };
  },
  parseHTML: () => [{ tag: "div[data-caixa]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes), 0],
  addCommands() {
    return {
      // dentro de uma caixa muda-lhe o tom; fora, põe o texto numa caixa
      alternarCaixa:
        (tom) =>
        ({ editor, commands }) =>
          editor.isActive(this.name) ? commands.updateAttributes(this.name, { tom }) : commands.wrapIn(this.name, { tom }),
      tirarCaixa:
        () =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d > 0; d -= 1) {
            if ($from.node(d).type.name !== this.name) continue;
            if (dispatch) tr.replaceWith($from.before(d), $from.after(d), $from.node(d).content);
            return true;
          }
          return false;
        },
    };
  },
});
