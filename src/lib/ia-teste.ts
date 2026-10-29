// O teste do assistente, como o vê quem lhe escreve: uma pergunta, e a resposta que ele daria com a memória e as perguntas frequentes de agora (a pergunta frequente que melhor corresponde, ou a passagem do documento, ou «não sei»), com a fonte por baixo. Funções puras.
import { procurar, type ControlosIA, type DocumentoDeMemoria } from "./ia-controlos";

export interface RespostaDeTeste {
  texto: string;
  /** De onde veio («Pergunta frequente», o nome do documento); vazio quando não encontrou nada. */
  fonte?: string;
  encontrou: boolean;
}

const limpar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O texto cortado em frases inteiras até caber (`maximo` caracteres), sem deixar frases a meio. */
export function ateAoLimite(texto: string, maximo: number, frases: number | null = null): string {
  const partes = texto.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*/g) ?? [texto];
  let saida = "";
  let n = 0;
  for (const p of partes) {
    if (frases !== null && n >= frases) break;
    if (saida && (saida + p).length > maximo) break;
    saida += p;
    n += 1;
  }
  return (saida || texto.slice(0, maximo)).trim();
}

/** O que o assistente responderia a esta pergunta com estes controlos e esta memória. */
export function responderNoTeste(controlos: Pick<ControlosIA, "soMemoria" | "tamanho" | "temasProibidos">, conhecido: DocumentoDeMemoria[], pergunta: string): RespostaDeTeste {
  const q = limpar(pergunta);
  const proibido = controlos.temasProibidos.split(/\r?\n/).map((t) => limpar(t).trim()).filter(Boolean).find((t) => q.includes(t));
  if (proibido) return { texto: "Não posso ajudar com esse tema.", encontrou: false };
  const melhor = procurar(conhecido, pergunta, 1)[0];
  if (!melhor) return { texto: controlos.soMemoria ? "Não sei responder a isso." : "Não encontrei isso. Escolha uma das perguntas prontas ou fale com a equipa.", encontrou: false };
  const eFaq = melhor.documento.startsWith("FAQ: ");
  const base = eFaq ? melhor.texto.split(/\n{2,}/).slice(1).join("\n\n") || melhor.texto : melhor.texto;
  const texto = controlos.tamanho === "curta" ? ateAoLimite(base, 220, 3) : controlos.tamanho === "detalhada" ? ateAoLimite(base, 900) : ateAoLimite(base, 500);
  return { texto, fonte: eFaq ? "Pergunta frequente" : melhor.documento, encontrou: true };
}
