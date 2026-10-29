// O que a janela «Ver detalhes» e a janela «Ver o mapa» mostram de um gráfico: a legenda com os totais, os principais contribuintes (com a sua parte do total) e, se os elementos são países, os dados do mapa. Puro: só olha para a especificação do gráfico.
import type { GraficoSpec } from "@/components/graficos/Graficos";
import { NOMES_DE_PAISES } from "@/dados/paises";

export interface LinhaDeContribuinte {
  chave: string;
  nome: string;
  valor: number;
  /** De 0 a 1. */
  parte: number;
}

export interface ItemDeLegenda {
  nome: string;
  /** O valor já escrito (total, média…). */
  valor: string;
}

export interface Detalhes {
  legenda: ItemDeLegenda[];
  contribuintes: LinhaDeContribuinte[];
  /** O que os contribuintes medem, para o cabeçalho da coluna («Total», «Média»). */
  medida: string;
}

const pt = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 });
const soma = (v: number[]) => v.reduce((s, x) => s + x, 0);
const media = (v: number[]) => (v.length ? soma(v) / v.length : 0);

function contribuintes(itens: { chave: string; nome: string; valor: number }[]): LinhaDeContribuinte[] {
  const total = soma(itens.map((i) => Math.max(0, i.valor)));
  return [...itens].sort((a, b) => b.valor - a.valor).map((i) => ({ ...i, parte: total > 0 ? Math.max(0, i.valor) / total : 0 }));
}

/** Os detalhes de um gráfico; `null` se o tipo não tem (a dispersão e a matriz de correlações não têm contribuintes). */
export function detalhesDe(spec: GraficoSpec): Detalhes | null {
  if (spec.tipo === "barras" || spec.tipo === "rosca" || spec.tipo === "colunas") {
    const linhas = contribuintes(spec.pontos.map((p) => ({ chave: p.chave, nome: p.rotulo, valor: p.valor })));
    return { legenda: linhas.slice(0, 6).map((l) => ({ nome: l.nome, valor: pt.format(l.valor) })), contribuintes: linhas, medida: "Total" };
  }
  if (spec.tipo === "histograma") {
    const linhas = contribuintes(spec.classes.map((c) => ({ chave: `${c.de}-${c.ate}`, nome: `${pt.format(c.de)} – ${pt.format(c.ate)}`, valor: c.n })));
    return { legenda: linhas.slice(0, 6).map((l) => ({ nome: l.nome, valor: pt.format(l.valor) })), contribuintes: linhas, medida: "Registos" };
  }
  if (spec.tipo === "empilhadas") {
    const linhas = contribuintes(spec.series.map((s) => ({ chave: s.nome, nome: s.nome, valor: soma(s.valores) })));
    return { legenda: linhas.slice(0, 6).map((l) => ({ nome: l.nome, valor: pt.format(l.valor) })), contribuintes: linhas, medida: "Total" };
  }
  if (spec.tipo === "linhas") {
    const linhas = contribuintes(spec.series.map((s) => ({ chave: s.nome, nome: s.nome, valor: media(s.valores) })));
    return { legenda: linhas.map((l) => ({ nome: l.nome, valor: pt.format(l.valor) })), contribuintes: linhas, medida: "Média" };
  }
  if (spec.tipo === "linha") {
    const v = spec.pontos.map((p) => p.valor);
    if (v.length === 0) return null;
    return {
      legenda: [
        { nome: "Total", valor: pt.format(soma(v)) },
        { nome: "Média", valor: pt.format(media(v)) },
        { nome: "Máximo", valor: pt.format(Math.max(...v)) },
        { nome: "Mínimo", valor: pt.format(Math.min(...v)) },
      ],
      contribuintes: [],
      medida: "Valor",
    };
  }
  return null;
}

// ---------- o mapa ----------

/** Os códigos de duas letras mais usados, com o nome que o mapa-múndi usa. */
const CODIGOS: Record<string, string> = { AO: "Angola", PT: "Portugal", BR: "Brazil", US: "United States of America", ZA: "South Africa", MZ: "Mozambique", RU: "Russia", FR: "France", GB: "United Kingdom", NA: "Namibia", CN: "China", AE: "United Arab Emirates" };

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** O nome do país no mapa-múndi (em inglês) a partir de um rótulo: o próprio nome, o nome em português ou o código de duas letras; `null` se não é um país. */
export function paisNoMapa(rotulo: string): string | null {
  if (NOMES_DE_PAISES[rotulo]) return rotulo;
  const porNome = Object.entries(NOMES_DE_PAISES).find(([, pt2]) => sem(pt2) === sem(rotulo));
  if (porNome) return porNome[0];
  return CODIGOS[rotulo.trim().toUpperCase()] ?? null;
}

/** Os dados do mapa de um gráfico cujos elementos são países (pelo menos 2, e 60 % dos elementos); `null` se não são. */
export function dadosDoMapa(spec: GraficoSpec): { nome: string; valor: number }[] | null {
  if (spec.tipo !== "barras" && spec.tipo !== "rosca" && spec.tipo !== "colunas") return null;
  const dados = new Map<string, number>();
  let conhecidos = 0;
  for (const p of spec.pontos) {
    const nome = paisNoMapa(p.rotulo);
    if (!nome) continue;
    conhecidos++;
    dados.set(nome, (dados.get(nome) ?? 0) + p.valor);
  }
  if (conhecidos < 2 || conhecidos < spec.pontos.length * 0.6) return null;
  return [...dados.entries()].map(([nome, valor]) => ({ nome, valor }));
}
