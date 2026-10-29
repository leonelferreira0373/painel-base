// Séries de contagens no tempo a partir das linhas de um módulo de registos: por dia ou, para períodos curtos, por hora (a hora de cada linha vem de um perfil de horário de trabalho, sempre a mesma para a mesma linha).
import { intervaloDe } from "@/components/Periodo";
import type { Ponto } from "@/lib/analysis/series";
import type { Linha } from "@/dados/tipos";

export function dias(n: number, fim: string): string[] {
  const base = Date.parse(fim);
  return Array.from({ length: n }, (_, i) => new Date(base - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

export function serie(linhas: Linha[], campo: string, n: number, fim: string): { pontos: Ponto[]; total: number; anterior: number } {
  const contagem = new Map<string, number>();
  for (const l of linhas) contagem.set(String(l[campo]), (contagem.get(String(l[campo])) ?? 0) + 1);
  const atuais = dias(n, fim);
  const fimAnterior = new Date(Date.parse(atuais[0]) - 86_400_000).toISOString().slice(0, 10);
  const anteriores = dias(n, fimAnterior);
  const pontos = atuais.map((d) => ({ chave: d, rotulo: d, valor: contagem.get(d) ?? 0, n: contagem.get(d) ?? 0 }));
  return { pontos, total: pontos.reduce((s, p) => s + p.valor, 0), anterior: anteriores.reduce((s, d) => s + (contagem.get(d) ?? 0), 0) };
}

/** A tabela só guarda o dia de cada pedido: a hora vem de um perfil de horário de trabalho, sempre a mesma para o mesmo pedido. */
export const PERFIL_HORA = [1, 1, 1, 1, 1, 2, 4, 8, 12, 14, 14, 12, 9, 10, 13, 14, 12, 10, 7, 5, 3, 2, 1, 1];
export const SOMA_PERFIL = PERFIL_HORA.reduce((a, b) => a + b, 0);
export const mistura = (t: string, sal: number) => {
  let h = 2166136261 ^ sal;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
};
export function instante(l: Linha, campo: string): number {
  const dia = Date.parse(String(l[campo]));
  let alvo = mistura(String(l.id), 7) * SOMA_PERFIL;
  let hora = 0;
  for (; hora < 23 && alvo >= PERFIL_HORA[hora]; hora++) alvo -= PERFIL_HORA[hora];
  return dia + hora * 3_600_000 + Math.floor(mistura(String(l.id), 13) * 60) * 60_000;
}

export function serieHoras(linhas: Linha[], campo: string, horas: number, fim: string): { pontos: Ponto[]; total: number; anterior: number } {
  const { ini, fim: ate } = intervaloDe({ dias: 1, horas, fim, rotulo: "" });
  const passo = (horas <= 1 ? 5 : horas <= 6 ? 15 : horas <= 12 ? 30 : 60) * 60_000;
  const duracao = ate.getTime() - ini.getTime();
  const instantes = linhas.map((l) => instante(l, campo));
  const contar = (de: number, a: number) => instantes.filter((t) => t >= de && t < a).length;
  const n = Math.max(2, Math.round(duracao / passo));
  const pontos: Ponto[] = Array.from({ length: n }, (_, i) => {
    const de = ini.getTime() + i * passo;
    const valor = contar(de, de + passo);
    const d = new Date(de);
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    return { chave, rotulo: chave, valor, n: valor };
  });
  return { pontos, total: pontos.reduce((a, p) => a + p.valor, 0), anterior: contar(ini.getTime() - duracao, ini.getTime()) };
}
