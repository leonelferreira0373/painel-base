import { describe, expect, it } from "vitest";
import { linhasParaImportar, mapearColunas, pareceBind } from "./importar";

const colunas = [{ chave: "passageiro", rotulo: "Passageiro" }, { chave: "data", rotulo: "Data da viagem" }, { chave: "destino", rotulo: "Destino" }];

describe("mapearColunas", () => {
  it("casa pelo nome ou pelo rótulo, sem acentos nem maiúsculas", () => {
    expect(mapearColunas(["PASSAGEIRO", "data da viagem", "Observações", "destino"], colunas)).toEqual(["passageiro", "data", null, "destino"]);
  });
  it("cada coluna do módulo só casa uma vez", () => {
    expect(mapearColunas(["Destino", "destino"], colunas)).toEqual(["destino", null]);
  });
});

describe("linhasParaImportar", () => {
  const t = { colunas: ["Passageiro", "Data da viagem", "Cor"], linhas: [["Ana", "2026-10-30", "azul"], ["", null, "verde"], ["Rui", 12, ""]] };
  it("traz só o que casa e ignora as linhas sem nada reconhecido", () => {
    const r = linhasParaImportar(t, colunas);
    expect(r.linhas).toEqual([{ passageiro: "Ana", data: "2026-10-30" }, { passageiro: "Rui", data: "12" }]);
    expect(r.reconhecidas).toBe(2);
    expect(r.ignoradas).toEqual(["Cor"]);
  });
});

describe("pareceBind", () => {
  it("reconhece uma zona", () => {
    expect(pareceBind("$ORIGIN exemplo.com.\n@ IN A 1.2.3.4")).toBe(true);
    expect(pareceBind("www 300 IN CNAME exemplo.com.")).toBe(true);
    expect(pareceBind("nome;valor\nAna;10")).toBe(false);
  });
});
