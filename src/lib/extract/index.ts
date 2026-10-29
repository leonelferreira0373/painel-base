// Ponto de entrada da extração: reconhece o formato pelo conteúdo e pelo nome e devolve tabelas e texto, com os ficheiros interiores (ZIP, anexos) extraídos a seguir.
import type { Extraido, Tabela } from "@/lib/tipos";
import { docxParaTabelas, emlParaResultado, folhasParaTabelas, nomesDoZip, odtParaTexto, pdfParaTabelas, zipParaFilhos, type Resultado } from "./binarios";
import { csvParaTabelas, htmlParaTabelas, jsonParaTabelas, ndjsonParaValores, novoId, xmlParaTabelas, type Contexto } from "./tabular";
import { descodificar, textoImprimivel } from "./texto";

export interface Opcoes {
  progresso?: (mensagem: string) => void;
}

export type Formato = "pdf" | "xlsx" | "xls" | "ods" | "docx" | "odt" | "pptx" | "zip" | "imagem" | "eml" | "json" | "ndjson" | "xml" | "html" | "texto" | "binario" | "doc-antigo";

const MAXIMO_PROFUNDIDADE = 3;

function extensao(nome: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(nome);
  return m ? m[1].toLowerCase() : "";
}

function comecaCom(bytes: Uint8Array, ...assinatura: number[]): boolean {
  return assinatura.every((b, i) => bytes[i] === b);
}

export async function detetarFormato(nome: string, bytes: Uint8Array): Promise<Formato> {
  const ext = extensao(nome);
  if (comecaCom(bytes, 0x25, 0x50, 0x44, 0x46)) return "pdf";
  if (comecaCom(bytes, 0x50, 0x4b, 0x03, 0x04)) {
    if (["xlsx", "xlsm"].includes(ext)) return "xlsx";
    if (ext === "docx") return "docx";
    if (ext === "ods") return "ods";
    if (ext === "odt") return "odt";
    if (ext === "pptx") return "pptx";
    try {
      const nomes = await nomesDoZip(bytes);
      if (nomes.includes("xl/workbook.xml")) return "xlsx";
      if (nomes.includes("word/document.xml")) return "docx";
      if (nomes.includes("mimetype") && nomes.includes("content.xml")) return ext === "odt" ? "odt" : "ods";
    } catch {
      return "binario";
    }
    return "zip";
  }
  if (comecaCom(bytes, 0xd0, 0xcf, 0x11, 0xe0)) return ["xls", "xlt"].includes(ext) ? "xls" : "doc-antigo";
  if (comecaCom(bytes, 0x89, 0x50, 0x4e, 0x47) || comecaCom(bytes, 0xff, 0xd8, 0xff) || comecaCom(bytes, 0x47, 0x49, 0x46, 0x38) || comecaCom(bytes, 0x42, 0x4d) || comecaCom(bytes, 0x49, 0x49, 0x2a, 0x00) || comecaCom(bytes, 0x4d, 0x4d, 0x00, 0x2a)) return "imagem";
  if (comecaCom(bytes, 0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return "imagem";

  const amostra = bytes.subarray(0, 4096);
  const utf16 = (amostra[0] === 0xff && amostra[1] === 0xfe) || (amostra[0] === 0xfe && amostra[1] === 0xff);
  if (!utf16 && amostra.includes(0)) return "binario";
  const { texto } = descodificar(amostra);
  const t = texto.trimStart();
  if (ext === "eml" || /^(received|return-path|message-id|mime-version|delivered-to|x-[\w-]+):/im.test(t.slice(0, 600)) || (/^from:/im.test(t.slice(0, 300)) && /^subject:/im.test(t.slice(0, 1500)))) return "eml";
  if (/^<(!doctype html|html|body|table)/i.test(t) || ["html", "htm"].includes(ext)) return "html";
  if (t.startsWith("<")) return "xml";
  if (["ndjson", "jsonl"].includes(ext)) return "ndjson";
  if (t.startsWith("{") || t.startsWith("[") || ext === "json") return "json";
  return "texto";
}

const ROTULOS: Record<Formato, string> = {
  pdf: "PDF",
  xlsx: "Excel (XLSX)",
  xls: "Excel (XLS)",
  ods: "OpenDocument Folha",
  docx: "Word (DOCX)",
  odt: "OpenDocument Texto",
  pptx: "PowerPoint (PPTX)",
  zip: "Arquivo ZIP",
  imagem: "Imagem (OCR)",
  eml: "E-mail (EML)",
  json: "JSON",
  ndjson: "NDJSON",
  xml: "XML",
  html: "HTML",
  texto: "Texto",
  binario: "Binário",
  "doc-antigo": "Documento Office antigo",
};

/** O nome de um formato em palavras («Excel (XLSX)»). */
export const rotuloDoFormato = (f: string): string => ROTULOS[f as Formato] ?? f;

export async function extrairFicheiro(ficheiro: File, opcoes: Opcoes = {}): Promise<Extraido[]> {
  const bytes = new Uint8Array(await ficheiro.arrayBuffer());
  return extrairBytes(ficheiro.name, bytes, ficheiro.type, opcoes, 0, undefined);
}

export async function extrairBytes(nome: string, bytes: Uint8Array, tipoMime: string, opcoes: Opcoes, profundidade: number, dentroDe: string | undefined): Promise<Extraido[]> {
  const inicio = performance.now();
  const progresso = opcoes.progresso ?? (() => {});
  const ficheiroId = novoId("f");
  const ctx: Contexto = { ficheiroId, origem: dentroDe ? `${dentroDe} › ${nome}` : nome };
  const avisos: string[] = [];
  let formato = await detetarFormato(nome, bytes);
  let rotulo = ROTULOS[formato];
  let res: Resultado = { tabelas: [], texto: "", avisos: [], filhos: [] };
  progresso(`A ler ${nome}`);
  try {
    switch (formato) {
      case "xlsx":
      case "xls":
      case "ods":
        res = await folhasParaTabelas(bytes, ctx);
        break;
      case "docx":
        res = await docxParaTabelas(bytes, ctx);
        break;
      case "odt":
        res = await odtParaTexto(bytes);
        break;
      case "pdf":
        res = await pdfParaTabelas(bytes, ctx, progresso);
        break;
      case "zip":
        res = await zipParaFilhos(bytes);
        break;
      case "eml":
        res = emlParaResultado(bytes, ctx);
        break;
      case "imagem": {
        const { ocrImagem } = await import("./ocr");
        const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: tipoMime || "image/png" });
        const ocr = await ocrImagem(blob, progresso);
        const tabelas: Tabela[] = ocr.tabelas.map((t, k) => ({ id: novoId("t"), ficheiroId, nome: `OCR · Tabela ${k + 1}`, origem: `${ctx.origem} › OCR · Tabela ${k + 1}`, colunas: t.colunas, linhas: t.linhas, confianca: t.confianca }));
        res = { tabelas, texto: ocr.texto, avisos: [`Texto reconhecido por OCR com confiança média de ${Math.round(ocr.confianca * 100)} %. Confirme os valores nos originais.`], filhos: [] };
        break;
      }
      case "json":
      case "ndjson": {
        const { texto } = descodificar(bytes);
        let valor: unknown;
        try {
          valor = formato === "ndjson" ? ndjsonParaValores(texto) : JSON.parse(texto);
        } catch {
          valor = ndjsonParaValores(texto);
          if (valor) {
            formato = "ndjson";
            rotulo = ROTULOS.ndjson;
          }
        }
        if (valor === null || valor === undefined) {
          avisos.push("O ficheiro não é JSON válido; foi lido como texto.");
          formato = "texto";
          const csv = csvParaTabelas(texto, ctx);
          res.tabelas = csv.tabelas;
          rotulo = csv.formato;
          res.texto = texto.slice(0, 200_000);
        } else res.tabelas = jsonParaTabelas(valor, ctx);
        break;
      }
      case "xml": {
        const { texto } = descodificar(bytes);
        res.tabelas = xmlParaTabelas(texto, ctx);
        res.texto = texto.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200_000);
        break;
      }
      case "html": {
        const { texto } = descodificar(bytes);
        const h = htmlParaTabelas(texto, ctx);
        res.tabelas = h.tabelas;
        res.texto = h.texto.slice(0, 200_000);
        break;
      }
      case "texto": {
        const { texto, codificacao } = descodificar(bytes);
        const csv = csvParaTabelas(texto, ctx);
        res.tabelas = csv.tabelas;
        rotulo = `${csv.formato} · ${codificacao}`;
        res.texto = texto.length <= 200_000 ? texto : texto.slice(0, 200_000);
        break;
      }
      case "pptx":
      case "doc-antigo":
      case "binario":
        break;
    }
  } catch (e) {
    avisos.push(`Não foi possível ler o ficheiro como ${rotulo}: ${e instanceof Error ? e.message : String(e)}`);
    res = { tabelas: [], texto: "", avisos: [], filhos: [] };
  }
  avisos.push(...res.avisos);
  const semConteudo = res.tabelas.length === 0 && res.texto === "" && res.filhos.length === 0;
  if (semConteudo && formato !== "imagem") {
    const linhas = textoImprimivel(bytes);
    if (linhas.length > 0) {
      res.tabelas = [{ id: novoId("t"), ficheiroId, nome: "Texto legível", origem: `${ctx.origem} › Texto legível`, colunas: ["Texto"], linhas: linhas.map((l) => [l]) }];
      res.texto = linhas.join("\n");
    }
    avisos.push(formato === "doc-antigo" ? "Formato Office antigo (.doc, .ppt): só foi possível recuperar o texto legível. Guarde o ficheiro como DOCX ou PDF para uma extração completa." : "Formato sem leitor estruturado: foi extraído apenas o texto legível e os metadados.");
    if (formato === "binario" || formato === "pptx") rotulo = ROTULOS[formato] + " (extração parcial)";
  }
  const principal: Extraido = { id: ficheiroId, nome, tamanho: bytes.length, tipoMime: tipoMime || "desconhecido", formato: rotulo, tabelas: res.tabelas, texto: res.texto, avisos, duracaoMs: Math.round(performance.now() - inicio), dentroDe };
  const resultado = [principal];
  if (profundidade < MAXIMO_PROFUNDIDADE) {
    for (const filho of res.filhos) resultado.push(...(await extrairBytes(filho.nome, filho.bytes, "", opcoes, profundidade + 1, dentroDe ? `${dentroDe} › ${nome}` : nome)));
  } else if (res.filhos.length > 0) avisos.push("Foi atingida a profundidade máxima de ficheiros dentro de ficheiros.");
  return resultado;
}
