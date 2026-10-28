// Guarda os dados já extraídos no próprio navegador (IndexedDB) para que recarregar a página não volte a zero. Nunca sai do dispositivo do analista.

const BASE = "painel-base";
const LOJA = "estado";

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA);
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

export async function guardar(chave: string, valor: unknown): Promise<void> {
  try {
    const db = await abrir();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(LOJA, "readwrite");
      t.objectStore(LOJA).put(valor, chave);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    db.close();
  } catch {
    /* navegação privada ou espaço esgotado: a análise continua a funcionar, só não sobrevive ao recarregamento */
  }
}

export async function ler<T>(chave: string): Promise<T | null> {
  try {
    const db = await abrir();
    const valor = await new Promise<T | null>((resolve, reject) => {
      const t = db.transaction(LOJA, "readonly");
      const r = t.objectStore(LOJA).get(chave);
      r.onsuccess = () => resolve((r.result as T | undefined) ?? null);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return valor;
  } catch {
    return null;
  }
}
