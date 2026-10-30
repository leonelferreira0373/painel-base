// As etiquetas nas imagens (smart tags, como as do Instagram e as do painel do Hotel Miragem): pontos postos sobre uma foto, cada um com um título e especificações («Nome: valor», uma por linha) e, se quiser, uma ligação. Aqui está o que é puro: os limites e a validação dos campos, as especificações, onde fica um ponto numa caixa que corta a imagem («cover») e quando se roda ou espelha, e para que lado abre o cartão. O desenho está em blog-css.ts (o mesmo no editor e no ficheiro exportado) e o editor em components/conteudo/ImagemDoBlog.tsx.
import { eRotacaoDeQuarto, numeroDaProporcao, type TransformacaoDeObjeto } from "./blog-objetos";

/** Os máximos dos campos (os do painel do Miragem). */
export const LIMITES_ETIQUETA = { titulo: 80, texto: 280 } as const;

export interface EtiquetaDeImagem {
  id: string;
  /** A posição, em percentagem da imagem inteira (0 a 100). */
  x: number;
  y: number;
  titulo: string;
  /** As especificações: uma por linha, «Nome: valor» ou texto simples. */
  texto: string;
  /** Uma ligação (opcional): o título do cartão leva lá. */
  url?: string;
}

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Uma percentagem da imagem: dentro de 0 a 100 e com 2 casas (o que não é número fica a meio). */
export const limitarPercentagem = (valor: number): number => (Number.isFinite(valor) ? Math.round(entre(valor, 0, 100) * 100) / 100 : 50);

/** Uma etiqueta nova, posta onde se tocou. */
export const etiquetaNova = (id: string, x: number, y: number): EtiquetaDeImagem => ({ id, x: limitarPercentagem(x), y: limitarPercentagem(y), titulo: "", texto: "" });

/** As etiquetas lidas de onde estiverem guardadas (texto JSON ou lista): o que está estragado fica de fora e os campos cortam-se aos limites. */
export function lerEtiquetas(v: unknown): EtiquetaDeImagem[] {
  let lista: unknown = v;
  if (typeof v === "string") {
    try {
      lista = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(lista)) return [];
  return lista.flatMap((m, i): EtiquetaDeImagem[] => {
    const o = m as Partial<EtiquetaDeImagem>;
    if (typeof o?.x !== "number" || typeof o.y !== "number" || !Number.isFinite(o.x) || !Number.isFinite(o.y)) return [];
    const url = typeof o.url === "string" && /^(https?:\/\/|mailto:|\/)/i.test(o.url.trim()) ? o.url.trim() : undefined;
    return [{ id: typeof o.id === "string" && o.id ? o.id : `e${i}`, x: limitarPercentagem(o.x), y: limitarPercentagem(o.y), titulo: typeof o.titulo === "string" ? o.titulo.slice(0, LIMITES_ETIQUETA.titulo) : "", texto: typeof o.texto === "string" ? o.texto.slice(0, LIMITES_ETIQUETA.texto) : "", ...(url ? { url } : {}) }];
  });
}

/** Só as etiquetas com título aparecem a quem lê (as outras são rascunhos). */
export const etiquetasPublicas = (lista: EtiquetaDeImagem[]): EtiquetaDeImagem[] => lista.filter((e) => e.titulo.trim().length > 0);

/** Uma linha das especificações: `nome` + `valor` («Área: 42 m²», duas colunas no cartão) ou só texto. */
export interface LinhaEspecificacao {
  nome: string | null;
  valor: string;
}

/** O nome de uma especificação é curto («Vista», «Área útil»): mais comprido já é uma frase com dois pontos lá dentro. */
const MAX_NOME_ESPECIFICACAO = 28;

/** O texto de uma etiqueta como lista: uma por linha, e «Nome: valor» (dois pontos e um espaço) vira duas colunas. As linhas vazias saem; «Check-in às 14:00» (sem espaço depois dos dois pontos) e as frases compridas ficam como texto simples. */
export function especificacoes(texto: string): LinhaEspecificacao[] {
  const linhas: LinhaEspecificacao[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const corte = linha.indexOf(": ");
    const nome = corte > 0 ? linha.slice(0, corte).trim() : "";
    const valor = corte > 0 ? linha.slice(corte + 2).trim() : "";
    linhas.push(nome && valor && nome.length <= MAX_NOME_ESPECIFICACAO ? { nome, valor } : { nome: null, valor: linha });
  }
  return linhas;
}

/** Os campos de uma etiqueta estão dentro dos limites? O primeiro problema, ou `null`. */
export function erroDaEtiqueta(e: Pick<EtiquetaDeImagem, "titulo" | "texto">): string | null {
  if (e.titulo.trim().length > LIMITES_ETIQUETA.titulo) return `O título tem no máximo ${LIMITES_ETIQUETA.titulo} letras.`;
  if (e.texto.trim().length > LIMITES_ETIQUETA.texto) return `O texto tem no máximo ${LIMITES_ETIQUETA.texto} letras.`;
  return null;
}

/**
 * Onde fica, na caixa (em %), um ponto marcado em % da imagem inteira, quando a imagem enche a caixa cortando o que sobra («cover»). `razao` é a largura / altura da imagem como se vê (já rodada) e `caixa` a da caixa. `null`: o ponto ficou no corte, fora da caixa.
 */
export function pontoNaCaixa(ponto: { x: number; y: number }, razao: number, caixa: number): { esquerda: number; topo: number } | null {
  if (!(razao > 0) || !(caixa > 0)) return null;
  // a imagem acompanha o lado que falta: se a caixa é mais larga, a imagem enche a largura e corta em cima e em baixo
  const larguraDaImagem = caixa >= razao ? 1 : razao / caixa; // em larguras da caixa
  const alturaDaImagem = caixa >= razao ? caixa / razao : 1; // em alturas da caixa
  const esquerda = ((1 - larguraDaImagem) / 2 + (limitarPercentagem(ponto.x) / 100) * larguraDaImagem) * 100;
  const topo = ((1 - alturaDaImagem) / 2 + (limitarPercentagem(ponto.y) / 100) * alturaDaImagem) * 100;
  if (esquerda < -0.5 || esquerda > 100.5 || topo < -0.5 || topo > 100.5) return null;
  return { esquerda: Math.round(esquerda * 100) / 100, topo: Math.round(topo * 100) / 100 };
}

/** Onde fica uma etiqueta na caixa de um objeto que se roda, espelha ou corta: primeiro o espelho, depois a rotação, depois o corte. */
export function lugarDaEtiqueta(e: Pick<EtiquetaDeImagem, "x" | "y">, t: TransformacaoDeObjeto): { esquerda: number; topo: number } | null {
  let x = limitarPercentagem(e.x);
  let y = limitarPercentagem(e.y);
  if (t.espelhoH) x = 100 - x;
  if (t.espelhoV) y = 100 - y;
  const rotacao = ((t.rotacao ?? 0) % 360 + 360) % 360;
  if (rotacao === 90) [x, y] = [100 - y, x];
  else if (rotacao === 180) [x, y] = [100 - x, 100 - y];
  else if (rotacao === 270) [x, y] = [y, 100 - x];
  const razao = t.razao && t.razao > 0 ? t.razao : 4 / 3;
  const razaoVista = eRotacaoDeQuarto(rotacao) ? 1 / razao : razao;
  const caixa = numeroDaProporcao(t.proporcao) ?? razaoVista;
  return pontoNaCaixa({ x, y }, razaoVista, caixa);
}

/** O contrário de `lugarDaEtiqueta`: onde, na imagem inteira (em %), fica um toque dado na caixa (em %), com o corte, a rotação e o espelho que a imagem tem. */
export function pontoDaImagem(lugar: { esquerda: number; topo: number }, t: TransformacaoDeObjeto): { x: number; y: number } {
  const rotacao = (((t.rotacao ?? 0) % 360) + 360) % 360;
  const razao = t.razao && t.razao > 0 ? t.razao : 4 / 3;
  const razaoVista = eRotacaoDeQuarto(rotacao) ? 1 / razao : razao;
  const caixa = numeroDaProporcao(t.proporcao) ?? razaoVista;
  const larguraDaImagem = caixa >= razaoVista ? 1 : razaoVista / caixa;
  const alturaDaImagem = caixa >= razaoVista ? caixa / razaoVista : 1;
  let x = ((lugar.esquerda / 100 - (1 - larguraDaImagem) / 2) / larguraDaImagem) * 100;
  let y = ((lugar.topo / 100 - (1 - alturaDaImagem) / 2) / alturaDaImagem) * 100;
  if (rotacao === 90) [x, y] = [y, 100 - x];
  else if (rotacao === 180) [x, y] = [100 - x, 100 - y];
  else if (rotacao === 270) [x, y] = [100 - y, x];
  if (t.espelhoH) x = 100 - x;
  if (t.espelhoV) y = 100 - y;
  return { x: limitarPercentagem(x), y: limitarPercentagem(y) };
}

/** Para que lado abre o cartão de uma etiqueta, para nunca sair da imagem: por cima do ponto, ou por baixo se o ponto está na metade de cima; encostado ao lado esquerdo ou direito perto das margens. */
export function ladoDoCartao(lugar: { esquerda: number; topo: number }): { vertical: "cima" | "baixo"; horizontal: "esquerda" | "centro" | "direita" } {
  return { vertical: lugar.topo < 45 ? "baixo" : "cima", horizontal: lugar.esquerda < 22 ? "esquerda" : lugar.esquerda > 78 ? "direita" : "centro" };
}
