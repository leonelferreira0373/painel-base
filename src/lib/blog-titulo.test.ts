// Testes do aspeto do título do artigo: alinhamento (também o antigo «ao centro»), tamanho, cor e o estilo no editor e no HTML exportado.
import { describe, expect, it } from "vitest";
import { alinharDoTitulo, estiloDoTitulo, estiloDoTituloEmLinha, TAMANHO_DO_TITULO, tamanhoDoTitulo, tamanhoVizinho } from "./blog-titulo";

const igual = (t: string) => t;

describe("aspeto do título do artigo", () => {
  it("o alinhamento escolhido manda; sem ele vale o antigo «ao centro»", () => {
    expect(alinharDoTitulo(undefined)).toBe("left");
    expect(alinharDoTitulo({ centrado: true })).toBe("center");
    expect(alinharDoTitulo({ centrado: true, alinhar: "right" })).toBe("right");
  });
  it("o tamanho que não faz sentido volta ao de partida", () => {
    expect(tamanhoDoTitulo({ tamanho: 52 })).toBe(52);
    expect(tamanhoDoTitulo({ tamanho: 3 })).toBe(TAMANHO_DO_TITULO);
    expect(tamanhoDoTitulo({ tamanho: Number.NaN })).toBe(TAMANHO_DO_TITULO);
    expect(tamanhoDoTitulo()).toBe(TAMANHO_DO_TITULO);
  });
  it("sobe e desce pelos tamanhos que se oferecem e pára nas pontas", () => {
    expect(tamanhoVizinho(38, 1)).toBe(44);
    expect(tamanhoVizinho(38, -1)).toBe(32);
    expect(tamanhoVizinho(40, 1)).toBe(44);
    expect(tamanhoVizinho(88, 1)).toBe(88);
    expect(tamanhoVizinho(24, -1)).toBe(24);
  });
  it("o estilo do campo leva só o que foi escolhido", () => {
    expect(estiloDoTitulo()).toEqual({ textAlign: "left", fontSize: "38px", fontWeight: 700, fontStyle: "normal" });
    expect(estiloDoTitulo({ alinhar: "center", tamanho: 60, negrito: false, italico: true, maiusculas: true, cor: "#dc2626", fonte: "Georgia" })).toEqual({ textAlign: "center", fontSize: "60px", fontWeight: 400, fontStyle: "italic", color: "#dc2626", textTransform: "uppercase", fontFamily: "Georgia" });
  });
  it("uma cor que não é de seis dígitos não passa para o estilo", () => {
    expect(estiloDoTitulo({ cor: "red; background:url(x)" })).not.toHaveProperty("color");
    expect(estiloDoTituloEmLinha({ cor: "javascript:1" }, igual)).not.toContain("color");
  });
  it("o HTML exportado traz o mesmo estilo (e o tamanho de partida em rem)", () => {
    expect(estiloDoTituloEmLinha(undefined, igual)).toBe("margin:0;font-size:2.4rem;line-height:1.15;font-weight:700");
    expect(estiloDoTituloEmLinha({ tamanho: 52, italico: true, cor: "#111111", maiusculas: true, fonte: "Georgia" }, igual)).toBe("margin:0;font-size:52px;line-height:1.15;font-weight:700;font-style:italic;color:#111111;text-transform:uppercase;font-family:Georgia");
  });
});
