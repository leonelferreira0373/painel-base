// Testes do IBAN: limpar, formatar, validar (módulo 97 e comprimento por país), o prefixo que a moeda escreve sozinha e gerar um válido.
import { describe, expect, it } from "vitest";
import { corpoDoIban, erroDoCorpo, erroDoIban, formatarCorpo, formatarIban, gerarIban, ibanDoCorpo, limparIban, prefixoDaMoeda } from "./iban";

describe("IBAN", () => {
  it("limpa e escreve em grupos de quatro", () => {
    expect(limparIban("pt50 0002-0123 1234 5678 9015 4")).toBe("PT50000201231234567890154");
    expect(formatarIban("PT50000201231234567890154")).toBe("PT50 0002 0123 1234 5678 9015 4");
  });
  it("aceita IBAN verdadeiros", () => {
    expect(erroDoIban("PT50 0002 0123 1234 5678 9015 4")).toBeNull();
    expect(erroDoIban("GB82 WEST 1234 5698 7654 32")).toBeNull();
    expect(erroDoIban("DE89 3704 0044 0532 0130 00")).toBeNull();
  });
  it("recusa o que está mal, com a razão", () => {
    expect(erroDoIban("")).toContain("Escreva");
    expect(erroDoIban("1234")).toContain("duas letras");
    expect(erroDoIban("PT50 0002 0123 1234 5678 9015")).toContain("25 caracteres");
    expect(erroDoIban("PT51 0002 0123 1234 5678 9015 4")).toContain("controlo");
  });
  it("gera IBAN angolanos e portugueses válidos, com os dígitos de controlo de sempre", () => {
    for (const conta of ["1234567810172", "9", "55501000123", "0040000012345678101"]) {
      const iban = gerarIban("AO", conta);
      expect(iban).toHaveLength(25);
      expect(iban.slice(0, 4)).toBe("AO06");
      expect(erroDoIban(iban)).toBeNull();
    }
    const pt = gerarIban("PT", "0033000012345678901");
    expect(pt.slice(0, 4)).toBe("PT50");
    expect(erroDoIban(pt)).toBeNull();
  });
  it("gera outros países com os seus próprios dígitos de controlo", () => {
    const iban = gerarIban("MZ", "123456789");
    expect(iban).toHaveLength(25);
    expect(erroDoIban(iban)).toBeNull();
  });
});

describe("IBAN: o prefixo vem da moeda", () => {
  it("kwanzas e dólares são de Angola, euros de Portugal", () => {
    expect(prefixoDaMoeda("AOA")).toBe("AO06");
    expect(prefixoDaMoeda("USD")).toBe("AO06");
    expect(prefixoDaMoeda("EUR")).toBe("PT50");
    expect(prefixoDaMoeda("XYZ")).toBe("");
  });
  it("quem preenche só escreve os 21 dígitos", () => {
    expect(corpoDoIban("0040 0000 1234 5678 1014 2", "AOA")).toBe("004000001234567810142");
    expect(corpoDoIban("00400000123456781014299999", "AOA")).toBe("004000001234567810142");
    expect(formatarCorpo("004000001234567810142")).toBe("0040 0000 1234 5678 1014 2");
    expect(ibanDoCorpo("AOA", "004000001234567810142")).toBe("AO06004000001234567810142");
    expect(ibanDoCorpo("AOA", "")).toBe("");
  });
  it("um IBAN colado inteiro perde o prefixo, mesmo com outro país ou outros dígitos de controlo", () => {
    expect(corpoDoIban("AO06 0040 0000 1234 5678 1014 2", "AOA")).toBe("004000001234567810142");
    expect(corpoDoIban("ao06004000001234567810142", "USD")).toBe("004000001234567810142");
    expect(corpoDoIban("AO06 0040 0000 1234 5678 1014 2", "EUR")).toBe("004000001234567810142");
    expect(corpoDoIban("AO78 0000 0000 1234 5678 1017 2", "AOA")).toBe("000000001234567810172");
  });
  it("ignora letras e símbolos", () => {
    expect(corpoDoIban("00a4-0b0", "AOA")).toBe("00400");
  });
  it("diz o que falta e valida o resto com o módulo 97", () => {
    expect(erroDoCorpo("AOA", "")).toContain("Escreva");
    expect(erroDoCorpo("AOA", "0040")).toBe("Faltam 17 dígitos.");
    expect(erroDoCorpo("AOA", "00400000123456781014")).toBe("Faltam 1 dígito.");
    expect(erroDoCorpo("AOA", "004000001234567810142")).toBeNull();
    expect(erroDoCorpo("AOA", "004000001234567810143")).toContain("controlo");
    expect(erroDoCorpo("EUR", "003300001234567890142")).toBeNull();
    expect(erroDoCorpo("XYZ", "123")).toContain("moeda");
  });
});
