// Testes das conversões de cor do seletor: do código hexadecimal para HSV e de volta, sem perder a cor.
import { describe, expect, it } from "vitest";
import { hexParaHsv, hsvParaHex } from "./cor";

describe("conversões de cor", () => {
  it("os extremos: preto, branco e as cores puras", () => {
    expect(hexParaHsv("#000000")).toEqual([0, 0, 0]);
    expect(hexParaHsv("#ffffff")).toEqual([0, 0, 1]);
    expect(hexParaHsv("#ff0000")).toEqual([0, 1, 1]);
    expect(hexParaHsv("#0000ff")).toEqual([240, 1, 1]);
    expect(hsvParaHex(120, 1, 1)).toBe("#00ff00");
  });
  it("ida e volta mantém a cor", () => {
    for (const hex of ["#e11d48", "#155dfc", "#808080", "#f0e6d8", "#171717"]) {
      const [h, s, v] = hexParaHsv(hex);
      expect(hsvParaHex(h, s, v)).toBe(hex);
    }
  });
});
