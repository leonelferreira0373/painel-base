// O aspeto do título do artigo (e do subtítulo): alinhamento, tamanho, cor, negrito, itálico e maiúsculas. Uma só conta serve o campo do editor e o HTML exportado, para o título ficar igual nos dois sítios.
import { corValida } from "./cores-graficos";

export type AlinhamentoDoTitulo = "left" | "center" | "right";

export interface AspetoDoTitulo {
  /** O título ao centro, como se guardava antes de haver o alinhamento. */
  centrado?: boolean;
  alinhar?: AlinhamentoDoTitulo;
  /** O tamanho em píxeis. */
  tamanho?: number;
  /** Uma cor de seis dígitos. */
  cor?: string;
  /** O título é a negrito, a não ser que seja `false`. */
  negrito?: boolean;
  italico?: boolean;
  maiusculas?: boolean;
  fonte?: string;
}

export const TAMANHOS_DO_TITULO = [24, 28, 32, 38, 44, 52, 60, 72, 88];
/** O tamanho de partida (2,4 rem). */
export const TAMANHO_DO_TITULO = 38;

export const ALINHAMENTOS_DO_TITULO: { id: AlinhamentoDoTitulo; rotulo: string }[] = [
  { id: "left", rotulo: "Título à esquerda" },
  { id: "center", rotulo: "Título ao centro" },
  { id: "right", rotulo: "Título à direita" },
];

export const alinharDoTitulo = (c?: AspetoDoTitulo): AlinhamentoDoTitulo => c?.alinhar ?? (c?.centrado ? "center" : "left");

/** O tamanho escolhido, se for um que faça sentido; senão o de partida. */
export const tamanhoDoTitulo = (c?: AspetoDoTitulo): number => (c?.tamanho !== undefined && Number.isFinite(c.tamanho) && c.tamanho >= 12 && c.tamanho <= 200 ? Math.round(c.tamanho) : TAMANHO_DO_TITULO);

/** O tamanho a seguir (ou o anterior) na lista dos tamanhos que se oferecem; no fim da lista fica onde está. */
export function tamanhoVizinho(atual: number, sentido: 1 | -1, lista: number[] = TAMANHOS_DO_TITULO): number {
  if (sentido === 1) return lista.find((t) => t > atual) ?? atual;
  return [...lista].reverse().find((t) => t < atual) ?? atual;
}

/** O estilo do campo do título no editor (propriedades de CSS em objeto). */
export function estiloDoTitulo(c?: AspetoDoTitulo): Record<string, string | number> {
  return {
    textAlign: alinharDoTitulo(c),
    fontSize: `${tamanhoDoTitulo(c)}px`,
    fontWeight: c?.negrito === false ? 400 : 700,
    fontStyle: c?.italico ? "italic" : "normal",
    ...(corValida(c?.cor) ? { color: c.cor } : {}),
    ...(c?.maiusculas ? { textTransform: "uppercase" } : {}),
    ...(c?.fonte ? { fontFamily: c.fonte } : {}),
  };
}

/** O estilo do <h1> no HTML exportado, como texto de CSS. `escapar` protege o tipo de letra, que é texto livre. */
export function estiloDoTituloEmLinha(c: AspetoDoTitulo | undefined, escapar: (t: string) => string): string {
  return [
    "margin:0",
    `font-size:${c?.tamanho !== undefined ? `${tamanhoDoTitulo(c)}px` : "2.4rem"}`,
    "line-height:1.15",
    `font-weight:${c?.negrito === false ? 400 : 700}`,
    ...(c?.italico ? ["font-style:italic"] : []),
    ...(corValida(c?.cor) ? [`color:${c.cor}`] : []),
    ...(c?.maiusculas ? ["text-transform:uppercase"] : []),
    ...(c?.fonte ? [`font-family:${escapar(c.fonte)}`] : []),
  ].join(";");
}
