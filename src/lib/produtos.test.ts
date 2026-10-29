// Testes dos produtos: ler o preço e o stock escritos, as mensagens de erro e as imagens do produto.
import { describe, expect, it } from "vitest";
import { erroDoPreco, erroDoProduto, erroDoStock, lerPreco, lerStock, precoParaTexto, produtoNovo } from "./produtos";

describe("preço", () => {
  it("lê as formas de escrever um preço", () => {
    expect(lerPreco("12500")).toBe(12500);
    expect(lerPreco("12500,5")).toBe(12500.5);
    expect(lerPreco("12500.50")).toBe(12500.5);
    expect(lerPreco("12 500,50")).toBe(12500.5);
    expect(lerPreco("12.500,50")).toBe(12500.5);
    expect(lerPreco("1,250,000")).toBe(1250000);
    expect(lerPreco("12.500")).toBe(12500);
    expect(lerPreco("0")).toBe(0);
    expect(lerPreco("0,99")).toBe(0.99);
  });
  it("recusa o que não é um valor", () => {
    for (const t of ["", "abc", "12,345,6", "-5", "12,", "1,2,3", "12.5.5"]) expect(lerPreco(t), t).toBeNull();
  });
  it("diz o que está mal", () => {
    expect(erroDoPreco("")).toContain("Escreva");
    expect(erroDoPreco("abc")).toContain("números");
    expect(erroDoPreco("12 500,50")).toBeNull();
  });
  it("escreve o preço para o campo e lê-o de volta", () => {
    expect(lerPreco(precoParaTexto(12500.5))).toBe(12500.5);
    expect(lerPreco(precoParaTexto(1250000))).toBe(1250000);
    expect(lerPreco(precoParaTexto(0))).toBe(0);
  });
});

describe("stock", () => {
  it("é um inteiro, zero ou mais", () => {
    expect(lerStock("120")).toBe(120);
    expect(lerStock(" 0 ")).toBe(0);
    expect(lerStock("1 200")).toBe(1200);
    for (const t of ["", "-1", "1,5", "abc", "1234567890"]) expect(lerStock(t), t).toBeNull();
    expect(erroDoStock("")).toContain("Escreva");
    expect(erroDoStock("1,5")).toContain("inteiro");
    expect(erroDoStock("5")).toBeNull();
  });
});

describe("produto", () => {
  it("o novo começa em rascunho, sem imagens", () => {
    const p = produtoNovo("p1", "2026-10-29T10:00:00.000Z");
    expect(p).toMatchObject({ id: "p1", estado: "rascunho", imagens: [], stock: 0, preco: 0, moeda: "AOA" });
  });
  it("precisa de nome, preço e stock certos para guardar", () => {
    const p = produtoNovo("p1");
    expect(erroDoProduto(p, "10", "1")).toContain("nome");
    expect(erroDoProduto({ ...p, nome: "Cabo" }, "x", "1")).toContain("números");
    expect(erroDoProduto({ ...p, nome: "Cabo" }, "10", "x")).toContain("inteiro");
    expect(erroDoProduto({ ...p, nome: "Cabo" }, "10", "1")).toBeNull();
  });
});
