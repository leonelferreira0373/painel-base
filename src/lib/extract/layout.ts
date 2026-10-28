// Reconstrução de tabelas a partir de texto posicionado (PDF e OCR): linhas, células por intervalos de espaço e blocos de linhas alinhadas.
import type { Celula } from "@/lib/tipos";

export interface Palavra {
  texto: string;
  x: number;
  largura: number;
  y: number;
  altura: number;
  confianca?: number;
}

export interface LinhaPosicionada {
  y: number;
  celulas: string[];
  xs: number[];
  texto: string;
  confianca?: number;
}

/** Junta palavras na mesma linha (tolerância vertical) e parte a linha em células onde há um intervalo largo. */
export function agruparLinhas(palavras: Palavra[], fatorIntervalo = 1.6): LinhaPosicionada[] {
  const validas = palavras.filter((p) => p.texto.trim() !== "");
  validas.sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: Palavra[][] = [];
  for (const p of validas) {
    const ultima = linhas[linhas.length - 1];
    const tolerancia = Math.max(2.5, p.altura * 0.5);
    if (ultima && Math.abs(ultima[0].y - p.y) <= tolerancia) ultima.push(p);
    else linhas.push([p]);
  }
  return linhas.map((grupo) => {
    grupo.sort((a, b) => a.x - b.x);
    const celulas: string[] = [];
    const xs: number[] = [];
    let atual = "";
    let xAtual = grupo[0].x;
    let fim = grupo[0].x;
    grupo.forEach((p, i) => {
      const folga = p.x - fim;
      const limiar = Math.max(6, p.altura * fatorIntervalo);
      if (i > 0 && folga > limiar) {
        celulas.push(atual.trim());
        xs.push(xAtual);
        atual = "";
        xAtual = p.x;
      }
      atual += (atual === "" || folga <= 0.5 ? "" : " ") + p.texto;
      fim = p.x + p.largura;
    });
    celulas.push(atual.trim());
    xs.push(xAtual);
    const confs = grupo.map((p) => p.confianca).filter((c): c is number => typeof c === "number");
    return {
      y: grupo[0].y,
      celulas,
      xs,
      texto: celulas.join(" "),
      confianca: confs.length ? confs.reduce((s, c) => s + c, 0) / confs.length : undefined,
    };
  });
}

export interface BlocoTabela {
  colunas: string[];
  linhas: Celula[][];
  de: number;
  ate: number;
  confianca?: number;
}

/** Blocos de pelo menos três linhas consecutivas com duas ou mais células e colunas alinhadas formam uma tabela. */
export function detetarTabelas(linhas: LinhaPosicionada[]): { tabelas: BlocoTabela[]; livres: string[] } {
  const tabelas: BlocoTabela[] = [];
  const usadas = new Set<number>();
  let i = 0;
  while (i < linhas.length) {
    if (linhas[i].celulas.length < 2) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < linhas.length && linhas[j].celulas.length >= 2 && Math.abs(linhas[j].celulas.length - linhas[i].celulas.length) <= 1) j++;
    if (j - i >= 3) {
      const cabecalho = linhas[i];
      const colunas = cabecalho.celulas.slice();
      const linhasTabela: Celula[][] = [];
      for (let k = i + 1; k < j; k++) {
        const linha: Celula[] = colunas.map(() => null);
        linhas[k].celulas.forEach((celula, idx) => {
          const x = linhas[k].xs[idx];
          let alvo = 0;
          let melhor = Infinity;
          cabecalho.xs.forEach((cx, c) => {
            const distancia = Math.abs(cx - x);
            if (distancia < melhor) {
              melhor = distancia;
              alvo = c;
            }
          });
          linha[alvo] = linha[alvo] ? `${linha[alvo]} ${celula}` : celula;
        });
        linhasTabela.push(linha);
      }
      const confs = linhas.slice(i, j).map((l) => l.confianca).filter((c): c is number => typeof c === "number");
      tabelas.push({ colunas, linhas: linhasTabela, de: i, ate: j - 1, confianca: confs.length ? confs.reduce((s, c) => s + c, 0) / confs.length : undefined });
      for (let k = i; k < j; k++) usadas.add(k);
      i = j;
    } else i++;
  }
  return { tabelas, livres: linhas.filter((_, idx) => !usadas.has(idx)).map((l) => l.texto) };
}
