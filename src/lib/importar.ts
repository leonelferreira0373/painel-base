// Importar para qualquer área: o que um ficheiro traz (uma tabela, uma zona DNS ou só o ficheiro) e como as colunas dele casam com as de um módulo. Funções puras; a janela de importar (components/exportar/) lê os ficheiros com o motor de extração e usa isto para as ligar ao módulo.
import type { Celula } from "./tipos";

export interface ColunaDoAlvo {
  chave: string;
  rotulo: string;
}

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Para cada cabeçalho do ficheiro, a coluna do módulo que lhe corresponde (pelo nome ou pelo rótulo, sem acentos nem maiúsculas); `null` se nenhuma. Cada coluna do módulo só casa uma vez. */
export function mapearColunas(cabecalhos: string[], colunas: ColunaDoAlvo[]): (string | null)[] {
  const usadas = new Set<string>();
  return cabecalhos.map((c) => {
    const n = norm(c);
    if (!n) return null;
    const alvo = colunas.find((x) => !usadas.has(x.chave) && (norm(x.chave) === n || norm(x.rotulo) === n));
    if (!alvo) return null;
    usadas.add(alvo.chave);
    return alvo.chave;
  });
}

export const textoDaCelula = (c: Celula | undefined): string => (c === null || c === undefined ? "" : typeof c === "number" ? String(c) : String(c).trim());

export interface LinhasParaImportar {
  linhas: Record<string, string>[];
  /** Quantas colunas do ficheiro casaram com as do módulo. */
  reconhecidas: number;
  /** Os cabeçalhos do ficheiro que não casaram (ficam de fora). */
  ignoradas: string[];
}

/** As linhas de uma tabela como o módulo as quer: chave da coluna → texto. Linhas sem nenhum valor reconhecido ficam de fora. */
export function linhasParaImportar(tabela: { colunas: string[]; linhas: Celula[][] }, colunas: ColunaDoAlvo[]): LinhasParaImportar {
  const mapa = mapearColunas(tabela.colunas, colunas);
  const linhas: Record<string, string>[] = [];
  for (const l of tabela.linhas) {
    const o: Record<string, string> = {};
    mapa.forEach((chave, i) => {
      const t = textoDaCelula(l[i]);
      if (chave && t) o[chave] = t;
    });
    if (Object.keys(o).length) linhas.push(o);
  }
  return { linhas, reconhecidas: mapa.filter(Boolean).length, ignoradas: tabela.colunas.filter((_, i) => !mapa[i] && tabela.colunas[i].trim()) };
}

/** O texto parece um ficheiro de zona BIND (tem $ORIGIN ou linhas «IN <tipo>»). */
export const pareceBind = (texto: string): boolean => /^\s*\$(ORIGIN|TTL)\b/im.test(texto) || /\sIN\s+(A|AAAA|CNAME|MX|TXT|NS|SRV|CAA|PTR|SOA)\s/i.test(texto);
