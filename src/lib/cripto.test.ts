import { afterEach, describe, expect, it, vi } from "vitest";
import { cifrarConteudo, decifrarConteudo } from "./notas";
import { aleatorios, cifrarAes, decifrarAes, derivarChaveAes, hmacSha1, paraHex, sha256Hex, temWebCrypto } from "./cripto";

const original = globalThis.crypto;
const sem = () => vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => original.getRandomValues(a) });
afterEach(() => vi.unstubAllGlobals());

// o painel aberto por http (uma rede local) não tem Web Crypto: as contas têm de dar os mesmos resultados em JavaScript
describe("criptografia sem Web Crypto (http)", () => {
  it("sabe que não há Web Crypto", () => {
    expect(temWebCrypto()).toBe(true);
    sem();
    expect(temWebCrypto()).toBe(false);
  });
  it("o SHA-256 é igual nos dois caminhos", async () => {
    const com = await sha256Hex("bpt_exemplo");
    sem();
    expect(await sha256Hex("bpt_exemplo")).toBe(com);
    expect(com).toHaveLength(64);
  });
  it("o HMAC-SHA1 dá o vetor de teste da RFC 2202", async () => {
    const chave = new Uint8Array(20).fill(0x0b);
    const esperado = "b617318655057264e28bc0b6fb378c8ef146be00";
    expect(paraHex(await hmacSha1(chave, new TextEncoder().encode("Hi There")))).toBe(esperado);
    sem();
    expect(paraHex(await hmacSha1(chave, new TextEncoder().encode("Hi There")))).toBe(esperado);
  });
  it("o que se cifra sem Web Crypto abre-se com ela, e ao contrário", async () => {
    const sal = aleatorios(16);
    const iv = aleatorios(12);
    const texto = new TextEncoder().encode("uma nota com acentuação: ção");
    sem();
    const chaveJs = await derivarChaveAes("palavra-passe", sal, 1000);
    expect("js" in chaveJs).toBe(true);
    const cifrado = new Uint8Array(await cifrarAes(chaveJs, iv, texto));
    vi.unstubAllGlobals();
    const chaveNavegador = await derivarChaveAes("palavra-passe", sal, 1000);
    expect("js" in chaveNavegador).toBe(false);
    expect(new Uint8Array(await decifrarAes(chaveNavegador, iv, cifrado))).toEqual(texto);
    const doNavegador = new Uint8Array(await cifrarAes(chaveNavegador, iv, texto));
    expect(doNavegador).toEqual(cifrado);
    sem();
    expect(new Uint8Array(await decifrarAes(chaveJs, iv, doNavegador))).toEqual(texto);
    await expect(decifrarAes(chaveJs, iv, doNavegador.slice(1))).rejects.toBeDefined();
  });
  it("uma nota com palavra-passe guarda-se e abre-se por http, e abre-se também por https", async () => {
    const conteudo = { corpo: "<p>Oi</p>", texto: "Oi", anexos: [] };
    sem();
    const { cifra } = await cifrarConteudo(conteudo, "x1y2z3");
    expect((await decifrarConteudo(cifra, "x1y2z3"))?.conteudo).toEqual(conteudo);
    expect(await decifrarConteudo(cifra, "errada")).toBeNull();
    vi.unstubAllGlobals();
    expect((await decifrarConteudo(cifra, "x1y2z3"))?.conteudo).toEqual(conteudo);
  }, 60_000);
});
