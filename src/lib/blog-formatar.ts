// A formatação do editor de blog (Markdown): cada botão da barra liga e desliga. Carregar duas vezes no mesmo botão tira a formatação em vez de a repetir. Funções puras sobre o texto e a seleção.

export interface FerramentaDeFormato {
  id: string;
  /** «linha»: põe ou tira um prefixo no início de cada linha (título, lista, citação); «inline»: envolve a seleção. */
  tipo: "inline" | "linha";
  antes: string;
  depois: string;
  exemplo: string;
}

export interface Resultado {
  texto: string;
  inicio: number;
  fim: number;
}

const PREFIXO_DE_LINHA: Record<string, string> = { titulo: "## ", lista: "- ", citacao: "> " };

const LIGACAO_COMPLETA = /^\[([\s\S]*)\]\([^)\s]*\)$/;
const FECHO_DA_LIGACAO = /^\]\([^)\s]*\)/;

/** O itálico `*x*` não é o negrito `**x**`: as marcas só valem se não fazem parte de duas seguidas. */
function eItalicoSozinho(texto: string, abre: number, fecha: number): boolean {
  return texto[abre - 1] !== "*" && texto[fecha + 1] !== "*";
}

function alternarEmLinha(texto: string, ini: number, fim: number, f: FerramentaDeFormato): Resultado {
  const sel = texto.slice(ini, fim);
  const tira = (inicio: number, fimSel: number, abre: number, tamAntes: number, fecha: number, tamDepois: number): Resultado => {
    const novo = `${texto.slice(0, abre)}${texto.slice(abre + tamAntes, fecha)}${texto.slice(fecha + tamDepois)}`;
    return { texto: novo, inicio: inicio - tamAntes, fim: fimSel - tamAntes };
  };
  if (f.id === "ligacao") {
    const dentro = LIGACAO_COMPLETA.exec(sel);
    if (dentro) return { texto: `${texto.slice(0, ini)}${dentro[1]}${texto.slice(fim)}`, inicio: ini, fim: ini + dentro[1].length };
    const resto = FECHO_DA_LIGACAO.exec(texto.slice(fim));
    if (texto.slice(ini - 1, ini) === "[" && resto) return { texto: `${texto.slice(0, ini - 1)}${sel}${texto.slice(fim + resto[0].length)}`, inicio: ini - 1, fim: fim - 1 };
  } else {
    const { antes, depois } = f;
    // a seleção já traz as marcas
    if (sel.length >= antes.length + depois.length && sel.startsWith(antes) && sel.endsWith(depois) && (f.id !== "italico" || eItalicoSozinho(texto, ini, fim - 1))) {
      const miolo = sel.slice(antes.length, sel.length - depois.length);
      return { texto: `${texto.slice(0, ini)}${miolo}${texto.slice(fim)}`, inicio: ini, fim: ini + miolo.length };
    }
    // as marcas estão à volta da seleção
    if (ini >= antes.length && texto.slice(ini - antes.length, ini) === antes && texto.slice(fim, fim + depois.length) === depois && (f.id !== "italico" || eItalicoSozinho(texto, ini - 1, fim))) {
      return tira(ini, fim, ini - antes.length, antes.length, fim, depois.length);
    }
  }
  const escolhido = sel || f.exemplo;
  return { texto: `${texto.slice(0, ini)}${f.antes}${escolhido}${f.depois}${texto.slice(fim)}`, inicio: ini + f.antes.length, fim: ini + f.antes.length + escolhido.length };
}

function alternarPorLinha(texto: string, ini: number, fim: number, f: FerramentaDeFormato): Resultado {
  const p = PREFIXO_DE_LINHA[f.id] ?? f.antes.replace(/^\n/, "");
  const comecoDaLinha = texto.lastIndexOf("\n", ini - 1) + 1;
  const fimDaLinha = (() => {
    const i = texto.indexOf("\n", fim > ini && texto[fim - 1] === "\n" ? fim - 1 : fim);
    return i === -1 ? texto.length : i;
  })();
  const linhas = texto.slice(comecoDaLinha, fimDaLinha).split("\n");
  if (linhas.every((l) => l === "")) {
    const novo = `${texto.slice(0, comecoDaLinha)}${p}${f.exemplo}${texto.slice(fimDaLinha)}`;
    return { texto: novo, inicio: comecoDaLinha + p.length, fim: comecoDaLinha + p.length + f.exemplo.length };
  }
  const todasTem = linhas.filter((l) => l !== "").every((l) => l.startsWith(p));
  const novas = linhas.map((l) => (l === "" ? l : todasTem ? l.slice(p.length) : l.startsWith(p) ? l : `${p}${l}`));
  const bloco = novas.join("\n");
  return { texto: `${texto.slice(0, comecoDaLinha)}${bloco}${texto.slice(fimDaLinha)}`, inicio: comecoDaLinha, fim: comecoDaLinha + bloco.length };
}

/** Aplica ou tira a formatação de uma ferramenta na seleção [ini, fim). */
export function alternarFormato(texto: string, ini: number, fim: number, f: FerramentaDeFormato): Resultado {
  const [a, b] = ini <= fim ? [ini, fim] : [fim, ini];
  return f.tipo === "linha" ? alternarPorLinha(texto, a, b, f) : alternarEmLinha(texto, a, b, f);
}
