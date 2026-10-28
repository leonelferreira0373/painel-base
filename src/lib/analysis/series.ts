// Dados prontos para gráficos, calculados a partir de uma tabela real: séries temporais, categorias, dispersão.
import type { Tabela } from "@/lib/tipos";
import { quantil } from "./perfil";
import { detetarOrdemData, lerData, lerNumero, paraTexto, vazio } from "./valores";

export type Granularidade = "dia" | "semana" | "mes" | "ano";
export type Agregacao = "contagem" | "soma" | "media" | "mediana" | "min" | "max";

export interface Ponto {
  chave: string;
  rotulo: string;
  valor: number;
  n: number;
}

function agregar(valores: number[], n: number, agg: Agregacao): number {
  if (agg === "contagem" || valores.length === 0) return n;
  if (agg === "soma") return valores.reduce((s, v) => s + v, 0);
  if (agg === "media") return valores.reduce((s, v) => s + v, 0) / valores.length;
  if (agg === "min") return Math.min(...valores);
  if (agg === "max") return Math.max(...valores);
  return quantil(valores.slice().sort((a, b) => a - b), 0.5);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function chaveDe(d: Date, g: Granularidade): string {
  if (g === "dia") return iso(d);
  if (g === "mes") return iso(d).slice(0, 7);
  if (g === "ano") return String(d.getUTCFullYear());
  const segunda = new Date(d);
  segunda.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(segunda);
}

function seguinte(chave: string, g: Granularidade): string {
  const d = new Date(chave.length === 4 ? `${chave}-01-01` : chave.length === 7 ? `${chave}-01` : chave);
  if (g === "dia") d.setUTCDate(d.getUTCDate() + 1);
  else if (g === "semana") d.setUTCDate(d.getUTCDate() + 7);
  else if (g === "mes") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return chaveDe(d, g);
}

export function serieTemporal(t: Tabela, colData: number, colMedida: number | null, agg: Agregacao, g: Granularidade): Ponto[] {
  const ordem = detetarOrdemData(t.linhas.map((l) => l[colData]));
  const grupos = new Map<string, { valores: number[]; n: number }>();
  for (const l of t.linhas) {
    const d = lerData(l[colData], ordem);
    if (!d) continue;
    const chave = chaveDe(d, g);
    const grupo = grupos.get(chave) ?? { valores: [], n: 0 };
    grupo.n++;
    if (colMedida !== null) {
      const x = lerNumero(l[colMedida]);
      if (x !== null) grupo.valores.push(x);
    }
    grupos.set(chave, grupo);
  }
  const chaves = [...grupos.keys()].sort();
  if (chaves.length === 0) return [];
  const completo = agg === "contagem" || agg === "soma";
  const todas: string[] = [];
  if (completo && chaves.length < 4000) {
    for (let c = chaves[0], guarda = 0; c <= chaves[chaves.length - 1] && guarda < 4000; c = seguinte(c, g), guarda++) todas.push(c);
  } else todas.push(...chaves);
  return todas.map((chave) => {
    const grupo = grupos.get(chave) ?? { valores: [], n: 0 };
    return { chave, rotulo: chave, valor: agregar(grupo.valores, grupo.n, colMedida === null ? "contagem" : agg), n: grupo.n };
  });
}

export function porCategoria(t: Tabela, colCat: number, colMedida: number | null, agg: Agregacao, topN = 12): Ponto[] {
  const grupos = new Map<string, { valores: number[]; n: number }>();
  for (const l of t.linhas) {
    if (vazio(l[colCat])) continue;
    const chave = paraTexto(l[colCat]).trim();
    const grupo = grupos.get(chave) ?? { valores: [], n: 0 };
    grupo.n++;
    if (colMedida !== null) {
      const x = lerNumero(l[colMedida]);
      if (x !== null) grupo.valores.push(x);
    }
    grupos.set(chave, grupo);
  }
  const pontos = [...grupos.entries()].map(([chave, g]) => ({ chave, rotulo: chave, valor: agregar(g.valores, g.n, colMedida === null ? "contagem" : agg), n: g.n }));
  pontos.sort((a, b) => b.valor - a.valor);
  if (pontos.length <= topN) return pontos;
  const resto = pontos.slice(topN - 1);
  const somaResto = agg === "contagem" || agg === "soma" ? resto.reduce((s, p) => s + p.valor, 0) : NaN;
  const cabeca = pontos.slice(0, topN - 1);
  return Number.isNaN(somaResto) ? pontos.slice(0, topN) : [...cabeca, { chave: "Outros", rotulo: `Outros (${resto.length})`, valor: somaResto, n: resto.reduce((s, p) => s + p.n, 0) }];
}

export function dispersao(t: Tabela, cx: number, cy: number, max = 1500): { x: number; y: number }[] {
  const pontos: { x: number; y: number }[] = [];
  for (const l of t.linhas) {
    const x = lerNumero(l[cx]);
    const y = lerNumero(l[cy]);
    if (x !== null && y !== null) pontos.push({ x, y });
  }
  if (pontos.length <= max) return pontos;
  const passo = pontos.length / max;
  return Array.from({ length: max }, (_, i) => pontos[Math.floor(i * passo)]);
}
