// Testes do aspeto da legenda das figuras: ler e escrever o atributo, o estilo no editor e a legenda no HTML exportado (sem escolhas, igual ao que sempre saiu).
import { describe, expect, it } from "vitest";
import { escreverAspetoDaLegenda, estiloDaLegenda, figcaptionHtml, lerAspetoDaLegenda } from "./blog-legenda";

describe("aspeto da legenda das figuras", () => {
  it("escreve e lê o mesmo aspeto, com a fonte e a cor codificadas", () => {
    const a = { alinhar: "right" as const, tamanho: 18, cor: "#DC2626", negrito: true, italico: true, maiusculas: true, fonte: '"Playfair Display", serif' };
    const texto = escreverAspetoDaLegenda(a);
    expect(texto).not.toContain('"');
    expect(lerAspetoDaLegenda(texto)).toEqual({ ...a, cor: "#dc2626" });
  });
  it("sem escolhas não escreve nada", () => {
    expect(escreverAspetoDaLegenda({})).toBe("");
    expect(lerAspetoDaLegenda("")).toEqual({});
    expect(lerAspetoDaLegenda(undefined)).toEqual({});
  });
  it("o que não serve fica de fora (HTML editado à mão)", () => {
    expect(lerAspetoDaLegenda("alinhar:cima;tamanho:9999;cor:red;fonte:a%3Bb%3Cx;negrito:1;lixo")).toEqual({ negrito: true });
    expect(lerAspetoDaLegenda("tamanho:%E0%A4%A")).toEqual({});
  });
  it("o estilo do campo leva o de partida e o que foi escolhido", () => {
    expect(estiloDaLegenda({})).toEqual({ textAlign: "center", fontSize: "14px", fontWeight: 400, fontStyle: "normal" });
    expect(estiloDaLegenda({ alinhar: "justify", tamanho: 20, negrito: true, cor: "#112233", maiusculas: true })).toMatchObject({ textAlign: "justify", fontSize: "20px", fontWeight: 600, color: "#112233", textTransform: "uppercase" });
  });
  it("a legenda exportada sem escolhas sai como sempre saiu", () => {
    expect(figcaptionHtml("audi", undefined)).toBe('<figcaption style="font-size:.85em;line-height:1.4;opacity:.7;margin-top:.45em;text-align:center">audi</figcaption>');
    expect(figcaptionHtml("audi", {}, "left")).toContain("text-align:left");
    expect(figcaptionHtml("", { tamanho: 20 })).toBe("");
  });
  it("a legenda exportada leva o aspeto escolhido e protege o tipo de letra", () => {
    const h = figcaptionHtml("audi", { alinhar: "right", tamanho: 18, cor: "#dc2626", negrito: true, italico: true, fonte: 'Georgia, "Times"' }, "center", (t) => t.replace(/"/g, "&quot;"));
    expect(h).toContain("font-size:18px");
    expect(h).toContain("color:#dc2626");
    expect(h).not.toContain("opacity");
    expect(h).toContain("font-weight:600");
    expect(h).toContain("font-style:italic");
    expect(h).toContain("font-family:Georgia, &quot;Times&quot;");
    expect(h).toContain("text-align:right");
  });
});
