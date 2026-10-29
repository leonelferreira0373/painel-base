// Cálculos da página de análise de uma entidade: contagens por período (com a variação face ao período anterior), camadas por estado, durações das etapas, percentis e países.
import type { Periodo } from "@/components/Periodo";
import type { Linha } from "@/dados/tipos";
import type { Ponto } from "@/lib/analysis/series";
import { dias, mistura, serie, serieHoras } from "./serie-registos";

export type Janela = { pontos: Ponto[]; total: number; anterior: number };

/** Contagem das linhas por dia (ou por hora, nos períodos curtos), com o total do período anterior com a mesma duração. */
export const janela = (linhas: Linha[], campo: string, p: Periodo): Janela => (p.horas ? serieHoras(linhas, campo, p.horas, p.fim) : serie(linhas, campo, p.dias, p.fim));

/** Variação em percentagem face ao período anterior; null quando não há base de comparação. */
export const variacaoPct = (atual: number, anterior: number): number | null => (anterior === 0 ? null : ((atual - anterior) / anterior) * 100);

/** O nome curto de um ponto do eixo: «28 out» para dias, «14:30» para horas. */
export function rotuloCurto(chave: string): string {
  if (chave.includes("T")) return chave.slice(11, 16);
  return new Date(chave).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", timeZone: "UTC" }).replace(".", "");
}

/** Uma camada por estado, ao longo do tempo: para o gráfico de colunas empilhadas. */
export function camadasPorEstado(linhas: Linha[], campoData: string, campoEstado: string, estados: readonly string[], p: Periodo) {
  const por = estados.map((e) => janela(linhas.filter((l) => String(l[campoEstado]) === e), campoData, p));
  const pontos = janela(linhas, campoData, p).pontos;
  return { rotulos: pontos.map((x) => rotuloCurto(x.chave)), series: estados.map((nome, i) => ({ nome, valores: por[i].pontos.map((x) => x.valor) })) };
}

export interface DefEtapa {
  nome: string;
  horas: number;
  variacao: number;
}

/** Duração fictícia (em horas) de uma etapa de uma linha: estável, à volta do valor típico. */
const duracao = (l: Linha, e: DefEtapa, i: number) => Math.max(0.2, e.horas * (1 + (mistura(String(l.id), 11 + i) - 0.5) * e.variacao));

const diasDe = (p: Periodo) => dias(p.horas ? 7 : p.dias, p.fim);

/** A duração média de cada etapa, por dia (em horas). */
export function duracoesPorDia(linhas: Linha[], campoData: string, etapas: readonly DefEtapa[], p: Periodo) {
  const lista = diasDe(p);
  return {
    rotulos: lista.map(rotuloCurto),
    series: etapas.map((e, i) => ({
      nome: e.nome,
      valores: lista.map((d) => {
        const doDia = linhas.filter((l) => String(l[campoData]) === d);
        return doDia.length === 0 ? 0 : Math.round((doDia.reduce((s, l) => s + duracao(l, e, i), 0) / doDia.length) * 10) / 10;
      }),
    })),
  };
}

const percentil = (ordenados: number[], q: number) => (ordenados.length === 0 ? 0 : ordenados[Math.min(ordenados.length - 1, Math.max(0, Math.ceil(q * ordenados.length) - 1))]);

/** O tempo total (soma das etapas) por dia: percentis 50, 90 e 99, em horas. */
export function percentisPorDia(linhas: Linha[], campoData: string, etapas: readonly DefEtapa[], p: Periodo) {
  const lista = diasDe(p);
  const tempos = lista.map((d) => linhas.filter((l) => String(l[campoData]) === d).map((l) => etapas.reduce((s, e, i) => s + duracao(l, e, i), 0)).sort((a, b) => a - b));
  const serieDe = (nome: string, q: number) => ({ nome, valores: tempos.map((t) => Math.round(percentil(t, q) * 10) / 10) });
  return { rotulos: lista.map(rotuloCurto), series: [serieDe("P50", 0.5), serieDe("P90", 0.9), serieDe("P99", 0.99)] };
}

/** Quantas linhas há por país, do maior para o menor. */
export function porPais(linhas: Linha[], paisDe: (l: Linha) => string): { nome: string; valor: number }[] {
  const contagem = new Map<string, number>();
  for (const l of linhas) contagem.set(paisDe(l), (contagem.get(paisDe(l)) ?? 0) + 1);
  return [...contagem].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
}

/** O total de uma série (soma dos valores). */
export const somar = (valores: number[]) => valores.reduce((s, v) => s + v, 0);

/** Só as linhas cuja data cai dentro do período. */
export const naJanela = (linhas: Linha[], campoData: string, p: Periodo): Linha[] => {
  const dentro = new Set(diasDe(p));
  return linhas.filter((l) => dentro.has(String(l[campoData])));
};
