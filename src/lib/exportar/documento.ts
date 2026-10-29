// A exportação do documento da pesquisa a fundo: Word e PDF a sério (títulos, parágrafos, listas, tabelas, métricas, avisos, passos e fontes), a partir dos mesmos blocos que se veem no ecrã. O Markdown, o HTML e o texto simples estão em lib/pesquisa-documento.ts.
import { infoDoFormato } from "./formatos";
import type { Bloco, DocumentoRico } from "../pesquisa-documento";

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const limpar = (t: string) => t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

interface Trecho {
  t: string;
  negrito?: boolean;
}

/** O texto da IA como pedaços (os «termos» e o **negrito** ficam a negrito; as marcas desaparecem). */
export function trechosDe(texto: string): Trecho[] {
  const out: Trecho[] = [];
  for (const p of texto.split(/(\*\*[^*]+\*\*|«[^»]+»)/g)) {
    if (!p) continue;
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) out.push({ t: p.slice(2, -2), negrito: true });
    else if (p.startsWith("«") && p.endsWith("»")) out.push({ t: p.slice(1, -1), negrito: true });
    else out.push({ t: p });
  }
  return out;
}

// ---------- Word ----------

const corrida = (t: Trecho, base: { negrito?: boolean; italico?: boolean; tamanho?: number }) => {
  const pr = [base.negrito || t.negrito ? "<w:b/>" : "", base.italico ? "<w:i/>" : "", base.tamanho ? `<w:sz w:val="${base.tamanho}"/>` : ""].join("");
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}<w:t xml:space="preserve">${escapar(limpar(t.t))}</w:t></w:r>`;
};
const par = (texto: string, o: { negrito?: boolean; italico?: boolean; tamanho?: number; depois?: number; recuo?: number; suspenso?: number; fundo?: string } = {}) =>
  `<w:p><w:pPr>${o.fundo ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fundo}"/>` : ""}<w:spacing w:after="${o.depois ?? 120}"/>${o.recuo ? `<w:ind w:left="${o.recuo}"${o.suspenso ? ` w:hanging="${o.suspenso}"` : ""}/>` : ""}</w:pPr>${trechosDe(texto).map((t) => corrida(t, o)).join("")}</w:p>`;
const celulaW = (t: string, negrito: boolean, fundo?: string) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${fundo ? `<w:shd w:val="clear" w:color="auto" w:fill="${fundo}"/>` : ""}</w:tcPr>${par(t, { negrito, depois: 40 })}</w:tc>`;
const tabelaW = (colunas: string[], linhas: (string | number)[][]) => {
  const borda = (l: string) => `<w:${l} w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(borda).join("")}</w:tblBorders></w:tblPr><w:tr>${colunas.map((c) => celulaW(c, true, "F2F2F2")).join("")}</w:tr>${linhas.map((l) => `<w:tr>${colunas.map((_, i) => celulaW(String(l[i] ?? ""), false)).join("")}</w:tr>`).join("")}</w:tbl>${par("", { depois: 60 })}`;
};

function blocoW(b: Bloco): string {
  switch (b.tipo) {
    case "titulo":
      return par(b.texto, { negrito: true, tamanho: b.nivel === 3 ? 24 : 28, depois: 100 });
    case "paragrafo":
      return par(b.texto);
    case "lista":
      return b.itens.map((x, i) => par(`${b.ordenada ? `${i + 1}.` : "•"} ${x}`, { recuo: 440, suspenso: 280, depois: 60 })).join("");
    case "tabela":
      return tabelaW(b.colunas, b.linhas) + (b.legenda ? par(b.legenda, { italico: true, tamanho: 18 }) : "");
    case "metricas":
      return tabelaW(["Indicador", "Valor", "Nota"], b.itens.map((m) => [m.rotulo, m.valor, m.nota ?? ""]));
    case "destaque":
      return par(`${b.titulo ? `**${b.titulo}** ` : ""}${b.texto}`, { fundo: "F2F2F2", recuo: 120 });
    case "grafico":
      return par(b.titulo, { negrito: true, depois: 60 }) + tabelaW(["", ...b.series.map((s) => s.nome)], b.categorias.map((c, i) => [c, ...b.series.map((s) => s.valores[i] ?? "")]));
    case "citacao":
      return par(`${b.texto}${b.fonte ? ` [${b.fonte}]` : ""}`, { italico: true, recuo: 440 });
    case "passos":
      return b.itens.map((p, i) => par(`${i + 1}. **${p.titulo}** — ${p.texto}`, { recuo: 440, suspenso: 280, depois: 80 })).join("");
    case "pares":
      return tabelaW(["Campo", "Valor"], b.itens.map((p) => [p.chave, p.valor]));
  }
}

/** O documento em Word (.docx). */
export async function paraDocxDocumento(d: DocumentoRico): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const corpo = [
    par(d.titulo, { negrito: true, tamanho: 36, depois: 160 }),
    d.resumo ? par(d.resumo, { italico: true, depois: 200 }) : "",
    ...d.blocos.map(blocoW),
    d.limitacoes.length ? par("Limitações", { negrito: true, tamanho: 28 }) + d.limitacoes.map((l) => par(`• ${l}`, { recuo: 440, suspenso: 280, depois: 60 })).join("") : "",
    d.fontes.length ? par("Fontes", { negrito: true, tamanho: 28 }) + d.fontes.map((f) => par(`${f.n}. ${f.titulo} — ${f.url}`, { recuo: 440, suspenso: 340, depois: 60, tamanho: 20 })).join("") : "",
  ].join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpo}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: "blob", mimeType: infoDoFormato("docx").mime, compression: "DEFLATE" });
}

// ---------- PDF ----------

const simples = (t: string) => trechosDe(t).map((x) => x.t).join("");

/** O documento em PDF (A4): texto com quebras de linha, tabelas, avisos e as fontes. */
export async function paraPdfDocumento(d: DocumentoRico): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const L = pdf.internal.pageSize.getWidth();
  const A = pdf.internal.pageSize.getHeight();
  const M = 44;
  const util = L - M * 2;
  let y = M;
  const garantir = (h: number) => {
    if (y + h > A - M) {
      pdf.addPage();
      y = M;
    }
  };
  const texto = (t: string, o: { tamanho?: number; negrito?: boolean; italico?: boolean; recuo?: number; depois?: number; cor?: number } = {}) => {
    pdf.setFont("helvetica", o.negrito ? "bold" : o.italico ? "italic" : "normal").setFontSize(o.tamanho ?? 10.5).setTextColor(o.cor ?? 20);
    const linhas = pdf.splitTextToSize(simples(t), util - (o.recuo ?? 0)) as string[];
    const alt = (o.tamanho ?? 10.5) * 1.35;
    for (const l of linhas) {
      garantir(alt);
      pdf.text(l, M + (o.recuo ?? 0), y + (o.tamanho ?? 10.5));
      y += alt;
    }
    y += o.depois ?? 6;
  };
  const tabela = (colunas: string[], linhas: (string | number)[][]) => {
    garantir(40);
    autoTable(pdf, { startY: y, head: [colunas], body: linhas.map((l) => colunas.map((_, i) => String(l[i] ?? ""))), styles: { fontSize: 9, cellPadding: 4 }, headStyles: { fillColor: [40, 40, 40] }, margin: { left: M, right: M } });
    y = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30) + 10;
  };

  texto(d.titulo, { tamanho: 20, negrito: true, depois: 8 });
  if (d.resumo) texto(d.resumo, { italico: true, cor: 90, depois: 12 });
  for (const b of d.blocos) {
    switch (b.tipo) {
      case "titulo":
        y += 4;
        texto(b.texto, { tamanho: b.nivel === 3 ? 12 : 14, negrito: true, depois: 6 });
        break;
      case "paragrafo":
        texto(b.texto);
        break;
      case "lista":
        b.itens.forEach((x, i) => texto(`${b.ordenada ? `${i + 1}.` : "•"} ${x}`, { recuo: 14, depois: 3 }));
        y += 3;
        break;
      case "tabela":
        tabela(b.colunas, b.linhas);
        if (b.legenda) texto(b.legenda, { tamanho: 9, italico: true, cor: 100 });
        break;
      case "metricas":
        tabela(["Indicador", "Valor", "Nota"], b.itens.map((m) => [m.rotulo, m.valor, m.nota ?? ""]));
        break;
      case "destaque":
        texto(`${b.titulo ? `${b.titulo}: ` : ""}${b.texto}`, { recuo: 10, negrito: false, depois: 8 });
        break;
      case "grafico":
        texto(b.titulo, { negrito: true, depois: 4 });
        tabela(["", ...b.series.map((s) => s.nome)], b.categorias.map((c, i) => [c, ...b.series.map((s) => s.valores[i] ?? "")]));
        break;
      case "citacao":
        texto(`${b.texto}${b.fonte ? ` [${b.fonte}]` : ""}`, { italico: true, recuo: 18, cor: 80 });
        break;
      case "passos":
        b.itens.forEach((p, i) => texto(`${i + 1}. ${p.titulo} — ${p.texto}`, { recuo: 14, depois: 4 }));
        y += 3;
        break;
      case "pares":
        tabela(["Campo", "Valor"], b.itens.map((p) => [p.chave, p.valor]));
        break;
    }
  }
  if (d.limitacoes.length) {
    texto("Limitações", { tamanho: 14, negrito: true, depois: 6 });
    d.limitacoes.forEach((l) => texto(`• ${l}`, { recuo: 14, depois: 3 }));
  }
  if (d.fontes.length) {
    y += 6;
    texto("Fontes", { tamanho: 14, negrito: true, depois: 6 });
    d.fontes.forEach((f) => texto(`${f.n}. ${f.titulo} — ${f.url}`, { tamanho: 9, recuo: 14, depois: 3 }));
  }
  return pdf.output("blob");
}
