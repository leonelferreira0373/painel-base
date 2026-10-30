// As ferramentas de cada objeto do texto do blog (uma imagem, um vídeo): proporções prontas (quadrado, 4:3, 16:9, retrato…) e rodar e espelhar (as etiquetas sobre uma imagem estão em etiquetas-imagem.ts). Funções puras: o editor e o ficheiro exportado desenham o objeto com o mesmo CSS.

export interface ProporcaoPronta {
  /** Vazio é a proporção original do ficheiro. */
  id: string;
  rotulo: string;
}

/** As proporções prontas de imagens e vídeos («largura / altura»). */
export const PROPORCOES: ProporcaoPronta[] = [
  { id: "", rotulo: "Original" },
  { id: "1 / 1", rotulo: "Quadrado 1:1" },
  { id: "4 / 5", rotulo: "Retrato 4:5" },
  { id: "9 / 16", rotulo: "Vertical 9:16" },
  { id: "3 / 4", rotulo: "Retrato 3:4" },
  { id: "4 / 3", rotulo: "Clássico 4:3" },
  { id: "3 / 2", rotulo: "Fotografia 3:2" },
  { id: "16 / 9", rotulo: "Panorâmico 16:9" },
  { id: "21 / 9", rotulo: "Cinema 21:9" },
];

/** Uma proporção escrita («16 / 9») como número (1,777…); vazia ou inválida dá `undefined`. */
export function numeroDaProporcao(p: string | undefined): number | undefined {
  const m = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(p ?? "");
  const n = m ? Number(m[1]) / Number(m[2]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export interface TransformacaoDeObjeto {
  /** A proporção escolhida (vazia: a do ficheiro). */
  proporcao?: string;
  /** A proporção do ficheiro (largura / altura), conhecida quando carrega. */
  razao?: number;
  /** 0, 90, 180 ou 270 graus. */
  rotacao?: number;
  espelhoH?: boolean;
  espelhoV?: boolean;
}

type Estilo = Record<string, string | number>;

export const eRotacaoDeQuarto = (r: number | undefined) => r === 90 || r === 270;
export const proximaRotacao = (r: number | undefined, sentido: 1 | -1 = 1) => (((r ?? 0) + 90 * sentido) % 360 + 360) % 360;

/** O CSS da caixa e o da imagem (ou do vídeo) dentro dela: a caixa tem a proporção final e corta o que sobra; o objeto roda e espelha-se ao centro. */
export function estiloDoObjeto(t: TransformacaoDeObjeto): { caixa: Estilo; objeto: Estilo } {
  const razao = t.razao && t.razao > 0 ? t.razao : 4 / 3;
  const quarto = eRotacaoDeQuarto(t.rotacao);
  const caixaRazao = numeroDaProporcao(t.proporcao) ?? (quarto ? 1 / razao : razao);
  // com um quarto de volta o objeto é desenhado com as medidas trocadas e depois rodado, para encher a caixa
  const objeto: Estilo = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: quarto ? `${(100 / caixaRazao).toFixed(3)}%` : "100%",
    height: quarto ? `${(100 * caixaRazao).toFixed(3)}%` : "100%",
    objectFit: "cover",
    maxWidth: "none",
    transform: `translate(-50%, -50%) rotate(${t.rotacao ?? 0}deg) scale(${t.espelhoH ? -1 : 1}, ${t.espelhoV ? -1 : 1})`,
  };
  return { caixa: { position: "relative", overflow: "hidden", aspectRatio: String(caixaRazao), borderRadius: 8 }, objeto };
}

/** Só vale a pena a caixa quando o objeto muda: sem proporção, rotação nem espelho a imagem desenha-se como sempre. */
export const temTransformacao = (t: TransformacaoDeObjeto): boolean => !!numeroDaProporcao(t.proporcao) || !!t.rotacao || !!t.espelhoH || !!t.espelhoV;

/** O endereço do vídeo com o corte («#t=2,9»: os navegadores só tocam esse pedaço). */
export const comCorte = (src: string, inicio: number, fim: number): string => (inicio > 0 || fim > 0 ? `${src}#t=${inicio > 0 ? inicio : 0}${fim > 0 ? `,${fim}` : ""}` : src);
