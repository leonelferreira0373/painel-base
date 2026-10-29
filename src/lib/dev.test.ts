// Testes das funções de developer tools: alvo do firewall, destino das cópias, consulta SQL só de leitura e apagar por dias.
import { describe, expect, it } from "vitest";
import { alvoApanhaIp, correrConsulta, emailValido, erroDoAlvo, erroDoDestino, ipBloqueado, linhasApagadas, planoDeAcesso, regraQueApanha } from "./dev";

describe("developer tools", () => {
  it("valida o alvo de uma regra do firewall", () => {
    expect(erroDoAlvo("203.0.113.7")).toBeNull();
    expect(erroDoAlvo("203.0.113.0/24")).toBeNull();
    expect(erroDoAlvo("ru")).toBeNull();
    expect(erroDoAlvo("")).toContain("Escreva");
    expect(erroDoAlvo("300.1.1.1")).toContain("0 a 255");
    expect(erroDoAlvo("10.0.0.0/33")).toContain("máscara");
    expect(erroDoAlvo("exemplo.pt")).toContain("IPv4");
  });
  it("valida o destino das cópias de segurança", () => {
    expect(erroDoDestino("local", "/var/copias")).toBeNull();
    expect(erroDoDestino("local", "copias")).toContain("começa por /");
    expect(erroDoDestino("s3", "s3://copias/painel")).toBeNull();
    expect(erroDoDestino("s3", "https://copias")).toContain("s3://");
    expect(erroDoDestino("sftp", "sftp://servidor:2222/pasta")).toBeNull();
    expect(erroDoDestino("sftp", "servidor/pasta")).toContain("sftp://");
    expect(erroDoDestino("drive", "1AbCdEfGhIjKlMn")).toBeNull();
    expect(erroDoDestino("drive", "")).toContain("Escreva");
  });
  it("corre consultas de leitura e recusa o resto", () => {
    const r = correrConsulta("SELECT * FROM pagamentos LIMIT 3;");
    expect(r.erro).toBeUndefined();
    expect(r.linhas).toHaveLength(3);
    expect(r.colunas).toContain("referencia");
    const c = correrConsulta("select id, estado from pagamentos limit 2");
    expect(c.colunas).toEqual(["id", "estado"]);
    expect(c.linhas[0]).toHaveLength(2);
    expect(correrConsulta("DELETE FROM pagamentos").erro).toContain("leitura");
    expect(correrConsulta("SELECT * FROM pagamentos; DROP TABLE x").erro).toContain("só de leitura");
    expect(correrConsulta("SELECT * FROM inexistente").erro).toContain("não existe");
    expect(correrConsulta("SELECT nada FROM pagamentos").erro).toContain("coluna");
    expect(correrConsulta("SELECT * FROM logs LIMIT 500").linhas).toHaveLength(50);
  });
  it("calcula quantas linhas se apagam", () => {
    expect(linhasApagadas(1000, 30)).toBe(500);
    expect(linhasApagadas(1000, 0)).toBe(900);
    expect(linhasApagadas(1000, 365)).toBeLessThan(100);
  });
  it("valida e-mails", () => {
    expect(emailValido("a@b.pt")).toBe(true);
    expect(emailValido("a@b")).toBe(false);
  });
});

describe("bloquear e desbloquear um IP", () => {
  const regra = (id: string, acao: "permitir" | "bloquear", alvo: string, ativa = true) => ({ id, acao, alvo, nota: "", ativa });

  it("um alvo apanha o IP sozinho, a gama que o contém e o país do pedido", () => {
    expect(alvoApanhaIp("203.0.113.7", "203.0.113.7")).toBe(true);
    expect(alvoApanhaIp("203.0.113.7", "203.0.113.8")).toBe(false);
    expect(alvoApanhaIp("203.0.113.0/24", "203.0.113.200")).toBe(true);
    expect(alvoApanhaIp("203.0.113.0/24", "203.0.114.1")).toBe(false);
    expect(alvoApanhaIp("10.0.0.0/8", "10.255.1.1")).toBe(true);
    expect(alvoApanhaIp("0.0.0.0/0", "8.8.8.8")).toBe(true);
    expect(alvoApanhaIp("RU", "1.2.3.4", "RU")).toBe(true);
    expect(alvoApanhaIp("ru", "1.2.3.4", "RU")).toBe(true);
    expect(alvoApanhaIp("RU", "1.2.3.4", "AO")).toBe(false);
    expect(alvoApanhaIp("RU", "1.2.3.4")).toBe(false);
    expect(alvoApanhaIp("nada", "1.2.3.4")).toBe(false);
  });

  it("ganha a regra mais específica, e num empate a que bloqueia", () => {
    const regras = [regra("a", "bloquear", "203.0.113.0/24"), regra("b", "permitir", "203.0.113.7"), regra("c", "permitir", "203.0.113.0/24")];
    expect(regraQueApanha("203.0.113.7", regras)?.id).toBe("b");
    expect(regraQueApanha("203.0.113.9", regras)?.id).toBe("a");
    expect(ipBloqueado("203.0.113.7", regras)).toBe(false);
    expect(ipBloqueado("203.0.113.9", regras)).toBe(true);
    expect(ipBloqueado("198.51.100.1", regras)).toBe(false);
  });

  it("as regras desativadas não contam", () => {
    expect(ipBloqueado("203.0.113.9", [regra("a", "bloquear", "203.0.113.0/24", false)])).toBe(false);
  });

  it("bloquear grava uma regra nova para o IP, ou muda a que já existe", () => {
    const novo = planoDeAcesso("203.0.113.7", undefined, [], "bloquear", "fw-x", "Muitas tentativas");
    expect(novo).toEqual({ guardar: { id: "fw-x", acao: "bloquear", alvo: "203.0.113.7", nota: "Muitas tentativas", ativa: true }, remover: null });
    const regras = [regra("p", "permitir", "203.0.113.7", false)];
    const muda = planoDeAcesso("203.0.113.7", undefined, regras, "bloquear", "fw-y");
    expect(muda.guardar).toMatchObject({ id: "p", acao: "bloquear", ativa: true });
  });

  it("desbloquear apaga a regra do IP se mais nenhuma o bloqueia", () => {
    const regras = [regra("a", "bloquear", "203.0.113.7")];
    expect(planoDeAcesso("203.0.113.7", undefined, regras, "permitir", "fw-z")).toEqual({ guardar: null, remover: "a" });
  });

  it("desbloquear um IP bloqueado por uma gama grava uma regra que o permite, e a gama fica", () => {
    const regras = [regra("a", "bloquear", "203.0.113.0/24")];
    const plano = planoDeAcesso("203.0.113.7", undefined, regras, "permitir", "fw-z");
    expect(plano.remover).toBeNull();
    expect(plano.guardar).toMatchObject({ id: "fw-z", acao: "permitir", alvo: "203.0.113.7", ativa: true });
    expect(ipBloqueado("203.0.113.7", [...regras, plano.guardar!])).toBe(false);
    expect(ipBloqueado("203.0.113.8", [...regras, plano.guardar!])).toBe(true);
  });

  it("desbloquear um IP que tem regra própria e está também numa gama muda a regra para permitir", () => {
    const regras = [regra("a", "bloquear", "203.0.113.0/24"), regra("b", "bloquear", "203.0.113.7")];
    const plano = planoDeAcesso("203.0.113.7", undefined, regras, "permitir", "fw-z");
    expect(plano).toEqual({ guardar: { id: "b", acao: "permitir", alvo: "203.0.113.7", nota: "", ativa: true }, remover: null });
  });
});
