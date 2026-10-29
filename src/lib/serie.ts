// As séries dos cartões de estatística: os registos de um ecrã (e-mails, pagamentos, cópias, pedidos…) repartidos em intervalos de tempo iguais, para o gráfico de cada cartão mostrar o que se passou de verdade e não um desenho. Funções puras.

/** O instante de uma data ISO («2026-10-29» ou «2026-10-29T10:00:00Z») em milissegundos. */
export const instante = (iso: string) => new Date(iso).getTime();

/**
 * Reparte os itens em `n` intervalos de tempo iguais, do mais antigo ao mais recente, entre o primeiro e o último instante que há.
 * Devolve uma lista vazia sem itens, e um só intervalo se todos os itens são do mesmo instante (não há série para desenhar).
 */
export function agrupar<T>(itens: T[], quando: (x: T) => number, n = 14): T[][] {
  const validos = itens.map((x) => ({ x, t: quando(x) })).filter((v) => Number.isFinite(v.t));
  if (validos.length === 0) return [];
  const min = Math.min(...validos.map((v) => v.t));
  const max = Math.max(...validos.map((v) => v.t));
  if (max === min) return [validos.map((v) => v.x)];
  const largura = (max - min) / n;
  const baldes: T[][] = Array.from({ length: n }, () => []);
  for (const v of validos) baldes[Math.min(n - 1, Math.floor((v.t - min) / largura))].push(v.x);
  return baldes;
}

/** Quantos intervalos usar para `total` itens: um por item, entre 5 e 14 (poucos itens dão poucos pontos; muitos não passam de 14). */
export const intervalosPara = (total: number) => Math.min(14, Math.max(5, total));

/** Quantos itens há em cada intervalo (só os que passam o filtro, se houver). */
export const contarPorIntervalo = <T,>(baldes: T[][], filtro: (x: T) => boolean = () => true): number[] => baldes.map((b) => b.filter(filtro).length);

/** A soma de um valor em cada intervalo. */
export const somarPorIntervalo = <T,>(baldes: T[][], valor: (x: T) => number, filtro: (x: T) => boolean = () => true): number[] => baldes.map((b) => b.filter(filtro).reduce((s, x) => s + valor(x), 0));

/** A média de um valor em cada intervalo (0 num intervalo sem itens). */
export const mediaPorIntervalo = <T,>(baldes: T[][], valor: (x: T) => number): number[] => baldes.map((b) => (b.length ? b.reduce((s, x) => s + valor(x), 0) / b.length : 0));

/** A divisão de duas séries, termo a termo, vezes `escala` (100 para percentagens); 0 onde o divisor é 0. */
export const razao = (cima: number[], baixo: number[], escala = 100): number[] => cima.map((c, i) => (baixo[i] ? (c / baixo[i]) * escala : 0));

/** A soma acumulada de uma série (para «quanto há no fim de cada intervalo»). */
export function acumular(serie: number[]): number[] {
  let total = 0;
  return serie.map((v) => (total += v));
}

/** Uma série só serve para desenhar se tem pelo menos dois pontos; senão devolve uma lista vazia e o cartão fica só com o número. */
export const serieValida = (serie: number[] | undefined): number[] => (serie && serie.length >= 2 && serie.every(Number.isFinite) ? serie : []);
