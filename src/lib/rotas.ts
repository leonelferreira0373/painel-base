// As rotas do site vistas por quem não programa: em vez de «/blog/como-escolher» o painel mostra o nome da página, «Blog › Como escolher», com um pill por pedaço e um chevron entre eles. Funções puras; quem as desenha é `<Rota>` (components/Frase.tsx). Os endereços técnicos (/api/…, /v1/…, ficheiros) não se traduzem: são para quem programa.
import { NOMES_DE_PAGINAS } from "@/dados/paginas";

/** O que separa os pedaços numa frase simples (um gráfico, um título): no ecrã, em vez dele, vai um chevron. */
export const SEPARADOR_DE_ROTA = " › ";

const TECNICO = /^\/(api|v\d+|_next|static|\.well-known)(\/|$)|\.[a-z0-9]{2,5}$|^\/\./i;

/** Um endereço de página («/precos», «/blog/novidades?x=1»), não uma frase nem um endereço técnico. */
export function eRota(valor: string): boolean {
  const v = valor.trim();
  return /^\/[^\s]*$/.test(v) && !v.startsWith("//") && !TECNICO.test(v.split(/[?#]/)[0]);
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function descodificar(t: string): string {
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

/** Os nomes de cada pedaço: «/servicos/consultoria» → [«Serviços», «Consultoria»]; «/» → [«Início»]. */
export function partesDaRota(caminho: string): string[] {
  const limpo = caminho.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
  if (!limpo) return [NOMES_DE_PAGINAS[""] ?? "Início"];
  return limpo.split("/").map((seg) => {
    const s = descodificar(seg);
    return NOMES_DE_PAGINAS[s.toLowerCase()] ?? maiuscula(s.replace(/[-_]+/g, " ").trim());
  });
}

/** O nome da página em texto simples: «Blog › Como escolher». */
export const textoDaRota = (caminho: string): string => partesDaRota(caminho).join(SEPARADOR_DE_ROTA);

/** O nome da página como frase do painel (`<Frase>`): um pill por pedaço e um chevron entre eles. */
export const frasaDaRota = (caminho: string): string => partesDaRota(caminho).map((p) => `«${p}»`).join(" > ");
