import { describe, expect, it } from "vitest";
import { codigoTotp, deBase32, destinosDoCodigo, eBase32, erroDoContacto, gerarCodigoDeUso, gerarSegredoTotp, mascararContacto, paraBase32, segredoEmGrupos, urlOtpAuth, verificarTotp } from "./seguranca-conta";

// o segredo da RFC 6238 («12345678901234567890») e os instantes e códigos de 8 dígitos do apêndice B
const SEGREDO_RFC = paraBase32(new TextEncoder().encode("12345678901234567890"));

describe("o código das aplicações autenticadoras (TOTP)", () => {
  it("dá os códigos da RFC 6238", () => {
    expect(SEGREDO_RFC).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(codigoTotp(SEGREDO_RFC, 59_000, 30, 8)).toBe("94287082");
    expect(codigoTotp(SEGREDO_RFC, 1_111_111_109_000, 30, 8)).toBe("07081804");
    expect(codigoTotp(SEGREDO_RFC, 1_234_567_890_000, 30, 8)).toBe("89005924");
    expect(codigoTotp(SEGREDO_RFC, 2_000_000_000_000, 30, 8)).toBe("69279037");
  });
  it("o código de seis dígitos é o fim do de oito", () => {
    expect(codigoTotp(SEGREDO_RFC, 59_000)).toBe("287082");
  });
  it("aceita o passo anterior e o seguinte, e nada mais longe", () => {
    const t = 1_700_000_000_000;
    const c = codigoTotp(SEGREDO_RFC, t);
    expect(verificarTotp(SEGREDO_RFC, c, t)).toBe(true);
    expect(verificarTotp(SEGREDO_RFC, c, t + 30_000)).toBe(true);
    expect(verificarTotp(SEGREDO_RFC, c, t - 30_000)).toBe(true);
    expect(verificarTotp(SEGREDO_RFC, c, t + 95_000)).toBe(false);
    expect(verificarTotp(SEGREDO_RFC, "12345", t)).toBe(false);
    expect(verificarTotp(SEGREDO_RFC, `${c.slice(0, 3)} ${c.slice(3)}`, t)).toBe(true);
  });
  it("as contas antigas da simulação (segredo em texto) continuam a dar um código", () => {
    expect(codigoTotp("seg-administrador", 1_700_000_000_000)).toMatch(/^\d{6}$/);
  });
  it("o base32 vai e volta, e o segredo novo tem 32 letras", () => {
    const b = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 7]);
    expect(deBase32(paraBase32(b))).toEqual(b);
    const s = gerarSegredoTotp();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(eBase32(s)).toBe(true);
    expect(eBase32("seg-administrador")).toBe(false);
    expect(segredoEmGrupos(s).split(" ")).toHaveLength(8);
  });
  it("o endereço para o QR code leva o segredo e o emissor", () => {
    const u = urlOtpAuth("Painel", "ana@empresa.pt", "ABCD EFGH");
    expect(u).toBe("otpauth://totp/Painel%3Aana%40empresa.pt?secret=ABCDEFGH&issuer=Painel&algorithm=SHA1&digits=6&period=30");
  });
});

describe("os códigos de uso único", () => {
  it("têm seis dígitos e não começam por zero", () => {
    for (let i = 0; i < 100; i++) expect(gerarCodigoDeUso()).toMatch(/^[1-9]\d{5}$/);
  });
});

describe("os contactos de recuperação", () => {
  const existentes = [{ id: "a", tipo: "email" as const, valor: "rui@casa.pt", verificado: true }, { id: "b", tipo: "telefone" as const, valor: "+244 923 111 222", verificado: false }];
  it("valida o e-mail e o número, os repetidos e o e-mail da própria conta", () => {
    expect(erroDoContacto("email", "ana@empresa.pt", existentes, "ana@empresa.pt")).toContain("diferente");
    expect(erroDoContacto("email", "RUI@casa.pt", existentes, "ana@empresa.pt")).toContain("já está");
    expect(erroDoContacto("email", "isto", existentes, "ana@empresa.pt")).toContain("não parece");
    expect(erroDoContacto("email", "outro@casa.pt", existentes, "ana@empresa.pt")).toBeNull();
    expect(erroDoContacto("telefone", "92311", existentes, "ana@empresa.pt")).toContain("algarismos");
    expect(erroDoContacto("telefone", "+244 923 111 222", existentes, "ana@empresa.pt")).toContain("já está");
    expect(erroDoContacto("telefone", "+351 912 345 678", existentes, "ana@empresa.pt")).toBeNull();
    expect(erroDoContacto("telefone", "", existentes, "ana@empresa.pt")).toContain("Escreva");
  });
  it("esconde o meio do e-mail e do número", () => {
    expect(mascararContacto("email", "rui.teste@casa.pt")).toBe("r••••••••@casa.pt");
    expect(mascararContacto("telefone", "+244 923 111 222")).toBe("+244 ••• ••• 222");
  });
  it("o código vai para o e-mail da conta e, por omissão, também para os contactos verificados", () => {
    const conta = { email: "ana@empresa.pt", emailRecuperacao: "ana@casa.pt", telefone: "+244 923 000 000", telefoneVerificado: true, recuperacao: existentes };
    const d = destinosDoCodigo(conta);
    expect(d.map((x) => x.valor)).toEqual(["ana@empresa.pt", "ana@casa.pt", "+244 923 000 000", "rui@casa.pt"]);
    expect(d[0].origem).toBe("conta");
    expect(d.slice(1).every((x) => x.origem === "recuperacao")).toBe(true);
  });
  it("sem a opção ligada, o código só vai para o e-mail da conta; sem repetidos", () => {
    expect(destinosDoCodigo({ email: "ana@empresa.pt", emailRecuperacao: "ana@casa.pt", codigosTambemParaRecuperacao: false }).map((x) => x.valor)).toEqual(["ana@empresa.pt"]);
    expect(destinosDoCodigo({ email: "ana@empresa.pt", emailRecuperacao: "ANA@empresa.pt", recuperacao: [{ id: "x", tipo: "email", valor: "ana@empresa.pt", verificado: true }] })).toHaveLength(1);
  });
});
