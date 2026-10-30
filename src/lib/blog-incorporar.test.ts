import { describe, expect, it } from "vitest";
import { htmlDaIncorporacao, incorporacaoDe, mapaDe } from "./blog-incorporar";

describe("incorporar ligações", () => {
  it("o YouTube, em qualquer das formas, vira o quadro sem cookies", () => {
    for (const url of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?t=5", "youtube.com/embed/dQw4w9WgXcQ"]) {
      expect(incorporacaoDe(url)).toMatchObject({ tipo: "youtube", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", proporcao: "16 / 9" });
    }
    expect(incorporacaoDe("https://www.youtube.com/shorts/abcDEF12345")?.proporcao).toBe("9 / 16");
  });
  it("o Vimeo e o Spotify", () => {
    expect(incorporacaoDe("https://vimeo.com/76979871")).toMatchObject({ tipo: "vimeo", src: "https://player.vimeo.com/video/76979871" });
    expect(incorporacaoDe("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x")).toMatchObject({ tipo: "spotify", src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC", proporcao: "3 / 1" });
    expect(incorporacaoDe("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")?.proporcao).toBe("1 / 1");
  });
  it("um sítio escrito ou uma ligação do Google Maps vira um mapa", () => {
    expect(incorporacaoDe("Hotel Miragem, Luanda")).toMatchObject({ tipo: "mapa", src: mapaDe("Hotel Miragem, Luanda"), titulo: "Hotel Miragem, Luanda" });
    expect(mapaDe(" Luanda ")).toBe("https://www.google.com/maps?q=Luanda&output=embed");
    expect(incorporacaoDe("https://www.google.com/maps?q=Ilha+de+Luanda")).toMatchObject({ tipo: "mapa", src: mapaDe("Ilha de Luanda") });
    expect(incorporacaoDe("https://www.google.com/maps/place/Ilha+de+Luanda/@-8.79,13.23,15z")).toMatchObject({ tipo: "mapa" });
    expect(incorporacaoDe("https://www.openstreetmap.org/#map=15/-8.79000/13.23000")).toMatchObject({ tipo: "mapa", src: mapaDe("-8.79000,13.23000") });
  });
  it("qualquer outra ligação fica como cartão (nunca um quadro de uma página qualquer)", () => {
    const i = incorporacaoDe("https://exemplo.pt/artigo");
    expect(i).toMatchObject({ tipo: "ligacao", src: "", titulo: "exemplo.pt" });
    expect(htmlDaIncorporacao(i!)).not.toContain("<iframe");
    expect(htmlDaIncorporacao(i!)).toContain('href="https://exemplo.pt/artigo"');
  });
  it("não aceita nada vazio nem protocolos perigosos", () => {
    expect(incorporacaoDe("   ")).toBeNull();
    expect(incorporacaoDe("javascript:alert(1)")).toMatchObject({ tipo: "mapa" });
    // fica uma pesquisa no mapa: o quadro só aponta para o Google Maps, nunca para o endereço escrito
    const html = htmlDaIncorporacao(incorporacaoDe("javascript:alert(1)")!);
    expect(html).toContain('src="https://www.google.com/maps?q=');
    expect(html).not.toMatch(/(?:src|href)="javascript:/);
  });
  it("o quadro leva a proporção, a legenda e a proteção", () => {
    const html = htmlDaIncorporacao(incorporacaoDe("https://youtu.be/dQw4w9WgXcQ")!, "A entrevista");
    expect(html).toContain("aspect-ratio:16 / 9");
    expect(html).toContain("sandbox=");
    expect(html).toContain("A entrevista</figcaption>");
  });
});
