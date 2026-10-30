// Como uma fotografia se mostra dentro da sua moldura: o zoom e o ponto que se vê (como o «object-position» do CSS). A imagem enche sempre a moldura («cover») e o zoom cresce a partir do mesmo ponto, por isso nunca aparece fundo vazio, em nenhuma proporção. Funções puras, partilhadas pelo visualizador, pelo bloco de imagem e pelas listas.
import type { CSSProperties } from "react";

export interface Enquadramento {
  /** 1 = a imagem a encher a moldura; até `ZOOM_MAXIMO`. */
  zoom: number;
  /** O ponto da imagem que fica fixo na moldura, de 0 (esquerda) a 1 (direita). */
  x: number;
  /** De 0 (topo) a 1 (fundo). */
  y: number;
}

export const ENQUADRAMENTO_INICIAL: Enquadramento = { zoom: 1, x: 0.5, y: 0.5 };
export const ZOOM_MAXIMO = 5;

/** O tamanho da moldura e o da imagem (só a proporção conta). */
export interface Medidas {
  moldura: { largura: number; altura: number };
  imagem: { largura: number; altura: number };
}

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const numero = (v: unknown, padrao: number) => (typeof v === "number" && Number.isFinite(v) ? v : padrao);

/** Um enquadramento lido de onde for (um valor estragado volta ao inicial). */
export function lerEnquadramento(v: unknown): Enquadramento {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Enquadramento>;
  return { zoom: entre(numero(o.zoom, 1), 1, ZOOM_MAXIMO), x: entre(numero(o.x, 0.5), 0, 1), y: entre(numero(o.y, 0.5), 0, 1) };
}

export const eInicial = (e: Enquadramento | undefined): boolean => !e || (e.zoom === 1 && e.x === 0.5 && e.y === 0.5);

const percentagem = (v: number) => `${Math.round(v * 10000) / 100}%`;

/** O estilo da imagem dentro da moldura (a moldura corta o que sobra). Sem enquadramento, a imagem só enche a moldura. */
export function estiloDoEnquadramento(e: Enquadramento | undefined): CSSProperties {
  const v = lerEnquadramento(e);
  const ponto = `${percentagem(v.x)} ${percentagem(v.y)}`;
  return { objectFit: "cover", objectPosition: ponto, ...(v.zoom > 1 ? { transform: `scale(${v.zoom})`, transformOrigin: ponto } : {}) };
}

/** Quanto da imagem se vê em cada eixo com zoom 1 (1 = vê-se toda a largura ou altura; menos = sobra e corta-se). */
export function janelaVisivel(m: Medidas): { x: number; y: number } {
  const moldura = m.moldura.largura / m.moldura.altura;
  const imagem = m.imagem.largura / m.imagem.altura;
  if (!Number.isFinite(moldura) || !Number.isFinite(imagem) || moldura <= 0 || imagem <= 0) return { x: 1, y: 1 };
  return { x: Math.min(1, moldura / imagem), y: Math.min(1, imagem / moldura) };
}

/** Arrasta a imagem: `dx` e `dy` são o que o dedo andou, em frações da moldura (o conteúdo acompanha o dedo, um para um). */
export function arrastar(e: Enquadramento, dx: number, dy: number, m: Medidas): Enquadramento {
  const w = janelaVisivel(m);
  const eixo = (p: number, d: number, largura: number) => (e.zoom - largura < 1e-9 ? p : entre(p - (d * largura) / (e.zoom - largura), 0, 1));
  return { ...e, x: eixo(e.x, dx, w.x), y: eixo(e.y, dy, w.y) };
}

/** Muda o zoom mantendo debaixo do ponto `centro` (em frações da moldura) a mesma parte da imagem. */
export function ampliar(e: Enquadramento, zoom: number, centro: { x: number; y: number }, m: Medidas): Enquadramento {
  const novo = entre(zoom, 1, ZOOM_MAXIMO);
  const w = janelaVisivel(m);
  const eixo = (p: number, c: number, largura: number) => {
    const ponto = ((c - p * (1 - e.zoom / largura)) * largura) / e.zoom;
    const d = 1 - novo / largura;
    return Math.abs(d) < 1e-9 ? p : entre((c - (novo * ponto) / largura) / d, 0, 1);
  };
  return { zoom: novo, x: eixo(e.x, centro.x, w.x), y: eixo(e.y, centro.y, w.y) };
}
