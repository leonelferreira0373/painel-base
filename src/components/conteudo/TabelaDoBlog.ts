// A tabela do editor com o que o TipTap não traz: o estilo da tabela inteira (grelha, linhas, listrada, cabeçalho escuro, limpa), as opções de cor e borda (cor, espessura e traço da borda, fundo e cor do texto do cabeçalho), a cor de fundo e o alinhamento vertical de cada célula. Tudo fica no HTML («data-estilo», «data-opcoes», «data-fundo», «data-valign»; as cores como variáveis de CSS na própria tabela) para o artigo exportado ter o mesmo aspeto, e a tabela leva uma moldura que deixa deslizar de lado nos ecrãs pequenos.
import { mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { createColGroup, Table, TableCell, TableHeader } from "@tiptap/extension-table";
import { alinhamentoVerticalValido, ESTILO_DE_TABELA_POR_OMISSAO, estiloDasOpcoesDaTabela, estiloDeTabela, escreverOpcoesDaTabela, lerOpcoesDaTabela } from "@/lib/blog-tabela";
import { corValida } from "@/lib/cores-graficos";

export const TabelaDoBlog = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      estilo: {
        default: ESTILO_DE_TABELA_POR_OMISSAO,
        parseHTML: (el: HTMLElement) => estiloDeTabela(el.getAttribute("data-estilo")),
        renderHTML: (a: Record<string, unknown>) => (estiloDeTabela(a.estilo) !== ESTILO_DE_TABELA_POR_OMISSAO ? { "data-estilo": estiloDeTabela(a.estilo) } : {}),
      },
      // as opções de cor e borda, num só atributo; a tabela leva-as também como variáveis de CSS
      opcoes: {
        default: "",
        parseHTML: (el: HTMLElement) => escreverOpcoesDaTabela(lerOpcoesDaTabela(el.getAttribute("data-opcoes"))),
        renderHTML: (a: Record<string, unknown>) => {
          const texto = typeof a.opcoes === "string" ? escreverOpcoesDaTabela(lerOpcoesDaTabela(a.opcoes)) : "";
          return texto ? { "data-opcoes": texto, style: estiloDasOpcoesDaTabela(lerOpcoesDaTabela(texto)) } : {};
        },
      },
    };
  },
  // o TipTap deita fora a largura das colunas quando a tabela leva um estilo seu: aqui junta-se os dois
  renderHTML({ node, HTMLAttributes }) {
    const { colgroup, tableWidth, tableMinWidth } = createColGroup(node, this.options.cellMinWidth);
    const base = tableWidth ? `width: ${tableWidth}` : `min-width: ${tableMinWidth}`;
    const { style, ...resto } = HTMLAttributes as Record<string, unknown> & { style?: string };
    const tabela = ["table", mergeAttributes(this.options.HTMLAttributes, resto, { style: [base, style].filter(Boolean).join("; ") }), colgroup, ["tbody", 0]] as unknown as DOMOutputSpec;
    return (this.options.renderWrapper ? ["div", { class: "tableWrapper" }, tabela] : tabela) as DOMOutputSpec;
  },
}).configure({ resizable: true, renderWrapper: true });

/** A cor de fundo e o alinhamento vertical da célula: só uma cor de seis dígitos e um dos três alinhamentos (o que vai para o estilo da célula nunca é texto livre). */
const ATRIBUTOS_DA_CELULA = {
  fundo: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => {
      const v = el.getAttribute("data-fundo");
      return corValida(v) ? v.toLowerCase() : null;
    },
    renderHTML: (a: Record<string, unknown>) => (corValida(a.fundo) ? { "data-fundo": a.fundo.toLowerCase(), style: `background-color: ${a.fundo.toLowerCase()}` } : {}),
  },
  alinharV: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => alinhamentoVerticalValido(el.getAttribute("data-valign")),
    renderHTML: (a: Record<string, unknown>) => {
      const v = alinhamentoVerticalValido(a.alinharV);
      return v ? { "data-valign": v, style: `vertical-align: ${v}` } : {};
    },
  },
};

export const CelulaDoBlog = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...ATRIBUTOS_DA_CELULA };
  },
});

export const CabecalhoDoBlog = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...ATRIBUTOS_DA_CELULA };
  },
});
