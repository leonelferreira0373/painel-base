// Testes de marketing: validar e montar ligações UTM, classificar de onde veio o visitante e a taxa de conversão.
import { describe, expect, it } from "vitest";
import { erroDoUtm, montarUrlUtm, origemDoVisitante, taxaDeConversao } from "./marketing";

const ok = { url: "https://exemplo.pt/precos?x=1", fonte: "facebook", meio: "social", campanha: "outubro-2026" };

describe("marketing", () => {
  it("valida os parâmetros UTM", () => {
    expect(erroDoUtm(ok)).toBeNull();
    expect(erroDoUtm({ ...ok, url: "exemplo" })).toContain("endereço completo");
    expect(erroDoUtm({ ...ok, fonte: "" })).toContain("Falta a fonte");
    expect(erroDoUtm({ ...ok, campanha: "campanha de outubro" })).toContain("sem espaços");
    expect(erroDoUtm({ ...ok, termo: "ação" })).toContain("termo");
  });
  it("monta a ligação mantendo o que já tinha e trocando os UTM antigos", () => {
    const u = new URL(montarUrlUtm({ ...ok, termo: "transporte" }));
    expect(u.searchParams.get("x")).toBe("1");
    expect(u.searchParams.get("utm_source")).toBe("facebook");
    expect(u.searchParams.get("utm_term")).toBe("transporte");
    const outra = new URL(montarUrlUtm({ ...ok, url: "https://exemplo.pt/?utm_source=velho&utm_content=velho" }));
    expect(outra.searchParams.get("utm_source")).toBe("facebook");
    expect(outra.searchParams.has("utm_content")).toBe(false);
  });
  it("classifica a origem do visitante", () => {
    expect(origemDoVisitante("", undefined)).toEqual({ fonte: "direto", meio: "nenhum" });
    expect(origemDoVisitante("https://www.google.com/search?q=x")).toEqual({ fonte: "google", meio: "organico" });
    expect(origemDoVisitante("https://l.facebook.com/l.php")).toEqual({ fonte: "facebook", meio: "social" });
    expect(origemDoVisitante("https://t.co/abc")).toEqual({ fonte: "twitter", meio: "social" });
    expect(origemDoVisitante("https://parceiros.pt/links")).toEqual({ fonte: "parceiros.pt", meio: "referencia" });
    expect(origemDoVisitante("https://www.google.com/", { source: "Newsletter", medium: "Email" })).toEqual({ fonte: "newsletter", meio: "email" });
    expect(origemDoVisitante("não é um endereço")).toEqual({ fonte: "direto", meio: "nenhum" });
  });
  it("calcula a taxa de conversão", () => {
    expect(taxaDeConversao(200, 5)).toBe(0.025);
    expect(taxaDeConversao(0, 0)).toBe(0);
  });
});
