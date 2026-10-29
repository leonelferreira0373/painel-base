// Estado que fica no navegador (localStorage) e se mantém entre visitas: o `useState` dos ecrãs do super painel que guardam a sua configuração. `definir` aceita um valor ou uma função, como o `useState`; o terceiro valor diz se já se leu o que estava guardado.
import { useCallback, useEffect, useState } from "react";
import { EVENTO_GUARDADO } from "./reciclagem-tipos";

export function useGuardado<T>(chave: string, inicial: T): [T, (v: T | ((antes: T) => T)) => void, boolean] {
  const [valor, setValor] = useState<T>(inicial);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(`painel.${chave}`);
      if (guardado !== null) setValor(JSON.parse(guardado) as T);
    } catch {
      /* sem armazenamento: fica o valor de origem */
    }
    setPronto(true);
  }, [chave]);
  // um item restaurado da reciclagem escreve na lista por fora: lê-se outra vez
  useEffect(() => {
    const ler = (e: Event) => {
      if ((e as CustomEvent<{ chave?: string }>).detail?.chave !== chave) return;
      try {
        const guardado = window.localStorage.getItem(`painel.${chave}`);
        if (guardado !== null) setValor(JSON.parse(guardado) as T);
      } catch {
        /* sem armazenamento */
      }
    };
    window.addEventListener(EVENTO_GUARDADO, ler);
    return () => window.removeEventListener(EVENTO_GUARDADO, ler);
  }, [chave]);
  const definir = useCallback(
    (v: T | ((antes: T) => T)) =>
      setValor((antes) => {
        const novo = typeof v === "function" ? (v as (a: T) => T)(antes) : v;
        try {
          window.localStorage.setItem(`painel.${chave}`, JSON.stringify(novo));
        } catch {
          /* sem armazenamento */
        }
        return novo;
      }),
    [chave],
  );
  return [valor, definir, pronto];
}
