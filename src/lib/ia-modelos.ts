// Os modelos de IA que o painel usa (Workers AI, da Cloudflare) e o que custam: a janela de contexto, o preço por milhão de tokens e as «neurons» (a unidade em que a Cloudflare cobra e dá a quota gratuita diária). Os números vêm da ficha de cada modelo na Cloudflare (API ai/models/search, a 29/10/2026). Funções puras, partilhadas pelo ecrã e pelo Worker (só imports relativos).

export interface ModeloDeIa {
  id: string;
  nome: string;
  fornecedor: string;
  /** Tokens que cabem de uma vez (pergunta + resposta). */
  janela: number;
  /** Dólares por milhão de tokens. */
  precoEntrada: number;
  precoSaida: number;
  ferramentas: boolean;
}

export const MODELO_PADRAO = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export const MODELOS_DE_IA: Record<string, ModeloDeIa> = {
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", nome: "Llama 3.3 70B (fp8, rápido)", fornecedor: "Meta", janela: 24_000, precoEntrada: 0.293, precoSaida: 2.253, ferramentas: true },
  "@cf/meta/llama-3.1-8b-instruct-fp8": { id: "@cf/meta/llama-3.1-8b-instruct-fp8", nome: "Llama 3.1 8B (fp8)", fornecedor: "Meta", janela: 32_000, precoEntrada: 0.152, precoSaida: 0.287, ferramentas: false },
};

/** A quota gratuita da Cloudflare: 10 000 neurons por dia (repõe-se à meia-noite UTC) e, depois, 0,011 USD por mil neurons. */
export const NEURONS_GRATIS_POR_DIA = 10_000;
export const USD_POR_NEURON = 0.011 / 1000;

/** A ficha de um modelo; um desconhecido ganha uma ficha genérica (sem preço) em vez de rebentar. */
export function modeloDe(id: string): ModeloDeIa {
  return MODELOS_DE_IA[id] ?? { id, nome: id.replace(/^@cf\/[^/]+\//, ""), fornecedor: id.split("/")[1] ?? "—", janela: 8_000, precoEntrada: 0, precoSaida: 0, ferramentas: false };
}

/** Quanto custa (em dólares) uma chamada com estes tokens, ao preço de tabela. */
export const custoUsd = (modelo: string, tokensEntrada: number, tokensSaida: number): number => {
  const m = modeloDe(modelo);
  return (tokensEntrada / 1_000_000) * m.precoEntrada + (tokensSaida / 1_000_000) * m.precoSaida;
};

/** As neurons de uma chamada (o que se gasta da quota gratuita). */
export const neuronsDe = (modelo: string, tokensEntrada: number, tokensSaida: number): number => custoUsd(modelo, tokensEntrada, tokensSaida) / USD_POR_NEURON;

/** Uma estimativa grosseira para quando a resposta não traz a contagem: ~3,6 caracteres por token em português. */
export const estimarTokens = (texto: string): number => Math.ceil(texto.length / 3.6);

/** O que uma chamada à IA gastou. */
export interface UsoDeChamada {
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  neurons: number;
  custoUsd: number;
  /** A janela de contexto do modelo. */
  janela: number;
  ms: number;
  /** Verdadeiro se a Cloudflare não disse os tokens e se estimaram pelo texto. */
  estimado: boolean;
}

const numero = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** O uso de uma chamada, lido do campo `usage` da resposta da Cloudflare (que traz os tokens e, às vezes, as neurons); sem ele estima-se pelo texto. */
export function usoDaResposta(modelo: string, usage: unknown, ms: number, textoEntrada = "", textoSaida = ""): UsoDeChamada {
  const u = (usage ?? {}) as { prompt_tokens?: unknown; completion_tokens?: unknown; neurons?: unknown };
  const tin = numero(u.prompt_tokens);
  const tout = numero(u.completion_tokens);
  const estimado = tin === null || tout === null;
  const tokensEntrada = tin ?? estimarTokens(textoEntrada);
  const tokensSaida = tout ?? estimarTokens(textoSaida);
  const dado = numero(u.neurons);
  const neurons = dado ?? neuronsDe(modelo, tokensEntrada, tokensSaida);
  return { modelo, tokensEntrada, tokensSaida, neurons, custoUsd: neurons * USD_POR_NEURON, janela: modeloDe(modelo).janela, ms: Math.round(ms), estimado };
}

/** Uma quantia em dólares com as casas que a fazem ler-se: «$0,0034», «$0,12», «$4,50». */
export function formatarUsd(v: number): string {
  const casas = v === 0 ? 2 : v < 0.01 ? 4 : v < 1 ? 3 : 2;
  return `$${v.toLocaleString("pt-PT", { minimumFractionDigits: casas === 4 ? 4 : 2, maximumFractionDigits: casas })}`;
}

/** Quanto da janela de contexto está ocupado (0 a 1, nunca mais do que 1). */
export const ocupacaoDaJanela = (tokens: number, janela: number): number => (janela > 0 ? Math.min(1, Math.max(0, tokens / janela)) : 0);
