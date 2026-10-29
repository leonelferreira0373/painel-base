// Escolher uma pasta do computador pelo próprio navegador (a janela de pastas do sistema), sem escrever caminhos à mão. O navegador só diz o nome da pasta (o «endereço final»), nunca o caminho completo: guarda-se esse nome, e o acesso à pasta guarda-se no IndexedDB para o painel poder lá escrever (por exemplo as cópias de segurança) sem voltar a perguntar. Só existe em ligações seguras (https ou localhost) e em navegadores que o permitem (Chrome, Edge).
interface JanelaComPastas {
  showDirectoryPicker?: (opcoes?: { mode?: "read" | "readwrite"; id?: string }) => Promise<PastaDoNavegador>;
}

/** O acesso a uma pasta: o que o navegador devolve ao escolher. */
export interface PastaDoNavegador {
  readonly name: string;
  getFileHandle(nome: string, opcoes?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(dados: Blob | string): Promise<void>; close(): Promise<void> }> }>;
  queryPermission?(opcoes: { mode: "read" | "readwrite" }): Promise<"granted" | "denied" | "prompt">;
  requestPermission?(opcoes: { mode: "read" | "readwrite" }): Promise<"granted" | "denied" | "prompt">;
}

const BD = "bridge-pastas";
const ARMAZEM = "pastas";

/** O navegador deixa escolher uma pasta? */
export const podeEscolherPasta = (): boolean => typeof window !== "undefined" && window.isSecureContext && typeof (window as unknown as JanelaComPastas).showDirectoryPicker === "function";

/** Abre a janela de pastas do sistema; `null` se a pessoa a fechou sem escolher. */
export async function escolherPasta(): Promise<PastaDoNavegador | null> {
  const abrir = (window as unknown as JanelaComPastas).showDirectoryPicker;
  if (!abrir) throw new Error("Este navegador não deixa escolher pastas.");
  try {
    return await abrir.call(window, { mode: "readwrite", id: "painel-copias" });
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") return null;
    throw e;
  }
}

const abrirBd = (): Promise<IDBDatabase> =>
  new Promise((resolver, rejeitar) => {
    const p = indexedDB.open(BD, 1);
    p.onupgradeneeded = () => p.result.createObjectStore(ARMAZEM);
    p.onsuccess = () => resolver(p.result);
    p.onerror = () => rejeitar(p.error ?? new Error("Não foi possível abrir o armazém de pastas."));
  });

async function pedido<T>(modo: IDBTransactionMode, f: (a: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrirBd();
  try {
    return await new Promise<T>((resolver, rejeitar) => {
      const r = f(bd.transaction(ARMAZEM, modo).objectStore(ARMAZEM));
      r.onsuccess = () => resolver(r.result);
      r.onerror = () => rejeitar(r.error ?? new Error("Falhou o armazém de pastas."));
    });
  } finally {
    bd.close();
  }
}

/** Guarda o acesso à pasta de um destino (a chave é o identificador do destino). */
export const guardarPasta = (id: string, pasta: PastaDoNavegador): Promise<IDBValidKey> => pedido("readwrite", (a) => a.put(pasta, id));
export const lerPasta = async (id: string): Promise<PastaDoNavegador | null> => ((await pedido("readonly", (a) => a.get(id))) as PastaDoNavegador | undefined) ?? null;
export const tirarPasta = (id: string): Promise<undefined> => pedido("readwrite", (a) => a.delete(id));

/** A pasta pode receber ficheiros agora? Se o navegador precisa de licença, pede-a (só funciona a seguir a um clique). */
export async function licencaDaPasta(pasta: PastaDoNavegador, pedir = true): Promise<boolean> {
  const opcoes = { mode: "readwrite" as const };
  if ((await pasta.queryPermission?.(opcoes)) === "granted") return true;
  return pedir && (await pasta.requestPermission?.(opcoes)) === "granted";
}

/** Escreve um ficheiro na pasta. */
export async function escreverNaPasta(pasta: PastaDoNavegador, nome: string, conteudo: Blob | string): Promise<void> {
  const ficheiro = await pasta.getFileHandle(nome, { create: true });
  const w = await ficheiro.createWritable();
  await w.write(conteudo);
  await w.close();
}
