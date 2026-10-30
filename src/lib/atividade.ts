// O registo de tudo o que se faz no painel, sessão a sessão: quando se entrou, de onde (o IP e o local), com que navegador e aparelho, e cada ação (as páginas, os cliques, as definições ligadas e desligadas com o antes e o depois, os campos mudados, as janelas, as mensagens com a IA, os convites, os tokens rodados…). Em modo simulado fica neste navegador; em modo ligado envia-se também ao servidor (ver docs/API.md, «sessões» e «atividade»).
"use client";

import { useEffect, useState } from "react";
import { PROJETO } from "@/dados/projeto";
import { chamar, lerLigacao } from "./api/cliente";
import { apagarConversas } from "./conversas-ia";

export type TipoDeAcao = "sessao" | "navegacao" | "clique" | "definicao" | "campo" | "janela" | "ia" | "convite" | "token" | "funcao" | "nota" | "dados" | "servidor";

export const ROTULO_DO_TIPO: Record<TipoDeAcao, string> = {
  sessao: "Sessão",
  navegacao: "Navegação",
  clique: "Clique",
  definicao: "Definição",
  campo: "Campo",
  janela: "Janela",
  ia: "IA",
  convite: "Convite",
  token: "Token",
  funcao: "Função",
  nota: "Nota",
  dados: "Dados",
  servidor: "Servidor",
};

export interface Dispositivo {
  navegador: string;
  versao: string;
  sistema: string;
  tipo: "computador" | "telemovel" | "tablet";
  ecra: string;
  idioma: string;
  fuso: string;
}

export interface Sessao {
  id: string;
  utilizador: string;
  funcao: string;
  inicio: string;
  /** A última vez que se fez alguma coisa (ou que a página esteve aberta). */
  ultima: string;
  fim?: string;
  motivoDoFim?: "terminada" | "inatividade" | "substituida";
  ip?: string;
  cidade?: string;
  regiao?: string;
  pais?: string;
  rede?: string;
  dispositivo: Dispositivo;
  acoes: number;
}

export interface Acao {
  id: string;
  sessao: string;
  quando: string;
  tipo: TipoDeAcao;
  texto: string;
  caminho?: string;
  antes?: string;
  depois?: string;
  /** O identificador da conversa com a IA a que a ação pertence (a conversa inteira abre-se a partir daqui). */
  conversa?: string;
}

// ---------- o aparelho ----------

/** O navegador, o sistema e o tipo de aparelho, lidos do texto que o navegador diz de si. */
export function descreverAgente(ua: string, extra: { largura?: number; altura?: number; idioma?: string; fuso?: string } = {}): Dispositivo {
  const v = (re: RegExp) => ua.match(re)?.[1]?.replace(/_/g, ".") ?? "";
  let navegador = "Navegador";
  let versao = "";
  if (/Edg(e|A|iOS)?\//.test(ua)) [navegador, versao] = ["Edge", v(/Edg(?:e|A|iOS)?\/([\d.]+)/)];
  else if (/OPR\/|Opera/.test(ua)) [navegador, versao] = ["Opera", v(/OPR\/([\d.]+)/)];
  else if (/SamsungBrowser\//.test(ua)) [navegador, versao] = ["Samsung Internet", v(/SamsungBrowser\/([\d.]+)/)];
  else if (/Firefox\/|FxiOS\//.test(ua)) [navegador, versao] = ["Firefox", v(/(?:Firefox|FxiOS)\/([\d.]+)/)];
  else if (/Chrome\/|CriOS\//.test(ua)) [navegador, versao] = ["Chrome", v(/(?:Chrome|CriOS)\/([\d.]+)/)];
  else if (/Safari\//.test(ua)) [navegador, versao] = ["Safari", v(/Version\/([\d.]+)/)];

  let sistema = "Sistema desconhecido";
  if (/Windows NT 10/.test(ua)) sistema = "Windows 10/11";
  else if (/Windows NT/.test(ua)) sistema = "Windows";
  else if (/Android/.test(ua)) sistema = `Android ${v(/Android ([\d.]+)/)}`.trim();
  else if (/iPhone|iPad|iPod/.test(ua)) sistema = `iOS ${v(/OS ([\d_]+)/)}`.trim();
  else if (/Mac OS X/.test(ua)) sistema = "macOS";
  else if (/CrOS/.test(ua)) sistema = "ChromeOS";
  else if (/Linux/.test(ua)) sistema = "Linux";

  const tipo: Dispositivo["tipo"] = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? "tablet" : /Mobi|iPhone|iPod|Android/.test(ua) ? "telemovel" : "computador";
  return { navegador, versao: versao.split(".")[0] ?? "", sistema, tipo, ecra: extra.largura && extra.altura ? `${extra.largura}×${extra.altura}` : "", idioma: extra.idioma ?? "", fuso: extra.fuso ?? "" };
}

export const rotuloDoDispositivo = (d: Dispositivo): string => `${d.navegador}${d.versao ? ` ${d.versao}` : ""} em ${d.sistema}`;
export const rotuloDoTipoDeAparelho = (t: Dispositivo["tipo"]): string => (t === "telemovel" ? "Telemóvel" : t === "tablet" ? "Tablet" : "Computador");

/** O local da sessão em palavras («Luanda, Angola») ou, sem o saber, o fuso horário. */
export function rotuloDoLocal(s: Pick<Sessao, "cidade" | "regiao" | "pais" | "dispositivo">): string {
  const nome = (() => {
    try {
      return s.pais ? new Intl.DisplayNames(["pt-PT"], { type: "region" }).of(s.pais) : "";
    } catch {
      return s.pais ?? "";
    }
  })();
  const partes = [s.cidade, nome || s.pais].filter(Boolean);
  return partes.length ? partes.join(", ") : s.dispositivo.fuso || "Local desconhecido";
}

// ---------- o que se guarda de cada campo ----------

const SENSIVEL = /palavra.?passe|password|senha|token|chave|segredo|secret|cvv|cart[aã]o|pin\b|c[oó]digo de/i;

/** O valor de um campo como se regista: o que é secreto nunca se guarda, o resto vai cortado. */
export function mascarar(nome: string, valor: string, tipo = ""): string {
  if (tipo === "password" || SENSIVEL.test(nome)) return valor ? "••••••" : "";
  const limpo = valor.replace(/\s+/g, " ").trim();
  return limpo.length > 90 ? `${limpo.slice(0, 90)}…` : limpo;
}

// ---------- a duração e as listas ----------

export const duracaoDe = (s: Pick<Sessao, "inicio" | "ultima" | "fim">, agora = Date.now()): number => Math.max(0, (s.fim ? new Date(s.fim).getTime() : Math.min(agora, new Date(s.ultima).getTime())) - new Date(s.inicio).getTime());

export function textoDaDuracao(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")} min`;
}

/** As sessões sem fim cuja última atividade já passou `limiteMs` ficam terminadas por inatividade, na hora da última atividade. */
export function fecharInativas(sessoes: Sessao[], agora: number, limiteMs: number, excepto?: string): Sessao[] {
  return sessoes.map((s) => (s.fim || s.id === excepto || agora - new Date(s.ultima).getTime() < limiteMs ? s : { ...s, fim: s.ultima, motivoDoFim: "inatividade" as const }));
}

export interface FiltroDeAcoes {
  sessao?: string;
  tipos?: TipoDeAcao[];
  texto?: string;
  de?: string;
  ate?: string;
}

/** Uma linha que junta as ações de uma conversa com a IA: quantas perguntas houve e qual foi a primeira. */
export interface AcaoAgrupada extends Acao {
  resumo?: { perguntas: number; primeira: string };
}

const PERGUNTA = /^Perguntou à IA: «([\s\S]*)»$/;

/** Junta as ações de cada conversa com a IA numa só linha (no lugar da mais recente); as outras ficam como estão. A lista vem da mais recente para a mais antiga. */
export function agruparConversas(acoes: Acao[]): AcaoAgrupada[] {
  const grupos = new Map<string, AcaoAgrupada>();
  const saida: AcaoAgrupada[] = [];
  for (const a of acoes) {
    if (a.tipo !== "ia" || !a.conversa) {
      saida.push(a);
      continue;
    }
    let g = grupos.get(a.conversa);
    if (!g) {
      const { antes: _antes, depois: _depois, ...resto } = a;
      g = { ...resto, id: `conversa-${a.conversa}`, texto: "Conversa com a IA", resumo: { perguntas: 0, primeira: "" } };
      grupos.set(a.conversa, g);
      saida.push(g);
    }
    const pergunta = PERGUNTA.exec(a.texto);
    if (pergunta) {
      g.resumo!.perguntas += 1;
      // da mais recente para a mais antiga: a última que se encontra é a primeira que se fez
      g.resumo!.primeira = pergunta[1];
    }
  }
  return saida;
}

const semAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrarAcoes(acoes: Acao[], f: FiltroDeAcoes): Acao[] {
  const q = f.texto ? semAcentos(f.texto.trim()) : "";
  const de = f.de ? new Date(f.de).getTime() : -Infinity;
  const ate = f.ate ? new Date(f.ate).getTime() : Infinity;
  return acoes.filter((a) => {
    if (f.sessao && a.sessao !== f.sessao) return false;
    if (f.tipos?.length && !f.tipos.includes(a.tipo)) return false;
    const t = new Date(a.quando).getTime();
    if (t < de || t > ate) return false;
    return !q || semAcentos(`${a.texto} ${a.antes ?? ""} ${a.depois ?? ""} ${a.caminho ?? ""}`).includes(q);
  });
}

const celula = (v: unknown) => {
  const t = String(v ?? "");
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** Um ficheiro CSV (separado por «;», como o Excel em português espera) com cada ação e a sessão a que pertence. */
export function paraCsv(sessoes: Sessao[], acoes: Acao[]): string {
  const porId = new Map(sessoes.map((s) => [s.id, s]));
  const linhas = [["Quando", "Utilizador", "Função", "Tipo", "Ação", "Antes", "Depois", "Página", "IP", "Local", "Aparelho", "Sessão"]];
  for (const a of acoes) {
    const s = porId.get(a.sessao);
    linhas.push([a.quando, s?.utilizador ?? "", s?.funcao ?? "", ROTULO_DO_TIPO[a.tipo], a.texto, a.antes ?? "", a.depois ?? "", a.caminho ?? "", s?.ip ?? "", s ? rotuloDoLocal(s) : "", s ? rotuloDoDispositivo(s.dispositivo) : "", a.sessao]);
  }
  return `﻿${linhas.map((l) => l.map(celula).join(";")).join("\r\n")}`;
}

// ---------- guardar e ler (só no navegador) ----------

const CHAVE_SESSOES = "painel.atividade.sessoes";
const CHAVE_ACOES = "painel.atividade.acoes";
const CHAVE_ATUAL = "painel.atividade.atual";
const MAXIMO_SESSOES = 60;
const MAXIMO_ACOES = 3000;
const INATIVIDADE_MS = 30 * 60_000;
export const EVENTO_ATIVIDADE = "painel:atividade";

const nova = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function ler<T>(chave: string): T[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(chave) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

// a cópia em memória evita ler e escrever o armazenamento a cada clique
let sessoesEmMemoria: Sessao[] | null = null;
let acoesEmMemoria: Acao[] | null = null;
let atual: Sessao | null = null;
let escrita = 0;
let aviso = 0;
const fila: Acao[] = [];

export const lerSessoes = (): Sessao[] => (sessoesEmMemoria ??= ler<Sessao>(CHAVE_SESSOES));
export const lerAcoes = (): Acao[] => (acoesEmMemoria ??= ler<Acao>(CHAVE_ACOES));
export const sessaoAtual = (): Sessao | null => atual;

function gravar(): void {
  try {
    window.localStorage.setItem(CHAVE_SESSOES, JSON.stringify(lerSessoes()));
    window.localStorage.setItem(CHAVE_ACOES, JSON.stringify(lerAcoes()));
  } catch {
    /* sem armazenamento ou cheio: fica só em memória */
  }
}

function agendar(): void {
  window.clearTimeout(escrita);
  escrita = window.setTimeout(gravar, 400);
  window.clearTimeout(aviso);
  aviso = window.setTimeout(() => window.dispatchEvent(new Event(EVENTO_ATIVIDADE)), 120);
}

function mudarSessao(id: string, f: (s: Sessao) => Sessao): void {
  sessoesEmMemoria = lerSessoes().map((s) => (s.id === id ? f(s) : s));
  if (atual?.id === id) atual = sessoesEmMemoria.find((s) => s.id === id) ?? atual;
}

const emServidor = () => lerLigacao().modo === "ligado";

/** Regista uma ação na sessão em curso. Duas iguais seguidas no mesmo segundo contam como uma. */
export function registar(tipo: TipoDeAcao, texto: string, extra: Partial<Pick<Acao, "caminho" | "antes" | "depois" | "conversa">> = {}): void {
  if (typeof window === "undefined" || !atual) return;
  const agora = new Date().toISOString();
  const acoes = lerAcoes();
  const ultima = acoes[0];
  if (ultima && ultima.sessao === atual.id && ultima.tipo === tipo && ultima.texto === texto && ultima.depois === extra.depois && Date.now() - new Date(ultima.quando).getTime() < 1000) return;
  const acao: Acao = { id: nova(), sessao: atual.id, quando: agora, tipo, texto: texto.slice(0, 240), caminho: extra.caminho ?? window.location.pathname, ...(extra.antes !== undefined ? { antes: extra.antes } : {}), ...(extra.depois !== undefined ? { depois: extra.depois } : {}), ...(extra.conversa ? { conversa: extra.conversa } : {}) };
  acoesEmMemoria = [acao, ...acoes].slice(0, MAXIMO_ACOES);
  mudarSessao(atual.id, (s) => ({ ...s, ultima: agora, acoes: s.acoes + 1 }));
  if (emServidor()) fila.push(acao);
  agendar();
}

/** Quando a página fica de lado ou fecha: grava já o que falta e avisa o servidor. */
function descarregar(): void {
  window.clearTimeout(escrita);
  gravar();
  void enviarFila();
}

async function enviarFila(): Promise<void> {
  if (!fila.length || !atual) return;
  const lote = fila.splice(0, 200);
  try {
    await chamar(lerLigacao(), "POST", "/v1/painel/atividade", { sessao: atual, itens: lote });
  } catch {
    fila.unshift(...lote.slice(0, 400));
  }
}

/** Abre a sessão deste separador (ou retoma-a se a página só recarregou) e vai buscar o IP e o local. */
export function iniciarSessao(utilizador: string, funcao: string): Sessao {
  const agora = new Date();
  let sessoes = fecharInativas(lerSessoes(), agora.getTime(), INATIVIDADE_MS);
  let retomada: Sessao | undefined;
  try {
    const id = window.sessionStorage.getItem(CHAVE_ATUAL);
    retomada = id ? sessoes.find((s) => s.id === id && !s.fim) : undefined;
  } catch {
    /* sem armazenamento */
  }
  if (retomada) {
    atual = { ...retomada, utilizador, funcao, ultima: agora.toISOString() };
    sessoes = sessoes.map((s) => (s.id === atual!.id ? atual! : s));
    sessoesEmMemoria = sessoes;
    agendar();
    if (!atual.ip) void descobrirLocal(atual.id);
    return atual;
  }
  const s: Sessao = {
    id: nova(),
    utilizador,
    funcao,
    inicio: agora.toISOString(),
    ultima: agora.toISOString(),
    dispositivo: descreverAgente(navigator.userAgent, { largura: window.screen.width, altura: window.screen.height, idioma: navigator.language, fuso: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    acoes: 0,
  };
  atual = s;
  sessoesEmMemoria = [s, ...sessoes].slice(0, MAXIMO_SESSOES);
  try {
    window.sessionStorage.setItem(CHAVE_ATUAL, s.id);
  } catch {
    /* sem armazenamento */
  }
  registar("sessao", `Iniciou a sessão (${rotuloDoDispositivo(s.dispositivo)}, ${rotuloDoTipoDeAparelho(s.dispositivo.tipo).toLowerCase()})`);
  void descobrirLocal(s.id);
  return s;
}

/** O IP e o local, pelo Worker (que os vê no pedido); sem Worker, só se sabe o fuso horário. */
async function descobrirLocal(id: string): Promise<void> {
  if (!PROJETO.urlIa) return;
  try {
    const c = new AbortController();
    const t = window.setTimeout(() => c.abort(), 7000);
    const r = await fetch(`${PROJETO.urlIa}/eu`, { signal: c.signal });
    window.clearTimeout(t);
    if (!r.ok) return;
    const d = (await r.json()) as { ip?: string; pais?: string; regiao?: string; cidade?: string; rede?: string };
    if (!d.ip) return;
    mudarSessao(id, (s) => ({ ...s, ip: d.ip, pais: d.pais || undefined, regiao: d.regiao || undefined, cidade: d.cidade || undefined, rede: d.rede || undefined }));
    if (atual?.id === id) registar("sessao", `Ligou-se de ${rotuloDoLocal(atual)} (IP ${d.ip}${d.rede ? `, ${d.rede}` : ""})`);
    agendar();
  } catch {
    /* sem Worker ou sem rede: fica sem IP */
  }
}

export function terminarSessao(motivo: NonNullable<Sessao["motivoDoFim"]> = "terminada"): void {
  if (!atual) return;
  registar("sessao", motivo === "inatividade" ? "A sessão terminou por inatividade" : "Terminou a sessão");
  const fim = new Date().toISOString();
  mudarSessao(atual.id, (s) => ({ ...s, fim, motivoDoFim: motivo }));
  descarregar();
  try {
    window.sessionStorage.removeItem(CHAVE_ATUAL);
  } catch {
    /* sem armazenamento */
  }
  atual = null;
}

/** Marca que a sessão continua viva (para a duração e para a inatividade). */
export function baterPulso(): void {
  if (!atual) return;
  const agora = new Date().toISOString();
  mudarSessao(atual.id, (s) => ({ ...s, ultima: agora }));
  agendar();
}

/** Põe de volta o histórico de atividade restaurado da reciclagem (junta-o ao que já existe). */
export function reporAtividade(d: { sessoes: Sessao[]; acoes: Acao[] }): void {
  const sessoes = lerSessoes();
  const acoes = lerAcoes();
  sessoesEmMemoria = [...sessoes, ...d.sessoes.filter((s) => !sessoes.some((x) => x.id === s.id))].sort((a, b) => b.inicio.localeCompare(a.inicio)).slice(0, MAXIMO_SESSOES);
  acoesEmMemoria = [...acoes, ...d.acoes.filter((a) => !acoes.some((x) => x.id === a.id))].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, MAXIMO_ACOES);
  descarregar();
  window.dispatchEvent(new Event(EVENTO_ATIVIDADE));
}

export function apagarAtividade(): void {
  sessoesEmMemoria = atual ? lerSessoes().filter((s) => s.id === atual!.id) : [];
  acoesEmMemoria = atual ? lerAcoes().filter((a) => a.sessao === atual!.id) : [];
  apagarConversas(new Set(lerAcoes().flatMap((a) => (a.conversa ? [a.conversa] : []))));
  descarregar();
  window.dispatchEvent(new Event(EVENTO_ATIVIDADE));
}

/** Liga as ações da página ao registo: grava ao sair e vai mandando a fila ao servidor. */
export function ligarOsOuvintes(): () => void {
  const aSair = () => descarregar();
  const aVisibilidade = () => {
    if (document.visibilityState === "hidden") descarregar();
    else baterPulso();
  };
  const pulso = window.setInterval(() => {
    if (document.visibilityState === "visible") baterPulso();
  }, 60_000);
  const envio = window.setInterval(() => void enviarFila(), 5000);
  window.addEventListener("pagehide", aSair);
  document.addEventListener("visibilitychange", aVisibilidade);
  return () => {
    window.removeEventListener("pagehide", aSair);
    document.removeEventListener("visibilitychange", aVisibilidade);
    window.clearInterval(pulso);
    window.clearInterval(envio);
  };
}

/** As sessões e as ações deste navegador, sempre atualizadas. */
export function useAtividade() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const ler = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO_ATIVIDADE, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO_ATIVIDADE, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  return { versao, sessoes: typeof window === "undefined" ? [] : lerSessoes(), acoes: typeof window === "undefined" ? [] : lerAcoes(), atual: sessaoAtual() };
}
