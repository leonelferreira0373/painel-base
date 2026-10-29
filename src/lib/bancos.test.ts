// Testes dos bancos pelo código do IBAN: Angola e Portugal, pela moeda ou pelo IBAN inteiro.
import { describe, expect, it } from "vitest";
import { BANCOS_POR_PAIS, bancoDoCodigo, bancoDoCorpo, bancoDoIban } from "./bancos";
import { erroDoIban, gerarIban } from "./iban";

describe("bancos pelo código do IBAN", () => {
  it("0040 é o BAI e 0006 o BFA, em kwanzas e em dólares", () => {
    expect(bancoDoCorpo("AOA", "004000001234567810142")).toBe("BAI");
    expect(bancoDoCorpo("USD", "0006")).toBe("BFA");
    expect(bancoDoCorpo("AOA", "0044")).toBe("Banco Sol");
    expect(bancoDoCorpo("AOA", "0055")).toBe("Millennium Atlântico");
  });
  it("em euros a tabela é a portuguesa (o mesmo código pode ser outro banco)", () => {
    expect(bancoDoCorpo("EUR", "0035")).toBe("Caixa Geral de Depósitos");
    expect(bancoDoCorpo("EUR", "0033")).toBe("Millennium bcp");
    expect(bancoDoCorpo("AOA", "0010")).toBe("BPC");
    expect(bancoDoCorpo("EUR", "0010")).toBe("BPI");
    expect(bancoDoCorpo("AOA", "0045")).toBe("Banco Económico");
    expect(bancoDoCorpo("EUR", "0045")).toBe("Crédito Agrícola");
  });
  it("devolve null enquanto faltam dígitos, se o banco não está na tabela ou se a moeda é desconhecida", () => {
    expect(bancoDoCorpo("AOA", "004")).toBeNull();
    expect(bancoDoCorpo("AOA", "9999")).toBeNull();
    expect(bancoDoCorpo("XYZ", "0040")).toBeNull();
  });
  it("lê o banco de um IBAN inteiro, pelo país", () => {
    expect(bancoDoIban("AO06 0040 0000 1234 5678 1014 2")).toBe("BAI");
    expect(bancoDoIban("PT50 0035 0000 1234 5678 9014 2")).toBe("Caixa Geral de Depósitos");
    expect(bancoDoIban("DE89 3704 0044 0532 0130 00")).toBeNull();
    expect(bancoDoIban("AO06")).toBeNull();
    expect(bancoDoCodigo("AO", "0040")).toBe("BAI");
  });
  it("todos os códigos têm quatro dígitos e não há dois nomes iguais num país", () => {
    for (const [pais, tabela] of Object.entries(BANCOS_POR_PAIS)) {
      for (const codigo of Object.keys(tabela)) expect(codigo, `${pais} ${codigo}`).toMatch(/^\d{4}$/);
      const nomes = Object.values(tabela);
      expect(new Set(nomes).size, pais).toBe(nomes.length);
    }
  });
  it("cada banco gera um IBAN válido com o seu código", () => {
    for (const [pais, tabela] of Object.entries(BANCOS_POR_PAIS)) {
      for (const [codigo, nome] of Object.entries(tabela)) {
        const iban = gerarIban(pais, `${codigo}000012345678901`);
        expect(erroDoIban(iban), `${pais} ${nome}`).toBeNull();
        expect(bancoDoIban(iban)).toBe(nome);
      }
    }
  });
});
