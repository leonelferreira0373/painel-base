import { describe, expect, it } from "vitest";
import { estiloDoObjeto, numeroDaProporcao, proximaRotacao, PROPORCOES, temTransformacao } from "./blog-objetos";

describe("proporções prontas", () => {
  it("têm as habituais e leem-se como número", () => {
    expect(PROPORCOES.map((p) => p.id)).toEqual(["", "1 / 1", "4 / 5", "9 / 16", "3 / 4", "4 / 3", "3 / 2", "16 / 9", "21 / 9"]);
    expect(numeroDaProporcao("16 / 9")).toBeCloseTo(16 / 9);
    expect(numeroDaProporcao("")).toBeUndefined();
    expect(numeroDaProporcao("lixo")).toBeUndefined();
    expect(numeroDaProporcao("0 / 5")).toBeUndefined();
  });
});

describe("rodar e espelhar", () => {
  it("a rotação dá a volta ao círculo nos dois sentidos", () => {
    expect([0, 90, 180, 270].map((r) => proximaRotacao(r))).toEqual([90, 180, 270, 0]);
    expect(proximaRotacao(0, -1)).toBe(270);
    expect(proximaRotacao(undefined)).toBe(90);
  });
  it("a caixa tem a proporção escolhida e o objeto enche-a", () => {
    const { caixa, objeto } = estiloDoObjeto({ proporcao: "16 / 9", razao: 1 });
    expect(Number(caixa.aspectRatio)).toBeCloseTo(16 / 9);
    expect(objeto.width).toBe("100%");
    expect(objeto.objectFit).toBe("cover");
  });
  it("com um quarto de volta a caixa vira (a proporção do ficheiro inverte-se) e o objeto troca as medidas", () => {
    const { caixa, objeto } = estiloDoObjeto({ razao: 2, rotacao: 90 });
    expect(Number(caixa.aspectRatio)).toBeCloseTo(0.5);
    expect(objeto.width).toBe("200.000%");
    expect(objeto.height).toBe("50.000%");
    expect(String(objeto.transform)).toContain("rotate(90deg)");
  });
  it("o espelho põe o sinal menos na escala", () => {
    expect(String(estiloDoObjeto({ espelhoH: true }).objeto.transform)).toContain("scale(-1, 1)");
    expect(String(estiloDoObjeto({ espelhoV: true }).objeto.transform)).toContain("scale(1, -1)");
  });
  it("sem nada mudado não há transformação", () => {
    expect(temTransformacao({})).toBe(false);
    expect(temTransformacao({ proporcao: "", rotacao: 0 })).toBe(false);
    expect(temTransformacao({ rotacao: 90 })).toBe(true);
    expect(temTransformacao({ proporcao: "1 / 1" })).toBe(true);
  });
});
