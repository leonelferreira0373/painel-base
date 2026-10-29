import { describe, expect, it } from "vitest";
import { alternarFormato, type FerramentaDeFormato } from "./blog-formatar";

const negrito: FerramentaDeFormato = { id: "negrito", tipo: "inline", antes: "**", depois: "**", exemplo: "texto" };
const italico: FerramentaDeFormato = { id: "italico", tipo: "inline", antes: "*", depois: "*", exemplo: "texto" };
const codigo: FerramentaDeFormato = { id: "codigo", tipo: "inline", antes: "`", depois: "`", exemplo: "código" };
const ligacao: FerramentaDeFormato = { id: "ligacao", tipo: "inline", antes: "[", depois: "](https://)", exemplo: "texto" };
const titulo: FerramentaDeFormato = { id: "titulo", tipo: "linha", antes: "\n## ", depois: "", exemplo: "Título" };
const lista: FerramentaDeFormato = { id: "lista", tipo: "linha", antes: "\n- ", depois: "", exemplo: "item" };

describe("a formatação liga e desliga", () => {
  it("negrito: a primeira vez envolve, a segunda desfaz", () => {
    const a = alternarFormato("uma frase", 4, 9, negrito);
    expect(a.texto).toBe("uma **frase**");
    expect(a.texto.slice(a.inicio, a.fim)).toBe("frase");
    const b = alternarFormato(a.texto, a.inicio, a.fim, negrito);
    expect(b.texto).toBe("uma frase");
    expect(b.texto.slice(b.inicio, b.fim)).toBe("frase");
  });
  it("desfaz também quando a seleção já traz as marcas", () => {
    const t = "uma **frase** aqui";
    const r = alternarFormato(t, 4, 13, negrito);
    expect(r.texto).toBe("uma frase aqui");
  });
  it("sem seleção põe o exemplo", () => {
    const r = alternarFormato("", 0, 0, codigo);
    expect(r.texto).toBe("`código`");
    expect(r.texto.slice(r.inicio, r.fim)).toBe("código");
  });
  it("itálico não confunde com negrito", () => {
    const negritoFeito = "**forte**";
    const r = alternarFormato(negritoFeito, 2, 7, italico);
    expect(r.texto).toBe("***forte***");
    expect(alternarFormato("*suave*", 1, 6, italico).texto).toBe("suave");
  });
  it("ligação: envolve e desfaz, de dentro ou com o conjunto selecionado", () => {
    const a = alternarFormato("ver site", 4, 8, ligacao);
    expect(a.texto).toBe("ver [site](https://)");
    expect(alternarFormato(a.texto, a.inicio, a.fim, ligacao).texto).toBe("ver site");
    expect(alternarFormato("ver [site](https://x.pt)", 4, 24, ligacao).texto).toBe("ver site");
  });
  it("título e lista: põem o prefixo na linha e tiram-no à segunda", () => {
    const a = alternarFormato("primeira\nsegunda", 9, 9, titulo);
    expect(a.texto).toBe("primeira\n## segunda");
    expect(alternarFormato(a.texto, a.inicio, a.fim, titulo).texto).toBe("primeira\nsegunda");
    const b = alternarFormato("um\ndois\ntrês", 0, 12, lista);
    expect(b.texto).toBe("- um\n- dois\n- três");
    expect(alternarFormato(b.texto, b.inicio, b.fim, lista).texto).toBe("um\ndois\ntrês");
  });
  it("numa linha vazia o título entra com o exemplo", () => {
    const r = alternarFormato("antes\n\ndepois", 6, 6, titulo);
    expect(r.texto).toBe("antes\n## Título\ndepois");
    expect(r.texto.slice(r.inicio, r.fim)).toBe("Título");
  });
  it("uma lista com algumas linhas já marcadas fica toda marcada", () => {
    const r = alternarFormato("- um\ndois", 0, 9, lista);
    expect(r.texto).toBe("- um\n- dois");
  });
});
