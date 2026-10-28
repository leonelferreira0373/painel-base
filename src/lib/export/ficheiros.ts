// Exportação para CSV, Excel e PDF — tudo gerado no navegador a partir dos dados reais extraídos.
import type { Celula, Perfil, Tabela } from "@/lib/tipos";
import { lerBooleano, lerData, lerNumero, vazio } from "@/lib/analysis/valores";

export function descarregar(nome: string, conteudo: BlobPart, tipo: string): void {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function nomeSeguro(texto: string): string {
  return texto.replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "dados";
}

// ---------- CSV ----------

function campoCsv(v: Celula): string {
  if (v === null || v === undefined) return "";
  const texto = typeof v === "number" ? String(v).replace(".", ",") : String(v);
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV com ponto e vírgula e vírgula decimal, que é o que o Excel em português espera; começa com BOM para manter os acentos. */
export function csvDe(t: Tabela): string {
  const linhas = [t.colunas.map(campoCsv).join(";"), ...t.linhas.map((l) => t.colunas.map((_, i) => campoCsv(l[i] ?? null)).join(";"))];
  return `﻿${linhas.join("\r\n")}\r\n`;
}

export function exportarCsv(t: Tabela, nomeFicheiro: string): void {
  descarregar(`${nomeSeguro(nomeFicheiro)}-${nomeSeguro(t.nome)}.csv`, csvDe(t), "text/csv;charset=utf-8");
}

// ---------- Excel ----------

const EPOCA = Date.UTC(1899, 11, 30);

function nomeFolha(nome: string, usados: Set<string>): string {
  const base = nome.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 28) || "Folha";
  let n = base;
  for (let k = 2; usados.has(n.toLowerCase()); k++) n = `${base.slice(0, 28 - String(k).length - 1)} ${k}`;
  usados.add(n.toLowerCase());
  return n;
}

export async function exportarExcel(opcoes: { tabelas: { tabela: Tabela; perfil: Perfil }[]; nomeFicheiro: string }): Promise<void> {
  const XLSX = await import("xlsx");
  const livro = XLSX.utils.book_new();
  const usados = new Set<string>(["perfil das colunas", "anomalias", "correlações"]);
  for (const { tabela, perfil } of opcoes.tabelas) {
    const tipos = perfil.colunas.map((c) => c.tipo);
    const folha = XLSX.utils.aoa_to_sheet([tabela.colunas]);
    const linhas = tabela.linhas;
    for (let r = 0; r < linhas.length; r++) {
      for (let c = 0; c < tabela.colunas.length; c++) {
        const v = linhas[r][c] ?? null;
        if (vazio(v)) continue;
        const ref = XLSX.utils.encode_cell({ r: r + 1, c });
        if (tipos[c] === "inteiro" || tipos[c] === "numero") {
          const n = lerNumero(v);
          folha[ref] = n === null ? { t: "s", v: String(v) } : { t: "n", v: n };
        } else if (tipos[c] === "data") {
          const d = lerData(v);
          folha[ref] = d ? { t: "n", v: (d.getTime() - EPOCA) / 86_400_000, z: d.getUTCHours() || d.getUTCMinutes() ? "yyyy-mm-dd hh:mm" : "yyyy-mm-dd" } : { t: "s", v: String(v) };
        } else if (tipos[c] === "booleano") {
          const b = lerBooleano(v);
          folha[ref] = b === null ? { t: "s", v: String(v) } : { t: "b", v: b };
        } else folha[ref] = typeof v === "number" ? { t: "n", v } : { t: "s", v: String(v) };
      }
    }
    folha["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(linhas.length, 1), c: Math.max(tabela.colunas.length - 1, 0) } });
    folha["!cols"] = tabela.colunas.map((nome) => ({ wch: Math.min(40, Math.max(10, nome.length + 2)) }));
    XLSX.utils.book_append_sheet(livro, folha, nomeFolha(tabela.nome, usados));
  }

  const perfilFolha: (string | number)[][] = [["Tabela", "Coluna", "Tipo", "Linhas", "Em falta", "Valores únicos", "Mínimo", "Máximo", "Média", "Mediana", "Desvio-padrão", "Valores atípicos"]];
  const anomalias: (string | number)[][] = [["Tabela", "Gravidade", "Tipo", "Coluna", "Ocorrências", "Detalhe"]];
  const correlacoes: (string | number)[][] = [["Tabela", "Coluna A", "Coluna B", "Coeficiente de Pearson"]];
  for (const { tabela, perfil } of opcoes.tabelas) {
    for (const c of perfil.colunas) perfilFolha.push([tabela.nome, c.nome, c.tipo, c.n, c.nulos, c.unicos, c.estat?.min ?? "", c.estat?.max ?? "", c.estat?.media ?? "", c.estat?.mediana ?? "", c.estat?.desvio ?? "", c.outliers ?? ""]);
    for (const a of perfil.anomalias) anomalias.push([tabela.nome, a.gravidade, a.tipo, a.coluna ?? "", a.contagem, a.mensagem]);
    for (const c of perfil.correlacoes) correlacoes.push([tabela.nome, c.a, c.b, Number(c.r.toFixed(4))]);
  }
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(perfilFolha), "Perfil das colunas");
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(anomalias), "Anomalias");
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(correlacoes), "Correlações");
  const bytes = XLSX.write(livro, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer;
  descarregar(`${nomeSeguro(opcoes.nomeFicheiro)}-analise.xlsx`, bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
