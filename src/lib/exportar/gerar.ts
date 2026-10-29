// Gera o ficheiro de cada formato a partir de uma fonte de dados (uma tabela ou uma zona DNS), tudo no navegador: nada sai do painel. O PDF, o Excel e o Word só se carregam quando se pede (são pesados); o resto são funções puras.
import { paraBind } from "@/lib/dns-bind";
import { paraCsv, paraImagem, paraJson, type DadosExportaveis } from "@/lib/exportar-dados";
import { paraDocxDocumento, paraPdfDocumento } from "./documento";
import { paraHtml, paraMarkdown, paraTextoSimples, tabelasDoDocumento } from "../pesquisa-documento";
import { formatosDaFonte, infoDoFormato, nomeDoFicheiro, type FonteDeExportacao, type FormatoDeExportar } from "./formatos";

const texto = (v: string | number | undefined) => String(v ?? "");
/** O nome de uma folha do Excel: sem os símbolos que ele não aceita, com no máximo 28 letras e o número se já houver outra com o mesmo nome. */
const nomeDaFolha = (t: string, i: number) => `${t.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 26) || "Folha"}${i ? ` ${i + 1}` : ""}`;
const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// o XML não aceita caracteres de controlo
const limpar = (t: string) => t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

/** A tabela em texto simples, com as colunas alinhadas. */
export function paraTxt(d: DadosExportaveis): string {
  const larguras = d.colunas.map((c, i) => Math.min(40, Math.max(c.length, ...d.linhas.map((l) => texto(l[i]).length))));
  const linha = (cel: (string | number)[]) => cel.map((c, i) => texto(c).slice(0, 40).padEnd(larguras[i])).join("  ").trimEnd();
  return [d.titulo, "=".repeat(Math.max(3, d.titulo.length)), "", linha(d.colunas), larguras.map((w) => "-".repeat(w)).join("  "), ...d.linhas.map(linha), ""].join("\r\n");
}

/** A tabela como imagem vetorial (SVG), em preto sobre branco. */
export function paraSvg(d: DadosExportaveis): string {
  const largura = 800;
  const margem = 24;
  const alturaLinha = 28;
  const total = margem * 2 + 36 + (d.linhas.length + 1) * alturaLinha;
  const x = (i: number) => (i === 0 ? margem : margem + (largura - margem * 2) * (0.4 + (0.6 * i) / Math.max(1, d.colunas.length - 1)));
  const celulas = (cel: (string | number)[], y: number, peso: number, cor: string) => cel.map((c, i) => `<text x="${x(i)}" y="${y}" text-anchor="${i === 0 ? "start" : "end"}" font-weight="${peso}" fill="${cor}">${escapar(limpar(texto(c)))}</text>`).join("");
  let y = margem + 36 + alturaLinha / 2;
  const corpo = [celulas(d.colunas, y, 600, "#555555")];
  for (const l of d.linhas) {
    y += alturaLinha;
    corpo.push(`<line x1="${margem}" x2="${largura - margem}" y1="${y - alturaLinha / 2}" y2="${y - alturaLinha / 2}" stroke="#e5e5e5"/>`, celulas(l, y, 400, "#111111"));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${total}" viewBox="0 0 ${largura} ${total}" font-family="Inter, Arial, sans-serif" font-size="13" dominant-baseline="middle">\n<rect width="100%" height="100%" fill="#ffffff"/>\n<text x="${margem}" y="${margem + 10}" font-size="17" font-weight="600" fill="#111111">${escapar(limpar(d.titulo))}</text>\n${corpo.join("\n")}\n</svg>\n`;
}

/** A tabela como documento Word (.docx): um título e uma tabela, escritos à mão em XML dentro de um zip (sem bibliotecas pesadas). */
export async function paraDocx(d: DadosExportaveis): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const w = (t: string) => `<w:t xml:space="preserve">${escapar(limpar(t))}</w:t>`;
  const celula = (t: string, negrito: boolean) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p><w:r>${negrito ? "<w:rPr><w:b/></w:rPr>" : ""}${w(t)}</w:r></w:p></w:tc>`;
  const linha = (cel: (string | number)[], negrito: boolean) => `<w:tr>${cel.map((c) => celula(texto(c), negrito)).join("")}</w:tr>`;
  const borda = (l: string) => `<w:${l} w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/>`;
  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:spacing w:after="240"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr>${w(d.titulo)}</w:r></w:p><w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(borda).join("")}</w:tblBorders></w:tblPr>${linha(d.colunas, true)}${d.linhas.map((l) => linha(l, false)).join("")}</w:tbl><w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", documento);
  return zip.generateAsync({ type: "blob", mimeType: infoDoFormato("docx").mime, compression: "DEFLATE" });
}

/** A tabela como folha de Excel (.xlsx). */
export async function paraXlsx(d: DadosExportaveis): Promise<Blob> {
  const XLSX = await import("xlsx");
  const folha = XLSX.utils.aoa_to_sheet([d.colunas, ...d.linhas]);
  folha["!cols"] = d.colunas.map((c, i) => ({ wch: Math.min(48, Math.max(c.length, ...d.linhas.slice(0, 200).map((l) => texto(l[i]).length)) + 2) }));
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, folha, (d.titulo || "Dados").replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Dados");
  const bytes = XLSX.write(livro, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer;
  return new Blob([bytes], { type: infoDoFormato("xlsx").mime });
}

/** A tabela como PDF (A4, na horizontal se tiver muitas colunas). */
export async function paraPdf(d: DadosExportaveis): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: d.colunas.length > 5 ? "landscape" : "portrait", compress: true });
  doc.setFont("helvetica", "bold").setFontSize(16).text(d.titulo, 40, 50);
  autoTable(doc, { startY: 66, head: [d.colunas], body: d.linhas.map((l) => l.map(texto)), styles: { fontSize: 9, cellPadding: 5 }, headStyles: { fillColor: [30, 30, 30] }, margin: { left: 40, right: 40 } });
  return doc.output("blob");
}

/** O ficheiro de um formato: o que a própria fonte sabe gerar, ou o genérico a partir da tabela. */
export async function gerarFormato(f: FonteDeExportacao, formato: FormatoDeExportar): Promise<Blob> {
  const proprio = f.gerar?.[formato];
  if (proprio) return proprio();
  const mime = infoDoFormato(formato).mime;
  if (formato === "bind") {
    if (!f.bind) throw new Error("Esta fonte não tem registos DNS.");
    return new Blob([paraBind(f.bind.zona, f.bind.registos)], { type: mime });
  }
  if (f.documento && !f.dados) {
    const doc = f.documento;
    const tabelas = tabelasDoDocumento(doc);
    switch (formato) {
      case "md":
        return new Blob([paraMarkdown(doc)], { type: mime });
      case "html":
        return new Blob([paraHtml(doc)], { type: mime });
      case "txt":
        return new Blob([`﻿${paraTextoSimples(doc)}`], { type: mime });
      case "json":
        return new Blob([JSON.stringify(doc, null, 2)], { type: mime });
      case "docx":
        return paraDocxDocumento(doc);
      case "pdf":
        return paraPdfDocumento(doc);
      case "csv":
        if (!tabelas[0]) throw new Error("O documento não tem tabelas.");
        return new Blob([paraCsv({ nome: f.nome, titulo: tabelas[0].titulo, colunas: tabelas[0].colunas, linhas: tabelas[0].linhas })], { type: mime });
      case "xlsx": {
        if (!tabelas.length) throw new Error("O documento não tem tabelas.");
        const XLSX = await import("xlsx");
        const livro = XLSX.utils.book_new();
        tabelas.forEach((tb, i) => XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([tb.colunas, ...tb.linhas]), nomeDaFolha(tb.titulo || `Tabela ${i + 1}`, i)));
        return new Blob([XLSX.write(livro, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer], { type: mime });
      }
      default:
        throw new Error(`O documento não se exporta em ${formato}.`);
    }
  }
  const d = f.dados;
  if (!d) throw new Error("Esta fonte não tem uma tabela.");
  switch (formato) {
    case "csv":
      return new Blob([paraCsv(d)], { type: mime });
    case "json":
      return new Blob([paraJson(d)], { type: mime });
    case "txt":
      return new Blob([`﻿${paraTxt(d)}`], { type: mime });
    case "svg":
      return new Blob([paraSvg(d)], { type: mime });
    case "png":
    case "jpg": {
      const b = await paraImagem(d, formato === "png" ? "image/png" : "image/jpeg");
      if (!b) throw new Error("O navegador não conseguiu desenhar a imagem.");
      return b;
    }
    case "docx":
      return paraDocx(d);
    case "xlsx":
      return paraXlsx(d);
    case "pdf":
      return paraPdf(d);
    default:
      throw new Error(`O formato ${formato} não se gera assim.`);
  }
}

export interface FicheiroGerado {
  nome: string;
  blob: Blob;
}

/** Gera os formatos escolhidos; com `zip`, e mais de um formato, vão todos para um único .zip. */
export async function exportarFonte(f: FonteDeExportacao, formatos: FormatoDeExportar[], zip: boolean): Promise<FicheiroGerado[]> {
  const validos = formatos.filter((x) => formatosDaFonte(f).includes(x));
  const ficheiros: FicheiroGerado[] = [];
  for (const x of validos) ficheiros.push({ nome: nomeDoFicheiro(f.nome, x), blob: await gerarFormato(f, x) });
  if (!zip || ficheiros.length < 2) return ficheiros;
  const { default: JSZip } = await import("jszip");
  const z = new JSZip();
  for (const x of ficheiros) z.file(x.nome, x.blob);
  return [{ nome: nomeDoFicheiro(f.nome, "zip"), blob: await z.generateAsync({ type: "blob", mimeType: infoDoFormato("zip").mime, compression: "DEFLATE" }) }];
}

export function descarregarBlob(nome: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
