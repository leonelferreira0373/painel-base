// A aparência do assistente de IA que cada pessoa escolhe: as cores do ponto de «alguém online» e de «ninguém online», as do anel de contexto (as três fases em que enche) e as das partes do contexto, todas numa gama leve e agradável (azul, amarelo, rosa, verde), e uma cor só para o anel que, se escolhida, vale por todas as fases. Fica neste navegador e tudo o que usa estas cores acompanha a escolha na hora (as cores são variáveis de CSS no documento).
"use client";

import { useEffect, useState } from "react";
import { corValida } from "./cores-graficos";

const CHAVE = "painel.ia.corDoAnel";
const CHAVE_CORES = "painel.ia.cores";
const EVENTO = "painel:cor-do-anel";
const EVENTO_CORES = "painel:cores-do-assistente";

/** Cada cor do assistente: o nome (para o painel), a variável de CSS e a cor de partida (leve, como as do Kumo). */
export const CORES_DO_ASSISTENTE = {
  online: { rotulo: "Alguém online", variavel: "--ia-online", padrao: "#86efac" },
  ausente: { rotulo: "Ninguém online", variavel: "--ia-ausente", padrao: "#fcd34d" },
  anelBom: { rotulo: "Anel: com espaço", variavel: "--ia-anel-bom", padrao: "#93c5fd" },
  anelAviso: { rotulo: "Anel: a encher", variavel: "--ia-anel-aviso", padrao: "#fcd34d" },
  anelPerigo: { rotulo: "Anel: quase cheio", variavel: "--ia-anel-perigo", padrao: "#f9a8d4" },
  parteSistema: { rotulo: "Contexto: instruções", variavel: "--ia-parte-sistema", padrao: "#93c5fd" },
  parteFerramentas: { rotulo: "Contexto: ferramentas", variavel: "--ia-parte-ferramentas", padrao: "#fcd34d" },
  parteMensagens: { rotulo: "Contexto: conversa", variavel: "--ia-parte-mensagens", padrao: "#86efac" },
  parteResposta: { rotulo: "Contexto: resposta", variavel: "--ia-parte-resposta", padrao: "#f9a8d4" },
} as const;

export type ChaveDeCor = keyof typeof CORES_DO_ASSISTENTE;
export type CoresEscolhidas = Partial<Record<ChaveDeCor, string>>;

/** As cores que a pessoa escolheu (as que não escolheu ficam de fora e valem as de partida). */
export function lerCoresDoAssistente(): CoresEscolhidas {
  try {
    const bruto = JSON.parse(window.localStorage.getItem(CHAVE_CORES) ?? "{}") as Record<string, unknown>;
    const saida: CoresEscolhidas = {};
    for (const k of Object.keys(CORES_DO_ASSISTENTE) as ChaveDeCor[]) if (typeof bruto[k] === "string" && corValida(bruto[k] as string)) saida[k] = (bruto[k] as string).toLowerCase();
    return saida;
  } catch {
    return {};
  }
}

/** As cores com as de partida a preencher o que falta. */
export const coresDoAssistente = (escolhidas: CoresEscolhidas): Record<ChaveDeCor, string> =>
  Object.fromEntries((Object.entries(CORES_DO_ASSISTENTE) as [ChaveDeCor, (typeof CORES_DO_ASSISTENTE)[ChaveDeCor]][]).map(([k, c]) => [k, escolhidas[k] ?? c.padrao])) as Record<ChaveDeCor, string>;

/** Põe as cores no documento (variáveis de CSS) para o chat, o anel e as janelas as usarem. */
export function aplicarCoresDoAssistente(escolhidas: CoresEscolhidas = lerCoresDoAssistente()): void {
  if (typeof document === "undefined") return;
  for (const [k, c] of Object.entries(CORES_DO_ASSISTENTE) as [ChaveDeCor, (typeof CORES_DO_ASSISTENTE)[ChaveDeCor]][]) {
    if (escolhidas[k]) document.documentElement.style.setProperty(c.variavel, escolhidas[k]!);
    else document.documentElement.style.removeProperty(c.variavel);
  }
}

/** Escolhe uma cor do assistente (seis dígitos) ou volta à de partida (`null`). */
export function definirCorDoAssistente(chave: ChaveDeCor, cor: string | null): void {
  const atuais = lerCoresDoAssistente();
  if (cor && corValida(cor)) atuais[chave] = cor.toLowerCase();
  else delete atuais[chave];
  try {
    if (Object.keys(atuais).length) window.localStorage.setItem(CHAVE_CORES, JSON.stringify(atuais));
    else window.localStorage.removeItem(CHAVE_CORES);
  } catch {
    /* sem armazenamento */
  }
  aplicarCoresDoAssistente(atuais);
  window.dispatchEvent(new Event(EVENTO_CORES));
}

/** Volta a todas as cores de partida (também a cor única do anel). */
export function reporCoresDoAssistente(): void {
  try {
    window.localStorage.removeItem(CHAVE_CORES);
  } catch {
    /* sem armazenamento */
  }
  definirCorDoAnel(null);
  aplicarCoresDoAssistente({});
  window.dispatchEvent(new Event(EVENTO_CORES));
}

/** As cores do assistente, sempre atualizadas; chamar em qualquer sítio que as use garante que ficam aplicadas no documento. */
export function useCoresDoAssistente(): Record<ChaveDeCor, string> {
  const [escolhidas, setEscolhidas] = useState<CoresEscolhidas>({});
  useEffect(() => {
    const ler = () => {
      const c = lerCoresDoAssistente();
      setEscolhidas(c);
      aplicarCoresDoAssistente(c);
    };
    ler();
    window.addEventListener(EVENTO_CORES, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO_CORES, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  return coresDoAssistente(escolhidas);
}

/** A cor escolhida para o anel de contexto, ou null para ficar com as cores das fases. */
export function lerCorDoAnel(): string | null {
  try {
    const v = window.localStorage.getItem(CHAVE);
    return corValida(v) ? v : null;
  } catch {
    return null;
  }
}

/** Escolhe a cor do anel (uma cor de seis dígitos) ou volta às cores das fases (null). */
export function definirCorDoAnel(cor: string | null): void {
  try {
    if (cor && corValida(cor)) window.localStorage.setItem(CHAVE, cor.toLowerCase());
    else window.localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** A cor do anel de contexto, sempre atualizada (também quando muda noutro separador). */
export function useCorDoAnel(): string | null {
  const [cor, setCor] = useState<string | null>(null);
  useEffect(() => {
    const ler = () => setCor(lerCorDoAnel());
    ler();
    window.addEventListener(EVENTO, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  return cor;
}

/** As três cores com que o anel se desenha a partir da escolhida: o arco, o fio de fundo e o fundo da área redonda. */
export function coresDoAnel(cor: string): { arco: string; fio: string; fundo: string } {
  return { arco: cor, fio: `color-mix(in oklab, ${cor} 28%, transparent)`, fundo: `color-mix(in oklab, ${cor} 16%, transparent)` };
}
