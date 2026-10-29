// A memória do assistente aceita qualquer ficheiro: PDF, Excel, Word, CSV, texto, JSON, XML, HTML, zonas BIND, e-mails, imagens (com OCR) e arquivos ZIP. Lê-se com o mesmo motor que a análise de dados e o resultado (texto e tabelas) passa a texto simples para o assistente consultar. Nunca se recusa um ficheiro: se não tem texto legível, guarda-se à mesma, desligado.
import type { Extraido } from "./tipos";

/** O máximo de caracteres que um só documento leva para a memória. */
export const MAXIMO_POR_DOCUMENTO = 200_000;
/** O máximo de linhas de cada tabela que passam para o texto. */
export const MAXIMO_DE_LINHAS_POR_TABELA = 500;

const celula = (c: string | number | boolean | null | undefined): string => (c === null || c === undefined ? "" : String(c).replace(/\s+/g, " ").trim());

/** O texto de tudo o que se extraiu de um ficheiro: o texto corrido e cada tabela como linhas «coluna: valor | coluna: valor». */
export function textoDosExtraidos(lista: Extraido[]): string {
  const partes: string[] = [];
  for (const e of lista) {
    const cabecalho = lista.length > 1 || e.dentroDe ? `# ${e.dentroDe ? `${e.dentroDe} › ` : ""}${e.nome}` : "";
    if (cabecalho) partes.push(cabecalho);
    if (e.texto.trim()) partes.push(e.texto.trim());
    for (const t of e.tabelas) {
      const linhas = t.linhas.slice(0, MAXIMO_DE_LINHAS_POR_TABELA).map((l) => t.colunas.map((c, i) => `${c}: ${celula(l[i])}`).join(" | "));
      partes.push([`## ${t.nome}`, ...linhas, t.linhas.length > MAXIMO_DE_LINHAS_POR_TABELA ? `… mais ${t.linhas.length - MAXIMO_DE_LINHAS_POR_TABELA} linhas` : ""].filter(Boolean).join("\n"));
    }
  }
  const texto = partes.join("\n\n").trim();
  return texto.length > MAXIMO_POR_DOCUMENTO ? `${texto.slice(0, MAXIMO_POR_DOCUMENTO)}\n… (o resto do ficheiro não coube na memória)` : texto;
}
