import { describe, expect, it } from "vitest";
import { MAXIMO_DE_LINHAS_POR_TABELA, MAXIMO_POR_DOCUMENTO, textoDosExtraidos } from "./ia-ficheiros";
import type { Extraido } from "./tipos";

const base = { id: "f", tamanho: 1, tipoMime: "", formato: "xlsx", avisos: [], duracaoMs: 1 };
const extraido = (parcial: Partial<Extraido>): Extraido => ({ ...base, nome: "ficheiro", tabelas: [], texto: "", ...parcial });

describe("o que a memória do assistente guarda de um ficheiro", () => {
  it("as tabelas passam a linhas «coluna: valor»", () => {
    const t = textoDosExtraidos([extraido({ tabelas: [{ id: "t", ficheiroId: "f", nome: "Preços", origem: "x", colunas: ["Produto", "Preço"], linhas: [["Cadeira", 120], ["Mesa", null]] }] })]);
    expect(t).toContain("## Preços");
    expect(t).toContain("Produto: Cadeira | Preço: 120");
    expect(t).toContain("Produto: Mesa | Preço:");
  });
  it("o texto corrido fica como está", () => {
    expect(textoDosExtraidos([extraido({ texto: "  Horário: 9h às 18h  " })])).toBe("Horário: 9h às 18h");
  });
  it("vários ficheiros (um ZIP) ganham um cabeçalho cada", () => {
    const t = textoDosExtraidos([extraido({ nome: "a.txt", texto: "um" }), extraido({ nome: "b.csv", dentroDe: "tudo.zip", texto: "dois" })]);
    expect(t).toContain("# a.txt");
    expect(t).toContain("# tudo.zip › b.csv");
  });
  it("uma tabela enorme é cortada e diz quantas linhas faltam", () => {
    const linhas = Array.from({ length: MAXIMO_DE_LINHAS_POR_TABELA + 7 }, (_, i) => [i]);
    const t = textoDosExtraidos([extraido({ tabelas: [{ id: "t", ficheiroId: "f", nome: "Grande", origem: "x", colunas: ["n"], linhas }] })]);
    expect(t).toContain("… mais 7 linhas");
  });
  it("um documento enorme é cortado no limite", () => {
    const t = textoDosExtraidos([extraido({ texto: "x".repeat(MAXIMO_POR_DOCUMENTO + 500) })]);
    expect(t.length).toBeLessThan(MAXIMO_POR_DOCUMENTO + 100);
    expect(t).toContain("o resto do ficheiro não coube");
  });
  it("um ficheiro sem nada dá texto vazio (quem chama decide)", () => {
    expect(textoDosExtraidos([extraido({})])).toBe("");
    expect(textoDosExtraidos([])).toBe("");
  });
});
