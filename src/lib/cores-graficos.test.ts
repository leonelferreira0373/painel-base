import { describe, expect, it } from "vitest";
import { clarear, comOpacidade, corEfetiva, corValida, idDoGrafico, paletaDe } from "./cores-graficos";

describe("cores dos gráficos", () => {
  it("só aceita cores de seis dígitos", () => {
    expect(corValida("#155dfc")).toBe(true);
    expect(corValida("#ABCDEF")).toBe(true);
    expect(corValida("155dfc")).toBe(false);
    expect(corValida("#fff")).toBe(false);
    expect(corValida(null)).toBe(false);
  });
  it("a paleta parte da cor escolhida e não repete nenhuma", () => {
    const p = paletaDe("#155dfc", 6);
    expect(p).toHaveLength(6);
    expect(p[0]).toBe("#155dfc");
    expect(new Set(p).size).toBe(6);
    expect(paletaDe("azul", 3)).toEqual([]);
  });
  it("clarear mistura com branco", () => {
    expect(clarear("#000000", 0.5)).toBe("#808080");
    expect(clarear("#ffffff", 0.5)).toBe("#ffffff");
    expect(clarear("#155dfc", 0)).toBe("#155dfc");
  });
  it("a cor com opacidade para o preenchimento", () => {
    expect(comOpacidade("#155dfc", 0.26)).toBe("rgba(21,93,252,0.26)");
  });
  it("o id junta a página e o título sem acentos", () => {
    expect(idDoGrafico("/marketing/cliques/", "Cliques por página")).toBe("marketing/cliques:cliques-por-pagina");
  });
});

describe("a gama de todos os gráficos", () => {
  const todas = { "*": "#16a34a", "marketing/cliques:cliques": "#dc2626" };
  it("cada gráfico usa a sua cor; sem ela, a gama", () => {
    expect(corEfetiva(todas, "marketing/cliques:cliques")).toBe("#dc2626");
    expect(corEfetiva(todas, "dev/saude:cpu")).toBe("#16a34a");
    expect(corEfetiva(todas, undefined)).toBe("#16a34a");
    expect(corEfetiva({}, "dev/saude:cpu")).toBeUndefined();
  });
});
