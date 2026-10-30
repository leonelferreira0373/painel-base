import { describe, expect, it } from "vitest";
import { descritoresDoFicheiro, eFicheiroDeFonte, eZip, familiaCss, familiaDoFicheiro, familiasDoHtml, FONTES, fontePorNome, ligacoesDeFontes, urlDaPrevia, urlDoGoogle } from "./blog-fontes";

describe("catálogo de fontes", () => {
  it("tem centenas de famílias, sem repetidas, de todas as categorias", () => {
    expect(FONTES.length).toBeGreaterThan(250);
    expect(new Set(FONTES.map((f) => f.nome)).size).toBe(FONTES.length);
    expect(new Set(FONTES.map((f) => f.categoria)).size).toBe(6);
    expect(fontePorNome("Playfair Display")?.categoria).toBe("serifa");
  });
  it("escreve a família e os endereços do Google Fonts", () => {
    expect(familiaCss("Playfair Display", "serifa")).toBe('"Playfair Display", serif');
    expect(familiaCss("Minha", "carregada")).toBe('"Minha", sans-serif');
    expect(urlDoGoogle("Playfair Display")).toBe("https://fonts.googleapis.com/css?family=Playfair+Display:400,400i,700,700i&display=swap");
    expect(urlDaPrevia("Dancing Script")).toContain("text=Dancing%20Script");
  });
});

describe("fontes carregadas", () => {
  it("conhece os ficheiros de fonte e os zips", () => {
    expect(["a.ttf", "a.OTF", "a.woff", "a.woff2"].every(eFicheiroDeFonte)).toBe(true);
    expect(eFicheiroDeFonte("a.png")).toBe(false);
    expect(eFicheiroDeFonte("._a.ttf")).toBe(false);
    expect(eZip("fontes.ZIP")).toBe(true);
  });
  it("tira a família e o peso do nome do ficheiro", () => {
    expect(familiaDoFicheiro("Playfair-BoldItalic.ttf")).toBe("Playfair");
    expect(familiaDoFicheiro("Minha_Fonte-Regular.woff2")).toBe("Minha Fonte");
    expect(familiaDoFicheiro("Roboto-Light.ttf")).toBe("Roboto");
    expect(familiaDoFicheiro("Bold.ttf")).toBe("Bold");
    expect(descritoresDoFicheiro("Playfair-BoldItalic.ttf")).toEqual({ weight: "700", style: "italic" });
    expect(descritoresDoFicheiro("Roboto-Light.ttf")).toEqual({ weight: "300", style: "normal" });
    expect(descritoresDoFicheiro("Minha.ttf")).toEqual({ weight: "400", style: "normal" });
  });
});

describe("fontes de um artigo", () => {
  it("lê as famílias dos estilos do HTML, sem repetir", () => {
    const html = '<p><span style="font-family: &quot;Playfair Display&quot;, serif;">a</span> <span style="font-family: &quot;Dancing Script&quot;, cursive">b</span> <span style="font-family: &quot;Playfair Display&quot;, serif">c</span></p>';
    expect(familiasDoHtml(html)).toEqual(["Playfair Display", "Dancing Script"]);
    expect(familiasDoHtml("<p>nada</p>", ['"Lora", serif'])).toEqual(["Lora"]);
  });
  it("só pede ao Google as fontes do catálogo (as do sistema e as da pessoa não)", () => {
    const l = ligacoesDeFontes(["Playfair Display", "Georgia", "Minha Fonte"]);
    expect(l).toContain("Playfair+Display");
    expect(l).not.toContain("Georgia");
    expect(l).not.toContain("Minha");
  });
});
