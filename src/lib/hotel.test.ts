// Testes do financeiro do hotel: ocupação, receita, diária média, RevPAR e previsão, a partir das reservas.
import { describe, expect, it } from "vitest";
import { gerarReservas, QUARTOS_DO_HOTEL } from "@/dados/modulos-negocios";
import { calcularFinanceiro, hojeDoHotel, type ReservaDoHotel } from "./hotel";

const r = (entrada: string, saida: string, valor: number, estado: string, tipo = "Standard"): ReservaDoHotel => ({ entrada, saida, noites: (Date.parse(saida) - Date.parse(entrada)) / 86_400_000, valor, estado, tipo });

describe("financeiro do hotel", () => {
  const reservas = [r("2026-10-27", "2026-10-30", 300_000, "Check-in"), r("2026-10-25", "2026-10-27", 100_000, "Concluída", "Suite"), r("2026-10-30", "2026-11-01", 80_000, "Confirmada"), r("2026-10-28", "2026-10-29", 50_000, "Cancelada"), r("2026-10-31", "2026-11-02", 60_000, "Pendente")];

  it("«hoje» é a chegada mais recente que ainda está no hotel", () => {
    expect(hojeDoHotel(reservas)).toBe("2026-10-27");
    expect(hojeDoHotel([r("2026-10-20", "2026-10-22", 1, "Concluída")])).toBe("2026-10-22");
    expect(hojeDoHotel([], new Date("2026-11-05T10:00:00Z"))).toBe("2026-11-05");
  });
  it("conta as noites de quem está e de quem já saiu, e nunca as canceladas nem as por vir", () => {
    const f = calcularFinanceiro(reservas, 10, 5, "2026-10-29");
    expect(f.dias).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"]);
    // 25 e 26: a que saiu a 27 (2 noites); 27, 28 e 29: a que está no hotel
    expect(f.ocupados).toEqual([1, 1, 1, 1, 1]);
    expect(f.receita).toEqual([50_000, 50_000, 100_000, 100_000, 100_000]);
    expect(f.totais.receita).toBe(400_000);
    expect(f.totais.noites).toBe(5);
  });
  it("calcula a ocupação, a diária média e o RevPAR", () => {
    const f = calcularFinanceiro(reservas, 10, 5, "2026-10-29");
    expect(f.ocupacao).toEqual([10, 10, 10, 10, 10]);
    expect(f.diaria).toEqual([50_000, 50_000, 100_000, 100_000, 100_000]);
    expect(f.revpar[2]).toBe(10_000);
    expect(f.totais.ocupacaoMedia).toBe(10);
    expect(f.totais.diariaMedia).toBe(80_000);
    expect(f.totais.revpar).toBe(8_000);
  });
  it("a previsão vem das reservas confirmadas e pendentes, noite a noite", () => {
    const f = calcularFinanceiro(reservas, 10, 5, "2026-10-29");
    expect(f.diasPrevistos[0]).toBe("2026-10-30");
    // 30 e 31: a confirmada (40 000 por noite); 31 e 1: a pendente (30 000 por noite)
    expect(f.previsao).toEqual([40_000, 70_000, 30_000, 0, 0]);
    expect(f.totais.previsao).toBe(140_000);
  });
  it("a receita por tipo de quarto só conta o que já aconteceu, do maior para o menor", () => {
    const f = calcularFinanceiro(reservas, 10, 5, "2026-10-29");
    expect(f.porTipo).toEqual([{ tipo: "Standard", valor: 300_000 }, { tipo: "Suite", valor: 100_000 }]);
  });
  it("sem reservas e sem quartos não divide por zero", () => {
    const f = calcularFinanceiro([], 0, 3, "2026-10-29");
    expect(f.totais).toEqual({ receita: 0, noites: 0, ocupacaoMedia: 0, diariaMedia: 0, revpar: 0, previsao: 0 });
    expect(f.diaria).toEqual([0, 0, 0]);
  });
  it("com as reservas de demonstração dá números possíveis (a ocupação nunca passa de 100 %)", () => {
    const f = calcularFinanceiro(gerarReservas().map((x) => x as unknown as ReservaDoHotel), QUARTOS_DO_HOTEL.length);
    expect(Math.max(...f.ocupacao)).toBeLessThanOrEqual(100);
    expect(f.totais.receita).toBeGreaterThan(0);
    expect(f.totais.diariaMedia).toBeGreaterThan(30_000);
  });
});
