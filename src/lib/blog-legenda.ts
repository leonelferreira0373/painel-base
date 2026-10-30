// O aspeto da legenda de uma figura (imagem, colagem, áudio, vídeo ou incorporação): alinhamento, tamanho, cor, negrito, itálico, maiúsculas e tipo de letra. Guarda-se num texto curto sem aspas («alinhar:left;tamanho:16»), que cabe num atributo do HTML, e uma só conta serve o campo do editor e o ficheiro exportado.
import { corValida } from "./cores-graficos";

export type AlinhamentoDaLegenda = "left" | "center" | "right" | "justify";

export interface AspetoDaLegenda {
  alinhar?: AlinhamentoDaLegenda;
  /** O tamanho em píxeis. */
  tamanho?: number;
  /** Uma cor de seis dígitos. */
  cor?: string;
  negrito?: boolean;
  italico?: boolean;
  maiusculas?: boolean;
  fonte?: string;
}

export const ALINHAMENTOS_DA_LEGENDA: AlinhamentoDaLegenda[] = ["left", "center", "right", "justify"];
/** O tamanho de partida (0,85 rem do texto). */
export const TAMANHO_DA_LEGENDA = 14;
export const TAMANHOS_DA_LEGENDA = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28];

/** O aspeto guardado num atributo; o que não existe ou não serve fica de fora. */
export function lerAspetoDaLegenda(texto: string | null | undefined): AspetoDaLegenda {
  const a: AspetoDaLegenda = {};
  for (const par of (texto ?? "").split(";")) {
    const i = par.indexOf(":");
    if (i < 0) continue;
    const chave = par.slice(0, i).trim();
    let valor: string;
    try {
      valor = decodeURIComponent(par.slice(i + 1).trim());
    } catch {
      continue;
    }
    if (chave === "alinhar" && (ALINHAMENTOS_DA_LEGENDA as string[]).includes(valor)) a.alinhar = valor as AlinhamentoDaLegenda;
    else if (chave === "tamanho" && Number.isFinite(Number(valor)) && Number(valor) >= 8 && Number(valor) <= 120) a.tamanho = Math.round(Number(valor));
    else if (chave === "cor" && corValida(valor)) a.cor = valor.toLowerCase();
    else if (chave === "negrito") a.negrito = valor === "1";
    else if (chave === "italico") a.italico = valor === "1";
    else if (chave === "maiusculas" && valor === "1") a.maiusculas = true;
    else if (chave === "fonte" && valor && valor.length <= 200 && !/[;<>{}\\]/.test(valor)) a.fonte = valor;
  }
  return a;
}

/** O aspeto como se guarda no atributo (vazio se não houver nada de especial). */
export function escreverAspetoDaLegenda(a: AspetoDaLegenda): string {
  const partes: string[] = [];
  if (a.alinhar) partes.push(`alinhar:${a.alinhar}`);
  if (a.tamanho) partes.push(`tamanho:${Math.round(a.tamanho)}`);
  if (corValida(a.cor)) partes.push(`cor:${encodeURIComponent(a.cor.toLowerCase())}`);
  if (a.negrito !== undefined) partes.push(`negrito:${a.negrito ? 1 : 0}`);
  if (a.italico) partes.push("italico:1");
  if (a.maiusculas) partes.push("maiusculas:1");
  if (a.fonte) partes.push(`fonte:${encodeURIComponent(a.fonte)}`);
  return partes.join(";");
}

/** O estilo do campo da legenda no editor (propriedades de CSS em objeto). A cor de partida vem da classe do campo. */
export function estiloDaLegenda(a: AspetoDaLegenda): Record<string, string | number> {
  return {
    textAlign: a.alinhar ?? "center",
    fontSize: `${a.tamanho ?? TAMANHO_DA_LEGENDA}px`,
    fontWeight: a.negrito ? 600 : 400,
    fontStyle: a.italico ? "italic" : "normal",
    ...(corValida(a.cor) ? { color: a.cor } : {}),
    ...(a.maiusculas ? { textTransform: "uppercase", letterSpacing: "0.04em" } : {}),
    ...(a.fonte ? { fontFamily: a.fonte } : {}),
  };
}

/** A legenda no HTML exportado, com o aspeto escolhido. `texto` já vem escrito como HTML; `escapar` protege o tipo de letra, que é texto livre. Sem escolhas sai como sempre saiu: pequena, mais clara e ao centro (ou à esquerda quando a imagem flutua). */
export function figcaptionHtml(texto: string | undefined, aspeto: AspetoDaLegenda | undefined, alinharPorOmissao = "center", escapar: (t: string) => string = (t) => t): string {
  if (!texto) return "";
  const a = aspeto ?? {};
  const estilo = [
    `font-size:${a.tamanho ? `${a.tamanho}px` : ".85em"}`,
    "line-height:1.4",
    ...(corValida(a.cor) ? [`color:${a.cor}`] : ["opacity:.7"]),
    ...(a.negrito ? ["font-weight:600"] : []),
    ...(a.italico ? ["font-style:italic"] : []),
    ...(a.maiusculas ? ["text-transform:uppercase", "letter-spacing:.04em"] : []),
    ...(a.fonte ? [`font-family:${escapar(a.fonte)}`] : []),
    "margin-top:.45em",
    `text-align:${a.alinhar ?? alinharPorOmissao}`,
  ].join(";");
  return `<figcaption style="${estilo}">${texto}</figcaption>`;
}

/** O atributo do nó do editor que guarda o aspeto da legenda (o mesmo nas quatro figuras). */
export const ATRIBUTO_DO_ASPETO_DA_LEGENDA = { default: "", parseHTML: (e: HTMLElement) => e.getAttribute("data-legenda-estilo") ?? "" };

/** O atributo do HTML que leva o aspeto (nada se não houver). */
export const aspetoDaLegendaNoHtml = (valor: unknown): Record<string, string> => (typeof valor === "string" && valor ? { "data-legenda-estilo": valor } : {});
