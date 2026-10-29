// Descarrega linhas de um módulo de registos como CSV (separado por ponto e vírgula, abre direto no Excel em português).
import { descarregar } from "../conta/Pecas";

export function copiarCsv(nome: string, linhas: { [k: string]: string | number }[]): void {
  if (linhas.length === 0) return;
  const colunas = Object.keys(linhas[0]);
  const celula = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const texto = [colunas.map(celula).join(";"), ...linhas.map((l) => colunas.map((c) => celula(l[c])).join(";"))].join("\n");
  descarregar(nome, `﻿${texto}`, "text/csv;charset=utf-8");
}
