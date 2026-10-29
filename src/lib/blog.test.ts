// Testes do blog: endereços, tempo de leitura, etiquetas e a exportação para Markdown.
import { describe, expect, it } from "vitest";
import { artigoNovo, lerEtiquetas, paraMarkdown, slugDe, tempoDeLeitura } from "./blog";

describe("blog", () => {
  it("faz o endereço sem acentos nem símbolos", () => {
    expect(slugDe("Olá, Mundo! 2026")).toBe("ola-mundo-2026");
    expect(slugDe("  Ação & Reação  ")).toBe("acao-reacao");
  });
  it("conta o tempo de leitura", () => {
    expect(tempoDeLeitura("curto")).toBe(1);
    expect(tempoDeLeitura("palavra ".repeat(600))).toBe(3);
  });
  it("lê etiquetas sem repetidos", () => {
    expect(lerEtiquetas("a, b ,, A, c")).toEqual(["a", "b", "c"]);
  });
  it("exporta com cabeçalho e título", () => {
    const a = { ...artigoNovo("1", "2026-10-29T10:00:00.000Z"), titulo: "Olá", slug: "ola", conteudo: "Texto **forte**.", etiquetas: ["x"], resumo: "R" };
    const md = paraMarkdown(a);
    expect(md.startsWith('---\ntitulo: "Olá"')).toBe(true);
    expect(md).toContain('etiquetas: ["x"]');
    expect(md).toContain("# Olá\n\nTexto **forte**.");
  });
});
