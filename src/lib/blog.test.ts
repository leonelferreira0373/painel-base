// Testes do blog: endereços, tempo de leitura e etiquetas.
import { describe, expect, it } from "vitest";
import { lerEtiquetas, slugDe, tempoDeLeitura } from "./blog";

describe("blog", () => {
  it("faz o endereço sem acentos nem símbolos", () => {
    expect(slugDe("Olá, Mundo! 2026")).toBe("ola-mundo-2026");
    expect(slugDe("  Ação & Reação  ")).toBe("acao-reacao");
  });
  it("conta o tempo de leitura", () => {
    expect(tempoDeLeitura("curto")).toBe(1);
    expect(tempoDeLeitura("palavra ".repeat(600))).toBe(3);
  });
  it("lê etiquetas sem repetidos", () => {
    expect(lerEtiquetas("a, b ,, A, c")).toEqual(["a", "b", "c"]);
  });
});
