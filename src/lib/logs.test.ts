import { describe, expect, it } from "vitest";
import { contagemPorNivel, filtrarLinhas, horaDaLinha, juntarLinhas, linhaSimulada, linhasParaTexto, nivelDoTexto, type LinhaDeLog } from "./logs";

const l = (id: number, nivel: LinhaDeLog["nivel"], fonte: string, texto: string): LinhaDeLog => ({ id: String(id).padStart(9, "0"), quando: "2026-10-29T14:32:07.412Z", nivel, fonte, texto });

describe("nivelDoTexto", () => {
  it("lê o nível das palavras e do estado HTTP", () => {
    expect(nivelDoTexto("2026-10-29 ERROR connection refused")).toBe("erro");
    expect(nivelDoTexto("Traceback (most recent call last):")).toBe("erro");
    expect(nivelDoTexto('1.2.3.4 - - [29/Oct] "GET /api/x HTTP/1.1" 502 12')).toBe("erro");
    expect(nivelDoTexto("GET /precos 404 12ms Chrome")).toBe("aviso");
    expect(nivelDoTexto("GET /precos 200 12ms Chrome")).toBe("info");
    expect(nivelDoTexto("WARN deprecated option")).toBe("aviso");
    expect(nivelDoTexto("[debug] cache hit")).toBe("debug");
    expect(nivelDoTexto("Servidor a ouvir na porta 3000")).toBe("info");
  });
});

describe("juntar e filtrar", () => {
  it("junta sem repetir, por ordem do id, e guarda só as últimas", () => {
    const a = [l(1, "info", "web", "a"), l(2, "info", "web", "b")];
    expect(juntarLinhas(a, [l(2, "info", "web", "b"), l(3, "erro", "db", "c")]).map((x) => x.id)).toEqual(["000000001", "000000002", "000000003"]);
    expect(juntarLinhas(a, [l(5, "info", "web", "e"), l(4, "info", "web", "d")], 3).map((x) => x.texto)).toEqual(["b", "d", "e"]);
    expect(juntarLinhas(a, [])).toBe(a);
  });
  it("filtra por nível, fonte e texto sem ligar a acentos", () => {
    const t = [l(1, "info", "web", "GET /precos 200"), l(2, "erro", "db", "conexão recusada"), l(3, "aviso", "web", "GET /x 404")];
    expect(filtrarLinhas(t, { niveis: new Set(["erro"]) }).map((x) => x.id)).toEqual(["000000002"]);
    expect(filtrarLinhas(t, { fontes: new Set(["web"]) })).toHaveLength(2);
    expect(filtrarLinhas(t, { texto: "CONEXAO" })).toHaveLength(1);
    expect(filtrarLinhas(t, { niveis: new Set(), fontes: new Set(), texto: " " })).toHaveLength(3);
    expect(contagemPorNivel(t)).toEqual({ debug: 0, info: 1, aviso: 1, erro: 1 });
  });
});

describe("escrever", () => {
  it("a hora tem milissegundos, em UTC ou na do navegador", () => {
    expect(horaDaLinha("2026-10-29T14:32:07.412Z", true)).toBe("14:32:07.412");
    expect(horaDaLinha("2026-10-29T14:32:07.412Z")).toMatch(/^\d\d:\d\d:07\.412$/);
  });
  it("o ficheiro tem uma linha por linha, com a hora, o nível e a fonte", () => {
    expect(linhasParaTexto([l(1, "erro", "db", "caiu")])).toBe("2026-10-29T14:32:07.412Z [ERRO] [db] caiu");
  });
});

describe("as de demonstração", () => {
  const agora = new Date("2026-10-29T14:32:07.000Z");
  it("são sempre as mesmas para o mesmo número e crescem em id", () => {
    expect(linhaSimulada(42, agora)).toEqual(linhaSimulada(42, agora));
    expect(linhaSimulada(7, agora).id < linhaSimulada(8, agora).id).toBe(true);
  });
  it("misturam pedidos, avisos e erros de verdade", () => {
    const linhas = Array.from({ length: 400 }, (_, i) => linhaSimulada(i, agora));
    const c = contagemPorNivel(linhas);
    expect(c.info).toBeGreaterThan(150);
    expect(c.aviso).toBeGreaterThan(10);
    expect(c.erro).toBeGreaterThan(5);
    expect(new Set(linhas.map((x) => x.fonte)).size).toBeGreaterThanOrEqual(3);
    for (const x of linhas.filter((y) => /^(GET|POST|PUT) /.test(y.texto))) expect(nivelDoTexto(x.texto), x.texto).toBe(x.nivel);
  });
});
