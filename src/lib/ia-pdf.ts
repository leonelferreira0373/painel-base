// Lê o texto de um PDF para a memória da IA: página a página, com o OCR do painel nas páginas digitalizadas (as primeiras 20). Só corre no navegador.
import { agruparLinhas, type Palavra } from "@/lib/extract/layout";

export interface TextoDoPdf {
  texto: string;
  paginas: number;
  avisos: string[];
}

export async function textoDoPdf(bytes: Uint8Array, progresso: (mensagem: string) => void): Promise<TextoDoPdf> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const partes: string[] = [];
  const semTexto: number[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    progresso(`Página ${n} de ${doc.numPages}`);
    const pagina = await doc.getPage(n);
    const conteudo = await pagina.getTextContent();
    const palavras: Palavra[] = [];
    for (const item of conteudo.items) {
      if (!("str" in item) || item.str.trim() === "") continue;
      palavras.push({ texto: item.str, x: item.transform[4], y: item.transform[5], largura: item.width, altura: item.height || Math.abs(item.transform[3]) });
    }
    if (palavras.length === 0) {
      semTexto.push(n);
      continue;
    }
    partes.push(agruparLinhas(palavras).map((l) => l.texto).join("\n"));
  }
  const avisos: string[] = [];
  if (semTexto.length > 0) {
    const limite = semTexto.slice(0, 20);
    avisos.push(`${semTexto.length} página(s) digitalizadas: ${limite.length < semTexto.length ? "o OCR leu as primeiras 20" : "lidas com OCR"}.`);
    const { ocrCanvas } = await import("@/lib/extract/ocr");
    for (const n of limite) {
      progresso(`OCR: página ${n}`);
      const pagina = await doc.getPage(n);
      const vista = pagina.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(vista.width);
      canvas.height = Math.ceil(vista.height);
      await pagina.render({ canvasContext: canvas.getContext("2d")!, viewport: vista }).promise;
      partes.push((await ocrCanvas(canvas, progresso)).texto);
    }
  }
  return { texto: partes.join("\n\n").trim(), paginas: doc.numPages, avisos };
}
