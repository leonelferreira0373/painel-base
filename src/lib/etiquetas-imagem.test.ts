import { describe, expect, it } from "vitest";
import { erroDaEtiqueta, especificacoes, pontoDaImagem, etiquetaNova, etiquetasPublicas, ladoDoCartao, LIMITES_ETIQUETA, lerEtiquetas, limitarPercentagem, lugarDaEtiqueta, pontoNaCaixa } from "./etiquetas-imagem";

describe("campos de uma etiqueta", () => {
  it("limita as percentagens e põe a meio o que não é número", () => {
    expect(limitarPercentagem(-4)).toBe(0);
    expect(limitarPercentagem(140)).toBe(100);
    expect(limitarPercentagem(33.3333)).toBe(33.33);
    expect(limitarPercentagem(NaN)).toBe(50);
    expect(etiquetaNova("a", 120, 10.555)).toEqual({ id: "a", x: 100, y: 10.56, titulo: "", texto: "" });
  });
  it("lê as guardadas, corta aos limites e deixa de fora as estragadas e as ligações perigosas", () => {
    const lista = lerEtiquetas(JSON.stringify([{ id: "a", x: 20, y: 30, titulo: "Casaco", texto: "Cor: azul" }, { x: 150, y: -4, titulo: "t".repeat(200), url: "https://loja.pt" }, { x: "a", y: 1 }, { x: 5, y: 5, titulo: "x", url: "javascript:alert(1)" }]));
    expect(lista).toHaveLength(3);
    expect(lista[0]).toEqual({ id: "a", x: 20, y: 30, titulo: "Casaco", texto: "Cor: azul" });
    expect(lista[1]).toMatchObject({ id: "e1", x: 100, y: 0, url: "https://loja.pt" });
    expect(lista[1].titulo).toHaveLength(LIMITES_ETIQUETA.titulo);
    expect(lista[2].url).toBeUndefined();
    expect(lerEtiquetas("não é JSON")).toEqual([]);
    expect(lerEtiquetas({ x: 1 })).toEqual([]);
  });
  it("só as que têm título aparecem a quem lê", () => {
    expect(etiquetasPublicas([etiquetaNova("a", 1, 1), { ...etiquetaNova("b", 2, 2), titulo: "Vista" }]).map((e) => e.id)).toEqual(["b"]);
  });
  it("avisa quando os campos passam os limites", () => {
    expect(erroDaEtiqueta({ titulo: "ok", texto: "ok" })).toBeNull();
    expect(erroDaEtiqueta({ titulo: "x".repeat(81), texto: "" })).toMatch(/título/);
    expect(erroDaEtiqueta({ titulo: "", texto: "x".repeat(281) })).toMatch(/texto/);
  });
});

describe("especificações", () => {
  it("«Nome: valor» vira duas colunas; o resto fica como texto", () => {
    expect(especificacoes("Área: 42 m²\n\nVista: mar\nCheck-in às 14:00\nUma frase muito comprida que tem: dois pontos")).toEqual([
      { nome: "Área", valor: "42 m²" },
      { nome: "Vista", valor: "mar" },
      { nome: null, valor: "Check-in às 14:00" },
      { nome: null, valor: "Uma frase muito comprida que tem: dois pontos" },
    ]);
    expect(especificacoes("   \n ")).toEqual([]);
  });
});

describe("onde fica o ponto", () => {
  it("numa caixa com a proporção da imagem fica onde se marcou", () => {
    expect(pontoNaCaixa({ x: 25, y: 75 }, 1.5, 1.5)).toEqual({ esquerda: 25, topo: 75 });
  });
  it("numa caixa mais larga a imagem corta em cima e em baixo: o ponto sobe ou desce com o corte, e o que fica no corte desaparece", () => {
    // imagem quadrada (1) numa caixa 2:1: vê-se só metade da altura
    expect(pontoNaCaixa({ x: 50, y: 50 }, 1, 2)).toEqual({ esquerda: 50, topo: 50 });
    expect(pontoNaCaixa({ x: 50, y: 0 }, 1, 2)).toBeNull();
    expect(pontoNaCaixa({ x: 10, y: 25 }, 1, 2)?.topo).toBeCloseTo(0, 0);
  });
  it("numa caixa mais estreita corta nos lados", () => {
    expect(pontoNaCaixa({ x: 0, y: 50 }, 2, 1)).toBeNull();
    expect(pontoNaCaixa({ x: 50, y: 50 }, 2, 1)).toEqual({ esquerda: 50, topo: 50 });
  });
  it("rodar e espelhar movem o ponto", () => {
    expect(lugarDaEtiqueta({ x: 20, y: 30 }, { razao: 1 })).toEqual({ esquerda: 20, topo: 30 });
    expect(lugarDaEtiqueta({ x: 20, y: 30 }, { razao: 1, espelhoH: true })).toEqual({ esquerda: 80, topo: 30 });
    expect(lugarDaEtiqueta({ x: 20, y: 30 }, { razao: 1, espelhoV: true })).toEqual({ esquerda: 20, topo: 70 });
    expect(lugarDaEtiqueta({ x: 20, y: 30 }, { razao: 1, rotacao: 180 })).toEqual({ esquerda: 80, topo: 70 });
    expect(lugarDaEtiqueta({ x: 20, y: 30 }, { razao: 1, rotacao: 90 })).toEqual({ esquerda: 70, topo: 20 });
    expect(lugarDaEtiqueta({ x: 20, y: 30 }, { razao: 1, rotacao: 270 })).toEqual({ esquerda: 30, topo: 80 });
  });
  it("com a proporção escolhida segue o corte", () => {
    // imagem quadrada cortada para 2:1
    expect(lugarDaEtiqueta({ x: 50, y: 50 }, { razao: 1, proporcao: "2 / 1" })).toEqual({ esquerda: 50, topo: 50 });
    expect(lugarDaEtiqueta({ x: 50, y: 5 }, { razao: 1, proporcao: "2 / 1" })).toBeNull();
  });
});

describe("para que lado abre o cartão", () => {
  it("por cima, ou por baixo na metade de cima, e encostado às margens", () => {
    expect(ladoDoCartao({ esquerda: 50, topo: 70 })).toEqual({ vertical: "cima", horizontal: "centro" });
    expect(ladoDoCartao({ esquerda: 10, topo: 20 })).toEqual({ vertical: "baixo", horizontal: "esquerda" });
    expect(ladoDoCartao({ esquerda: 90, topo: 60 })).toEqual({ vertical: "cima", horizontal: "direita" });
  });
});

describe("tocar na caixa devolve o ponto da imagem", () => {
  it("é o contrário de onde o ponto fica, com qualquer rotação, espelho e corte", () => {
    const casos = [{ razao: 1.5 }, { razao: 1.5, rotacao: 90 }, { razao: 1.5, rotacao: 180 }, { razao: 1.5, rotacao: 270 }, { razao: 1.5, espelhoH: true }, { razao: 1.5, espelhoV: true, rotacao: 90 }, { razao: 1, proporcao: "4 / 3" }, { razao: 2, proporcao: "1 / 1", espelhoH: true }];
    for (const t of casos) {
      const original = { x: 52, y: 47 };
      const lugar = lugarDaEtiqueta(original, t);
      expect(lugar).not.toBeNull();
      const volta = pontoDaImagem(lugar!, t);
      expect(volta.x).toBeCloseTo(original.x, 0);
      expect(volta.y).toBeCloseTo(original.y, 0);
    }
  });
});
