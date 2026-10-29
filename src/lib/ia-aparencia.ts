// A aparência do assistente de IA que cada pessoa escolhe: por agora, a cor do anel de contexto (a área redonda ao lado da escrita). Fica neste navegador e todos os anéis do painel acompanham a escolha na hora.
"use client";

import { useEffect, useState } from "react";
import { corValida } from "./cores-graficos";

const CHAVE = "painel.ia.corDoAnel";
const EVENTO = "painel:cor-do-anel";

/** A cor escolhida para o anel de contexto, ou null para ficar com as cores do aviso (verde, âmbar e vermelho). */
export function lerCorDoAnel(): string | null {
  try {
    const v = window.localStorage.getItem(CHAVE);
    return corValida(v) ? v : null;
  } catch {
    return null;
  }
}

/** Escolhe a cor do anel (uma cor de seis dígitos) ou volta às cores do aviso (null). */
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
