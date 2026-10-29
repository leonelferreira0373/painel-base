import { describe, expect, it } from "vitest";
import { esconderTudoExcepto, escolhaLocal, mensagensDaEscolha, opcoesDe, opcoesEscolhidas, passaNoFiltro, procurarOpcoes, resumoDoFiltro, VAZIO } from "./filtro-colunas";

const acoes = ["Iniciou sessão", "Enviou um e-mail", "Iniciou sessão", "Exportou dados", "Iniciou sessão", "Enviou um e-mail", "", "Confirmou um pedido"];

describe("opcoesDe", () => {
  it("conta as opções diferentes, as mais frequentes primeiro, e o vazio tem nome", () => {
    const o = opcoesDe(acoes);
    expect(o.slice(0, 2)).toEqual([{ valor: "Iniciou sessão", contagem: 3 }, { valor: "Enviou um e-mail", contagem: 2 }]);
    expect(o.map((x) => x.valor)).toContain(VAZIO);
    expect(o).toHaveLength(5);
    expect(o.at(-1)?.valor).toBe("Exportou dados"); // empate a 1: por ordem alfabética (Confirmou, Exportou, (vazio))
  });
});

describe("passaNoFiltro e procurar", () => {
  it("sem escondidos tudo passa; escondido não passa; o vazio esconde-se pelo seu nome", () => {
    expect(passaNoFiltro("x", undefined)).toBe(true);
    expect(passaNoFiltro("x", new Set())).toBe(true);
    expect(passaNoFiltro("Enviou um e-mail", new Set(["Enviou um e-mail"]))).toBe(false);
    expect(passaNoFiltro("Iniciou sessão", new Set(["Enviou um e-mail"]))).toBe(true);
    expect(passaNoFiltro("  ", new Set([VAZIO]))).toBe(false);
  });
  it("a pesquisa não liga a acentos nem a maiúsculas", () => {
    const o = opcoesDe(acoes);
    expect(procurarOpcoes(o, "SESSAO").map((x) => x.valor)).toEqual(["Iniciou sessão"]);
    expect(procurarOpcoes(o, "  ")).toHaveLength(5);
    expect(procurarOpcoes(o, "zzz")).toEqual([]);
  });
  it("esconde tudo menos o que se escolheu, e resume", () => {
    const o = opcoesDe(acoes);
    const e = esconderTudoExcepto(o, ["Enviou um e-mail", "Iniciou sessão"]);
    expect([...e].sort()).toEqual(["(vazio)", "Confirmou um pedido", "Exportou dados"].sort());
    expect(resumoDoFiltro(o, e)).toBe("2 de 5");
  });
});

describe("a IA escolhe as opções", () => {
  const o = opcoesDe(acoes);
  it("o pedido leva a coluna, as opções com a contagem e o pedido", () => {
    const m = mensagensDaEscolha("Ação", o, "tudo o que tem a ver com e-mails");
    expect(m[0].role).toBe("system");
    expect(m[1].content).toContain("Coluna: Ação");
    expect(m[1].content).toContain("- Iniciou sessão (3)");
    expect(m[1].content).toContain("Pedido: tudo o que tem a ver com e-mails");
  });
  it("lê a resposta e só aceita opções que existem", () => {
    expect(opcoesEscolhidas('{"opcoes": ["Enviou um e-mail", "Inventada", "enviou um e-mail", "iniciou sessao"]}', o)).toEqual(["Enviou um e-mail", "Iniciou sessão"]);
    expect(opcoesEscolhidas('Aqui está: {"opcoes": ["Exportou dados"]} pronto', o)).toEqual(["Exportou dados"]);
    expect(opcoesEscolhidas("não sei", o)).toEqual([]);
    expect(opcoesEscolhidas('{"opcoes": "x"}', o)).toEqual([]);
  });
  it("sem IA, escolhe pelas palavras do pedido (pelo começo da palavra)", () => {
    expect(escolhaLocal(o, "mostra tudo o que tem a ver com e-mails")).toEqual(["Enviou um e-mail"]);
    expect(escolhaLocal(o, "sessões")).toEqual(["Iniciou sessão"]);
    expect(escolhaLocal(o, "tudo")).toEqual([]);
  });
});
