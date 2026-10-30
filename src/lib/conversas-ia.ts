// As conversas com a IA tal como aconteceram, para se poderem rever na atividade do painel: o que a pessoa escreveu, os passos da IA, o que se permitiu ou recusou e a resposta inteira. Ficam neste navegador, ligadas à ação do registo pelo identificador da conversa.

export type PapelNaConversa = "pessoa" | "ia" | "passo" | "decisao" | "aviso";

export interface ItemDaConversa {
  quando: string;
  papel: PapelNaConversa;
  texto: string;
}

export interface ConversaGuardada {
  id: string;
  inicio: string;
  ultima: string;
  itens: ItemDaConversa[];
}

const CHAVE = "painel.conversas-ia";
export const MAXIMO_DE_CONVERSAS = 40;
export const MAXIMO_DE_ITENS = 400;
export const MAXIMO_DO_TEXTO = 20_000;

/** Junta um item ao fim da conversa (e cria a conversa se ainda não existe). Cada texto vai cortado ao máximo. */
export function juntarItem(conversa: ConversaGuardada | undefined, id: string, papel: PapelNaConversa, texto: string, agora: Date): ConversaGuardada {
  const quando = agora.toISOString();
  const base = conversa ?? { id, inicio: quando, ultima: quando, itens: [] };
  const item: ItemDaConversa = { quando, papel, texto: texto.slice(0, MAXIMO_DO_TEXTO) };
  return { ...base, ultima: quando, itens: [...base.itens, item].slice(-MAXIMO_DE_ITENS) };
}

/** Fica com as conversas mais recentes (e sempre com as que se pede para manter). */
export function limitarConversas(lista: ConversaGuardada[], manter: ReadonlySet<string> = new Set()): ConversaGuardada[] {
  const porData = [...lista].sort((a, b) => b.ultima.localeCompare(a.ultima));
  const guardar = new Set(porData.filter((c) => manter.has(c.id)).map((c) => c.id));
  for (const c of porData) if (guardar.size < Math.max(MAXIMO_DE_CONVERSAS, manter.size)) guardar.add(c.id);
  return porData.filter((c) => guardar.has(c.id));
}

// ---------- guardar e ler (só no navegador) ----------

let emMemoria: ConversaGuardada[] | null = null;
let escrita = 0;

function lerTodas(): ConversaGuardada[] {
  if (emMemoria) return emMemoria;
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]") as unknown;
    emMemoria = Array.isArray(v) ? (v as ConversaGuardada[]) : [];
  } catch {
    emMemoria = [];
  }
  return emMemoria;
}

function agendar(): void {
  window.clearTimeout(escrita);
  escrita = window.setTimeout(() => {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(lerTodas()));
    } catch {
      /* sem armazenamento ou cheio: fica só em memória */
    }
  }, 400);
}

/** Acrescenta uma coisa dita ou feita à conversa `id`. */
export function acrescentarNaConversa(id: string, papel: PapelNaConversa, texto: string): void {
  if (typeof window === "undefined" || !id || !texto.trim()) return;
  const todas = lerTodas();
  const atual = todas.find((c) => c.id === id);
  const nova = juntarItem(atual, id, papel, texto, new Date());
  emMemoria = limitarConversas(atual ? todas.map((c) => (c.id === id ? nova : c)) : [nova, ...todas], new Set([id]));
  agendar();
}

export const lerConversa = (id: string): ConversaGuardada | null => (typeof window === "undefined" ? null : (lerTodas().find((c) => c.id === id) ?? null));

/** Apaga as conversas, menos as que se pede para manter (as da sessão em curso, quando se apaga o histórico de atividade). */
export function apagarConversas(manter: ReadonlySet<string> = new Set()): void {
  if (typeof window === "undefined") return;
  emMemoria = lerTodas().filter((c) => manter.has(c.id));
  agendar();
}
