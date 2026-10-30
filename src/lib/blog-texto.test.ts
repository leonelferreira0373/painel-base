// Testes do texto do blog: maiúsculas e minúsculas em português, contagem e tempo de leitura, avanço e caixas.
import { describe, expect, it } from "vitest";
import { aplicarCaixa, AVANCO_MAXIMO, contarTexto, limitarAvanco, tomDeCaixa } from "./blog-texto";

describe("texto do blog", () => {
  it("muda as maiúsculas e minúsculas", () => {
    expect(aplicarCaixa("olá, mundo", "maiusculas")).toBe("OLÁ, MUNDO");
    expect(aplicarCaixa("OLÁ, Mundo", "minusculas")).toBe("olá, mundo");
  });
  it("«Cada Palavra» deixa as palavras de ligação em minúsculas, menos na primeira", () => {
    expect(aplicarCaixa("o guia de transporte para a ilha", "titulo")).toBe("O Guia de Transporte para a Ilha");
    expect(aplicarCaixa("ÁGUAS DO ATLÂNTICO", "titulo")).toBe("Águas do Atlântico");
    expect(aplicarCaixa("pé-de-meia", "titulo")).toBe("Pé-de-meia");
  });
  it("«Só a primeira letra» põe maiúscula depois de cada ponto", () => {
    expect(aplicarCaixa("ISTO É UM TESTE. outra frase! e mais?  sim", "frase")).toBe("Isto é um teste. Outra frase! E mais?  Sim");
    expect(aplicarCaixa("", "frase")).toBe("");
  });
  it("conta palavras, letras e o tempo de leitura", () => {
    expect(contarTexto("")).toEqual({ palavras: 0, caracteres: 0, semEspacos: 0, minutos: 0 });
    expect(contarTexto("um dois  três\nquatro")).toMatchObject({ palavras: 4, caracteres: 20, semEspacos: 16, minutos: 1 });
    expect(contarTexto("palavra ".repeat(450)).minutos).toBe(2);
  });
  it("o avanço fica entre zero e o máximo", () => {
    expect(limitarAvanco(-3)).toBe(0);
    expect(limitarAvanco(2.4)).toBe(2);
    expect(limitarAvanco(99)).toBe(AVANCO_MAXIMO);
    expect(limitarAvanco(Number.NaN)).toBe(0);
  });
  it("um tom de caixa que não existe fica «info»", () => {
    expect(tomDeCaixa("perigo")).toBe("perigo");
    expect(tomDeCaixa("xpto")).toBe("info");
  });
});
