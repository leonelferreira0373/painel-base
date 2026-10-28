import { describe, expect, it } from "vitest";
import { analisar } from "./perfil";
import { dispersao, porCategoria, serieTemporal } from "./series";
import { detetarOrdemData, lerBooleano, lerData, lerNumero } from "./valores";
import { aTabela, analisarCsv, descodificar, detetarSeparador, temCabecalho } from "@/lib/extract/texto";
import { csvParaTabelas, jsonParaTabelas, ndjsonParaValores } from "@/lib/extract/tabular";
import { agruparLinhas, detetarTabelas } from "@/lib/extract/layout";
import type { Tabela } from "@/lib/tipos";

const ctx = { ficheiroId: "f", origem: "teste.csv" };

describe("números", () => {
  it("lê formatos portugueses e ingleses", () => {
    expect(lerNumero("1.250,50")).toBe(1250.5);
    expect(lerNumero("1,250.50")).toBe(1250.5);
    expect(lerNumero("1 250 000")).toBe(1250000);
    expect(lerNumero("Kz 3.200,00")).toBe(3200);
    expect(lerNumero("(1.000,00)")).toBe(-1000);
    expect(lerNumero("12,5%")).toBe(12.5);
    expect(lerNumero("1.250")).toBe(1250);
    expect(lerNumero("-7")).toBe(-7);
  });
  it("não confunde códigos, telefones e datas com números", () => {
    expect(lerNumero("00123")).toBeNull();
    expect(lerNumero("+244 923 000 104")).toBeNull();
    expect(lerNumero("2024-05-01")).toBeNull();
    expect(lerNumero("12/05/2024")).toBeNull();
    expect(lerNumero("abc")).toBeNull();
    expect(lerNumero("")).toBeNull();
  });
});

describe("datas e booleanos", () => {
  it("lê ISO e dia primeiro", () => {
    expect(lerData("2026-10-28")?.toISOString().slice(0, 10)).toBe("2026-10-28");
    expect(lerData("28/10/2026")?.toISOString().slice(0, 10)).toBe("2026-10-28");
    expect(lerData("28-10-2026 14:30")?.toISOString()).toBe("2026-10-28T14:30:00.000Z");
  });
  it("recusa datas que não existem", () => {
    expect(lerData("31/02/2026")).toBeNull();
    expect(lerData("2026-13-01")).toBeNull();
  });
  it("deteta a ordem mês primeiro quando um valor o obriga", () => {
    expect(detetarOrdemData(["10/28/2026", "11/02/2026"])).toBe("mes");
    expect(detetarOrdemData(["28/10/2026", "02/11/2026"])).toBe("dia");
  });
  it("lê sim e não", () => {
    expect(lerBooleano("Sim")).toBe(true);
    expect(lerBooleano("não")).toBe(false);
    expect(lerBooleano("talvez")).toBeNull();
  });
});

describe("CSV", () => {
  it("deteta o separador e respeita aspas e quebras de linha", () => {
    const texto = 'nome;valor;nota\n"Silva; Ana";10,5;"linha 1\nlinha 2"\nPedro;3;ok\n';
    expect(detetarSeparador(texto)).toBe(";");
    const m = analisarCsv(texto, ";");
    expect(m).toHaveLength(3);
    expect(m[1][0]).toBe("Silva; Ana");
    expect(m[1][2]).toBe("linha 1\nlinha 2");
  });
  it("descodifica Windows-1252 e UTF-8 com BOM", () => {
    expect(descodificar(new Uint8Array([0xef, 0xbb, 0xbf, 0x41])).texto).toBe("A");
    expect(descodificar(new Uint8Array([0x4a, 0x6f, 0xe3, 0x6f])).texto).toBe("João");
  });
  it("reconhece o cabeçalho e cria colunas quando não existe", () => {
    expect(temCabecalho(["nome", "valor"])).toBe(true);
    expect(temCabecalho(["12", "34"])).toBe(false);
    expect(aTabela([["a", "b"], ["1", "2"]]).colunas).toEqual(["a", "b"]);
    expect(aTabela([["1", "2"], ["3", "4"]]).colunas).toEqual(["Coluna 1", "Coluna 2"]);
  });
  it("devolve uma tabela com o formato legível", () => {
    const { tabelas, formato } = csvParaTabelas("a,b\n1,2\n3,4\n", ctx);
    expect(tabelas[0].linhas).toHaveLength(2);
    expect(formato).toContain("CSV");
  });
});

describe("JSON", () => {
  it("achata objetos aninhados e junta listas de valores simples", () => {
    const t = jsonParaTabelas([{ id: 1, cliente: { nome: "Ana", pais: "AO" }, etiquetas: ["a", "b"] }], ctx)[0];
    expect(t.colunas).toEqual(["id", "cliente.nome", "cliente.pais", "etiquetas"]);
    expect(t.linhas[0]).toEqual([1, "Ana", "AO", "a; b"]);
  });
  it("separa listas de registos dentro de um objeto", () => {
    const tabelas = jsonParaTabelas({ empresa: "ACME", pedidos: [{ n: 1 }, { n: 2 }] }, ctx);
    expect(tabelas.map((t) => t.nome)).toEqual(["Propriedades", "pedidos"]);
  });
  it("lê NDJSON", () => {
    expect(ndjsonParaValores('{"a":1}\n{"a":2}\n')).toHaveLength(2);
    expect(ndjsonParaValores("não é json\n{}")).toBeNull();
  });
});

function tabelaDe(colunas: string[], linhas: (string | number | null)[][]): Tabela {
  return { id: "t", ficheiroId: "f", nome: "t", origem: "t", colunas, linhas };
}

describe("perfil", () => {
  const linhas: (string | number | null)[][] = [];
  for (let i = 0; i < 60; i++) {
    linhas.push([`P-${i}`, `2026-10-${String((i % 28) + 1).padStart(2, "0")}`, i % 3 === 0 ? "Lisboa" : i % 3 === 1 ? "lisboa" : "Porto", i === 59 ? 9999 : 100 + i, i % 10 === 0 ? null : "Sim"]);
  }
  linhas.push([...linhas[0]]);
  const p = analisar(tabelaDe(["ref", "data", "cidade", "valor", "confirmado"], linhas));

  it("infere os tipos", () => {
    const tipos = Object.fromEntries(p.colunas.map((c) => [c.nome, c.tipo]));
    expect(tipos).toMatchObject({ ref: "identificador", data: "data", cidade: "categoria", valor: "inteiro", confirmado: "booleano" });
  });
  it("calcula estatísticas corretas", () => {
    const valor = p.colunas.find((c) => c.nome === "valor")!;
    expect(valor.estat!.min).toBe(100);
    expect(valor.estat!.max).toBe(9999);
    expect(valor.histograma!.reduce((s, h) => s + h.n, 0)).toBe(61);
  });
  it("deteta duplicados, atípicos, grafias e valores em falta", () => {
    expect(p.duplicadas).toBe(1);
    const tipos = p.anomalias.map((a) => a.tipo);
    expect(tipos).toContain("Linhas duplicadas");
    expect(tipos).toContain("Valores atípicos");
    expect(tipos).toContain("Grafias inconsistentes");
    expect(tipos).toContain("Valores em falta");
    expect(p.pontuacao).toBeLessThan(100);
  });
  it("encontra correlações fortes", () => {
    const l = Array.from({ length: 30 }, (_, i) => [i, i * 2 + 1, (i * 7) % 5]);
    const q = analisar(tabelaDe(["x", "y", "z"], l));
    expect(q.correlacoes[0]).toMatchObject({ a: "x", b: "y" });
    expect(q.correlacoes[0].r).toBeCloseTo(1, 5);
  });
});

describe("séries", () => {
  const t = tabelaDe(["data", "valor", "cidade"], [
    ["2026-10-01", 10, "A"],
    ["2026-10-01", 20, "B"],
    ["2026-10-03", 5, "A"],
  ]);
  it("agrega por dia e preenche os dias sem dados", () => {
    const s = serieTemporal(t, 0, 1, "soma", "dia");
    expect(s.map((x) => x.valor)).toEqual([30, 0, 5]);
  });
  it("agrega por categoria", () => {
    const c = porCategoria(t, 2, 1, "soma");
    expect(c.map((x) => [x.rotulo, x.valor])).toEqual([["B", 20], ["A", 15]]);
  });
  it("devolve pares para dispersão", () => {
    expect(dispersao(t, 1, 1)).toHaveLength(3);
  });
});

describe("layout de PDF", () => {
  it("reconstrói uma tabela a partir de texto posicionado", () => {
    const palavras = [
      ...["Nome", "Valor", "Data"].map((texto, i) => ({ texto, x: 50 + i * 120, y: 700, largura: 30, altura: 10 })),
      ...["Ana", "10", "2026-10-01"].map((texto, i) => ({ texto, x: 50 + i * 120, y: 680, largura: 30, altura: 10 })),
      ...["Rui", "20", "2026-10-02"].map((texto, i) => ({ texto, x: 50 + i * 120, y: 660, largura: 30, altura: 10 })),
    ];
    const { tabelas } = detetarTabelas(agruparLinhas(palavras));
    expect(tabelas).toHaveLength(1);
    expect(tabelas[0].colunas).toEqual(["Nome", "Valor", "Data"]);
    expect(tabelas[0].linhas[1]).toEqual(["Rui", "20", "2026-10-02"]);
  });
});
