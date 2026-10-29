// O financeiro do hotel, calculado a partir das reservas e do número de quartos: receita, ocupação, diária média (ADR) e receita por quarto disponível (RevPAR), dia a dia. Só conta o que já aconteceu (check-in e check-out) e a previsão vem do que está por vir (confirmadas e pendentes). Funções puras.

export interface ReservaDoHotel {
  entrada: string;
  saida: string;
  noites: number;
  valor: number;
  estado: string;
  tipo: string;
}

const DIA = 86_400_000;
const instanteDoDia = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const isoDoDia = (t: number) => new Date(t).toISOString().slice(0, 10);

/** O que já aconteceu (ocupa um quarto e gera receita) e o que ainda vem. */
const REALIZADAS = new Set(["Check-in", "Concluída"]);
const PREVISTAS = new Set(["Confirmada", "Pendente"]);

/** Uma reserva está no hotel numa noite se chegou nesse dia ou antes e ainda não saiu. */
const naNoite = (r: ReservaDoHotel, t: number) => instanteDoDia(r.entrada) <= t && t < instanteDoDia(r.saida);
/** O que a reserva vale por noite. */
const porNoite = (r: ReservaDoHotel) => r.valor / Math.max(1, r.noites || (instanteDoDia(r.saida) - instanteDoDia(r.entrada)) / DIA);

/** «Hoje» do hotel: a última chegada que ainda está no hotel; sem ela, a última saída; sem reservas, o dia do relógio. */
export function hojeDoHotel(reservas: ReservaDoHotel[], relogio = new Date()): string {
  const emCurso = reservas.filter((r) => r.estado === "Check-in").map((r) => instanteDoDia(r.entrada));
  if (emCurso.length) return isoDoDia(Math.max(...emCurso));
  const acabadas = reservas.filter((r) => r.estado === "Concluída").map((r) => instanteDoDia(r.saida));
  return acabadas.length ? isoDoDia(Math.max(...acabadas)) : relogio.toISOString().slice(0, 10);
}

export interface FinanceiroDoHotel {
  hoje: string;
  /** Os `dias` dias que acabam hoje, do mais antigo ao mais recente. */
  dias: string[];
  /** Quartos ocupados em cada noite. */
  ocupados: number[];
  receita: number[];
  /** Percentagem de quartos ocupados (0 a 100). */
  ocupacao: number[];
  /** Diária média: a receita a dividir pelos quartos ocupados. */
  diaria: number[];
  /** Receita por quarto disponível. */
  revpar: number[];
  /** Os `dias` dias a seguir a hoje e o que as reservas confirmadas e pendentes valem em cada um. */
  diasPrevistos: string[];
  previsao: number[];
  totais: { receita: number; noites: number; ocupacaoMedia: number; diariaMedia: number; revpar: number; previsao: number };
  porTipo: { tipo: string; valor: number }[];
}

export function calcularFinanceiro(reservas: ReservaDoHotel[], quartos: number, dias = 14, hoje = hojeDoHotel(reservas)): FinanceiroDoHotel {
  const fim = instanteDoDia(hoje);
  const passados = Array.from({ length: dias }, (_, i) => fim - (dias - 1 - i) * DIA);
  const futuros = Array.from({ length: dias }, (_, i) => fim + (i + 1) * DIA);
  const realizadas = reservas.filter((r) => REALIZADAS.has(r.estado));
  const previstas = reservas.filter((r) => PREVISTAS.has(r.estado));
  const ocupados = passados.map((t) => realizadas.filter((r) => naNoite(r, t)).length);
  const receita = passados.map((t) => realizadas.filter((r) => naNoite(r, t)).reduce((s, r) => s + porNoite(r), 0));
  const disponiveis = Math.max(1, quartos);
  const soma = (v: number[]) => v.reduce((s, x) => s + x, 0);
  const totalReceita = soma(receita);
  const noites = soma(ocupados);
  const previsao = futuros.map((t) => previstas.filter((r) => naNoite(r, t)).reduce((s, r) => s + porNoite(r), 0));
  const tipos = new Map<string, number>();
  for (const r of realizadas) tipos.set(r.tipo, (tipos.get(r.tipo) ?? 0) + r.valor);
  return {
    hoje,
    dias: passados.map(isoDoDia),
    ocupados,
    receita,
    ocupacao: ocupados.map((n) => (n / disponiveis) * 100),
    diaria: receita.map((v, i) => (ocupados[i] ? v / ocupados[i] : 0)),
    revpar: receita.map((v) => v / disponiveis),
    diasPrevistos: futuros.map(isoDoDia),
    previsao,
    totais: { receita: totalReceita, noites, ocupacaoMedia: (noites / (disponiveis * dias)) * 100, diariaMedia: noites ? totalReceita / noites : 0, revpar: totalReceita / (disponiveis * dias), previsao: soma(previsao) },
    porTipo: [...tipos].map(([tipo, valor]) => ({ tipo, valor })).sort((a, b) => b.valor - a.valor),
  };
}
