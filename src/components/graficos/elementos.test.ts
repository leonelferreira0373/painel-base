import { describe, expect, it, vi } from "vitest";

// o desenho do gráfico (Kumo, ECharts, React) não corre em node: só interessa a lógica das opções
vi.mock("@cloudflare/kumo", () => ({ Chart: () => null, ChartPalette: { categorical: (i: number) => `#cat${i}` } }));
vi.mock("@/lib/echarts", () => ({ echarts: {} }));
vi.mock("@/lib/tema", () => ({ useTema: () => ({ efetivo: "claro" }) }));
vi.mock("../Estados", () => ({ SemDadosGrafico: () => null }));
vi.mock("../Frase", () => ({ Pilula: () => null, SetaDeCaminho: () => null }));
vi.mock("./CorDoGrafico", () => ({ useIdDoGrafico: () => undefined }));

import { elementosCompletos, elementosDe, opcoesDe, type GraficoSpec } from "./Graficos";

const p = (chave: string, valor: number) => ({ chave, rotulo: chave.toUpperCase(), valor, n: valor });
const barras: GraficoSpec = { tipo: "barras", pontos: [p("a", 30), p("b", 20), p("c", 10)] };

describe("os elementos de um gráfico", () => {
  it("cada barra é um elemento, com a cor de origem (a primeira destacada, as outras mais claras)", () => {
    const e = elementosCompletos(barras, "#155dfc");
    expect(e.map((x) => x.chave)).toEqual(["a", "b", "c"]);
    expect(e[0].padrao).toBe("#155dfc");
    expect(e[1].padrao).toBe(e[2].padrao);
    expect(e[1].padrao).not.toBe("#155dfc");
  });
  it("as séries e as fatias também", () => {
    const linhas: GraficoSpec = { tipo: "linhas", rotulos: ["x", "y"], series: [{ nome: "p50", valores: [1, 2] }, { nome: "p95", valores: [2, 3] }] };
    expect(elementosCompletos(linhas).map((x) => x.rotulo)).toEqual(["p50", "p95"]);
    expect(elementosCompletos({ tipo: "rosca", pontos: [p("x", 1), p("y", 2)] })).toHaveLength(2);
  });
  it("só se listam gráficos com 2 a 12 elementos; uma linha ou uma dispersão não têm", () => {
    expect(elementosDe(barras)).toHaveLength(3);
    expect(elementosDe({ tipo: "barras", pontos: [p("a", 1)] })).toHaveLength(0);
    expect(elementosDe({ tipo: "barras", pontos: Array.from({ length: 13 }, (_, i) => p(`k${i}`, i)) })).toHaveLength(0);
    expect(elementosDe({ tipo: "linha", pontos: [p("a", 1), p("b", 2)] })).toHaveLength(0);
    expect(elementosDe({ tipo: "dispersao", pontos: [{ x: 1, y: 2 }], rx: "x", ry: "y" })).toHaveLength(0);
  });
  it("duas barras com a mesma chave ganham chaves diferentes", () => {
    const e = elementosCompletos({ tipo: "barras", pontos: [p("a", 1), p("a", 2), p("b", 3)] });
    expect(new Set(e.map((x) => x.chave)).size).toBe(3);
  });
  it("a cor escolhida para uma barra pinta só essa barra", () => {
    const o = opcoesDe(barras, undefined, { b: "#dc2626" }) as unknown as { series: { data: { itemStyle: { color: string } }[] }[] };
    // a lista vem invertida (a primeira barra fica em cima): c, b, a
    const cores = o.series[0].data.map((d) => d.itemStyle.color);
    expect(cores[1]).toBe("#dc2626");
    expect(cores[0]).not.toBe("#dc2626");
    expect(cores[2]).not.toBe("#dc2626");
  });
  it("sem escolhas, o desenho é o de sempre", () => {
    const o = opcoesDe(barras, "#155dfc") as unknown as { series: { data: { itemStyle: { color: string } }[] }[] };
    const cores = o.series[0].data.map((d) => d.itemStyle.color);
    expect(cores[2]).toBe("#155dfc");
    expect(cores[0]).toBe(cores[1]);
  });
  it("as fatias e as séries levam a cor escolhida", () => {
    const r = opcoesDe({ tipo: "rosca", pontos: [p("x", 1), p("y", 2)] }, undefined, { y: "#16a34a" }) as unknown as { series: { data: { name: string; itemStyle: { color: string } }[] }[] };
    expect(r.series[0].data.find((d) => d.name === "Y")?.itemStyle.color).toBe("#16a34a");
    const l = opcoesDe({ tipo: "empilhadas", rotulos: ["a"], series: [{ nome: "um", valores: [1] }, { nome: "dois", valores: [2] }] }, undefined, { dois: "#7c3aed" }) as unknown as { color: string[] };
    expect(l.color[1]).toBe("#7c3aed");
  });
});
