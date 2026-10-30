import { describe, expect, it } from "vitest";
import { ampliar, arrastar, ENQUADRAMENTO_INICIAL, eInicial, estiloDoEnquadramento, janelaVisivel, lerEnquadramento, ZOOM_MAXIMO, type Medidas } from "./enquadramento";

// uma fotografia larga (3:1) numa moldura 1:1: só se vê um terço da largura
const larga: Medidas = { moldura: { largura: 100, altura: 100 }, imagem: { largura: 300, altura: 100 } };
const igual: Medidas = { moldura: { largura: 200, altura: 100 }, imagem: { largura: 400, altura: 200 } };

/** Onde fica, na moldura (0 a 1), o ponto `u` da imagem: a conta que o CSS faz com «object-position» e «scale». */
const ondeFica = (e: { zoom: number; x: number; y: number }, u: number, w: number, eixo: "x" | "y") => {
  const p = e[eixo];
  const f1 = (u - p * (1 - w)) / w;
  return p + e.zoom * (f1 - p);
};

describe("enquadramento", () => {
  it("lê valores estragados como o enquadramento inicial e limita os extremos", () => {
    expect(lerEnquadramento(undefined)).toEqual(ENQUADRAMENTO_INICIAL);
    expect(lerEnquadramento({ zoom: "muito", x: NaN, y: null })).toEqual(ENQUADRAMENTO_INICIAL);
    expect(lerEnquadramento({ zoom: 99, x: -3, y: 7 })).toEqual({ zoom: ZOOM_MAXIMO, x: 0, y: 1 });
    expect(eInicial(undefined)).toBe(true);
    expect(eInicial({ zoom: 1.5, x: 0.5, y: 0.5 })).toBe(false);
  });
  it("sem zoom a imagem só enche a moldura; com zoom cresce a partir do mesmo ponto", () => {
    expect(estiloDoEnquadramento(undefined)).toEqual({ objectFit: "cover", objectPosition: "50% 50%" });
    expect(estiloDoEnquadramento({ zoom: 2, x: 0.25, y: 1 })).toEqual({ objectFit: "cover", objectPosition: "25% 100%", transform: "scale(2)", transformOrigin: "25% 100%" });
  });
  it("calcula o que se vê de uma fotografia numa moldura de outra proporção", () => {
    expect(janelaVisivel(larga)).toEqual({ x: 1 / 3, y: 1 });
    expect(janelaVisivel(igual)).toEqual({ x: 1, y: 1 });
  });
  it("arrastar: o conteúdo acompanha o dedo um para um e nunca passa das bordas", () => {
    const e0 = { zoom: 1, x: 0.5, y: 0.5 };
    const e1 = arrastar(e0, -0.1, 0, larga); // dedo para a esquerda: vê-se mais da direita
    expect(e1.x).toBeGreaterThan(0.5);
    // onde fica um ponto da imagem mexeu exatamente o que o dedo mexeu
    const w = janelaVisivel(larga).x;
    expect(ondeFica(e1, 0.5, w, "x") - ondeFica(e0, 0.5, w, "x")).toBeCloseTo(-0.1, 6);
    expect(arrastar(e0, -5, 0, larga).x).toBe(1);
    expect(arrastar(e0, 5, 0, larga).x).toBe(0);
    // sem sobra e sem zoom não há nada para arrastar
    expect(arrastar(e0, 0.3, 0.3, igual)).toEqual(e0);
  });
  it("com zoom também se arrasta nos dois eixos", () => {
    const e = arrastar({ zoom: 2, x: 0.5, y: 0.5 }, 0.1, -0.1, igual);
    expect(e.x).toBeLessThan(0.5);
    expect(e.y).toBeGreaterThan(0.5);
  });
  it("ampliar: o ponto debaixo dos dedos fica no mesmo sítio", () => {
    const e0 = { zoom: 1.5, x: 0.3, y: 0.6 };
    const centro = { x: 0.7, y: 0.4 };
    const w = janelaVisivel(larga);
    const e1 = ampliar(e0, 3, centro, larga);
    expect(e1.zoom).toBe(3);
    // o ponto da imagem que estava em `centro` com e0 continua em `centro` com e1
    const u = ((centro.x - e0.x * (1 - e0.zoom / w.x)) * w.x) / e0.zoom;
    expect(ondeFica(e1, u, w.x, "x")).toBeCloseTo(centro.x, 6);
    expect(ampliar(e0, 99, centro, larga).zoom).toBe(ZOOM_MAXIMO);
    expect(ampliar(e0, 0.2, centro, larga).zoom).toBe(1);
  });
  it("voltar ao zoom 1 numa moldura sem sobra deixa o enquadramento no sítio", () => {
    const e = ampliar({ zoom: 2, x: 0.3, y: 0.3 }, 1, { x: 0.5, y: 0.5 }, igual);
    expect(e.zoom).toBe(1);
  });
});
