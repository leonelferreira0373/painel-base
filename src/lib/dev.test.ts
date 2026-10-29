// Testes das funções de developer tools: alvo do firewall, destino das cópias, consulta SQL só de leitura e apagar por dias.
import { describe, expect, it } from "vitest";
import { correrConsulta, emailValido, erroDoAlvo, erroDoDestino, linhasApagadas } from "./dev";

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
