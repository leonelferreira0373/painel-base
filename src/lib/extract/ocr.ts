// Reconhecimento ótico de caracteres (OCR) no navegador, com o motor e os idiomas servidos pelo próprio domínio (public/vendor).
import { agruparLinhas, detetarTabelas, type Palavra } from "./layout";

export interface ResultadoOcr {
  texto: string;
  confianca: number;
  tabelas: { colunas: string[]; linhas: (string | number | boolean | null)[][]; confianca?: number }[];
}

type Trabalhador = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;
let trabalhador: Promise<Trabalhador> | null = null;
let progressoAtual: (m: string) => void = () => {};

async function obter(): Promise<Trabalhador> {
  if (!trabalhador) {
    trabalhador = import("tesseract.js").then(({ createWorker }) =>
      createWorker(["por", "eng"], 1, {
        workerPath: "/vendor/tesseract-worker.min.js",
        corePath: "/vendor",
        langPath: "/vendor",
        gzip: true,
        logger: (m: { status: string; progress: number }) => progressoAtual(`OCR: ${m.status} ${Math.round(m.progress * 100)} %`),
      }),
    );
  }
  return trabalhador;
}

export async function ocrImagem(fonte: Blob | HTMLCanvasElement, progresso: (m: string) => void): Promise<ResultadoOcr> {
  progressoAtual = progresso;
  const w = await obter();
  const { data } = await w.recognize(fonte, {}, { blocks: true });
  const palavras: Palavra[] = [];
  for (const bloco of data.blocks ?? []) {
    for (const par of bloco.paragraphs) {
      for (const linha of par.lines) {
        for (const p of linha.words) {
          palavras.push({ texto: p.text, x: p.bbox.x0, largura: p.bbox.x1 - p.bbox.x0, y: -p.bbox.y0, altura: p.bbox.y1 - p.bbox.y0, confianca: p.confidence / 100 });
        }
      }
    }
  }
  const linhas = agruparLinhas(palavras, 2.2);
  const { tabelas } = detetarTabelas(linhas);
  return { texto: data.text.trim(), confianca: data.confidence / 100, tabelas };
}

export const ocrCanvas = ocrImagem;
