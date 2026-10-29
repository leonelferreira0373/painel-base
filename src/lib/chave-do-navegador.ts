// A chave segura do navegador: um par de chaves ECDSA P-256 criado neste navegador, cuja parte privada nunca sai dele (a Web Crypto guarda-a sem a deixar ler, no IndexedDB). A conta guarda só a parte pública e a impressão do navegador. Para entrar, o painel lança um desafio aleatório, o navegador assina-o e a assinatura confere-se com a parte pública; se o navegador mudou (a impressão já não bate certo), a chave é recusada. Só existe em ligações seguras (https ou localhost).
import { aleatorios, sha256Hex } from "./cripto";

export interface ChaveDoNavegador {
  id: string;
  nome: string;
  criada: string;
  /** A parte pública (JWK): é o que a conta guarda. */
  publica: JsonWebKey;
  /** A impressão do navegador no momento em que a chave foi criada. */
  impressao: string;
  ultimoUso: string | null;
}

const BD = "bridge-chaves";
const ARMAZEM = "chaves";

/** Há Web Crypto e IndexedDB (ligação segura)? Sem elas não se criam nem se usam chaves. */
export const chaveSeguraDisponivel = (): boolean => typeof window !== "undefined" && typeof indexedDB !== "undefined" && !!globalThis.crypto?.subtle;

const abrir = (): Promise<IDBDatabase> =>
  new Promise((resolver, rejeitar) => {
    const p = indexedDB.open(BD, 1);
    p.onupgradeneeded = () => p.result.createObjectStore(ARMAZEM, { keyPath: "id" });
    p.onsuccess = () => resolver(p.result);
    p.onerror = () => rejeitar(p.error ?? new Error("Não foi possível abrir o armazém de chaves."));
  });

async function pedido<T>(modo: IDBTransactionMode, f: (a: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir();
  try {
    return await new Promise<T>((resolver, rejeitar) => {
      const r = f(bd.transaction(ARMAZEM, modo).objectStore(ARMAZEM));
      r.onsuccess = () => resolver(r.result);
      r.onerror = () => rejeitar(r.error ?? new Error("Falhou o armazém de chaves."));
    });
  } finally {
    bd.close();
  }
}

/** Uma impressão do navegador: o que não muda de uma visita para outra (navegador, sistema, idioma, fuso, ecrã), resumido. Não identifica a pessoa; só diz se é o mesmo navegador. */
export async function impressaoDoNavegador(): Promise<string> {
  const n = typeof navigator !== "undefined" ? navigator : undefined;
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  })();
  const traços = [n?.userAgent ?? "", n?.platform ?? "", (n?.languages ?? []).join(","), tz, typeof screen !== "undefined" ? `${screen.width}x${screen.height}x${screen.colorDepth}` : "", String(n?.hardwareConcurrency ?? "")];
  return (await sha256Hex(traços.join("|"))).slice(0, 32);
}

const idNovo = (): string => [...aleatorios(8)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Cria a chave neste navegador e devolve o registo que a conta guarda (sem a parte privada). */
export async function criarChaveDoNavegador(nome: string): Promise<ChaveDoNavegador> {
  if (!chaveSeguraDisponivel()) throw new Error("Este navegador precisa de uma ligação segura (https) para criar chaves.");
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  const publica = await crypto.subtle.exportKey("jwk", par.publicKey);
  const id = idNovo();
  await pedido("readwrite", (a) => a.put({ id, privada: par.privateKey, publica: par.publicKey }));
  return { id, nome: nome.trim() || "Este navegador", criada: new Date().toISOString(), publica, impressao: await impressaoDoNavegador(), ultimoUso: null };
}

/** Os identificadores das chaves que existem neste navegador. */
export async function idsDasChavesNesteNavegador(): Promise<string[]> {
  if (!chaveSeguraDisponivel()) return [];
  try {
    return (await pedido("readonly", (a) => a.getAllKeys())).map(String);
  } catch {
    return [];
  }
}

export async function apagarChaveDoNavegador(id: string): Promise<void> {
  if (!chaveSeguraDisponivel()) return;
  try {
    await pedido("readwrite", (a) => a.delete(id));
  } catch {
    /* já não existia */
  }
}

/** Assina o desafio com a chave privada que está neste navegador. */
export async function assinarDesafio(id: string, desafio: Uint8Array): Promise<ArrayBuffer> {
  const r = (await pedido("readonly", (a) => a.get(id))) as { privada: CryptoKey } | undefined;
  if (!r) throw new Error("Este navegador não tem essa chave.");
  return crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, r.privada, desafio as BufferSource);
}

/** A assinatura confere com a parte pública que a conta guardou? */
export async function verificarAssinatura(publica: JsonWebKey, desafio: Uint8Array, assinatura: ArrayBuffer): Promise<boolean> {
  try {
    const chave = await crypto.subtle.importKey("jwk", publica, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, chave, assinatura, desafio as BufferSource);
  } catch {
    return false;
  }
}
