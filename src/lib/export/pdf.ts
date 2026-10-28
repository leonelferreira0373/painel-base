// Relatório em PDF: resumo, qualidade dos dados, gráficos, perfil das colunas e amostra. Os gráficos são os mesmos do ecrã, rasterizados no navegador.
import { alturaDe, formatar, opcoesExportacao, type GraficoSpec } from "@/components/graficos/Graficos";
import { echarts } from "@/lib/echarts";
import type { Sugestao } from "@/lib/analysis/sugestoes";
import type { Extraido, Perfil, Tabela } from "@/lib/tipos";
import { descarregar, nomeSeguro } from "./ficheiros";

const PT = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 });
const num = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? "" : PT.format(v));

async function graficoParaPng(spec: GraficoSpec, largura: number, altura: number): Promise<{ dados: string; altura: number }> {
  const h = alturaDe(spec, altura);
  const caixa = document.createElement("div");
  caixa.style.cssText = `position:fixed;left:-9999px;top:0;width:${largura}px;height:${h}px;`;
  document.body.append(caixa);
  const grafico = echarts.init(caixa, undefined, { renderer: "canvas", width: largura, height: h });
  grafico.setOption({ ...(opcoesExportacao(spec) as object), animation: false, backgroundColor: "#ffffff" });
  const dados = grafico.getDataURL({ type: "png", pixelRatio: 1.6, backgroundColor: "#ffffff" });
  grafico.dispose();
  caixa.remove();
  return { dados, altura: h };
}

export interface OpcoesRelatorio {
  ficheiros: Extraido[];
  tabela: Tabela;
  perfil: Perfil;
  graficos: Sugestao[];
  amostra?: number;
}

export async function exportarPdf(op: OpcoesRelatorio): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const L = doc.internal.pageSize.getWidth();
  const A = doc.internal.pageSize.getHeight();
  const M = 42;
  const util = L - M * 2;
  let y = M;
  const preto = 0;

  const novaPagina = () => {
    doc.addPage();
    y = M;
  };
  const garantir = (altura: number) => {
    if (y + altura > A - M - 14) novaPagina();
  };
  const titulo = (texto: string) => {
    garantir(40);
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(preto);
    doc.text(texto, M, y + 12);
    y += 28;
  };

  y += 20;
  doc.setFontSize(22).text("Relatório de análise de dados", M, y);
  y += 24;
  doc.setFont("helvetica", "normal").setFontSize(10);
  const geral = [
    ["Ficheiros", op.ficheiros.map((f) => f.nome).join(", ")],
    ["Tabela analisada", `${op.tabela.nome} (${op.tabela.origem})`],
    ["Data de geração", new Date().toLocaleString("pt-PT")],
  ];
  for (const [k, v] of geral) {
    const linhas = doc.splitTextToSize(v, util - 110) as string[];
    doc.setFont("helvetica", "bold").text(k, M, y);
    doc.setFont("helvetica", "normal").text(linhas, M + 110, y);
    y += 14 * linhas.length;
  }
  y += 14;

  titulo("Resumo");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "plain",
    styles: { font: "helvetica", fontSize: 10, textColor: preto, cellPadding: { top: 4, bottom: 4, left: 0, right: 8 } },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 150 } },
    body: [
      ["Linhas", num(op.perfil.linhas)],
      ["Colunas", num(op.perfil.colunas.length)],
      ["Completude dos dados", `${num(op.perfil.completude)} %`],
      ["Linhas duplicadas", num(op.perfil.duplicadas)],
      ["Pontuação de qualidade", `${num(op.perfil.pontuacao)} em 100`],
    ],
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  if (op.perfil.anomalias.length > 0) {
    titulo("Anomalias encontradas");
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Gravidade", "Tipo", "Coluna", "Ocorrências", "Detalhe"]],
      body: op.perfil.anomalias.slice(0, 40).map((a) => [a.gravidade, a.tipo, a.coluna ?? "", num(a.contagem), a.mensagem]),
      styles: { font: "helvetica", fontSize: 8.5, textColor: preto, cellPadding: 4 },
      headStyles: { fillColor: [255, 255, 255], textColor: preto, fontStyle: "bold", lineColor: [0, 0, 0], lineWidth: { bottom: 0.8 } },
      theme: "plain",
      rowPageBreak: "avoid",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  }

  if (op.graficos.length > 0) {
    titulo("Gráficos");
    for (const g of op.graficos) {
      const png = await graficoParaPng(g.spec, Math.floor(util), 220);
      const alturaPdf = png.altura * (util / Math.floor(util));
      garantir(alturaPdf + 28);
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(preto);
      doc.text(doc.splitTextToSize(g.titulo, util) as string[], M, y + 8);
      y += 16;
      doc.addImage(png.dados, "PNG", M, y, util, alturaPdf, undefined, "FAST");
      y += alturaPdf + 18;
    }
  }

  titulo("Perfil das colunas");
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Coluna", "Tipo", "Em falta", "Únicos", "Mínimo", "Máximo", "Média", "Mediana"]],
    body: op.perfil.colunas.map((c) => [c.nome, c.tipo, num(c.nulos), num(c.unicos), num(c.estat?.min), num(c.estat?.max), num(c.estat?.media), num(c.estat?.mediana)]),
    styles: { font: "helvetica", fontSize: 8.5, textColor: preto, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [255, 255, 255], textColor: preto, fontStyle: "bold", lineColor: [0, 0, 0], lineWidth: { bottom: 0.8 } },
    theme: "plain",
    rowPageBreak: "avoid",
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  const nLinhas = op.amostra ?? 25;
  const colunasVistas = op.tabela.colunas.slice(0, 8);
  garantir(70);
  titulo(`Amostra dos dados (primeiras ${Math.min(nLinhas, op.tabela.linhas.length)} de ${formatar(op.tabela.linhas.length)} linhas${op.tabela.colunas.length > 8 ? `; 8 de ${op.tabela.colunas.length} colunas` : ""})`);
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [colunasVistas],
    body: op.tabela.linhas.slice(0, nLinhas).map((l) => colunasVistas.map((_, i) => (l[i] === null || l[i] === undefined ? "" : String(l[i])))),
    styles: { font: "helvetica", fontSize: 8, textColor: preto, cellPadding: 3, overflow: "ellipsize" },
    headStyles: { fillColor: [255, 255, 255], textColor: preto, fontStyle: "bold", lineColor: [0, 0, 0], lineWidth: { bottom: 0.8 } },
    theme: "plain",
    rowPageBreak: "avoid",
  });

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(preto);
    doc.text(`Relatório de análise de dados`, M, A - 22);
    doc.text(`${p} / ${paginas}`, L - M, A - 22, { align: "right" });
  }
  doc.setProperties({ title: `Relatório de análise · ${op.tabela.nome}`, subject: "Análise de dados" });
  descarregar(`${nomeSeguro(op.ficheiros[0]?.nome ?? op.tabela.nome)}-relatorio.pdf`, doc.output("arraybuffer"), "application/pdf");
}
