// Os formatos de um parágrafo do blog que vão além do texto: a letra capitular (a primeira letra grande, com o resto do texto a rodeá-la, em 2, 3 ou 4 linhas e com cor à escolha), o texto de destaque (grande, em serifa, como a abertura de uma revista) e a legenda (pequena). São atributos do parágrafo; no HTML ficam como classes («capitular capitular-3», «destaque», «legenda») e o aspeto vem de blog-css.ts. Mais as colunas: um bloco que reparte o texto em duas ou três colunas com um filete no meio.
import { Extension, Mark, Node } from "@tiptap/core";

export type VarianteDeParagrafo = "" | "destaque" | "legenda";

export const FormatosDoParagrafo = Extension.create({
  name: "formatosDoParagrafo",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          /** 0 = sem letra capitular; senão, quantas linhas ocupa (2, 3 ou 4). */
          capitular: {
            default: 0,
            parseHTML: (e: HTMLElement) => (e.classList.contains("capitular-2") ? 2 : e.classList.contains("capitular-4") ? 4 : e.classList.contains("capitular") ? 3 : 0),
            renderHTML: (a: { capitular?: number }) => (a.capitular ? { class: `capitular capitular-${a.capitular}` } : {}),
          },
          capitularCor: {
            default: null,
            parseHTML: (e: HTMLElement) => e.style.getPropertyValue("--cap-cor") || null,
            renderHTML: (a: { capitular?: number; capitularCor?: string | null }) => (a.capitular && a.capitularCor ? { style: `--cap-cor: ${a.capitularCor}` } : {}),
          },
          variante: {
            default: "",
            parseHTML: (e: HTMLElement) => (e.classList.contains("destaque") ? "destaque" : e.classList.contains("legenda") ? "legenda" : ""),
            renderHTML: (a: { variante?: VarianteDeParagrafo }) => (a.variante ? { class: a.variante } : {}),
          },
        },
      },
      {
        types: ["horizontalRule"],
        attributes: {
          /** O tipo de linha: fina (a de sempre), tracejada, pontilhada, dupla, grossa ou ornamento. */
          linha: {
            default: "",
            parseHTML: (e: HTMLElement) => /linha-(tracejada|pontilhada|dupla|grossa|ornamento)/.exec(e.className)?.[1] ?? "",
            renderHTML: (a: { linha?: string }) => (a.linha ? { class: `linha-${a.linha}` } : {}),
          },
        },
      },
    ];
  },
});

/** Os tipos de linha que se podem pôr entre dois pedaços do texto. */
export const TIPOS_DE_LINHA: { id: string; rotulo: string }[] = [
  { id: "", rotulo: "Fina" },
  { id: "tracejada", rotulo: "Tracejada" },
  { id: "pontilhada", rotulo: "Pontilhada" },
  { id: "dupla", rotulo: "Dupla" },
  { id: "grossa", rotulo: "Grossa" },
  { id: "ornamento", rotulo: "Ornamento" },
];

/** As animações que o texto pode ter (o CSS está em blog-css.ts; quem prefere menos movimento não as vê). */
export const ANIMACOES_DO_TEXTO: { id: string; rotulo: string }[] = [
  { id: "aparecer", rotulo: "Aparecer" },
  { id: "subir", rotulo: "Subir" },
  { id: "destacar", rotulo: "Destacar" },
  { id: "pulsar", rotulo: "Pulsar" },
  { id: "brilhar", rotulo: "Brilhar" },
  { id: "balancar", rotulo: "Balançar" },
];

/** O texto com uma animação: no HTML fica «<span data-anim="subir">». */
export const AnimacaoDoTexto = Mark.create({
  name: "animacaoDoTexto",
  addAttributes() {
    return { tipo: { default: "aparecer", parseHTML: (e: HTMLElement) => e.getAttribute("data-anim") ?? "aparecer", rendered: false } };
  },
  parseHTML() {
    return [{ tag: "span[data-anim]" }];
  },
  renderHTML({ mark }) {
    return ["span", { "data-anim": mark.attrs.tipo }, 0];
  },
});

/** Um bloco que reparte o que tem dentro (parágrafos, títulos, listas) em colunas. */
export const ColunasDoBlog = Node.create({
  name: "colunasDoBlog",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { n: { default: 2, parseHTML: (e: HTMLElement) => (e.getAttribute("data-colunas") === "3" ? 3 : 2) } };
  },
  parseHTML() {
    return [{ tag: "div[data-colunas]" }];
  },
  renderHTML({ node }) {
    return ["div", { "data-colunas": String(node.attrs.n) }, 0];
  },
  addCommands() {
    return {
      /** Tira as colunas do bloco onde está o cursor: o que tinham dentro fica no texto, uma coluna só. */
      desfazerColunas:
        () =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d > 0; d--) {
            const no = $from.node(d);
            if (no.type.name !== "colunasDoBlog") continue;
            const inicio = $from.before(d);
            dispatch?.(tr.replaceWith(inicio, inicio + no.nodeSize, no.content));
            return true;
          }
          return false;
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    colunasDoBlog: { desfazerColunas: () => ReturnType };
  }
}
