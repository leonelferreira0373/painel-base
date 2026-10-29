import { describe, expect, it } from "vitest";
import { sentidoDe, textoDaVariacao } from "./variacao";

describe("a variação de um indicador", () => {
  it("subiu, desceu ou ficou igual", () => {
    expect(sentidoDe(12.5)).toBe("subiu");
    expect(sentidoDe(-8)).toBe("desceu");
    expect(sentidoDe(0)).toBe("igual");
  });
  it("uma variação que arredonda a zero é igual (não se mostra uma seta para «0 %»)", () => {
    expect(sentidoDe(0.04)).toBe("igual");
    expect(sentidoDe(-0.04)).toBe("igual");
    expect(sentidoDe(0.06)).toBe("subiu");
    expect(sentidoDe(-0.06)).toBe("desceu");
  });
  it("o texto é sempre a percentagem sem sinal: o sentido está na seta", () => {
    expect(textoDaVariacao(12.54)).toMatch(/^12,5\s%$/);
    expect(textoDaVariacao(-8)).toMatch(/^8\s%$/);
    expect(textoDaVariacao(0)).toMatch(/^0\s%$/);
  });
});
