// Testes do contrato das APIs: identificadores únicos, caminhos no formato certo, o comando curl e o documento OpenAPI.
import { describe, expect, it } from "vitest";
import { comoCurl, ENDPOINTS, endpointPorId, paraOpenApi } from "./contrato";

describe("contrato das APIs", () => {
  it("os identificadores são únicos e os caminhos começam por /v1/", () => {
    expect(new Set(ENDPOINTS.map((e) => e.id)).size).toBe(ENDPOINTS.length);
    for (const e of ENDPOINTS) expect(e.caminho.startsWith("/v1/")).toBe(true);
  });
  it("cada área tem endpoints e cada um tem descrição e exemplo", () => {
    for (const a of ["pagamentos", "marketing", "dev"]) expect(ENDPOINTS.some((e) => e.area === a)).toBe(true);
    for (const e of ENDPOINTS) {
      expect(e.descricao.length).toBeGreaterThan(10);
      expect(e.exemplo).toBeDefined();
    }
  });
  it("faz o comando curl com o token e o corpo", () => {
    const c = comoCurl(endpointPorId("pagamentos-criar")!, "https://api.exemplo.pt/", "abc");
    expect(c).toContain("curl -X POST 'https://api.exemplo.pt/v1/pagamentos'");
    expect(c).toContain("Authorization: Bearer abc");
    expect(c).toContain("-d '");
    expect(comoCurl(endpointPorId("saude")!, "https://x.pt", "")).toContain("<token>");
  });
  it("faz o documento OpenAPI com todas as operações", () => {
    const doc = paraOpenApi("Teste") as { openapi: string; paths: Record<string, Record<string, unknown>> };
    expect(doc.openapi).toBe("3.1.0");
    const operacoes = Object.values(doc.paths).reduce((s, p) => s + Object.keys(p).length, 0);
    expect(operacoes).toBe(ENDPOINTS.length);
  });
});
