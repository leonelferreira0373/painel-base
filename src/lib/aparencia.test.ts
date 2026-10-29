// Testes da aparência personalizável: misturar cores, contraste, paleta com as escolhas do utilizador e quais variáveis do Kumo se mudam.
import { describe, expect, it } from "vitest";
import { CORES } from "@/dados/aparencia";
import { contraste, hexValido, misturar, paleta, pilhaDe, temCores, variaveisDe, variaveisDeLetras, variaveisDoTema } from "./aparencia";

describe("cores", () => {
  it("valida códigos de seis dígitos", () => {
    expect(hexValido("#155dfc")).toBe(true);
    expect(hexValido("155dfc")).toBe(false);
    expect(hexValido("#15f")).toBe(false);
  });
  it("mistura duas cores", () => {
    expect(misturar("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(misturar("#102030", "#102030", 0.7)).toBe("#102030");
  });
  it("calcula o contraste: preto sobre branco é 21", () => {
    expect(Math.round(contraste("#000000", "#ffffff"))).toBe(21);
    expect(contraste("#777777", "#ffffff")).toBeLessThan(4.5);
  });
});

describe("paleta", () => {
  it("sem escolhas, é a de origem de cada tema", () => {
    for (const c of CORES) {
      expect(paleta("claro")[c.id]).toBe(c.claro);
      expect(paleta("escuro")[c.id]).toBe(c.escuro);
    }
  });
  it("as escolhas do utilizador ficam por cima, só no tema onde as fez", () => {
    const a = { escuro: { acento: "#ff0000" } };
    expect(paleta("escuro", a).acento).toBe("#ff0000");
    expect(paleta("claro", a).acento).toBe(CORES.find((c) => c.id === "acento")!.claro);
  });
  it("ignora códigos inválidos", () => {
    expect(paleta("claro", { claro: { acento: "vermelho" } }).acento).toBe(CORES.find((c) => c.id === "acento")!.claro);
  });
});

describe("variáveis do Kumo", () => {
  it("sem nada mudado, não se muda nada", () => {
    expect(variaveisDoTema("claro")).toEqual({});
    expect(temCores("claro", {})).toBe(false);
  });
  it("mudar o acento só mexe nas variáveis do acento", () => {
    const v = variaveisDoTema("claro", { claro: { acento: "#e11d48" } });
    expect(v["--color-kumo-brand"]).toBe("#e11d48");
    expect(Object.keys(v).every((k) => /brand|link|focus/.test(k))).toBe(true);
    expect(v["--color-kumo-canvas"]).toBeUndefined();
  });
  it("mudar o fundo refaz também as nuances que dependem dele", () => {
    const v = variaveisDoTema("claro", { claro: { fundo: "#f0e6d8" } });
    expect(v["--color-kumo-canvas"]).toBe("#f0e6d8");
    expect(v["--color-kumo-tint"]).toBeDefined();
    expect(v["--color-kumo-brand"]).toBeUndefined();
  });
  it("a paleta completa traz todas as variáveis", () => {
    expect(Object.keys(variaveisDe(paleta("escuro"))).length).toBeGreaterThan(25);
  });
});

describe("letras", () => {
  it("só se mudam as que o utilizador escolheu", () => {
    expect(variaveisDeLetras()).toEqual({});
    expect(variaveisDeLetras({ titulos: "serifada" })).toEqual({ "--fonte-titulos": pilhaDe("serifada") });
  });
  it("uma letra desconhecida cai na do painel", () => {
    expect(pilhaDe("não-existe")).toBe(pilhaDe("inter"));
  });
});
