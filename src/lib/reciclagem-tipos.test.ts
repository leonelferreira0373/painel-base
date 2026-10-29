import { describe, expect, it } from "vitest";
import { diasRestantes, diasValidos, expirados, expiraEm, novoItemApagado, rotuloDe, textoDoPrazo, tipoDaColecao, tipoDoArmazem } from "./reciclagem-tipos";

const agora = new Date("2026-10-29T12:00:00.000Z");
const item = (apagadoEm: string) => ({ apagadoEm });

describe("os prazos", () => {
  it("o item apaga-se de vez passados os dias definidos", () => {
    expect(expiraEm(item("2026-10-01T12:00:00.000Z"), 90).toISOString()).toBe("2026-12-30T12:00:00.000Z");
    expect(diasRestantes(item("2026-10-29T12:00:00.000Z"), 90, agora)).toBe(90);
    expect(diasRestantes(item("2026-07-15T12:00:00.000Z"), 90, agora)).toBe(0);
    expect(diasRestantes(item("2026-10-28T13:00:00.000Z"), 1, agora)).toBe(1);
  });
  it("encurtar o prazo faz expirar já os mais antigos", () => {
    const lista = [item("2026-10-29T10:00:00.000Z"), item("2026-10-20T12:00:00.000Z"), item("2026-07-15T12:00:00.000Z")];
    expect(expirados(lista, 90, agora)).toEqual([lista[2]]);
    expect(expirados(lista, 7, agora)).toEqual([lista[1], lista[2]]);
    expect(expirados(lista, 365, agora)).toEqual([]);
  });
  it("só se aceitam prazos inteiros entre 1 e 3650 dias", () => {
    expect([90, 1, 3650].every(diasValidos)).toBe(true);
    expect([0, -5, 3651, 1.5, NaN, "90", null].some(diasValidos)).toBe(false);
  });
  it("escreve-se em palavras", () => {
    expect(textoDoPrazo(0)).toBe("Acaba hoje");
    expect(textoDoPrazo(1)).toBe("Falta 1 dia");
    expect(textoDoPrazo(12)).toBe("Faltam 12 dias");
  });
});

describe("os nomes", () => {
  it("o nome de um item vem do campo que costuma ter nome", () => {
    expect(rotuloDe({ id: "x", nome: " Rede ", valor: 1 })).toBe("Rede");
    expect(rotuloDe({ id: "x", pergunta: "Qual é o horário?" })).toBe("Qual é o horário?");
    expect(rotuloDe({ id: "dns-1", tipo: "A", nome: "", valor: "1.2.3.4" })).toBe("A @");
    expect(rotuloDe({ id: "dns-2", tipo: "MX", nome: "www", valor: "x" })).toBe("MX www");
    expect(rotuloDe({ id: "abc" })).toBe("abc");
    expect(rotuloDe(null)).toBe("Sem nome");
  });
  it("as coleções e os armazéns têm nome em palavras", () => {
    expect(tipoDaColecao("firewall-regras")).toBe("Regra do firewall");
    expect(tipoDaColecao("minha-coisa")).toBe("minha coisa");
    expect(tipoDoArmazem("ficheiros", { tipo: "pasta" })).toBe("Pasta");
    expect(tipoDoArmazem("ficheiros", { tipo: "image/png" })).toBe("Ficheiro");
    expect(tipoDoArmazem("artigos", {})).toBe("Artigo do blog");
  });
  it("um item apagado leva a hora, quem apagou e a página", () => {
    const i = novoItemApagado({ tipo: "Pergunta da FAQ", dados: { id: "f1", pergunta: "Olá?" }, origem: { kind: "faq" }, por: "Ana", pagina: "/conteudo/faq/", agora });
    expect(i).toMatchObject({ rotulo: "Olá?", apagadoEm: "2026-10-29T12:00:00.000Z", apagadoPor: "Ana", pagina: "/conteudo/faq/" });
    expect(i.id.length).toBeGreaterThan(6);
  });
});
