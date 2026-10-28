// Escalas, marcas de eixo e formatação partilhadas pelos gráficos. Cores em valor literal para que o mesmo SVG sirva no ecrã e na exportação para PDF.

export const COR = {
  acento: "#155DFC",
  acentoClaro: "#6F9BFF",
  acentoPalido: "#D5E1FF",
  tinta: "#1D1D1F",
  suave: "#6E6E73",
  eixo: "#9A9A98",
  grelha: "#E9E9E6",
  fundo: "#FDFDFC",
} as const;

export const PALETA = [COR.acento, COR.tinta, COR.acentoClaro, "#8E8E8C", "#B7CDFF", "#C9C9C6"];

export const FONTE = "var(--font-sans)";

export function escala(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const k = (r1 - r0) / (d1 - d0 || 1);
  return (v) => r0 + (v - d0) * k;
}

function passoLimpo(bruto: number): number {
  const exp = Math.floor(Math.log10(bruto));
  const f = bruto / 10 ** exp;
  const limpo = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return limpo * 10 ** exp;
}

export function marcas(min: number, max: number, alvo = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) return [min];
  const passo = passoLimpo((max - min) / alvo);
  const inicio = Math.ceil(min / passo) * passo;
  const out: number[] = [];
  for (let v = inicio, guarda = 0; v <= max + passo * 1e-9 && guarda < 50; v += passo, guarda++) out.push(Math.abs(v) < passo * 1e-9 ? 0 : v);
  return out;
}

const normal = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 });
const compacto = new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 });

export function formatar(v: number, curto = false): string {
  if (!Number.isFinite(v)) return "";
  if (curto && Math.abs(v) >= 10_000) return compacto.format(v);
  return normal.format(v);
}

export function truncar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

/** Reduz uma série longa a no máximo `max` pontos, mantendo o valor mais alto de cada intervalo. */
export function reduzir<T extends { valor: number }>(pontos: T[], max = 500): T[] {
  if (pontos.length <= max) return pontos;
  const tamanho = pontos.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    const bloco = pontos.slice(Math.floor(i * tamanho), Math.floor((i + 1) * tamanho));
    out.push(bloco.reduce((m, p) => (p.valor > m.valor ? p : m), bloco[0]));
  }
  return out;
}
