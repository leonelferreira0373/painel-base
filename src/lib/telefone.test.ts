import { describe, expect, it } from "vitest";
import { erroDoTelefone, escreverTelefone, exemploDeTelefone, formatarCorpoDoTelefone, indicativoDe, lerTelefone, limparCorpoDoTelefone, PAISES, paisPorFuso, paisPorIso, pesquisarPaises, reconhecerPais, telefoneDe } from "./telefone";

const AO = paisPorIso("AO")!;
const PT = paisPorIso("PT")!;

describe("a lista de países", () => {
  it("tem códigos únicos, indicativos só com dígitos e comprimentos que cabem nos 15 dígitos do número internacional", () => {
    expect(new Set(PAISES.map((p) => p.iso)).size).toBe(PAISES.length);
    expect(PAISES.length).toBeGreaterThan(200);
    for (const p of PAISES) {
      expect(p.dial, p.iso).toMatch(/^\d{1,4}$/);
      expect(p.min, p.iso).toBeLessThanOrEqual(p.max);
      expect(p.dial.length + p.max, p.iso).toBeLessThanOrEqual(15);
      expect(p.grupos.every((g) => g > 0), p.iso).toBe(true);
    }
  });
  it("os mais usados vêm primeiro e a pesquisa serve por nome, código e indicativo", () => {
    expect(pesquisarPaises("").slice(0, 3).map((p) => p.iso)).toEqual(["AO", "PT", "BR"]);
    expect(pesquisarPaises("mocambique").map((p) => p.iso)).toContain("MZ");
    expect(pesquisarPaises("pt")[0].iso).toBe("PT");
    expect(pesquisarPaises("+351").map((p) => p.iso)).toContain("PT");
    expect(pesquisarPaises("244").map((p) => p.iso)).toEqual(["AO"]);
    expect(pesquisarPaises("zzzz")).toEqual([]);
  });
  it("o país vem do fuso da conta", () => {
    expect(paisPorFuso("Africa/Luanda").iso).toBe("AO");
    expect(paisPorFuso("Europe/Lisbon").iso).toBe("PT");
    expect(paisPorFuso("Africa/Maputo").iso).toBe("MZ");
    expect(paisPorFuso("UTC").iso).toBe("AO");
  });
});

describe("reconhecer o indicativo", () => {
  it("com «+» ou «00» à frente o país reconhece-se sozinho", () => {
    expect(reconhecerPais("+244 923 000 000")).toMatchObject({ pais: AO, resto: "923000000" });
    expect(reconhecerPais("00351912345678")).toMatchObject({ pais: PT, resto: "912345678" });
    expect(reconhecerPais("+55 11 91234-5678")?.pais.iso).toBe("BR");
    expect(reconhecerPais("923000000")).toBeNull();
    expect(reconhecerPais("+")).toBeNull();
  });
  it("escolhe o indicativo mais longo: +1242 são as Baamas e +1 os Estados Unidos", () => {
    expect(reconhecerPais("+1 242 555 0100")?.pais.iso).toBe("BS");
    expect(reconhecerPais("+1 212 555 0100")?.pais.iso).toBe("US");
    expect(reconhecerPais("+7 912 345 67 89")?.pais.iso).toBe("RU");
  });
  it("escrever muda o país quando se cola um número internacional e mantém-no quando não", () => {
    expect(escreverTelefone("+351912345678", AO)).toEqual({ pais: PT, corpo: "912345678" });
    expect(escreverTelefone("923 000 000", PT)).toEqual({ pais: PT, corpo: "923000000" });
    expect(escreverTelefone("923abc000000", AO)).toEqual({ pais: AO, corpo: "923000000" });
  });
  it("o número colado com o indicativo do país escolhido, sem o «+», perde o indicativo", () => {
    expect(escreverTelefone("244923000000", AO)).toEqual({ pais: AO, corpo: "923000000" });
    expect(escreverTelefone("244923", AO)).toEqual({ pais: AO, corpo: "244923" });
  });
  it("o zero do tronco sai nos países que o usam e o número nunca passa do máximo", () => {
    const FR = paisPorIso("FR")!;
    expect(limparCorpoDoTelefone("06 12 34 56 78", FR)).toBe("612345678");
    expect(limparCorpoDoTelefone("0923000000", AO)).toBe("0923000000".slice(0, 9));
    expect(limparCorpoDoTelefone("9230000001234", AO)).toHaveLength(9);
  });
});

describe("escrever e ler", () => {
  it("escreve em grupos e com o indicativo", () => {
    expect(formatarCorpoDoTelefone("923000000", AO)).toBe("923 000 000");
    expect(formatarCorpoDoTelefone("92300", AO)).toBe("923 00");
    expect(formatarCorpoDoTelefone("11912345678", paisPorIso("BR")!)).toBe("11 91234 5678");
    expect(telefoneDe(AO, "923000000")).toBe("+244 923 000 000");
    expect(telefoneDe(AO, "")).toBe("");
    expect(indicativoDe(paisPorIso("BS")!)).toBe("+1 242");
    expect(telefoneDe(paisPorIso("BS")!, "5550100")).toBe("+1 242 555 0100");
  });
  it("lê o que está guardado e volta a escrever o mesmo", () => {
    for (const g of ["+244 923 000 000", "+351 912 345 678", "+1 242 555 0100", "+55 11 91234 5678"]) {
      const { pais, corpo } = lerTelefone(g, AO);
      expect(telefoneDe(pais, corpo)).toBe(g);
    }
    expect(lerTelefone("945321186", AO)).toEqual({ pais: AO, corpo: "945321186" });
  });
  it("tem um exemplo para cada país", () => {
    expect(exemploDeTelefone(AO)).toBe("923 000 000");
    expect(exemploDeTelefone(paisPorIso("FJ")!)).toBe("123 4567");
  });
});

describe("validar", () => {
  it("diz quantos dígitos faltam e deixa o campo vazio em paz", () => {
    expect(erroDoTelefone(AO, "")).toBeNull();
    expect(erroDoTelefone(AO, "9230")).toBe("Faltam 5 dígitos.");
    expect(erroDoTelefone(AO, "92300000")).toBe("Falta 1 dígito.".replace("Falta", "Faltam"));
    expect(erroDoTelefone(AO, "923000000")).toBeNull();
    expect(erroDoTelefone(paisPorIso("BR")!, "1191234")).toBe("Faltam pelo menos 3 dígitos.");
    expect(erroDoTelefone(paisPorIso("BR")!, "1191234567")).toBeNull();
  });
});
