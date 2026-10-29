// Copiar dados a sério: o que se copia de um cartão, de uma lista ou de uma linha não é só o valor que se vê, é a informação toda e estruturada (o título, de onde vem, quando se copiou e cada campo com o seu nome). Vai para a área de transferência em duas formas: texto (JSON, para quem o lê ou o dá a uma IA) e tabela HTML (para colar no Word, no Excel ou no Google Docs). Funções puras e a escrita na área de transferência.
import type { DadosExportaveis } from "./exportar-dados";

export interface PayloadEstruturado {
  /** O que é: «cartao», «lista», «registo»… */
  tipo: string;
  titulo: string;
  /** A página de onde vem. */
  origem?: string;
  geradoEm: string;
  dados: unknown;
}

const dataDe = (agora: Date) => agora.toISOString();

/** Uma tabela como estrutura: as colunas e cada linha como objeto com o nome das colunas. */
export function estruturaDeTabela(d: DadosExportaveis, origem?: string, agora = new Date()): PayloadEstruturado {
  return { tipo: "lista", titulo: d.titulo, ...(origem ? { origem } : {}), geradoEm: dataDe(agora), dados: { colunas: d.colunas, linhas: d.linhas.map((l) => Object.fromEntries(d.colunas.map((c, i) => [c, l[i] ?? null]))) } };
}

/** Um registo (uma linha, uma conta, um commit…) com todos os campos e os nomes que lhes damos. */
export function estruturaDeRegisto(titulo: string, campos: Record<string, unknown>, origem?: string, agora = new Date()): PayloadEstruturado {
  return { tipo: "registo", titulo, ...(origem ? { origem } : {}), geradoEm: dataDe(agora), dados: campos };
}

export const textoDe = (p: PayloadEstruturado): string => JSON.stringify(p, null, 2);

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const celula = (v: unknown): string => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** A mesma informação como tabela HTML: uma tabela de linhas e colunas, ou de «campo» e «valor» num registo. */
export function htmlDe(p: PayloadEstruturado): string {
  const d = p.dados as { colunas?: string[]; linhas?: Record<string, unknown>[] } | Record<string, unknown>;
  const titulo = `<p><strong>${escapar(p.titulo)}</strong></p>`;
  if (d && typeof d === "object" && Array.isArray((d as { colunas?: string[] }).colunas) && Array.isArray((d as { linhas?: unknown[] }).linhas)) {
    const { colunas, linhas } = d as { colunas: string[]; linhas: Record<string, unknown>[] };
    return `${titulo}<table border="1" cellspacing="0" cellpadding="4"><thead><tr>${colunas.map((c) => `<th>${escapar(c)}</th>`).join("")}</tr></thead><tbody>${linhas.map((l) => `<tr>${colunas.map((c) => `<td>${escapar(celula(l[c]))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  const campos = d && typeof d === "object" ? Object.entries(d as Record<string, unknown>) : [["valor", d]];
  return `${titulo}<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${campos.map(([k, v]) => `<tr><td>${escapar(k)}</td><td>${escapar(celula(v))}</td></tr>`).join("")}</tbody></table>`;
}

/** Copia a estrutura para a área de transferência (texto e tabela); `false` se o navegador não deixar. */
export async function copiarEstruturado(p: PayloadEstruturado): Promise<boolean> {
  const texto = textoDe(p);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([texto], { type: "text/plain" }), "text/html": new Blob([htmlDe(p)], { type: "text/html" }) })]);
      return true;
    }
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      return false;
    }
  }
}
