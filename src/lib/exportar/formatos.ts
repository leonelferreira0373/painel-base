// Os formatos em que se pode exportar qualquer coisa do painel, e quais estão ligados nas definições (Definições da conta > Exportar). O que cada fonte de dados sabe gerar e o que a pessoa deixou ligado dá os formatos que a janela de exportar oferece. Funções puras.
import type { Icone } from "@/components/Icones";
import type { DadosExportaveis } from "@/lib/exportar-dados";
import type { RegistoDns } from "@/lib/dns-bind";
import type { DocumentoRico } from "@/lib/pesquisa-documento";

export type FormatoDeExportar = "pdf" | "csv" | "xlsx" | "docx" | "txt" | "md" | "html" | "json" | "png" | "jpg" | "svg" | "bind" | "zip";

export interface InfoDoFormato {
  id: FormatoDeExportar;
  rotulo: string;
  extensao: string;
  mime: string;
  icone: Icone;
}

export const FORMATOS: InfoDoFormato[] = [
  { id: "pdf", rotulo: "PDF", extensao: "pdf", mime: "application/pdf", icone: "pdf" },
  { id: "csv", rotulo: "CSV", extensao: "csv", mime: "text/csv;charset=utf-8", icone: "tabela" },
  { id: "xlsx", rotulo: "Excel", extensao: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", icone: "excel" },
  { id: "docx", rotulo: "Word", extensao: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", icone: "artigo" },
  { id: "txt", rotulo: "Texto (TXT)", extensao: "txt", mime: "text/plain;charset=utf-8", icone: "ficheiro" },
  { id: "md", rotulo: "Markdown", extensao: "md", mime: "text/markdown;charset=utf-8", icone: "codigo" },
  { id: "html", rotulo: "Página web (HTML)", extensao: "html", mime: "text/html;charset=utf-8", icone: "globo" },
  { id: "json", rotulo: "JSON", extensao: "json", mime: "application/json", icone: "json" },
  { id: "png", rotulo: "Imagem PNG", extensao: "png", mime: "image/png", icone: "imagem" },
  { id: "jpg", rotulo: "Imagem JPG", extensao: "jpg", mime: "image/jpeg", icone: "imagem" },
  { id: "svg", rotulo: "Imagem SVG", extensao: "svg", mime: "image/svg+xml", icone: "galeria" },
  { id: "bind", rotulo: "BIND (zona DNS)", extensao: "zone", mime: "text/plain;charset=utf-8", icone: "globo" },
  { id: "zip", rotulo: "ZIP", extensao: "zip", mime: "application/zip", icone: "pasta" },
];

export const infoDoFormato = (id: FormatoDeExportar): InfoDoFormato => FORMATOS.find((f) => f.id === id) ?? FORMATOS[0];

/** O que a pessoa deixou ligado: sem nada escrito, tudo está ligado. */
export type PreferenciasDeExportar = Partial<Record<FormatoDeExportar, boolean>>;
export const estaLigado = (prefs: PreferenciasDeExportar | undefined, f: FormatoDeExportar): boolean => prefs?.[f] !== false;

/** Uma coisa que se pode exportar: uma tabela, e/ou os registos de uma zona DNS, e/ou ficheiros que ela própria sabe gerar (o relatório em PDF da análise, por exemplo). */
export interface FonteDeExportacao {
  nome: string;
  titulo: string;
  dados?: DadosExportaveis;
  bind?: { zona: string; registos: RegistoDns[] };
  /** Um documento rico (a pesquisa a fundo): sai em PDF, Word, Markdown, HTML, texto e JSON, e as suas tabelas em CSV e Excel. */
  documento?: DocumentoRico;
  gerar?: Partial<Record<FormatoDeExportar, () => Promise<Blob>>>;
}

const DA_TABELA: FormatoDeExportar[] = ["pdf", "csv", "xlsx", "docx", "txt", "json", "png", "jpg", "svg"];

/** Os formatos que esta fonte sabe gerar, sem o ZIP (que só junta os outros). */
export function formatosDaFonte(f: FonteDeExportacao): FormatoDeExportar[] {
  const s = new Set<FormatoDeExportar>();
  if (f.dados) DA_TABELA.forEach((x) => s.add(x));
  if (f.bind) s.add("bind");
  if (f.documento) {
    for (const x of ["pdf", "docx", "txt", "md", "html", "json"] as FormatoDeExportar[]) s.add(x);
    if (f.documento.blocos.some((b) => b.tipo === "tabela" || b.tipo === "grafico")) (["csv", "xlsx"] as FormatoDeExportar[]).forEach((x) => s.add(x));
  }
  for (const k of Object.keys(f.gerar ?? {}) as FormatoDeExportar[]) s.add(k);
  return FORMATOS.map((x) => x.id).filter((x) => x !== "zip" && s.has(x));
}

/** Os formatos que a janela oferece: os da fonte que estão ligados nas definições, e o ZIP se estiver ligado e houver mais de um. */
export function formatosOferecidos(f: FonteDeExportacao, prefs: PreferenciasDeExportar | undefined): { formatos: FormatoDeExportar[]; zip: boolean; desligados: FormatoDeExportar[] } {
  const da = formatosDaFonte(f);
  const formatos = da.filter((x) => estaLigado(prefs, x));
  return { formatos, zip: estaLigado(prefs, "zip") && formatos.length > 1, desligados: da.filter((x) => !estaLigado(prefs, x)) };
}

/** O nome do ficheiro: o nome da fonte sem símbolos, mais a extensão do formato. */
export function nomeDoFicheiro(nome: string, f: FormatoDeExportar): string {
  const base = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "dados";
  return `${base}.${infoDoFormato(f).extensao}`;
}
