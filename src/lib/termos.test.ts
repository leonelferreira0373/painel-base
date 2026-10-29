import { describe, expect, it } from "vitest";
import { explicarTermo, TERMOS_NO_GLOSSARIO } from "./termos";

describe("explicarTermo", () => {
  it("explica os termos técnicos, sem ligar a maiúsculas nem a acentos", () => {
    expect(explicarTermo("TTL")).toMatchObject({ tipo: "Termo técnico", conhecido: true });
    expect(explicarTermo("ttl").texto).toMatch(/Tempo de vida/);
    expect(explicarTermo("Reconn").texto).toMatch(/pesquisa a fundo/);
    expect(explicarTermo("A/B").tipo).toBe("Termo técnico");
    expect(TERMOS_NO_GLOSSARIO).toBeGreaterThan(30);
  });
  it("explica as páginas do painel, com a área onde estão", () => {
    const e = explicarTermo("Firewall");
    expect(e.conhecido).toBe(true);
    expect(e.tipo).toBe("Termo técnico");
    const p = explicarTermo("Registos DNS");
    expect(p).toMatchObject({ tipo: "Página do painel", onde: "Developer tools", conhecido: true });
    expect(p.texto).toMatch(/BIND/);
  });
  it("explica as funções, os formatos e as definições da conta", () => {
    expect(explicarTermo("Administrador").tipo).toBe("Função");
    expect(explicarTermo("Excel").tipo).toBe("Formato de exportação");
    expect(explicarTermo("Segurança").tipo).toBe("Definições da conta");
  });
  it("um pedaço de uma rota do site leva o caminho", () => {
    expect(explicarTermo("Homens", "Compras > Homens")).toMatchObject({ tipo: "Página do site", onde: "Compras > Homens" });
  });
  it("o que não conhece diz-se com honestidade", () => {
    const e = explicarTermo("Xyzzy 42");
    expect(e).toMatchObject({ tipo: "Valor", conhecido: false });
    expect(e.texto).toMatch(/pergunte à IA/);
  });
});
