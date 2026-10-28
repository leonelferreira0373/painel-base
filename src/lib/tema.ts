// Tema claro ou escuro do painel: o Kumo muda de cores com o atributo data-mode da página. A escolha fica neste navegador.
"use client";

import { useSyncExternalStore } from "react";
import { CHAVE_TEMA as CHAVE } from "./tema-script";

export type Tema = "claro" | "escuro" | "sistema";

const EVENTO = "painel:tema";

function lerTema(): Tema {
  try {
    const t = window.localStorage.getItem(CHAVE);
    return t === "escuro" || t === "sistema" ? t : "claro";
  } catch {
    return "claro";
  }
}

const sistemaEscuro = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
export const efetivoDe = (t: Tema): "claro" | "escuro" => (t === "sistema" ? (sistemaEscuro() ? "escuro" : "claro") : t);

export function aplicarTema(t: Tema): void {
  const e = efetivoDe(t);
  const raiz = document.documentElement;
  raiz.dataset.mode = e === "escuro" ? "dark" : "light";
  raiz.style.colorScheme = e === "escuro" ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", e === "escuro" ? "#111111" : "#fcfcfc");
}

export function definirTema(t: Tema): void {
  try {
    window.localStorage.setItem(CHAVE, t);
  } catch {
    /* sem armazenamento */
  }
  aplicarTema(t);
  window.dispatchEvent(new Event(EVENTO));
}

function subscrever(aoMudar: () => void) {
  const sistema = window.matchMedia("(prefers-color-scheme: dark)");
  const aoSistema = () => {
    if (lerTema() === "sistema") aplicarTema("sistema");
    aoMudar();
  };
  window.addEventListener(EVENTO, aoMudar);
  sistema.addEventListener("change", aoSistema);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    sistema.removeEventListener("change", aoSistema);
  };
}

// O instantâneo junta a escolha e o resultado («sistema|escuro») para a página reagir também quando o sistema muda de tema.
const instantaneo = () => {
  const t = lerTema();
  return `${t}|${efetivoDe(t)}`;
};

export function useTema(): { tema: Tema; efetivo: "claro" | "escuro"; definir: (t: Tema) => void } {
  const valor = useSyncExternalStore(subscrever, instantaneo, () => "claro|claro");
  const [tema, efetivo] = valor.split("|") as [Tema, "claro" | "escuro"];
  return { tema, efetivo, definir: definirTema };
}
