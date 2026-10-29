// Testes da exportação de dados: o CSV (com aspas, ponto e vírgula e BOM) e o JSON (lista de objetos).
import { describe, expect, it } from "vitest";
import { paraCsv, paraJson, type DadosExportaveis } from "./exportar-dados";

const dados: DadosExportaveis = { nome: "paises", titulo: "Países", colunas: ["País", "Pedidos"], linhas: [["Angola", 52], ['Côte "d\'Ivoire"', 3]] };

describe("exportar dados", () => {
  it("o CSV tem BOM, ponto e vírgula e aspas duplicadas", () => {
    const csv = paraCsv(dados);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.split("\n")[0]).toBe('﻿"País";"Pedidos"');
    expect(csv.split("\n")[2]).toBe('"Côte ""d\'Ivoire""";"3"');
  });
  it("o JSON é uma lista de objetos com o nome das colunas", () => {
    expect(JSON.parse(paraJson(dados))).toEqual([
      { País: "Angola", Pedidos: 52 },
      { País: 'Côte "d\'Ivoire"', Pedidos: 3 },
    ]);
  });
});
