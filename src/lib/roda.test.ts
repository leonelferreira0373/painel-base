import { describe, expect, it } from "vitest";
import { algarismoEm, caracteresDe, proximaPosicao, repousoDe, rodaParaCima, TAMANHO_DA_TIRA, valorDe } from "./roda";

describe("caracteresDe", () => {
  it("alinha pela direita e só os algarismos rodam", () => {
    expect(caracteresDe("4,5 %")).toEqual([
      { c: "4", posicao: 4, algarismo: true },
      { c: ",", posicao: 3, algarismo: false },
      { c: "5", posicao: 2, algarismo: true },
      { c: " ", posicao: 1, algarismo: false },
      { c: "%", posicao: 0, algarismo: false },
    ]);
  });
  it("com mais um algarismo, os de baixo ficam na mesma posição", () => {
    const a = caracteresDe("99").map((x) => x.posicao);
    const b = caracteresDe("100").map((x) => x.posicao);
    expect(a).toEqual([1, 0]);
    expect(b).toEqual([2, 1, 0]);
  });
});

describe("valorDe", () => {
  it("lê números escritos à portuguesa", () => {
    expect(valorDe("10 599")).toBe(10599);
    expect(valorDe("41,5 %")).toBe(41.5);
    expect(valorDe("1.240")).toBe(1240);
    expect(valorDe("3690")).toBe(3690);
    expect(valorDe("125 000 Kz")).toBe(125000);
    expect(valorDe("-2,3 %")).toBe(-2.3);
  });
  it("sem algarismos não há valor", () => {
    expect(valorDe("—")).toBeNull();
    expect(valorDe("")).toBeNull();
  });
});

describe("rodaParaCima", () => {
  it("cresce, ou não se sabe: para cima; diminui: para baixo", () => {
    expect(rodaParaCima("10", "12")).toBe(true);
    expect(rodaParaCima("12", "10")).toBe(false);
    expect(rodaParaCima("12", "12")).toBe(true);
    expect(rodaParaCima(null, "5")).toBe(true);
    expect(rodaParaCima("—", "5")).toBe(true);
  });
});

describe("proximaPosicao", () => {
  it("para cima passa por 9→0 sem voltar atrás", () => {
    expect(proximaPosicao(repousoDe(8), 1, true)).toBe(18 + 3);
    expect(proximaPosicao(repousoDe(2), 5, true)).toBe(12 + 3);
  });
  it("para baixo desce o caminho mais curto no sentido contrário", () => {
    expect(proximaPosicao(repousoDe(1), 8, false)).toBe(11 - 3);
    expect(proximaPosicao(repousoDe(5), 2, false)).toBe(15 - 3);
  });
  it("o mesmo algarismo não roda", () => {
    expect(proximaPosicao(repousoDe(4), 4, true)).toBe(14);
  });
  it("a partir do repouso chega sempre ao algarismo pedido, dentro da tira", () => {
    for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) for (const cima of [true, false]) {
      const d = proximaPosicao(repousoDe(a), b, cima)!;
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(TAMANHO_DA_TIRA);
      expect(algarismoEm(d)).toBe(b);
    }
  });
  it("a meio de uma rolagem continua a partir de onde está, e sem tira que chegue salta", () => {
    expect(proximaPosicao(21, 4, true)).toBe(24);
    expect(proximaPosicao(28, 5, true)).toBeNull();
    expect(proximaPosicao(1, 5, false)).toBeNull();
  });
});
