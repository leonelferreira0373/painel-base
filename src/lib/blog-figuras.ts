// A figura de uma imagem do blog como HTML pronto a mostrar (o ficheiro exportado e a pré-visualização): a caixa com a proporção escolhida, a imagem rodada ou espelhada, a ligação, as etiquetas por cima (com o cartão que abre ao passar o rato, ao focar ou ao tocar) e a legenda. As mesmas classes («marca», «marca-ponto», «marca-cartao») têm o CSS em blog-css.ts, que é também o do editor. Funções puras.
import { cssDe } from "./blog-colagem";
import { figcaptionHtml, type AspetoDaLegenda } from "./blog-legenda";
import { estiloDoObjeto, temTransformacao, type TransformacaoDeObjeto } from "./blog-objetos";
import { especificacoes, etiquetasPublicas, ladoDoCartao, lugarDaEtiqueta, type EtiquetaDeImagem } from "./etiquetas-imagem";
const escaparHtml = (t: string): string => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** O HTML das etiquetas de uma imagem (só as que têm título e que o corte da caixa não esconde). */
export function htmlDasEtiquetas(etiquetas: EtiquetaDeImagem[], t: TransformacaoDeObjeto): string {
  return etiquetasPublicas(etiquetas)
    .flatMap((e) => {
      const lugar = lugarDaEtiqueta(e, t);
      if (!lugar) return [];
      const lado = ladoDoCartao(lugar);
      const linhas = especificacoes(e.texto);
      const pares = linhas.filter((l) => l.nome);
      const soltas = linhas.filter((l) => !l.nome);
      const titulo = e.url ? `<a href="${escaparHtml(e.url)}" target="_blank" rel="noopener noreferrer">${escaparHtml(e.titulo)}</a>` : escaparHtml(e.titulo);
      const cartao = `<span class="marca-cartao" role="tooltip"><b>${titulo}</b>${pares.length ? `<dl>${pares.map((l) => `<dt>${escaparHtml(l.nome!)}</dt><dd>${escaparHtml(l.valor)}</dd>`).join("")}</dl>` : ""}${soltas.map((l) => `<p>${escaparHtml(l.valor)}</p>`).join("")}</span>`;
      return [`<span class="marca marca-${lado.vertical} marca-${lado.horizontal}" style="left:${lugar.esquerda}%;top:${lugar.topo}%" tabindex="0" aria-label="${escaparHtml(e.titulo)}"><i class="marca-ponto"></i>${cartao}</span>`];
    })
    .join("");
}

export interface DadosDaFigura {
  src: string;
  alt: string;
  /** Largura em percentagem do texto. */
  largura: number;
  alinhar: string;
  envolver: boolean;
  legenda?: string;
  /** O aspeto da legenda (alinhamento, tamanho, cor…). */
  legendaAspeto?: AspetoDaLegenda;
  ligacao?: string;
  etiquetas: EtiquetaDeImagem[];
  transformacao: TransformacaoDeObjeto;
}

/** A figura inteira: a imagem (com a caixa e as etiquetas) e a legenda, alinhada, com largura ou a flutuar ao lado do texto. */
export function htmlDaFigura(d: DadosDaFigura): string {
  const t = d.transformacao;
  const comCaixa = temTransformacao(t);
  const { caixa, objeto } = estiloDoObjeto(t);
  const imagem = `<img src="${escaparHtml(d.src)}" alt="${d.alt}" style="${comCaixa ? cssDe(objeto) : "display:block;width:100%;height:auto;border-radius:8px"}">`;
  const comLigacao = d.ligacao ? `<a href="${escaparHtml(d.ligacao)}" target="_blank" rel="noopener noreferrer" style="display:block">${imagem}</a>` : imagem;
  const interior = comCaixa ? `<div style="${cssDe(caixa)}">${comLigacao}</div>` : comLigacao;
  const etiquetas = htmlDasEtiquetas(d.etiquetas, t);
  const corpo = etiquetas ? `<div style="position:relative">${interior}${etiquetas}</div>` : interior;
  const flutua = d.envolver && (d.alinhar === "esquerda" || d.alinhar === "direita");
  if (flutua) {
    const margem = d.alinhar === "esquerda" ? "0.3em 1.25em 0.5em 0" : "0.3em 0 0.5em 1.25em";
    return `<figure style="float:${d.alinhar === "esquerda" ? "left" : "right"};width:${d.largura}%;margin:${margem}">${corpo}${figcaptionHtml(d.legenda, d.legendaAspeto, "left", escaparHtml)}</figure>`;
  }
  const esquerda = d.alinhar === "esquerda" ? "0" : "auto";
  const direita = d.alinhar === "direita" ? "0" : "auto";
  return `<figure style="width:${d.largura}%;margin:1em ${direita} 1em ${esquerda}">${corpo}${figcaptionHtml(d.legenda, d.legendaAspeto, "center", escaparHtml)}</figure>`;
}
