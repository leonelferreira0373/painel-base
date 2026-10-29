// A «roda» dos números: quando um número muda, cada algarismo rola na vertical até ao novo valor, como um odómetro, em vez de saltar. Aqui ficam as contas puras (que posição ocupa cada algarismo, para que lado roda e como se alinham os caracteres); o desenho é do componente NumeroEmRoda.

/** Cada caractere de um número escrito, alinhado pela direita (`posicao` 0 é o último): assim, quando o número ganha ou perde um algarismo, os que ficam não saltam de coluna. */
export interface CaractereDaRoda {
  c: string;
  /** Posição a contar da direita (0 é o último caractere). */
  posicao: number;
  /** Só os algarismos rodam; o resto (espaços, vírgulas, «%», «Kz») fica quieto. */
  algarismo: boolean;
}

export function caracteresDe(texto: string): CaractereDaRoda[] {
  const cs = [...texto];
  return cs.map((c, i) => ({ c, posicao: cs.length - 1 - i, algarismo: /^[0-9]$/.test(c) }));
}

/** O valor numérico de um número escrito («10 599», «41,5 %», «1.240 Kz»): só os algarismos e a vírgula decimal; `null` se não houver algarismos. */
export function valorDe(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/\d/.test(limpo)) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Roda para cima quando o número cresce (ou não se sabe) e para baixo quando diminui. */
export function rodaParaCima(antes: string | null, depois: string): boolean {
  const a = antes === null ? null : valorDe(antes);
  const d = valorDe(depois);
  return a === null || d === null || d >= a;
}

/** A tira de algarismos tem três voltas (0–9 três vezes) e o algarismo em repouso fica na volta do meio (10–19), para a roda poder rodar até nove casas para cima ou para baixo sem acabar. */
export const VOLTA = 10;

/** O comprimento da tira: três voltas de algarismos. */
export const TAMANHO_DA_TIRA = VOLTA * 3;

/** O algarismo que a tira mostra numa posição. */
export const algarismoEm = (posicao: number) => ((posicao % VOLTA) + VOLTA) % VOLTA;

/** A posição de repouso de um algarismo: na volta do meio. */
export const repousoDe = (algarismo: number) => VOLTA + algarismo;

/**
 * A posição na tira a que a roda vai, a partir da posição em que está (mesmo a meio de uma rolagem), para chegar ao algarismo `para` rodando no sentido pedido
 * (o caminho mais curto nesse sentido, de 1 a 9 casas). Devolve `null` se não houver tira que chegue: então a roda salta para o repouso.
 */
export function proximaPosicao(posicao: number, para: number, paraCima: boolean): number | null {
  const de = algarismoEm(posicao);
  if (de === para) return posicao;
  const passos = paraCima ? (para - de + VOLTA) % VOLTA : (de - para + VOLTA) % VOLTA;
  const destino = paraCima ? posicao + passos : posicao - passos;
  return destino >= 0 && destino < TAMANHO_DA_TIRA ? destino : null;
}
