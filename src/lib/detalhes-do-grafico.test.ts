import { describe, expect, it, vi } from "vitest";

// só interessa a lógica dos detalhes: o desenho do gráfico (Kumo, ECharts, React) não corre em node
vi.mock("@/components/graficos/Graficos", () => ({}));

import { dadosDoMapa, detalhesDe, paisNoMapa } from "./detalhes-do-grafico";

const p = (chave: string, rotulo: string, valor: number) => ({ chave, rotulo, valor, n: valor });

describe("os detalhes de um gráfico", () => {
  it("os contribuintes ordenam-se do maior para o menor, com a sua parte do total", () => {
    const d = detalhesDe({ tipo: "barras", pontos: [p("a", "A", 10), p("b", "B", 30), p("c", "C", 60)] })!;
    expect(d.contribuintes.map((c) => c.nome)).toEqual(["C", "B", "A"]);
    expect(d.contribuintes[0].parte).toBeCloseTo(0.6, 5);
    expect(d.legenda[0]).toEqual({ nome: "C", valor: "60" });
    expect(d.medida).toBe("Total");
  });
  it("as séries somam (camadas) ou fazem a média (linhas)", () => {
    const camadas = detalhesDe({ tipo: "empilhadas", rotulos: ["x", "y"], series: [{ nome: "um", valores: [1, 2] }, { nome: "dois", valores: [10, 20] }] })!;
    expect(camadas.contribuintes.map((c) => [c.nome, c.valor])).toEqual([["dois", 30], ["um", 3]]);
    const linhas = detalhesDe({ tipo: "linhas", rotulos: ["x", "y"], series: [{ nome: "p50", valores: [2, 4] }] })!;
    expect(linhas.contribuintes[0].valor).toBe(3);
    expect(linhas.medida).toBe("Média");
  });
  it("uma linha tem total, média, máximo e mínimo, e nenhum contribuinte", () => {
    const d = detalhesDe({ tipo: "linha", pontos: [p("1", "1", 2), p("2", "2", 8)] })!;
    expect(d.legenda.map((l) => l.nome)).toEqual(["Total", "Média", "Máximo", "Mínimo"]);
    expect(d.legenda[2].valor).toBe("8");
    expect(d.contribuintes).toEqual([]);
    expect(detalhesDe({ tipo: "linha", pontos: [] })).toBeNull();
  });
  it("a dispersão e a matriz não têm detalhes", () => {
    expect(detalhesDe({ tipo: "dispersao", pontos: [{ x: 1, y: 2 }], rx: "x", ry: "y" })).toBeNull();
    expect(detalhesDe({ tipo: "matriz", nomes: ["a"], valores: [[1]] })).toBeNull();
  });
});

describe("o mapa", () => {
  it("reconhece o país pelo nome do mapa, pelo nome em português ou pelo código", () => {
    expect(paisNoMapa("Angola")).toBe("Angola");
    expect(paisNoMapa("Estados Unidos")).toBe("United States of America");
    expect(paisNoMapa("estados unidos")).toBe("United States of America");
    expect(paisNoMapa("BR")).toBe("Brazil");
    expect(paisNoMapa("Chrome")).toBeNull();
  });
  it("só há mapa quando os elementos são países", () => {
    const paises = dadosDoMapa({ tipo: "barras", pontos: [p("AO", "Angola", 50), p("PT", "Portugal", 20), p("BR", "Brasil", 5)] })!;
    expect(paises).toEqual([{ nome: "Angola", valor: 50 }, { nome: "Portugal", valor: 20 }, { nome: "Brazil", valor: 5 }]);
    expect(dadosDoMapa({ tipo: "barras", pontos: [p("a", "Chrome", 5), p("b", "Firefox", 3)] })).toBeNull();
    expect(dadosDoMapa({ tipo: "barras", pontos: [p("a", "Angola", 5), p("b", "Chrome", 3), p("c", "Firefox", 1)] })).toBeNull();
    expect(dadosDoMapa({ tipo: "linha", pontos: [] })).toBeNull();
  });
});
