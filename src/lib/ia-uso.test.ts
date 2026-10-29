import { describe, expect, it } from "vitest";
import { MODELO_PADRAO, usoDaResposta } from "./ia-modelos";
import { aPagar, quadradosDe, repartirContexto, somarUso, tomDoAnel } from "./ia-uso";

const uso = (tin: number, tout: number) => usoDaResposta(MODELO_PADRAO, { prompt_tokens: tin, completion_tokens: tout }, 100);

describe("somarUso", () => {
  it("soma tokens, neurons e dinheiro", () => {
    const t = somarUso([{ uso: uso(1000, 100) }, { uso: uso(500, 50) }]);
    expect(t).toMatchObject({ chamadas: 2, tokensEntrada: 1500, tokensSaida: 150 });
    expect(t.neurons).toBeCloseTo(uso(1000, 100).neurons + uso(500, 50).neurons, 6);
    expect(somarUso([])).toEqual({ chamadas: 0, tokensEntrada: 0, tokensSaida: 0, neurons: 0, custoUsd: 0 });
  });
});

describe("aPagar", () => {
  it("dentro da quota gratuita não se paga nada", () => {
    expect(aPagar({ neurons: 9999, limiteGratis: 10000, custoUsd: 0.11 })).toBe(0);
    expect(aPagar({ neurons: 0, limiteGratis: 10000, custoUsd: 0 })).toBe(0);
  });
  it("só o que passa da quota se paga, ao preço de tabela", () => {
    expect(aPagar({ neurons: 20000, limiteGratis: 10000, custoUsd: 0.22 })).toBeCloseTo(0.11, 6);
  });
});

describe("repartirContexto", () => {
  it("reparte a entrada pelos caracteres e deixa o resto da janela livre", () => {
    const u = uso(1000, 100);
    const p = repartirContexto(u, { sistema: 300, ferramentas: 500, mensagens: 200 });
    const por = Object.fromEntries(p.map((x) => [x.id, x.tokens]));
    expect(por.sistema).toBe(300);
    expect(por.ferramentas).toBe(500);
    expect(por.mensagens).toBe(200);
    expect(por.resposta).toBe(100);
    expect(por.livre).toBe(24000 - 1100);
    expect(p.reduce((s, x) => s + x.tokens, 0)).toBe(24000);
  });
  it("sem a repartição tudo o que entrou conta como mensagens", () => {
    const p = repartirContexto(uso(800, 20));
    expect(p.find((x) => x.id === "mensagens")?.tokens).toBe(800);
    expect(p.find((x) => x.id === "sistema")?.tokens).toBe(0);
  });
});

describe("quadradosDe", () => {
  it("cinquenta quadrados: as partes com tokens têm pelo menos um e o resto é livre", () => {
    const q = quadradosDe(repartirContexto(uso(240, 24), { sistema: 100, ferramentas: 0, mensagens: 100 }));
    expect(q.sistema).toBeGreaterThanOrEqual(1);
    expect(q.ferramentas).toBe(0);
    expect(Object.values(q).reduce((s, n) => s + n, 0)).toBe(50);
    expect(q.livre).toBeGreaterThan(40);
  });
});

describe("tomDoAnel", () => {
  it("verde, âmbar e vermelho", () => {
    expect(tomDoAnel(0.2)).toBe("sucesso");
    expect(tomDoAnel(0.6)).toBe("aviso");
    expect(tomDoAnel(0.85)).toBe("perigo");
  });
});
