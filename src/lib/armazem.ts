// Armazenamento local do painel (IndexedDB): os ficheiros, a memória da IA e os artigos do blog ficam no navegador, sem servidor. Um hook por coleção mantém os ecrãs sincronizados: quem guarda ou remove avisa os outros.
import { useCallback, useEffect, useState } from "react";

export type Loja = "ficheiros" | "memoria" | "artigos";

const BASE = "painel-dados";
const LOJAS: Loja[] = ["ficheiros", "memoria", "artigos"];

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => LOJAS.forEach((l) => r.result.createObjectStore(l, { keyPath: "id" }));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function pedir<T>(loja: Loja, modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir();
  return new Promise((ok, erro) => {
    const r = f(bd.transaction(loja, modo).objectStore(loja));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

const ouvintes = new Map<Loja, Set<() => void>>();
const avisar = (loja: Loja) => ouvintes.get(loja)?.forEach((f) => f());

export const todos = <T,>(loja: Loja) => pedir<T[]>(loja, "readonly", (s) => s.getAll());

export async function guardar<T extends { id: string }>(loja: Loja, item: T): Promise<void> {
  await pedir(loja, "readwrite", (s) => s.put(item));
  avisar(loja);
}

export async function remover(loja: Loja, id: string): Promise<void> {
  await pedir(loja, "readwrite", (s) => s.delete(id));
  avisar(loja);
}

/** Os itens de uma coleção, sempre atualizados; `pronto` fica verdadeiro depois da primeira leitura. */
export function useArmazem<T extends { id: string }>(loja: Loja) {
  const [itens, setItens] = useState<T[]>([]);
  const [pronto, setPronto] = useState(false);
  const carregar = useCallback(async () => {
    try {
      setItens(await todos<T>(loja));
    } catch {
      /* sem armazenamento (janela privada, por exemplo): fica vazio */
    }
    setPronto(true);
  }, [loja]);
  useEffect(() => {
    void carregar();
    const conjunto = ouvintes.get(loja) ?? new Set<() => void>();
    conjunto.add(carregar);
    ouvintes.set(loja, conjunto);
    return () => {
      conjunto.delete(carregar);
    };
  }, [loja, carregar]);
  return { itens, pronto, guardar: (i: T) => guardar(loja, i), remover: (id: string) => remover(loja, id) };
}
