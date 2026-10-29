// Testes das letras carregadas: nome a partir do ficheiro, formatos aceites, ligações seguras e o nome da família do Google Fonts.
import { describe, expect, it } from "vitest";
import { eFicheiroDeLetra, erroDaLigacao, familiaDaLigacao, nomeDoFicheiro } from "./fontes";

describe("letras carregadas", () => {
  it("tira o nome do ficheiro", () => {
    expect(nomeDoFicheiro("Minha-Letra_Bold.woff2")).toBe("Minha Letra Bold");
    expect(nomeDoFicheiro("Roboto.ttf")).toBe("Roboto");
  });
  it("reconhece os formatos de letra, também em ligações com parâmetros", () => {
    expect(eFicheiroDeLetra("a.WOFF2")).toBe(true);
    expect(eFicheiroDeLetra("https://x.pt/f/letra.otf?v=3")).toBe(true);
    expect(eFicheiroDeLetra("https://fonts.googleapis.com/css2?family=Roboto")).toBe(false);
    expect(eFicheiroDeLetra("foto.png")).toBe(false);
  });
  it("só aceita ligações https", () => {
    expect(erroDaLigacao("https://fonts.googleapis.com/css2?family=Roboto")).toBeNull();
    expect(erroDaLigacao("http://exemplo.pt/a.woff2")).not.toBeNull();
    expect(erroDaLigacao("não é uma ligação")).not.toBeNull();
  });
  it("lê a família de uma ligação do Google Fonts", () => {
    expect(familiaDaLigacao("https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap")).toBe("Open Sans");
    expect(familiaDaLigacao("https://x.pt/letra.woff2")).toBeNull();
  });
});
