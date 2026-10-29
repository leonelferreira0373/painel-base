// Testes do cliente das APIs: o endereço do servidor (só https), a montagem do URL e o pedido (com um fetch simulado).
import { afterEach, describe, expect, it, vi } from "vitest";
import { chamar, erroDoEndereco, urlDe, type LigacaoApi } from "./cliente";

const ligado: LigacaoApi = { modo: "ligado", base: "https://api.exemplo.pt/", token: "t0k" };

afterEach(() => vi.unstubAllGlobals());

describe("cliente das APIs", () => {
  it("só aceita https (e http em localhost)", () => {
    expect(erroDoEndereco("https://api.exemplo.pt")).toBeNull();
    expect(erroDoEndereco("http://localhost:3000")).toBeNull();
    expect(erroDoEndereco("http://exemplo.pt")).not.toBeNull();
    expect(erroDoEndereco("exemplo")).not.toBeNull();
  });
  it("monta o URL sem barras a mais e troca os parâmetros", () => {
    expect(urlDe("https://api.exemplo.pt/", "/v1/pagamentos")).toBe("https://api.exemplo.pt/v1/pagamentos");
    expect(urlDe("https://api.exemplo.pt", "/v1/pagamentos/{id}", { id: "a b" })).toBe("https://api.exemplo.pt/v1/pagamentos/a%20b");
  });
  it("faz o pedido com o token e devolve o JSON", async () => {
    const pedido = vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", pedido);
    expect(await chamar(ligado, "GET", "/v1/dev/saude")).toEqual({ ok: 1 });
    const [url, opcoes] = pedido.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.exemplo.pt/v1/dev/saude");
    expect((opcoes.headers as Record<string, string>).Authorization).toBe("Bearer t0k");
  });
  it("diz o que correu mal", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    await expect(chamar(ligado, "GET", "/v1/x")).rejects.toThrow("token");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await expect(chamar(ligado, "GET", "/v1/x")).rejects.toThrow("500");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("falhou"))));
    await expect(chamar(ligado, "GET", "/v1/x")).rejects.toThrow("Não foi possível ligar");
    await expect(chamar({ ...ligado, base: "http://exemplo.pt" }, "GET", "/v1/x")).rejects.toThrow("https");
  });
});
