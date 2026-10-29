// Testes das séries dos cartões: repartir por intervalos de tempo e contar, somar, fazer a média e dividir séries.
import { describe, expect, it } from "vitest";
import { acumular, agrupar, variacaoDeSerie, contarPorIntervalo, instante, intervalosPara, mediaPorIntervalo, razao, serieValida, somarPorIntervalo } from "./serie";

const item = (t: number, estado = "ok", v = 1) => ({ t, estado, v });
const tempo = (x: { t: number }) => x.t;

describe("séries dos cartões", () => {
  it("reparte em intervalos iguais, do mais antigo ao mais recente", () => {
    const itens = [item(0), item(10), item(20), item(30), item(40)];
    const baldes = agrupar(itens, tempo, 4);
    expect(baldes).toHaveLength(4);
    expect(baldes.map((b) => b.length)).toEqual([1, 1, 1, 2]);
    expect(baldes.flat()).toHaveLength(5);
  });
  it("o último instante cai no último intervalo e nenhum item se perde", () => {
    const itens = Array.from({ length: 50 }, (_, i) => item(i * 7));
    const baldes = agrupar(itens, tempo, 14);
    expect(baldes).toHaveLength(14);
    expect(baldes.reduce((s, b) => s + b.length, 0)).toBe(50);
    expect(baldes[13].some((x) => x.t === 49 * 7)).toBe(true);
  });
  it("sem itens não há série e com um só instante há um só intervalo", () => {
    expect(agrupar([], tempo)).toEqual([]);
    expect(agrupar([item(5), item(5)], tempo, 14)).toHaveLength(1);
    expect(serieValida(contarPorIntervalo(agrupar([item(5), item(5)], tempo, 14)))).toEqual([]);
  });
  it("ignora instantes que não são números", () => {
    expect(agrupar([item(NaN), item(0), item(10)], tempo, 2).flat()).toHaveLength(2);
  });
  it("conta, soma e faz a média por intervalo", () => {
    const itens = [item(0, "a", 2), item(1, "b", 4), item(10, "a", 6), item(11, "a", 8)];
    const baldes = agrupar(itens, tempo, 2);
    expect(contarPorIntervalo(baldes)).toEqual([2, 2]);
    expect(contarPorIntervalo(baldes, (x) => x.estado === "a")).toEqual([1, 2]);
    expect(somarPorIntervalo(baldes, (x) => x.v)).toEqual([6, 14]);
    expect(mediaPorIntervalo(baldes, (x) => x.v)).toEqual([3, 7]);
  });
  it("a média de um intervalo sem itens é 0", () => {
    expect(mediaPorIntervalo([[], [item(1, "a", 5)]], (x) => x.v)).toEqual([0, 5]);
  });
  it("divide séries termo a termo e protege a divisão por zero", () => {
    expect(razao([1, 2, 0], [2, 4, 0])).toEqual([50, 50, 0]);
    expect(razao([1], [4], 1)).toEqual([0.25]);
  });
  it("acumula", () => {
    expect(acumular([1, 2, 3, 0])).toEqual([1, 3, 6, 6]);
    expect(acumular([])).toEqual([]);
  });
  it("só uma série com dois pontos ou mais serve para desenhar", () => {
    expect(serieValida([1])).toEqual([]);
    expect(serieValida(undefined)).toEqual([]);
    expect(serieValida([1, NaN])).toEqual([]);
    expect(serieValida([1, 2])).toEqual([1, 2]);
  });
  it("usa um intervalo por item, entre 5 e 14", () => {
    expect([0, 3, 8, 14, 48, 500].map(intervalosPara)).toEqual([5, 5, 8, 14, 14, 14]);
  });
  it("lê datas ISO", () => {
    expect(instante("2026-10-29")).toBe(Date.UTC(2026, 9, 29));
  });
});

describe("variacaoDeSerie", () => {
  it("compara a média da segunda metade com a da primeira", () => {
    expect(variacaoDeSerie([10, 10, 15, 15])).toEqual({ variacao: 50, n: 2 });
    expect(variacaoDeSerie([20, 20, 10, 10])).toEqual({ variacao: -50, n: 2 });
  });
  it("com um número ímpar de pontos o mais antigo fica de fora", () => {
    expect(variacaoDeSerie([99, 10, 10, 20, 20])).toEqual({ variacao: 100, n: 2 });
  });
  it("sem pontos que cheguem, ou com a base a zero, não há variação", () => {
    expect(variacaoDeSerie([1, 2, 3])).toBeNull();
    expect(variacaoDeSerie([])).toBeNull();
    expect(variacaoDeSerie([0, 0, 5, 5])).toBeNull();
    expect(variacaoDeSerie([1, Number.NaN, 3, 4])).toBeNull();
  });
});
