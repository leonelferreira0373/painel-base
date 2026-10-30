// A colagem de imagens do blog, com formatos já prontos: duas colunas, três, quatro ou seis numa só vista, mosaico (uma grande e as outras ao lado), uma grande e duas, faixa e carrossel. Aqui estão os formatos, o CSS de cada um e o texto de CSS para o ficheiro exportado. Funções puras; o editor desenha-a em components/conteudo/ColagemDoBlog.tsx.

export type ModeloDeColagem = "duas" | "tres" | "quatro" | "seis" | "mosaico" | "topo" | "faixa" | "carrossel" | "apresentacao";

/** Os formatos prontos; `ideal` é o número de imagens para que foram pensados (também desenha a miniatura). */
export const MODELOS_DE_COLAGEM: { id: ModeloDeColagem; rotulo: string; ideal: number }[] = [
  { id: "duas", rotulo: "Duas colunas", ideal: 2 },
  { id: "tres", rotulo: "Três colunas", ideal: 3 },
  { id: "quatro", rotulo: "Quatro numa vista", ideal: 4 },
  { id: "seis", rotulo: "Seis numa vista", ideal: 6 },
  { id: "mosaico", rotulo: "Mosaico", ideal: 4 },
  { id: "topo", rotulo: "Uma grande e duas", ideal: 3 },
  { id: "faixa", rotulo: "Em faixa", ideal: 3 },
  { id: "carrossel", rotulo: "Carrossel", ideal: 4 },
  { id: "apresentacao", rotulo: "Apresentação automática", ideal: 3 },
];

/** O formato que se propõe para um número de imagens. */
export const modeloPorOmissao = (n: number): ModeloDeColagem => (n <= 2 ? "duas" : n === 3 ? "topo" : n === 4 ? "quatro" : "seis");

type Estilo = Record<string, string | number>;

/** O CSS da grelha de cada formato. `n` é o número de imagens. */
export function estiloDaColagem(modelo: ModeloDeColagem, n: number): Estilo {
  const base: Estilo = { display: "grid", gap: 6 };
  switch (modelo) {
    case "tres":
    case "seis":
      return { ...base, gridTemplateColumns: "repeat(3, 1fr)" };
    case "mosaico":
      return { ...base, gridTemplateColumns: "2fr 1fr", gridTemplateRows: `repeat(${Math.max(1, n - 1)}, 1fr)`, aspectRatio: "4 / 3" };
    case "faixa":
      return { ...base, gridTemplateColumns: `repeat(${Math.max(1, n)}, 1fr)` };
    case "carrossel":
      return { display: "flex", gap: 6, overflowX: "auto", scrollSnapType: "x mandatory" };
    case "apresentacao":
      return { position: "relative", overflow: "hidden", aspectRatio: "16 / 9", borderRadius: 4 };
    default:
      return { ...base, gridTemplateColumns: "repeat(2, 1fr)" };
  }
}

/** O CSS de cada imagem da grelha. */
export function estiloDaCelula(modelo: ModeloDeColagem, indice: number, n: number): Estilo {
  const comum: Estilo = { width: "100%", objectFit: "cover", borderRadius: 4, display: "block" };
  switch (modelo) {
    case "mosaico":
      // a primeira ocupa todas as linhas
      return { ...comum, height: "100%", ...(indice === 0 ? { gridRow: `span ${Math.max(1, n - 1)}` } : {}) };
    case "topo":
      return { ...comum, height: "auto", ...(indice === 0 ? { gridColumn: "span 2", aspectRatio: "16 / 9" } : { aspectRatio: "4 / 3" }) };
    case "quatro":
    case "seis":
      return { ...comum, height: "auto", aspectRatio: "4 / 3" };
    case "faixa":
      return { ...comum, height: "auto", aspectRatio: "3 / 4" };
    case "carrossel":
      return { ...comum, height: "auto", flex: "0 0 100%", scrollSnapAlign: "start", aspectRatio: "16 / 9" };
    case "apresentacao":
      // as imagens aparecem uma a uma, de quatro em quatro segundos, em ciclo (os «keyframes» estão em blog-css.ts)
      return { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0, animationName: `bl-slide-${Math.min(10, Math.max(2, n))}`, animationDuration: `${Math.max(2, n) * 4}s`, animationDelay: `${indice * 4}s`, animationIterationCount: "infinite", animationTimingFunction: "ease-in-out" };
    default:
      return { ...comum, height: "auto", aspectRatio: "1 / 1" };
  }
}

const SEM_UNIDADE = new Set(["opacity", "inset", "position", "overflow", "animationName", "animationDuration", "animationDelay", "animationIterationCount", "animationTimingFunction", "aspectRatio", "gridRow", "gridColumn", "gridTemplateColumns", "gridTemplateRows", "display", "objectFit", "width", "height", "flex", "overflowX", "scrollSnapType", "scrollSnapAlign"]);

/** Um estilo como texto de CSS («grid-template-columns:repeat(2, 1fr);gap:6px»). */
export const cssDe = (e: Estilo): string =>
  Object.entries(e)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${typeof v === "number" && !SEM_UNIDADE.has(k) ? `${v}px` : v}`)
    .join(";");
