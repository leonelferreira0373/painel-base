// As métricas de pagamentos, calculadas a partir da lista de pagamentos: o que o ecrã de visão geral mostra e o que a API devolve em /v1/pagamentos/metricas. Funções puras.
import type { Pagamento } from "@/dados/super-dados";

export interface MetricasDePagamentos {
  volume: number;
  numero: number;
  ticketMedio: number;
  taxaDeSucesso: number;
  pendentes: number;
  valorPendente: number;
  reembolsado: number;
  porMetodo: { metodo: string; valor: number }[];
  porEstado: { estado: string; numero: number }[];
  porDia: { data: string; valor: number }[];
}

/** O volume conta só os confirmados; a taxa de sucesso é confirmados sobre (confirmados + recusados). */
export function calcularMetricas(pagamentos: Pagamento[]): MetricasDePagamentos {
  const confirmados = pagamentos.filter((p) => p.estado === "Confirmado");
  const recusados = pagamentos.filter((p) => p.estado === "Recusado");
  const pendentes = pagamentos.filter((p) => p.estado === "Pendente");
  const soma = (l: Pagamento[]) => l.reduce((s, p) => s + p.valor, 0);
  const porMetodo = new Map<string, number>();
  for (const p of confirmados) porMetodo.set(p.metodo, (porMetodo.get(p.metodo) ?? 0) + p.valor);
  const porEstado = new Map<string, number>();
  for (const p of pagamentos) porEstado.set(p.estado, (porEstado.get(p.estado) ?? 0) + 1);
  const porDia = new Map<string, number>();
  for (const p of confirmados) porDia.set(p.data, (porDia.get(p.data) ?? 0) + p.valor);
  return {
    volume: soma(confirmados),
    numero: pagamentos.length,
    ticketMedio: confirmados.length ? soma(confirmados) / confirmados.length : 0,
    taxaDeSucesso: confirmados.length + recusados.length ? confirmados.length / (confirmados.length + recusados.length) : 0,
    pendentes: pendentes.length,
    valorPendente: soma(pendentes),
    reembolsado: soma(pagamentos.filter((p) => p.estado === "Reembolsado")),
    porMetodo: [...porMetodo].map(([metodo, valor]) => ({ metodo, valor })).sort((a, b) => b.valor - a.valor),
    porEstado: [...porEstado].map(([estado, numero]) => ({ estado, numero })).sort((a, b) => b.numero - a.numero),
    porDia: [...porDia].map(([data, valor]) => ({ data, valor })).sort((a, b) => a.data.localeCompare(b.data)),
  };
}
