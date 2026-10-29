// Os controlos do assistente de IA: como se comporta (nome, instruções, tom, tamanho das respostas, limites) e a sua memória (documentos PDF e notas). Funções puras para dividir a memória em pedaços, procurar os que respondem a uma pergunta e montar as instruções finais; o resto é guardar e ler no navegador.
import { useEffect, useState } from "react";

export interface ControlosIA {
  nome: string;
  /** Como o assistente deve responder, nas palavras de quem o gere. */
  instrucoes: string;
  tom: "formal" | "neutro" | "proximo";
  tamanho: "curta" | "media" | "detalhada";
  /** Responde só com o que está na memória e diz que não sabe quando não está lá. */
  soMemoria: boolean;
  /** Temas que não deve tratar, um por linha. */
  temasProibidos: string;
  /** A primeira mensagem de uma conversa. */
  boasVindas: string;
}

export const CONTROLOS_DE_ORIGEM: ControlosIA = {
  nome: "Assistente do painel",
  instrucoes: "",
  tom: "neutro",
  tamanho: "media",
  soMemoria: false,
  temasProibidos: "",
  boasVindas: "Em que posso ajudar? Escolha uma pergunta ou escreva a sua.",
};

export const TONS: Record<ControlosIA["tom"], string> = { formal: "Formal", neutro: "Neutro", proximo: "Próximo" };
export const TAMANHOS: Record<ControlosIA["tamanho"], string> = { curta: "Curtas", media: "Médias", detalhada: "Detalhadas" };

/** Um documento ou uma nota que o assistente tem na memória. */
export interface DocumentoDeMemoria {
  id: string;
  nome: string;
  /** «faq» são as perguntas frequentes do editor de FAQ, que entram na memória sem serem guardadas aqui. */
  origem: "pdf" | "nota" | "faq";
  tamanho: number;
  paginas?: number;
  criado: string;
  /** Só os ativos entram nas respostas e nas instruções. */
  ativo: boolean;
  texto: string;
}

/** O limite de caracteres ativos na memória: mais do que isto não cabe no que o modelo lê de uma vez. */
export const LIMITE_DE_MEMORIA = 200_000;

export const caracteresAtivos = (docs: DocumentoDeMemoria[]) => docs.filter((d) => d.ativo).reduce((s, d) => s + d.texto.length, 0);

/** Parte um texto em pedaços de cerca de `tamanho` caracteres, sem partir parágrafos. */
export function pedacos(texto: string, tamanho = 700): string[] {
  const out: string[] = [];
  let atual = "";
  for (const par of texto.split(/\n{2,}|\r\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
    if (atual && atual.length + par.length > tamanho) (out.push(atual), (atual = ""));
    if (par.length > tamanho * 2) {
      for (let i = 0; i < par.length; i += tamanho) out.push(par.slice(i, i + tamanho));
      continue;
    }
    atual = atual ? `${atual}\n\n${par}` : par;
  }
  if (atual) out.push(atual);
  return out;
}

const PALAVRAS_VAZIAS = new Set(["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "um", "uma", "que", "para", "por", "com", "no", "na", "nos", "nas", "se", "como", "qual", "quais", "é", "são", "ao", "à"]);
const limpar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const palavrasDe = (t: string) => limpar(t).split(/[^a-z0-9]+/).filter((p) => p.length > 2 && !PALAVRAS_VAZIAS.has(p));

export interface Passagem {
  documento: string;
  texto: string;
  pontos: number;
}

/** Os pedaços da memória ativa que melhor respondem à pergunta, pelas palavras que têm em comum (sem acentos, sem palavras vazias). */
export function procurar(docs: DocumentoDeMemoria[], pergunta: string, n = 3): Passagem[] {
  const quer = new Set(palavrasDe(pergunta));
  if (quer.size === 0) return [];
  const todas: Passagem[] = [];
  for (const d of docs.filter((x) => x.ativo)) {
    // uma pergunta frequente é uma só passagem: a pergunta e a resposta nunca se separam
    for (const p of d.origem === "faq" ? [d.texto] : pedacos(d.texto)) {
      const tem = new Set(palavrasDe(p));
      let pontos = 0;
      for (const q of quer) if (tem.has(q)) pontos += 1;
      if (pontos > 0) todas.push({ documento: d.nome, texto: p, pontos: pontos / Math.sqrt(Math.max(1, tem.size)) + pontos });
    }
  }
  return todas.sort((a, b) => b.pontos - a.pontos).slice(0, n);
}

/** As instruções que o modelo recebe: o que a pessoa escreveu, o tom, o tamanho, os limites e a lista da memória ativa. */
export function instrucoesFinais(c: ControlosIA, docs: DocumentoDeMemoria[], perguntasFrequentes = 0): string {
  const linhas = [`És «${c.nome}», o assistente do painel. Responde sempre em português de Portugal.`];
  linhas.push(`Tom: ${c.tom === "formal" ? "formal, tratando a pessoa por «o senhor» ou «a senhora»" : c.tom === "proximo" ? "próximo e simpático, sem ser informal demais" : "neutro e claro"}.`);
  linhas.push(`Respostas ${c.tamanho === "curta" ? "curtas (uma a três frases)" : c.tamanho === "detalhada" ? "detalhadas, com os passos numerados quando houver" : "de tamanho médio (um parágrafo)"}.`);
  if (c.instrucoes.trim()) linhas.push(`Instruções de quem gere o painel:\n${c.instrucoes.trim()}`);
  const temas = c.temasProibidos.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
  if (temas.length) linhas.push(`Não tratas destes temas e dizes que não podes ajudar: ${temas.join("; ")}.`);
  const ativos = docs.filter((d) => d.ativo);
  if (c.soMemoria) linhas.push("Responde só com o que está na memória abaixo. Se não estiver lá, diz que não sabes e sugere falar com a equipa.");
  if (ativos.length) linhas.push(`Memória (${ativos.length} ${ativos.length === 1 ? "documento" : "documentos"}): ${ativos.map((d) => d.nome).join("; ")}.`);
  if (perguntasFrequentes > 0) linhas.push(`${perguntasFrequentes} ${perguntasFrequentes === 1 ? "pergunta frequente publicada" : "perguntas frequentes publicadas"}: são as respostas oficiais da equipa, usa-as tal como estão quando a pergunta coincidir.`);
  if (!ativos.length && !perguntasFrequentes && c.soMemoria) linhas.push("A memória está vazia: diz que ainda não tens informação.");
  return linhas.join("\n");
}

// ---------- guardar e ler (só no navegador) ----------


const CHAVE = "painel.ia.controlos";
/** O evento que avisa os ecrãs (e o assistente) de que os controlos mudaram. */
export const EVENTO_IA = "painel:ia";

export function lerControlos(): ControlosIA {
  try {
    return { ...CONTROLOS_DE_ORIGEM, ...(JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}") as Partial<ControlosIA>) };
  } catch {
    return CONTROLOS_DE_ORIGEM;
  }
}

export function guardarControlos(c: ControlosIA): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(c));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_IA));
}

/** Os controlos em vigor, sempre atualizados. */
export function useControlosIA(): ControlosIA {
  const [c, setC] = useState<ControlosIA>(CONTROLOS_DE_ORIGEM);
  useEffect(() => {
    const ler = () => setC(lerControlos());
    ler();
    window.addEventListener(EVENTO_IA, ler);
    return () => window.removeEventListener(EVENTO_IA, ler);
  }, []);
  return c;
}
