// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aoMudarAsRevogacoes, estaRevogado, lerRevogacoes, reporAcesso, revogarAcesso } from "./acessos-revogados";

describe("o acesso revogado vale logo", () => {
  beforeEach(() => window.localStorage.clear());

  it("revoga e repõe, sem ligar às maiúsculas nem aos espaços do e-mail", () => {
    expect(estaRevogado("ana@empresa.pt")).toBe(false);
    revogarAcesso("  Ana@Empresa.pt ", "Mateus", new Date("2026-10-29T12:00:00.000Z"));
    expect(estaRevogado("ana@empresa.pt")).toBe(true);
    expect(estaRevogado("ANA@EMPRESA.PT")).toBe(true);
    expect(lerRevogacoes()).toEqual([{ email: "ana@empresa.pt", quando: "2026-10-29T12:00:00.000Z", por: "Mateus" }]);
    reporAcesso("ana@empresa.pt");
    expect(estaRevogado("ana@empresa.pt")).toBe(false);
  });
  it("revogar duas vezes não repete a pessoa na lista", () => {
    revogarAcesso("ana@empresa.pt", "A");
    revogarAcesso("ana@empresa.pt", "B");
    expect(lerRevogacoes()).toHaveLength(1);
    expect(lerRevogacoes()[0].por).toBe("B");
  });
  it("avisa logo quem está a ouvir, e deixa de avisar quando se cancela", () => {
    const f = vi.fn();
    const parar = aoMudarAsRevogacoes(f);
    revogarAcesso("rui@empresa.pt", "A");
    expect(f).toHaveBeenCalledTimes(1);
    reporAcesso("rui@empresa.pt");
    expect(f).toHaveBeenCalledTimes(2);
    parar();
    revogarAcesso("rui@empresa.pt", "A");
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("sem e-mail ninguém está revogado", () => {
    expect(estaRevogado(undefined)).toBe(false);
    expect(estaRevogado("")).toBe(false);
  });
  it("uma lista estragada lê-se como vazia", () => {
    window.localStorage.setItem("painel.acessos-revogados", "isto não é JSON");
    expect(lerRevogacoes()).toEqual([]);
    window.localStorage.setItem("painel.acessos-revogados", JSON.stringify({ x: 1 }));
    expect(lerRevogacoes()).toEqual([]);
  });
});
