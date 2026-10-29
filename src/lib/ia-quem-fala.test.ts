import { describe, expect, it } from "vitest";
import { quemFala } from "./ia-quem-fala";

const funcao = { rotulo: "Administrador", areas: { inicio: ["ver"], "area-sem-nome": ["ver", "editar"] }, fechados: ["dev/dns"] };
const sessao = { nome: "Mateus Ferraz", email: "mateus.ferraz@empresa.exemplo" };
const atual = { id: "s-9k2x", inicio: "2026-10-29T08:05:00Z", cidade: "Luanda", pais: "Angola", dispositivo: { navegador: "Chrome", versao: "141", sistema: "Android", tipo: "telemovel", ecra: "360x800", idioma: "pt-PT", fuso: "Africa/Luanda" } } as const;

describe("quem fala com a IA", () => {
  it("diz que é o painel de administração e que quem escreve é da equipa, não um cliente", () => {
    const t = quemFala(funcao, sessao, "/a1/operacoes/transporte/", atual);
    expect(t).toMatch(/painel de administração/);
    expect(t).toMatch(/NÃO é um cliente/);
  });
  it("leva a pessoa, a função, a sessão, o aparelho e o sítio", () => {
    const t = quemFala(funcao, sessao, "/x/", atual);
    expect(t).toContain("Mateus Ferraz (mateus.ferraz@empresa.exemplo)");
    expect(t).toContain("função «Administrador»");
    expect(t).toContain("sessão s-9k2x");
    expect(t).toContain("Chrome em Android (telemovel)");
    expect(t).toContain("de Luanda, Angola");
  });
  it("diz o que a função pode ver, com o nome das áreas (ou o código, se não tem nome), e os módulos fechados", () => {
    const t = quemFala(funcao, sessao, "/x/", atual);
    expect(t).toMatch(/vê estas áreas: Início, area-sem-nome/);
    expect(t).toContain("módulos fechados: dev/dns");
  });
  it("sem sessão aberta ainda diz onde está e qual é a função", () => {
    const t = quemFala(funcao, null, "/x/", null);
    expect(t).toContain("função «Administrador»");
    expect(t).not.toContain("sessão s-");
  });
});
