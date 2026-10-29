// O que a IA gastou, a sério: cada chamada (a pesquisa em linguagem natural e o assistente) traz da Cloudflare os tokens e as neurons que usou; aqui guardam-se, neste navegador, o histórico (com a pergunta e a resposta, que só ficam aqui), o que cada contexto ocupa da janela do modelo e o que se gastou nesta sessão; e pede-se ao Worker o que se gastou hoje no total (a quota gratuita). Funções puras e um hook; o que se vê (o anel, a janela, o histórico) está em components/ia/.
import { useCallback, useEffect, useState } from "react";
import { PROJETO } from "@/dados/projeto";
import { NEURONS_GRATIS_POR_DIA, modeloDe, ocupacaoDaJanela, type UsoDeChamada } from "./ia-modelos";

export type OrigemDaIa = "pesquisa" | "assistente" | "analise";

export const ROTULO_DA_ORIGEM: Record<OrigemDaIa, string> = { pesquisa: "Pesquisa em linguagem natural", assistente: "Assistente", analise: "Análise a fundo" };

/** Uma chamada no histórico. A pergunta e a resposta só existem neste navegador. */
export interface RegistoDeUso {
  id: string;
  quando: string;
  origem: OrigemDaIa;
  pergunta: string;
  resposta: string;
  uso: UsoDeChamada;
  /** As ferramentas do painel que o assistente usou nesta chamada. */
  ferramentas?: string[];
  /** Quantos caracteres tinham as instruções, as ferramentas e as mensagens que seguiram nesta chamada (para repartir o contexto). */
  partes?: { sistema: number; ferramentas: number; mensagens: number };
}

export interface TotaisDeUso {
  chamadas: number;
  tokensEntrada: number;
  tokensSaida: number;
  neurons: number;
  custoUsd: number;
}

export const totaisVazios = (): TotaisDeUso => ({ chamadas: 0, tokensEntrada: 0, tokensSaida: 0, neurons: 0, custoUsd: 0 });

export function somarUso(registos: Pick<RegistoDeUso, "uso">[]): TotaisDeUso {
  return registos.reduce(
    (t, r) => ({ chamadas: t.chamadas + 1, tokensEntrada: t.tokensEntrada + r.uso.tokensEntrada, tokensSaida: t.tokensSaida + r.uso.tokensSaida, neurons: t.neurons + r.uso.neurons, custoUsd: t.custoUsd + r.uso.custoUsd }),
    totaisVazios(),
  );
}

/** O que o Worker diz que se gastou hoje, somando toda a gente. */
export interface GastoDeHoje {
  dia: string;
  chamadas: number;
  tokensEntrada: number;
  tokensSaida: number;
  neurons: number;
  custoUsd: number;
  limiteGratis: number;
  restantes: number;
}

/** O que se paga de facto: nada enquanto as neurons de hoje couberem na quota gratuita; o que passa dela custa ao preço de tabela. */
export function aPagar(gasto: Pick<GastoDeHoje, "neurons" | "limiteGratis" | "custoUsd">): number {
  if (gasto.neurons <= gasto.limiteGratis || gasto.neurons <= 0) return 0;
  return gasto.custoUsd * ((gasto.neurons - gasto.limiteGratis) / gasto.neurons);
}

// ---------- o contexto: o que ocupa a janela ----------

export interface ParteDoContexto {
  id: "sistema" | "ferramentas" | "mensagens" | "resposta" | "livre";
  rotulo: string;
  tokens: number;
}

/**
 * Reparte os tokens de uma chamada pelas suas partes (instruções do sistema, ferramentas, mensagens, resposta) e deixa o resto da janela como «livre».
 * O total de entrada é o que a Cloudflare contou; a repartição por partes é proporcional ao tamanho em caracteres (uma estimativa).
 */
export function repartirContexto(uso: Pick<UsoDeChamada, "tokensEntrada" | "tokensSaida" | "janela">, partes?: RegistoDeUso["partes"]): ParteDoContexto[] {
  const total = Math.max(0, uso.tokensEntrada);
  const p = partes ?? { sistema: 0, ferramentas: 0, mensagens: 0 };
  const soma = p.sistema + p.ferramentas + p.mensagens;
  const tok = (c: number) => (soma > 0 ? Math.round((c / soma) * total) : 0);
  const sistema = soma > 0 ? tok(p.sistema) : 0;
  const ferramentas = soma > 0 ? tok(p.ferramentas) : 0;
  const mensagens = soma > 0 ? Math.max(0, total - sistema - ferramentas) : total;
  const usados = sistema + ferramentas + mensagens + Math.max(0, uso.tokensSaida);
  return [
    { id: "sistema", rotulo: "Instruções do sistema", tokens: sistema },
    { id: "ferramentas", rotulo: "Ferramentas do painel", tokens: ferramentas },
    { id: "mensagens", rotulo: "Mensagens", tokens: mensagens },
    { id: "resposta", rotulo: "Resposta", tokens: Math.max(0, uso.tokensSaida) },
    { id: "livre", rotulo: "Espaço livre", tokens: Math.max(0, uso.janela - usados) },
  ];
}

/** Quantos quadrados de uma grelha de `n` cada parte ocupa (só a livre arredonda para baixo; as outras têm pelo menos um se tiverem tokens). */
export function quadradosDe(partes: ParteDoContexto[], n = 50): Record<ParteDoContexto["id"], number> {
  const total = partes.reduce((s, p) => s + p.tokens, 0) || 1;
  const out = { sistema: 0, ferramentas: 0, mensagens: 0, resposta: 0, livre: 0 } as Record<ParteDoContexto["id"], number>;
  let usados = 0;
  for (const p of partes) {
    if (p.id === "livre") continue;
    out[p.id] = p.tokens > 0 ? Math.max(1, Math.round((p.tokens / total) * n)) : 0;
    usados += out[p.id];
  }
  out.livre = Math.max(0, n - usados);
  return out;
}

/** A cor do anel: verde enquanto há folga, âmbar a partir de 60 %, vermelho a partir de 85 %. */
export const tomDoAnel = (ocupacao: number): "sucesso" | "aviso" | "perigo" => (ocupacao >= 0.85 ? "perigo" : ocupacao >= 0.6 ? "aviso" : "sucesso");

// ---------- guardar e ler (só no navegador) ----------

const CHAVE = "painel.ia.historico";
const MAXIMO_DE_REGISTOS = 400;
export const EVENTO_USO_DA_IA = "painel:ia-uso";

export function lerHistoricoDaIa(): RegistoDeUso[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as RegistoDeUso[]).filter((r) => r && typeof r.id === "string" && r.uso && typeof r.uso.tokensEntrada === "number") : [];
  } catch {
    return [];
  }
}

/** O contexto em que cada origem está agora (a última chamada) e o que se gastou desde que a página abriu. */
const estado: { contextos: Partial<Record<OrigemDaIa, RegistoDeUso>>; sessao: TotaisDeUso } = { contextos: {}, sessao: totaisVazios() };

const nova = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function registarUsoDaIa(r: Omit<RegistoDeUso, "id" | "quando"> & { id?: string; quando?: string }): RegistoDeUso {
  const registo: RegistoDeUso = { id: r.id ?? nova(), quando: r.quando ?? new Date().toISOString(), ...r };
  estado.contextos[registo.origem] = registo;
  const s = estado.sessao;
  estado.sessao = { chamadas: s.chamadas + 1, tokensEntrada: s.tokensEntrada + registo.uso.tokensEntrada, tokensSaida: s.tokensSaida + registo.uso.tokensSaida, neurons: s.neurons + registo.uso.neurons, custoUsd: s.custoUsd + registo.uso.custoUsd };
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify([registo, ...lerHistoricoDaIa()].slice(0, MAXIMO_DE_REGISTOS)));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_USO_DA_IA));
  return registo;
}

/** Põe de volta o histórico da IA restaurado da reciclagem. */
export function reporHistoricoDaIa(registos: RegistoDeUso[]): void {
  const atuais = lerHistoricoDaIa();
  const todos = [...atuais, ...registos.filter((r) => !atuais.some((x) => x.id === r.id))].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, MAXIMO_DE_REGISTOS);
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(todos));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_USO_DA_IA));
}

export function apagarHistoricoDaIa(): void {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
  estado.contextos = {};
  estado.sessao = totaisVazios();
  window.dispatchEvent(new Event(EVENTO_USO_DA_IA));
}

/** O que o Worker diz que se gastou hoje; `null` se não há Worker ou não respondeu. */
export async function lerGastoDeHoje(sinal?: AbortSignal): Promise<GastoDeHoje | null> {
  if (!PROJETO.urlIa) return null;
  try {
    const r = await fetch(`${PROJETO.urlIa}/uso/hoje`, { signal: sinal });
    if (!r.ok) return null;
    const d = (await r.json()) as Partial<GastoDeHoje>;
    return typeof d.neurons === "number" ? { dia: String(d.dia ?? ""), chamadas: d.chamadas ?? 0, tokensEntrada: d.tokensEntrada ?? 0, tokensSaida: d.tokensSaida ?? 0, neurons: d.neurons, custoUsd: d.custoUsd ?? 0, limiteGratis: d.limiteGratis ?? NEURONS_GRATIS_POR_DIA, restantes: d.restantes ?? 0 } : null;
  } catch {
    return null;
  }
}

// ---------- «em uso»: o anel só tem cor enquanto a IA trabalha ----------

const emUsoAte: Record<OrigemDaIa, number> = { pesquisa: 0, assistente: 0, analise: 0 };
export const EVENTO_EM_USO = "painel:ia-em-uso";

/** Marca a IA como em uso durante mais `ms` (o anel fica colorido até lá); `0` acaba já. */
export function marcarEmUso(origem: OrigemDaIa, ms: number): void {
  emUsoAte[origem] = ms > 0 ? Date.now() + ms : 0;
  window.dispatchEvent(new Event(EVENTO_EM_USO));
}

/** Verdadeiro enquanto a IA desta origem está a trabalhar (e uns segundos depois). */
export function useEmUso(origem: OrigemDaIa): boolean {
  const [, setTique] = useState(0);
  useEffect(() => {
    let cronometro = 0;
    const ler = () => {
      setTique((n) => n + 1);
      window.clearTimeout(cronometro);
      const falta = emUsoAte[origem] - Date.now();
      if (falta > 0) cronometro = window.setTimeout(ler, falta + 30);
    };
    window.addEventListener(EVENTO_EM_USO, ler);
    ler();
    return () => {
      window.removeEventListener(EVENTO_EM_USO, ler);
      window.clearTimeout(cronometro);
    };
  }, [origem]);
  return typeof window !== "undefined" && emUsoAte[origem] > Date.now();
}

/** O estado da IA neste navegador, sempre atualizado: o contexto de cada origem, o gasto da sessão, o histórico e o gasto de hoje. */
export function useUsoDaIa() {
  const [versao, setVersao] = useState(0);
  const [hoje, setHoje] = useState<GastoDeHoje | null>(null);
  useEffect(() => {
    const ler = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO_USO_DA_IA, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO_USO_DA_IA, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  const recarregarHoje = useCallback(() => void lerGastoDeHoje().then(setHoje), []);
  useEffect(recarregarHoje, [recarregarHoje, versao]);
  const contexto = (origem: OrigemDaIa) => {
    const r = estado.contextos[origem];
    if (!r) return null;
    const tokens = r.uso.tokensEntrada + r.uso.tokensSaida;
    return { registo: r, tokens, janela: r.uso.janela, ocupacao: ocupacaoDaJanela(tokens, r.uso.janela), modelo: modeloDe(r.uso.modelo) };
  };
  return { versao, contexto, sessao: estado.sessao, historico: typeof window === "undefined" ? [] : lerHistoricoDaIa(), hoje, recarregarHoje };
}
