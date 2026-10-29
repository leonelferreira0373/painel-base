// A cor de cada gráfico: cada pessoa pinta o gráfico que quiser à sua maneira e a escolha fica guardada neste navegador, gráfico a gráfico (a chave é a página mais o título do gráfico). Funções puras para derivar uma paleta e tons de uma cor; o resto é guardar e ler.
import { useCallback, useEffect, useState } from "react";
import { hexParaHsv, hsvParaHex } from "./cor";

/** As cores prontas a escolher (a pessoa também pode escrever a sua). */
export const CORES_DE_GRAFICO: { rotulo: string; hex: string }[] = [
  { rotulo: "Azul", hex: "#155dfc" },
  { rotulo: "Verde-água", hex: "#0f766e" },
  { rotulo: "Verde", hex: "#16a34a" },
  { rotulo: "Âmbar", hex: "#d97706" },
  { rotulo: "Vermelho", hex: "#dc2626" },
  { rotulo: "Rosa", hex: "#db2777" },
  { rotulo: "Violeta", hex: "#7c3aed" },
  { rotulo: "Cinzento", hex: "#525252" },
];

/** A cor com que se começa quando ainda não há nenhuma escolhida (a cor de acento do painel). */
export const COR_DE_PARTIDA = "#155dfc";
export const corValida = (cor: unknown): cor is string => typeof cor === "string" && /^#[0-9a-f]{6}$/i.test(cor);

/** `n` cores que partem da cor escolhida (a primeira é ela) e rodam o matiz, para gráficos com várias partes (rosca, camadas). */
export function paletaDe(base: string, n: number): string[] {
  if (!corValida(base)) return [];
  const [h, s, v] = hexParaHsv(base);
  const passo = 360 / Math.max(3, n);
  return Array.from({ length: n }, (_, i) => (i === 0 ? base.toLowerCase() : hsvParaHex((h + i * passo) % 360, s, v)));
}

const canal = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);

/** A cor misturada com branco (`parte` de 0 a 1): o tom claro das barras que não são a destacada. */
export function clarear(hex: string, parte = 0.5): string {
  if (!corValida(hex)) return hex;
  const c = [0, 1, 2].map((i) => Math.round(canal(hex, i) + (255 - canal(hex, i)) * parte));
  return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** A cor com transparência: para o preenchimento por baixo de uma linha. */
export const comOpacidade = (hex: string, opacidade: number): string => (corValida(hex) ? `rgba(${canal(hex, 0)},${canal(hex, 1)},${canal(hex, 2)},${opacidade})` : hex);

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** A chave de um gráfico: a página onde está e o seu título («marketing/cliques:cliques-por-pagina»). */
export const idDoGrafico = (pagina: string, titulo: string): string => `${pagina.replace(/^\/+|\/+$/g, "")}:${sem(titulo)}`;

// ---------- guardar e ler (só no navegador) ----------

const CHAVE = "painel.cores-graficos";
export const EVENTO_CORES = "painel:cores-graficos";

export function lerCores(): Record<string, string> {
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(v).filter(([, c]) => corValida(c))) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Guarda a cor de um gráfico; `null` repõe a original. */
export function definirCor(id: string, cor: string | null): void {
  const todas = lerCores();
  if (cor && corValida(cor)) todas[id] = cor.toLowerCase();
  else delete todas[id];
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(todas));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_CORES));
}

/** A «gama»: a cor de todos os gráficos de uma vez. Cada gráfico pode ter a sua cor própria por cima. */
export const ID_DA_GAMA = "*";

/** A cor que vale para um gráfico: a sua, se a tem, senão a gama. */
export const corEfetiva = (todas: Record<string, string>, id?: string): string | undefined => (id ? todas[id] : undefined) ?? todas[ID_DA_GAMA];

/** Muda a gama inteira de uma vez: a cor passa a valer para todos os gráficos e as cores próprias de cada um saem. `null` repõe as originais de todos. */
export function definirGama(cor: string | null): void {
  const todas: Record<string, string> = cor && corValida(cor) ? { [ID_DA_GAMA]: cor.toLowerCase() } : {};
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(todas));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_CORES));
}

/** A cor de um gráfico (a sua, ou a da gama), como a mudar só a ele, e a cor que é só dele (se a tem). Todos os gráficos com o mesmo id mudam ao mesmo tempo. */
export function useCorDoGrafico(id?: string): [string | undefined, (cor: string | null) => void, string | undefined] {
  const [cores, setCores] = useState<Record<string, string>>({});
  useEffect(() => {
    const ler = () => setCores(lerCores());
    ler();
    window.addEventListener(EVENTO_CORES, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO_CORES, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  const mudar = useCallback((nova: string | null) => id && definirCor(id, nova), [id]);
  return [corEfetiva(cores, id), mudar, id ? cores[id] : undefined];
}
