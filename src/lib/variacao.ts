// A variação de um indicador: o sentido (subiu, desceu, igual) e o texto da percentagem. Puro, para o painel e os testes.
export type Sentido = "subiu" | "desceu" | "igual";

/** O que aconteceu: arredondada a uma casa decimal, uma variação de 0,04 % é «igual» (mostrar uma seta para «0 %» enganava). */
export function sentidoDe(variacao: number): Sentido {
  const arredondada = Math.round(variacao * 10) / 10;
  return arredondada > 0 ? "subiu" : arredondada < 0 ? "desceu" : "igual";
}

export const textoDaVariacao = (variacao: number): string => `${Math.abs(variacao).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} %`;

