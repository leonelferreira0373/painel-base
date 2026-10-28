// Formatos binários e de documentos: folhas de cálculo, Word, PDF, ZIP e e-mail (.eml). As bibliotecas pesadas carregam-se só quando são precisas.
import type { Celula, Tabela } from "@/lib/tipos";
import { agruparLinhas, detetarTabelas, type Palavra } from "./layout";
import { htmlParaTabelas, novoId, type Contexto } from "./tabular";
import { aTabela, descodificar } from "./texto";

export interface Resultado {
  tabelas: Tabela[];
  texto: string;
  avisos: string[];
  /** Ficheiros encontrados dentro deste (anexos, entradas de um ZIP) para serem extraídos a seguir. */
  filhos: { nome: string; bytes: Uint8Array }[];
}

const vazioRes = (): Resultado => ({ tabelas: [], texto: "", avisos: [], filhos: [] });

function tabela(ctx: Contexto, nome: string, colunas: string[], linhas: Celula[][], confianca?: number): Tabela {
  return { id: novoId("t"), ficheiroId: ctx.ficheiroId, nome, origem: `${ctx.origem} › ${nome}`, colunas, linhas, confianca };
}

// ---------- folhas de cálculo (XLSX, XLS, ODS) ----------

export async function folhasParaTabelas(bytes: Uint8Array, ctx: Contexto): Promise<Resultado> {
  const XLSX = await import("xlsx");
  const res = vazioRes();
  const livro = XLSX.read(bytes, { type: "array", cellNF: true });
  for (const nome of livro.SheetNames) {
    const folha = livro.Sheets[nome];
    if (!folha || !folha["!ref"]) continue;
    const intervalo = XLSX.utils.decode_range(folha["!ref"]);
    const matriz: Celula[][] = [];
    for (let r = intervalo.s.r; r <= intervalo.e.r; r++) {
      const linha: Celula[] = [];
      let algum = false;
      for (let c = intervalo.s.c; c <= intervalo.e.c; c++) {
        const celula = folha[XLSX.utils.encode_cell({ r, c })];
        let valor: Celula = null;
        if (celula) {
          if (celula.t === "n" && typeof celula.v === "number" && celula.z && XLSX.SSF.is_date(String(celula.z))) {
            const d = XLSX.SSF.parse_date_code(celula.v);
            if (d) {
              const dia = `${String(d.y).padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
              valor = d.H || d.M || d.S ? `${dia} ${String(d.H).padStart(2, "0")}:${String(d.M).padStart(2, "0")}:${String(d.S).padStart(2, "0")}` : dia;
            }
          } else if (celula.t === "d" && celula.v instanceof Date) valor = celula.v.toISOString().slice(0, 10);
          else if (celula.t === "e") valor = String(celula.w ?? "#ERRO");
          else if (celula.t === "z") valor = null;
          else if (typeof celula.v === "number" || typeof celula.v === "boolean") valor = celula.v;
          else if (celula.v !== undefined && celula.v !== null) valor = String(celula.v);
        }
        if (valor !== null && !(typeof valor === "string" && valor.trim() === "")) algum = true;
        linha.push(valor);
      }
      if (algum) matriz.push(linha);
    }
    if (matriz.length === 0) continue;
    const { colunas, linhas } = aTabela(matriz);
    res.tabelas.push(tabela(ctx, nome, colunas, linhas));
  }
  if (res.tabelas.length === 0) res.avisos.push("O livro não tem folhas com dados.");
  return res;
}

// ---------- Word (DOCX) e OpenDocument (ODT) ----------

export async function docxParaTabelas(bytes: Uint8Array, ctx: Contexto): Promise<Resultado> {
  const mammoth = await import("mammoth");
  const res = vazioRes();
  // No navegador o mammoth lê um ArrayBuffer; em Node (testes) lê um Buffer.
  const entrada = () => ({ arrayBuffer: bytes.slice().buffer as ArrayBuffer, ...(typeof Buffer !== "undefined" ? { buffer: Buffer.from(bytes) } : {}) });
  const html = await mammoth.convertToHtml(entrada());
  const { tabelas, texto } = htmlParaTabelas(html.value, ctx);
  res.tabelas = tabelas;
  const bruto = await mammoth.extractRawText(entrada());
  res.texto = bruto.value.trim() || texto;
  for (const m of html.messages.slice(0, 3)) res.avisos.push(m.message);
  return res;
}

export async function odtParaTexto(bytes: Uint8Array): Promise<Resultado> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const res = vazioRes();
  const conteudo = await zip.file("content.xml")?.async("string");
  if (conteudo && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(conteudo, "application/xml");
    res.texto = Array.from(doc.getElementsByTagName("text:p")).map((p) => (p.textContent ?? "").trim()).filter(Boolean).join("\n");
  }
  return res;
}

// ---------- PDF ----------

export async function pdfParaTabelas(bytes: Uint8Array, ctx: Contexto, progresso: (m: string) => void): Promise<Resultado> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
  const res = vazioRes();
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const textos: string[] = [];
  const paginasSemTexto: number[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    progresso(`PDF: página ${n} de ${doc.numPages}`);
    const pagina = await doc.getPage(n);
    const conteudo = await pagina.getTextContent();
    const palavras: Palavra[] = [];
    for (const item of conteudo.items) {
      if (!("str" in item) || item.str.trim() === "") continue;
      palavras.push({ texto: item.str, x: item.transform[4], y: item.transform[5], largura: item.width, altura: item.height || Math.abs(item.transform[3]) });
    }
    if (palavras.length === 0) {
      paginasSemTexto.push(n);
      continue;
    }
    const linhas = agruparLinhas(palavras);
    const { tabelas, livres } = detetarTabelas(linhas);
    tabelas.forEach((t, k) => res.tabelas.push(tabela(ctx, `Página ${n} · Tabela ${k + 1}`, t.colunas, t.linhas)));
    textos.push(`— Página ${n} —\n${livres.join("\n")}`);
  }
  res.texto = textos.join("\n\n");
  if (paginasSemTexto.length > 0) {
    res.avisos.push(`${paginasSemTexto.length} página(s) sem texto (digitalizadas): ${paginasSemTexto.slice(0, 10).join(", ")}${paginasSemTexto.length > 10 ? "…" : ""}`);
    const limite = paginasSemTexto.slice(0, 20);
    const { ocrCanvas } = await import("./ocr");
    for (const n of limite) {
      progresso(`OCR: página ${n}`);
      const pagina = await doc.getPage(n);
      const vista = pagina.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(vista.width);
      canvas.height = Math.ceil(vista.height);
      await pagina.render({ canvasContext: canvas.getContext("2d")!, viewport: vista }).promise;
      const ocr = await ocrCanvas(canvas, progresso);
      ocr.tabelas.forEach((t, k) => res.tabelas.push(tabela(ctx, `Página ${n} (OCR) · Tabela ${k + 1}`, t.colunas, t.linhas, t.confianca)));
      res.texto += `\n\n— Página ${n} (OCR, confiança ${Math.round(ocr.confianca * 100)} %) —\n${ocr.texto}`;
    }
    if (paginasSemTexto.length > limite.length) res.avisos.push("O OCR leu apenas as primeiras 20 páginas digitalizadas.");
  }
  return res;
}

// ---------- ZIP ----------

export async function zipParaFilhos(bytes: Uint8Array): Promise<Resultado> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const res = vazioRes();
  const entradas = Object.values(zip.files).filter((f) => !f.dir && !f.name.startsWith("__MACOSX/") && !/(^|\/)\.DS_Store$/.test(f.name));
  for (const e of entradas.slice(0, 300)) res.filhos.push({ nome: e.name, bytes: await e.async("uint8array") });
  if (entradas.length > 300) res.avisos.push(`O arquivo tem ${entradas.length} ficheiros; foram lidos os primeiros 300.`);
  return res;
}

export async function nomesDoZip(bytes: Uint8Array): Promise<string[]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  return Object.keys(zip.files);
}

// ---------- E-mail (.eml) ----------

function binarioParaTexto(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return s;
}

function textoParaBinario(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function descodificarPalavras(valor: string): string {
  return valor.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, charset: string, enc: string, dados: string) => {
    try {
      const bytes = enc.toLowerCase() === "b" ? textoParaBinario(atob(dados)) : textoParaBinario(dados.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16))));
      return new TextDecoder(charset).decode(bytes);
    } catch {
      return dados;
    }
  });
}

function cabecalhos(bloco: string): Map<string, string> {
  const mapa = new Map<string, string>();
  const desdobrado = bloco.replace(/\r?\n[ \t]+/g, " ");
  for (const l of desdobrado.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0) mapa.set(l.slice(0, i).trim().toLowerCase(), l.slice(i + 1).trim());
  }
  return mapa;
}

function parametro(valor: string | undefined, nome: string): string | undefined {
  const m = new RegExp(`${nome}\\s*=\\s*("([^"]*)"|[^;\\s]+)`, "i").exec(valor ?? "");
  return m ? (m[2] ?? m[1]) : undefined;
}

function descodificarCorpo(corpo: string, codificacao: string | undefined): Uint8Array {
  const enc = (codificacao ?? "").toLowerCase();
  if (enc === "base64") return textoParaBinario(atob(corpo.replace(/\s+/g, "")));
  if (enc === "quoted-printable") {
    return textoParaBinario(corpo.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16))));
  }
  return textoParaBinario(corpo);
}

interface ParteMime {
  tipo: string;
  nome?: string;
  bytes: Uint8Array;
  charset?: string;
  anexo: boolean;
}

function partes(texto: string, acumulado: ParteMime[]): void {
  const corte = texto.search(/\r?\n\r?\n/);
  const cab = cabecalhos(corte === -1 ? texto : texto.slice(0, corte));
  const corpo = corte === -1 ? "" : texto.slice(corte).replace(/^\r?\n\r?\n/, "");
  const tipoCompleto = cab.get("content-type") ?? "text/plain";
  const tipo = tipoCompleto.split(";")[0].trim().toLowerCase();
  if (tipo.startsWith("multipart/")) {
    const limite = parametro(tipoCompleto, "boundary");
    if (!limite) return;
    for (const p of corpo.split(`--${limite}`).slice(1)) {
      if (p.startsWith("--")) break;
      partes(p.replace(/^\r?\n/, ""), acumulado);
    }
    return;
  }
  const disposicao = cab.get("content-disposition") ?? "";
  const nome = descodificarPalavras(parametro(disposicao, "filename") ?? parametro(tipoCompleto, "name") ?? "");
  acumulado.push({ tipo, nome: nome || undefined, bytes: descodificarCorpo(corpo, cab.get("content-transfer-encoding")), charset: parametro(tipoCompleto, "charset"), anexo: /attachment/i.test(disposicao) || (nome !== "" && !tipo.startsWith("text/")) });
}

export function emlParaResultado(bytes: Uint8Array, ctx: Contexto): Resultado {
  const bruto = binarioParaTexto(bytes);
  const res = vazioRes();
  const corte = bruto.search(/\r?\n\r?\n/);
  const cab = cabecalhos(corte === -1 ? bruto : bruto.slice(0, corte));
  const campo = (k: string) => descodificarPalavras(cab.get(k) ?? "");
  const lista: ParteMime[] = [];
  partes(bruto, lista);
  const decod = (p: ParteMime) => new TextDecoder(p.charset ?? "utf-8", { fatal: false }).decode(p.bytes);
  const simples = lista.find((p) => p.tipo === "text/plain" && !p.anexo);
  const html = lista.find((p) => p.tipo === "text/html" && !p.anexo);
  let corpo = simples ? decod(simples) : "";
  if (!corpo && html) corpo = htmlParaTabelas(decod(html), ctx).texto;
  res.texto = corpo.trim();
  res.tabelas.push(tabela(ctx, "Mensagem", ["De", "Para", "Cc", "Assunto", "Data", "ID da mensagem"], [[campo("from"), campo("to"), campo("cc"), campo("subject"), campo("date"), campo("message-id")]]));
  if (html) res.tabelas.push(...htmlParaTabelas(decod(html), ctx).tabelas);
  for (const p of lista.filter((x) => x.anexo && x.nome)) res.filhos.push({ nome: p.nome as string, bytes: p.bytes });
  return res;
}

export { descodificar };
