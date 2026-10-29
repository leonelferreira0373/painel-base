// Testes das métricas de pagamentos: o volume só conta confirmados, a taxa de sucesso, os pendentes e as séries.
import { describe, expect, it } from "vitest";
import type { Pagamento } from "@/dados/super-dados";
import { gerarPagamentos } from "@/dados/super-dados";
import { calcularMetricas } from "./pagamentos";

const p = (valor: number, estado: Pagamento["estado"], metodo = "Transferência", data = "2026-10-28"): Pagamento => ({ id: `${valor}${estado}`, referencia: "PG-1", cliente: "X", metodo, valor, moeda: "AOA", data, estado, conta: "AO" });

describe("métricas de pagamentos", () => {
  it("calcula o volume, o ticket médio e a taxa de sucesso", () => {
    const m = calcularMetricas([p(100, "Confirmado"), p(300, "Confirmado", "Cartão"), p(50, "Recusado"), p(70, "Pendente"), p(10, "Reembolsado")]);
    expect(m.volume).toBe(400);
    expect(m.ticketMedio).toBe(200);
    expect(m.taxaDeSucesso).toBeCloseTo(2 / 3);
    expect(m.pendentes).toBe(1);
    expect(m.valorPendente).toBe(70);
    expect(m.reembolsado).toBe(10);
    expect(m.numero).toBe(5);
    expect(m.porMetodo[0]).toEqual({ metodo: "Cartão", valor: 300 });
  });
  it("agrupa por dia, por ordem", () => {
    const m = calcularMetricas([p(5, "Confirmado", "x", "2026-10-29"), p(7, "Confirmado", "x", "2026-10-27"), p(1, "Confirmado", "x", "2026-10-29")]);
    expect(m.porDia).toEqual([{ data: "2026-10-27", valor: 7 }, { data: "2026-10-29", valor: 6 }]);
  });
  it("não rebenta sem pagamentos", () => {
    const m = calcularMetricas([]);
    expect(m.volume).toBe(0);
    expect(m.ticketMedio).toBe(0);
    expect(m.taxaDeSucesso).toBe(0);
  });
  it("os dados de demonstração dão métricas com sentido", () => {
    const m = calcularMetricas(gerarPagamentos());
    expect(m.numero).toBe(48);
    expect(m.volume).toBeGreaterThan(0);
    expect(m.taxaDeSucesso).toBeGreaterThan(0.5);
    expect(m.porMetodo.length).toBeGreaterThan(1);
  });
});
