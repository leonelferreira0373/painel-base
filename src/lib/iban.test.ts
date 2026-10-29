// Testes do IBAN: limpar, formatar, validar (módulo 97 e comprimento por país) e gerar um válido.
import { describe, expect, it } from "vitest";
import { erroDoIban, formatarIban, gerarIban, limparIban } from "./iban";

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
  it("gera IBAN angolanos válidos", () => {
    for (const conta of ["1234567810172", "9", "55501000123"]) {
      const iban = gerarIban("AO", conta);
      expect(iban).toHaveLength(25);
      expect(erroDoIban(iban)).toBeNull();
    }
  });
});
