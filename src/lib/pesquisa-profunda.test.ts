import { describe, expect, it } from "vitest";
import { CONFIG_DE_ORIGEM, etasDaFila, faltaDe, instrucoesDaPesquisa, instrucoesDoDocumento, mensagemDeCorrecao, paraComecar, pedidoInicial, textoDoTempo, type TrabalhoDePesquisa } from "./pesquisa-profunda";

const t = (p: Partial<TrabalhoDePesquisa> = {}): TrabalhoDePesquisa => ({
  id: "a",
  titulo: "Receita",
  pedido: "",
  alvo: { titulo: "Receita", tipo: "cartao" },
  config: CONFIG_DE_ORIGEM,
  estado: "fila",
  criado: "2026-10-29T10:00:00.000Z",
  passoAtual: 0,
  passosPrevistos: 6,
  passos: [],
  correcoes: [],
  notas: [],
  fontes: [],
  chamadas: 0,
  tokens: 0,
  neurons: 0,
  custoUsd: 0,
  ...p,
});

describe("tempo estimado", () => {
  it("o que falta são os passos que restam vezes a média, mais a escrita do foco", () => {
    expect(faltaDe(t({ estado: "a pesquisar", passoAtual: 2, mediaPassoMs: 5000 }))).toBe(4 * 5000 + 14_000);
    expect(faltaDe(t({ estado: "a pesquisar", passoAtual: 6, mediaPassoMs: 5000 }))).toBe(14_000);
    expect(faltaDe(t({ estado: "concluida" }))).toBe(0);
    expect(faltaDe(t({ config: { ...CONFIG_DE_ORIGEM, foco: "curto" }, passoAtual: 0 }))).toBe(6 * 6500 + 8000);
  });
  it("a fila espera pelo que está à frente, dividido pelos que correm ao mesmo tempo", () => {
    const a = t({ id: "a", estado: "a pesquisar", passoAtual: 6, mediaPassoMs: 1000, criado: "2026-10-29T10:00:00.000Z" });
    const b = t({ id: "b", estado: "a pesquisar", passoAtual: 6, mediaPassoMs: 1000, criado: "2026-10-29T10:00:01.000Z" });
    const c = t({ id: "c", criado: "2026-10-29T10:00:02.000Z", mediaPassoMs: 1000 });
    const d = t({ id: "d", criado: "2026-10-29T10:00:03.000Z", mediaPassoMs: 1000 });
    const e = etasDaFila([a, b, c, d]);
    expect(e.get("a")).toBe(14_000);
    // c entra na primeira pista que fica livre (14 s) e demora 6 s + 14 s; d entra na outra pista, também livre aos 14 s
    expect(e.get("c")).toBe(14_000 + 20_000);
    expect(e.get("d")).toBe(14_000 + 20_000);
  });
  it("escreve em palavras", () => {
    expect(textoDoTempo(1000)).toBe("5 s");
    expect(textoDoTempo(43_000)).toBe("45 s");
    expect(textoDoTempo(125_000)).toBe("2 min");
  });
});

describe("a fila", () => {
  it("só começa o que cabe na concorrência, pela ordem em que entrou", () => {
    const l = [t({ id: "1", estado: "a pesquisar" }), t({ id: "2", criado: "2026-10-29T10:00:02.000Z" }), t({ id: "3", criado: "2026-10-29T10:00:01.000Z" })];
    expect(paraComecar(l, 2).map((x) => x.id)).toEqual(["3"]);
    expect(paraComecar(l, 3).map((x) => x.id)).toEqual(["3", "2"]);
    expect(paraComecar([t({ estado: "a pesquisar" }), t({ id: "x", estado: "em pausa" })], 2)).toEqual([]);
  });
});

describe("o que se diz à IA", () => {
  it("as instruções dizem se há internet e quantas voltas, a data e a ênfase", () => {
    const com = instrucoesDaPesquisa({ ...CONFIG_DE_ORIGEM, enfase: "riscos" }, 6, new Date("2026-10-29T10:00:00Z"));
    expect(com).toContain("29 de outubro de 2026");
    expect(com).toContain("no máximo 6 voltas");
    expect(com).toContain("buscar_web");
    expect(com).toContain("riscos");
    expect(instrucoesDaPesquisa({ ...CONFIG_DE_ORIGEM, internet: false }, 6)).toContain("Não tens acesso à internet");
  });
  it("o pedido leva os dados, cortados, e o que a pessoa escreveu", () => {
    const longo = { linhas: Array.from({ length: 500 }, (_, i) => ({ i, nome: `linha ${i}` })) };
    const p = pedidoInicial({ alvo: { titulo: "Pedidos", tipo: "lista", pagina: "/operacoes/", dados: longo }, pedido: "  compara com o mercado " }, 500);
    expect(p).toContain("uma lista do painel, em /operacoes/");
    expect(p).toContain("(cortado)");
    expect(p).toContain("A pessoa pediu: compara com o mercado");
    expect(pedidoInicial({ alvo: { titulo: "Como vai o negócio?", tipo: "livre" }, pedido: "" })).toContain("não escreveu mais nada");
  });
  it("as instruções do documento pedem JSON e seguem o foco", () => {
    const i = instrucoesDoDocumento({ titulo: "x", config: { ...CONFIG_DE_ORIGEM, foco: "extenso" } });
    expect(i).toContain("SÓ com um objeto JSON");
    expect(i).toContain("«termo»");
    expect(i).toContain("doze a dezoito blocos");
  });
  it("a correção chega à IA como ordem", () => {
    expect(mensagemDeCorrecao("  ignora o Brasil ")).toBe("Correção da pessoa (obedece-lhe já): ignora o Brasil");
  });
});

import { empurrao, podeConcluir } from "./pesquisa-profunda";

describe("o mínimo antes de concluir", () => {
  const normal = { ...CONFIG_DE_ORIGEM, profundidade: "normal" as const };
  it("pede procurar e ler o que a profundidade exige", () => {
    expect(podeConcluir(normal, { procuras: 1, leituras: 0, porLer: 5 })).toBe(false);
    expect(podeConcluir(normal, { procuras: 1, leituras: 2, porLer: 5 })).toBe(true);
    expect(podeConcluir({ ...CONFIG_DE_ORIGEM, profundidade: "rapida" }, { procuras: 1, leituras: 0, porLer: 5 })).toBe(true);
    expect(podeConcluir({ ...CONFIG_DE_ORIGEM, profundidade: "profunda" }, { procuras: 1, leituras: 4, porLer: 5 })).toBe(false);
  });
  it("não pede mais do que existe nem nada sem internet", () => {
    expect(podeConcluir(normal, { procuras: 1, leituras: 1, porLer: 0 })).toBe(true);
    expect(podeConcluir({ ...normal, internet: false }, { procuras: 0, leituras: 0, porLer: 0 })).toBe(true);
  });
  it("o empurrão diz o que falta", () => {
    expect(empurrao(normal, { procuras: 1, leituras: 0 })).toMatch(/ler páginas inteiras \(0 de 2\)/);
    expect(empurrao({ ...normal, profundidade: "profunda" }, { procuras: 1, leituras: 0 })).toMatch(/procurar mais \(1 de 2\) e ler/);
  });
});
