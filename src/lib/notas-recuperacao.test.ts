import { describe, expect, it } from "vitest";
import { cifrarConteudo, decifrarConteudo } from "./notas";
import { criarRecuperacao, gerarCodigo, senhaRecuperada, textoDoEmailDeRecuperacao } from "./notas-recuperacao";

describe("recuperar a palavra-passe de uma nota", () => {
  it("a chave do cofre devolve a palavra-passe, e outra chave não", async () => {
    const { recuperacao, chave } = await criarRecuperacao("a-minha-senha-123");
    expect(await senhaRecuperada(recuperacao, chave)).toBe("a-minha-senha-123");
    const outra = await criarRecuperacao("outra");
    expect(await senhaRecuperada(recuperacao, outra.chave)).toBeNull();
    expect(await senhaRecuperada({ ...recuperacao, dados: recuperacao.dados.slice(0, -4) + "AAAA" }, chave)).toBeNull();
  });
  it("a palavra-passe recuperada abre a nota", async () => {
    const conteudo = { corpo: "<p>Segredo</p>", texto: "Segredo", anexos: [], titulo: "Contas" };
    const { cifra } = await cifrarConteudo(conteudo, "x1y2z3w4");
    const { recuperacao, chave } = await criarRecuperacao("x1y2z3w4");
    const senha = await senhaRecuperada(recuperacao, chave);
    expect((await decifrarConteudo(cifra, senha!))?.conteudo).toEqual(conteudo);
  });
  it("o código tem seis dígitos e o e-mail diz para onde olhar", () => {
    for (let i = 0; i < 50; i++) expect(gerarCodigo()).toMatch(/^[1-9]\d{5}$/);
    const e = textoDoEmailDeRecuperacao("Pedidos por dia", "123456");
    expect(e.corpo).toContain("123 456");
    expect(e.corpo).toContain("Pedidos por dia");
    expect(e.corpo).toContain("10 minutos");
  });
});
