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
  it("o que não conhece não finge: não há texto e a etiqueta não abre nada", () => {
    const e = explicarTermo("Xyzzy 42");
    expect(e).toMatchObject({ tipo: "Valor", conhecido: false, texto: "" });
  });
  it("as ações, botões, teclas e estados que o painel cita têm explicação a sério", () => {
    const citados = ["Investigar com IA", "Analisar com IA", "Pesquisa em curso", "Perguntar à IA", "Deixar nota", "Copiar dados", "Alterar", "Esc", "Igual ao sistema", "Personalizado", "Carregar ficheiros", "Carregar imagens", "Preferências de cookies", "Falar com a equipa", "Novo registo", "Definições da conta", "Em análise", "Confirmado", "Recusado", "Novo", "Agendada", "A enviar"];
    for (const t of citados) {
      const e = explicarTermo(t);
      expect(e.conhecido, t).toBe(true);
      expect(e.texto.length, t).toBeGreaterThan(40);
      expect(e.texto, t).not.toMatch(/não tenho|pergunte à IA para saber/i);
    }
    expect(explicarTermo("Investigar com IA")).toMatchObject({ tipo: "Ação do menu" });
    expect(explicarTermo("Investigar com IA").texto).toMatch(/análise a fundo/);
  });
});
