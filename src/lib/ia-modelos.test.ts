import { describe, expect, it } from "vitest";
import { custoUsd, estimarTokens, formatarUsd, MODELO_PADRAO, modeloDe, neuronsDe, ocupacaoDaJanela, usoDaResposta, USD_POR_NEURON } from "./ia-modelos";

describe("preços", () => {
  it("o custo vem do preço por milhão de tokens", () => {
    expect(custoUsd(MODELO_PADRAO, 1_000_000, 0)).toBeCloseTo(0.293, 6);
    expect(custoUsd(MODELO_PADRAO, 0, 1_000_000)).toBeCloseTo(2.253, 6);
    expect(custoUsd(MODELO_PADRAO, 304, 23)).toBeCloseTo(0.000141, 6);
  });
  it("as neurons batem com as que a Cloudflare devolveu (304 tokens de entrada e 23 de saída gastaram 12,82)", () => {
    expect(neuronsDe(MODELO_PADRAO, 304, 23)).toBeCloseTo(12.82, 1);
    expect(custoUsd(MODELO_PADRAO, 304, 23)).toBeCloseTo(neuronsDe(MODELO_PADRAO, 304, 23) * USD_POR_NEURON, 10);
  });
  it("um modelo desconhecido não rebenta: custa zero e tem uma janela por omissão", () => {
    const m = modeloDe("@cf/nova/coisa-1");
    expect(m).toMatchObject({ nome: "coisa-1", janela: 8000, precoEntrada: 0 });
    expect(custoUsd("@cf/nova/coisa-1", 1000, 1000)).toBe(0);
  });
});

describe("usoDaResposta", () => {
  it("lê os tokens e as neurons que a Cloudflare disse", () => {
    const u = usoDaResposta(MODELO_PADRAO, { prompt_tokens: 304, completion_tokens: 23, neurons: 12.8175 }, 1234.6);
    expect(u).toMatchObject({ tokensEntrada: 304, tokensSaida: 23, neurons: 12.8175, janela: 24000, ms: 1235, estimado: false });
    expect(u.custoUsd).toBeCloseTo(12.8175 * USD_POR_NEURON, 10);
  });
  it("sem neurons calcula-as pelos tokens", () => {
    const u = usoDaResposta(MODELO_PADRAO, { prompt_tokens: 1000, completion_tokens: 100 }, 10);
    expect(u.neurons).toBeCloseTo(neuronsDe(MODELO_PADRAO, 1000, 100), 6);
    expect(u.estimado).toBe(false);
  });
  it("sem contagem nenhuma estima pelo texto e diz que estimou", () => {
    const u = usoDaResposta(MODELO_PADRAO, undefined, 5, "a".repeat(360), "b".repeat(36));
    expect(u).toMatchObject({ tokensEntrada: 100, tokensSaida: 10, estimado: true });
  });
  it("ignora números estranhos", () => {
    expect(usoDaResposta(MODELO_PADRAO, { prompt_tokens: -4, completion_tokens: "x" }, 0, "abcd", "ab").estimado).toBe(true);
  });
});

describe("apresentação", () => {
  it("estimarTokens arredonda para cima", () => {
    expect(estimarTokens("")).toBe(0);
    expect(estimarTokens("abcd")).toBe(2);
  });
  it("os dólares têm as casas que os fazem ler-se", () => {
    expect(formatarUsd(0)).toBe("$0,00");
    expect(formatarUsd(0.0034)).toBe("$0,0034");
    expect(formatarUsd(0.123)).toBe("$0,123");
    expect(formatarUsd(4.5)).toBe("$4,50");
  });
  it("a ocupação da janela fica entre 0 e 1", () => {
    expect(ocupacaoDaJanela(6000, 24000)).toBe(0.25);
    expect(ocupacaoDaJanela(99999, 24000)).toBe(1);
    expect(ocupacaoDaJanela(-5, 24000)).toBe(0);
    expect(ocupacaoDaJanela(5, 0)).toBe(0);
  });
});
