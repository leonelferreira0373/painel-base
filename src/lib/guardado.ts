// Estado que fica no navegador (localStorage) e se mantém entre visitas: o `useState` dos ecrãs do super painel que guardam a sua configuração. `definir` aceita um valor ou uma função, como o `useState`; o terceiro valor diz se já se leu o que estava guardado.
import { useCallback, useEffect, useState } from "react";

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
