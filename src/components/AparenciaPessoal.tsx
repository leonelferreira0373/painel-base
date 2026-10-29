// Aplica ao painel as cores e as letras que o utilizador escolheu (Definições da conta → Aparência): põe as variáveis CSS no <html> para o tema em vigor e guarda uma cópia para o script do tema as pôr antes de pintar. Não desenha nada.
"use client";

import { useEffect } from "react";
import { variaveisDoTema } from "@/lib/aparencia";
import { useConta } from "@/lib/conta";
import { useTema } from "@/lib/tema";
import { registarFonte } from "@/lib/fontes";

export const CHAVE_APARENCIA = "painel.aparencia";

export function AparenciaPessoal() {
  const { conta } = useConta();
  // as letras que a pessoa carregou (ficheiros e ligações) põem-se a funcionar em todo o painel
  useEffect(() => {
    (conta.fontes ?? []).forEach((f) => void registarFonte(f));
  }, [conta.fontes]);
  const { efetivo } = useTema();
  const aparencia = conta.aparencia;
  useEffect(() => {
    const modo = efetivo === "escuro" ? "escuro" : "claro";
    const variaveis = variaveisDoTema(modo, aparencia);
    const raiz = document.documentElement;
    for (const [k, v] of Object.entries(variaveis)) raiz.style.setProperty(k, v);
    try {
      window.localStorage.setItem(CHAVE_APARENCIA, JSON.stringify({ claro: variaveisDoTema("claro", aparencia), escuro: variaveisDoTema("escuro", aparencia) }));
    } catch {
      /* sem armazenamento */
    }
    return () => {
      for (const k of Object.keys(variaveis)) raiz.style.removeProperty(k);
    };
  }, [aparencia, efetivo]);
  return null;
}
