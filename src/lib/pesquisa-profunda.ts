// A pesquisa a fundo («Analisar com IA»): a pessoa pede uma análise do que está a ver (um cartão, uma lista, um registo, ou uma pergunta sua), a IA pesquisa na internet e raciocina em segundo plano, e quando acaba avisa no chat. Os pedidos entram numa fila (vários ao mesmo tempo, sem estorvar o chat nem a pesquisa em linguagem natural), cada um mostra o seu tempo estimado, os passos e os pensamentos da IA em direto, e a pessoa pode corrigi-la enquanto trabalha e mudar a profundidade e o foco da resposta. Aqui estão os tipos, a fila, o cálculo do tempo, as instruções internas da IA e o armazenamento; o motor que corre cada pedido está em pesquisa-motor.ts.
"use client";

import { useEffect, useState } from "react";
import type { DocumentoRico, FonteDoDocumento } from "./pesquisa-documento";

export type Profundidade = "rapida" | "normal" | "profunda";
export type Foco = "curto" | "equilibrado" | "detalhado" | "extenso";
export type Enfase = "geral" | "numeros" | "riscos" | "oportunidades" | "acoes" | "mercado";

/** Quantas voltas de ferramentas, e o mínimo de procuras e de páginas lidas antes de a IA poder concluir (com a internet ligada). */
export const PROFUNDIDADES: Record<Profundidade, { rotulo: string; passos: number; estimativa: string; minimoDeProcuras: number; minimoDeLeituras: number }> = {
  rapida: { rotulo: "Rápida", passos: 3, estimativa: "cerca de 1 minuto", minimoDeProcuras: 1, minimoDeLeituras: 0 },
  normal: { rotulo: "Normal", passos: 6, estimativa: "cerca de 2 minutos", minimoDeProcuras: 1, minimoDeLeituras: 2 },
  profunda: { rotulo: "Profunda", passos: 12, estimativa: "cerca de 5 minutos", minimoDeProcuras: 2, minimoDeLeituras: 4 },
};

export const FOCOS: Record<Foco, { rotulo: string; tokens: number; escritaMs: number; instrucao: string }> = {
  curto: { rotulo: "Curta", tokens: 1000, escritaMs: 8000, instrucao: "Resposta curta: o resumo em duas ou três frases e no máximo quatro blocos (o essencial, uma tabela ou métricas se ajudarem, e a conclusão). Menos de 350 palavras." },
  equilibrado: { rotulo: "Equilibrada", tokens: 1600, escritaMs: 14000, instrucao: "Resposta equilibrada: seis a oito blocos, com o contexto, os números principais, uma tabela ou métricas, os riscos e uma recomendação." },
  detalhado: { rotulo: "Detalhada", tokens: 2200, escritaMs: 22000, instrucao: "Resposta detalhada: oito a doze blocos, com contexto, análise dos dados dados, comparações, tabelas, métricas, um gráfico se houver números comparáveis, riscos, oportunidades e próximos passos." },
  extenso: { rotulo: "Extensa", tokens: 3000, escritaMs: 34000, instrucao: "Resposta extensa e completa: doze a dezoito blocos, a cobrir tudo (contexto, dados, mercado, concorrência, comparações, números, riscos, oportunidades, hipóteses, o que não se conseguiu confirmar e um plano de ação por passos), com tabelas, métricas e gráficos onde houver números." },
};

export const ENFASES: Record<Enfase, { rotulo: string; instrucao: string }> = {
  geral: { rotulo: "Geral", instrucao: "Sem ênfase especial: cobre o que for mais importante." },
  numeros: { rotulo: "Números e dados", instrucao: "Dá prioridade aos números, às tendências e às comparações quantitativas." },
  riscos: { rotulo: "Riscos e problemas", instrucao: "Dá prioridade ao que pode correr mal: riscos, anomalias, dependências e pontos fracos." },
  oportunidades: { rotulo: "Oportunidades", instrucao: "Dá prioridade ao que se pode ganhar: oportunidades, melhorias e ganhos rápidos." },
  acoes: { rotulo: "Ações recomendadas", instrucao: "Dá prioridade ao que fazer: recomendações concretas, por ordem de impacto, com o primeiro passo de cada uma." },
  mercado: { rotulo: "Mercado e concorrência", instrucao: "Dá prioridade ao contexto externo: o mercado, a concorrência, as referências do setor e as notícias recentes." },
};

export interface ConfigDaPesquisa {
  profundidade: Profundidade;
  foco: Foco;
  enfase: Enfase;
  /** Pesquisar na internet (senão a IA só analisa o que lhe deram). */
  internet: boolean;
}

export const CONFIG_DE_ORIGEM: ConfigDaPesquisa = { profundidade: "normal", foco: "equilibrado", enfase: "geral", internet: true };

export type EstadoDaPesquisa = "fila" | "a pesquisar" | "em pausa" | "concluida" | "falhou" | "cancelada";
export const ROTULO_DO_ESTADO: Record<EstadoDaPesquisa, string> = { fila: "Na fila", "a pesquisar": "A pesquisar", "em pausa": "Em pausa", concluida: "Concluída", falhou: "Falhou", cancelada: "Cancelada" };
export const FINAIS: EstadoDaPesquisa[] = ["concluida", "falhou", "cancelada"];

/** O que se analisa: o que está no ecrã (um cartão, uma lista, um registo ou a página) ou só uma pergunta. */
export interface AlvoDeAnalise {
  titulo: string;
  tipo: "cartao" | "lista" | "registo" | "pagina" | "livre";
  pagina?: string;
  /** Os dados estruturados, como `copiarEstruturado` os copia. */
  dados?: unknown;
}

export type TipoDePasso = "pensamento" | "pesquisa" | "resultados" | "leitura" | "nota" | "correcao" | "escrita" | "erro";

export interface PassoDaPesquisa {
  id: string;
  quando: string;
  tipo: TipoDePasso;
  texto: string;
  detalhe?: string;
}

export interface CorrecaoDaPesquisa {
  id: string;
  quando: string;
  texto: string;
  aplicada: boolean;
}

export interface TrabalhoDePesquisa {
  id: string;
  titulo: string;
  /** O que a pessoa escreveu a pedir (pode estar vazio). */
  pedido: string;
  alvo: AlvoDeAnalise;
  config: ConfigDaPesquisa;
  estado: EstadoDaPesquisa;
  criado: string;
  iniciado?: string;
  concluido?: string;
  passoAtual: number;
  /** Quantas voltas de ferramentas tem de dar, pela profundidade. */
  passosPrevistos: number;
  /** Quanto durou, em média, cada passo (para o tempo estimado). */
  mediaPassoMs?: number;
  passos: PassoDaPesquisa[];
  correcoes: CorrecaoDaPesquisa[];
  notas: string[];
  fontes: FonteDoDocumento[];
  resultado?: DocumentoRico;
  avisos?: string[];
  erro?: string;
  chamadas: number;
  tokens: number;
  neurons: number;
  custoUsd: number;
  /** A pessoa já viu o resultado. */
  lido?: boolean;
}

// ---------- o tempo estimado ----------

export const PASSO_PADRAO_MS = 6500;
export const CONCORRENCIA = 2;

/** Quanto falta a um trabalho que já está a correr (ou em pausa), em milissegundos. */
export function faltaDe(t: Pick<TrabalhoDePesquisa, "passoAtual" | "passosPrevistos" | "mediaPassoMs" | "config" | "estado">): number {
  if (FINAIS.includes(t.estado)) return 0;
  const restantes = Math.max(0, t.passosPrevistos - t.passoAtual);
  return restantes * (t.mediaPassoMs ?? PASSO_PADRAO_MS) + FOCOS[t.config.foco].escritaMs;
}

/** O tempo estimado de cada trabalho por acabar. Os que estão na fila esperam pelos que estão à frente (divididos pelos que correm ao mesmo tempo). */
export function etasDaFila(trabalhos: TrabalhoDePesquisa[], concorrencia = CONCORRENCIA): Map<string, number> {
  const etas = new Map<string, number>();
  const aCorrer = trabalhos.filter((t) => t.estado === "a pesquisar" || t.estado === "em pausa");
  for (const t of aCorrer) etas.set(t.id, faltaDe(t));
  // as «pistas»: cada uma acaba quando acabar o trabalho que a ocupa; o seguinte da fila entra na primeira que ficar livre
  const pistas = Array.from({ length: Math.max(1, concorrencia) }, (_, i) => aCorrer[i] ? faltaDe(aCorrer[i]) : 0);
  for (const t of trabalhos.filter((x) => x.estado === "fila").sort((a, b) => a.criado.localeCompare(b.criado))) {
    const i = pistas.indexOf(Math.min(...pistas));
    pistas[i] += faltaDe(t);
    etas.set(t.id, pistas[i]);
  }
  return etas;
}

/** «cerca de 45 s», «cerca de 2 min»: o tempo estimado em palavras. */
export function textoDoTempo(ms: number): string {
  const s = Math.max(5, Math.round(ms / 5000) * 5);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  return `${m} min`;
}

/** Os trabalhos que se podem começar já: os que estão na fila, por ordem, até caberem na concorrência. */
export function paraComecar(trabalhos: TrabalhoDePesquisa[], concorrencia = CONCORRENCIA): TrabalhoDePesquisa[] {
  const aCorrer = trabalhos.filter((t) => t.estado === "a pesquisar" || t.estado === "em pausa").length;
  return trabalhos.filter((t) => t.estado === "fila").sort((a, b) => a.criado.localeCompare(b.criado)).slice(0, Math.max(0, concorrencia - aCorrer));
}

// ---------- o que se diz à IA ----------

const hojeEscrito = (d: Date) => d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

/** As instruções internas da pesquisa (a pessoa nunca as vê escritas, mas vê o que a IA faz). */
export function instrucoesDaPesquisa(c: ConfigDaPesquisa, passos: number, agora = new Date()): string {
  return [
    "És um analista sénior, com muito critério e espírito crítico. Vais fazer um reconhecimento (uma pesquisa a fundo) sobre aquilo que a pessoa te pediu, e depois escrever um documento rico e rigoroso. Escreves sempre em português de Portugal.",
    `Hoje é ${hojeEscrito(agora)}.`,
    c.internet
      ? `Tens duas ferramentas de internet, buscar_web (para procurar) e ler_pagina (para ler uma página inteira), e a ferramenta concluir (quando já sabes o suficiente). Podes dar no máximo ${passos} voltas de ferramentas; não gastes todas se já tens o que precisas.`
      : "Não tens acesso à internet nesta análise: trabalhas só com os dados que te deram. Quando já os percebeste, chama concluir.",
    "Em CADA chamada de ferramenta preenche o campo «pensamento» com UMA frase curta e honesta do que estás a pensar e porque vais fazer isto (a pessoa lê-o em direto e pode corrigir-te).",
    "Critério: confirma o que é importante em mais do que uma fonte; desconfia de fontes fracas, antigas ou sem autor; separa factos de opiniões e de estimativas; diz com clareza o que não conseguiste confirmar. Nunca inventes números, nomes, datas nem ligações. Se os dados que te deram contradizem a internet, diz isso.",
    "Se a pessoa te mandar uma correção a meio («Correção da pessoa»), obedece-lhe logo e muda de rumo.",
    `Ênfase: ${ENFASES[c.enfase].instrucao}`,
  ].join("\n");
}

const comoTexto = (v: unknown, max: number): string => {
  let s = "";
  try {
    s = typeof v === "string" ? v : JSON.stringify(v, null, 1);
  } catch {
    s = String(v);
  }
  return s.length > max ? `${s.slice(0, max)}… (cortado)` : s;
};

/** O pedido inicial: o que se analisa, os dados (cortados para caberem) e o que a pessoa escreveu. */
export function pedidoInicial(t: Pick<TrabalhoDePesquisa, "alvo" | "pedido">, maximoDeDados = 7000): string {
  const partes = [`O que analisar: ${t.alvo.titulo} (${{ cartao: "um cartão do painel", lista: "uma lista do painel", registo: "um registo do painel", pagina: "uma página do painel", livre: "uma pergunta da pessoa" }[t.alvo.tipo]}${t.alvo.pagina ? `, em ${t.alvo.pagina}` : ""}).`];
  if (t.alvo.dados !== undefined) partes.push(`Dados (JSON):\n${comoTexto(t.alvo.dados, maximoDeDados)}`);
  partes.push(t.pedido.trim() ? `A pessoa pediu: ${t.pedido.trim()}` : "A pessoa não escreveu mais nada: faz a análise mais útil que souberes (o que significam estes dados, o que se destaca, o que fazer, e o que diz o mercado e a internet sobre isto).");
  return partes.join("\n\n");
}

/** O que se pede à IA no fim: o documento em JSON, com a extensão e a ênfase escolhidas. */
export function instrucoesDoDocumento(t: Pick<TrabalhoDePesquisa, "config" | "titulo">): string {
  return [
    "Escreve agora o documento final. Responde SÓ com um objeto JSON, sem texto antes nem depois, com esta forma:",
    '{"titulo": string, "resumo": string, "confianca": "alta"|"media"|"baixa", "blocos": Bloco[], "fontes": [{"n": number, "titulo": string, "url": string}], "limitacoes": string[]}',
    "Cada Bloco tem «tipo» e é um destes: ",
    '{"tipo":"titulo","texto":string} · {"tipo":"paragrafo","texto":string} · {"tipo":"lista","itens":string[],"ordenada":boolean} · {"tipo":"tabela","colunas":string[],"linhas":(string|number)[][],"legenda":string} · {"tipo":"metricas","itens":[{"rotulo":string,"valor":string,"nota":string}]} · {"tipo":"destaque","variante":"info"|"aviso"|"sucesso"|"erro","titulo":string,"texto":string} · {"tipo":"grafico","grafico":"barras"|"linha"|"rosca","titulo":string,"categorias":string[],"series":[{"nome":string,"valores":number[]}]} · {"tipo":"citacao","texto":string,"fonte":number} · {"tipo":"passos","itens":[{"titulo":string,"texto":string}]} · {"tipo":"pares","itens":[{"chave":string,"valor":string}]}',
    "Nos textos podes usar «termo» para destacar uma entidade, um nome ou um conceito importante (sai como etiqueta), **negrito**, e [1], [2]… para citar as fontes (o número é o «n» da lista de fontes). Só cites fontes que leste, e só uses números que vieram dos dados ou das fontes.",
    FOCOS[t.config.foco].instrucao,
    `Ênfase: ${ENFASES[t.config.enfase].instrucao}`,
  ].join("\n");
}

/** A IA já pesquisou e leu o que a profundidade pede? Se há menos páginas por ler do que o mínimo, o mínimo desce (não se pode ler o que não apareceu). */
export function podeConcluir(c: ConfigDaPesquisa, feito: { procuras: number; leituras: number; porLer: number }): boolean {
  if (!c.internet) return true;
  const p = PROFUNDIDADES[c.profundidade];
  return feito.procuras >= p.minimoDeProcuras && feito.leituras >= Math.min(p.minimoDeLeituras, feito.leituras + feito.porLer);
}

/** O que se diz à IA quando quer concluir cedo de mais. */
export function empurrao(c: ConfigDaPesquisa, feito: { procuras: number; leituras: number }): string {
  const p = PROFUNDIDADES[c.profundidade];
  const falta = [feito.procuras < p.minimoDeProcuras ? `procurar mais (${feito.procuras} de ${p.minimoDeProcuras})` : "", feito.leituras < p.minimoDeLeituras ? `ler páginas inteiras (${feito.leituras} de ${p.minimoDeLeituras})` : ""].filter(Boolean).join(" e ");
  return `Ainda não podes concluir: esta análise pede ${falta}. Escolhe as páginas mais fiáveis e mais úteis dos resultados, lê-as com ler_pagina (escreve em «nota» o que aprendeste) e só depois chama concluir.`;
}

/** O texto do que a pessoa escreveu a meio, como a IA o lê. */
export const mensagemDeCorrecao = (texto: string): string => `Correção da pessoa (obedece-lhe já): ${texto.trim()}`;

// ---------- guardar e ler (só no navegador) ----------

const CHAVE = "painel.pesquisas";
const MAXIMO = 25;
export const EVENTO_PESQUISAS = "painel:pesquisas";

const nova = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const novoIdDePesquisa = nova;

let memoria: TrabalhoDePesquisa[] | null = null;
let escrita = 0;

export function lerTrabalhos(): TrabalhoDePesquisa[] {
  if (memoria) return memoria;
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]") as unknown;
    memoria = Array.isArray(v) ? (v as TrabalhoDePesquisa[]).filter((t) => t && typeof t.id === "string") : [];
  } catch {
    memoria = [];
  }
  // o que estava a meio quando a página fechou volta à fila (as notas e as correções ficam)
  memoria = memoria.map((t) => (t.estado === "a pesquisar" || t.estado === "em pausa" ? { ...t, estado: "fila" as const, passoAtual: 0 } : t));
  return memoria;
}

function gravar(): void {
  window.clearTimeout(escrita);
  escrita = window.setTimeout(() => {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(lerTrabalhos()));
    } catch {
      /* cheio ou sem armazenamento: fica só em memória */
    }
  }, 300);
  window.dispatchEvent(new Event(EVENTO_PESQUISAS));
}

export const trabalhoPorId = (id: string): TrabalhoDePesquisa | undefined => lerTrabalhos().find((t) => t.id === id);

export function mudarTrabalho(id: string, f: (t: TrabalhoDePesquisa) => TrabalhoDePesquisa): void {
  memoria = lerTrabalhos().map((t) => (t.id === id ? f(t) : t));
  gravar();
}

export function criarTrabalho(alvo: AlvoDeAnalise, pedido: string, config: ConfigDaPesquisa): TrabalhoDePesquisa {
  const t: TrabalhoDePesquisa = {
    id: nova(),
    titulo: alvo.titulo,
    pedido: pedido.trim(),
    alvo,
    config,
    estado: "fila",
    criado: new Date().toISOString(),
    passoAtual: 0,
    passosPrevistos: PROFUNDIDADES[config.profundidade].passos,
    passos: [],
    correcoes: [],
    notas: [],
    fontes: [],
    chamadas: 0,
    tokens: 0,
    neurons: 0,
    custoUsd: 0,
  };
  // dos antigos ficam os que já acabaram mais recentes; o que está por acabar nunca se perde
  const todos = [...lerTrabalhos(), t];
  const aCabar = todos.filter((x) => !FINAIS.includes(x.estado));
  const acabados = todos.filter((x) => FINAIS.includes(x.estado)).slice(-Math.max(0, MAXIMO - aCabar.length));
  memoria = [...acabados, ...aCabar].sort((a, b) => a.criado.localeCompare(b.criado));
  gravar();
  return t;
}

export function acrescentarPasso(id: string, tipo: TipoDePasso, texto: string, detalhe?: string): void {
  mudarTrabalho(id, (t) => ({ ...t, passos: [...t.passos, { id: nova(), quando: new Date().toISOString(), tipo, texto: texto.slice(0, 600), ...(detalhe ? { detalhe: detalhe.slice(0, 1500) } : {}) }].slice(-250) }));
}

/** Põe de volta uma análise restaurada da reciclagem (sem repetir uma que já exista). */
export function reporTrabalho(t: TrabalhoDePesquisa): void {
  if (lerTrabalhos().some((x) => x.id === t.id)) return;
  memoria = [...lerTrabalhos(), t].sort((a, b) => a.criado.localeCompare(b.criado));
  gravar();
}

export function apagarTrabalho(id: string): void {
  memoria = lerTrabalhos().filter((t) => t.id !== id);
  gravar();
}

/** A pessoa corrige a IA a meio do trabalho: a correção entra no próximo passo. */
export function corrigirTrabalho(id: string, texto: string): void {
  const t = texto.trim();
  if (!t) return;
  mudarTrabalho(id, (x) => ({ ...x, correcoes: [...x.correcoes, { id: nova(), quando: new Date().toISOString(), texto: t.slice(0, 1000), aplicada: false }] }));
}

/** O mesmo trabalho outra vez, do princípio, com as correções já feitas (volta à fila). */
export function repetirTrabalho(id: string): void {
  mudarTrabalho(id, (t) => ({ ...t, estado: "fila", passoAtual: 0, passos: [], notas: [], fontes: [], resultado: undefined, erro: undefined, avisos: undefined, concluido: undefined, iniciado: undefined, mediaPassoMs: undefined, lido: false, correcoes: t.correcoes.map((c) => ({ ...c, aplicada: false })), criado: new Date().toISOString() }));
}

/** Os trabalhos, sempre atualizados, e o tempo estimado de cada um. */
export function useTrabalhos() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const ler = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO_PESQUISAS, ler);
    ler();
    return () => window.removeEventListener(EVENTO_PESQUISAS, ler);
  }, []);
  const trabalhos = typeof window === "undefined" ? [] : lerTrabalhos();
  return { versao, trabalhos, etas: etasDaFila(trabalhos), porLer: trabalhos.filter((t) => t.estado === "concluida" && !t.lido).length, porAcabar: trabalhos.filter((t) => !FINAIS.includes(t.estado)).length };
}

// ---------- abrir as janelas ----------

export const EVENTO_ANALISAR = "painel:analisar";
export const EVENTO_ABRIR_PESQUISAS = "painel:abrir-pesquisas";

/** Abre a janela «Analisar com IA» para isto (um cartão, uma lista, um registo, a página, ou uma pergunta livre). */
export function abrirAnalise(alvo: AlvoDeAnalise): void {
  window.dispatchEvent(new CustomEvent(EVENTO_ANALISAR, { detail: { alvo } }));
}

/** Abre a janela «Pesquisa em curso» (com um trabalho escolhido, se se disser qual). */
export function abrirPesquisas(id?: string): void {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_PESQUISAS, { detail: { id } }));
}

/** O que se exporta de uma análise acabada (a janela de exportar oferece os formatos de documento). */
export function fonteDaAnalise(t: Pick<TrabalhoDePesquisa, "titulo" | "resultado">): { nome: string; titulo: string; documento: DocumentoRico } | null {
  if (!t.resultado) return null;
  return { nome: `analise-${t.titulo}`, titulo: t.resultado.titulo, documento: t.resultado };
}
