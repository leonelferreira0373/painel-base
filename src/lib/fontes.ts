// Letras carregadas pela pessoa: validar ficheiros e ligações, guardar os ficheiros no navegador (IndexedDB) e registá-los para o painel os usar. As funções puras testam-se; as que tocam no navegador só correm lá.
import { FORMATOS_DE_LETRA, type FonteCarregada } from "@/dados/fontes";

/** «Minha-Letra_Bold.woff2» → «Minha Letra Bold». */
export function nomeDoFicheiro(ficheiro: string): string {
  return ficheiro
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** O ficheiro é de um formato de letra que o navegador lê? */
export const eFicheiroDeLetra = (nomeOuUrl: string) => FORMATOS_DE_LETRA.some((f) => nomeOuUrl.toLowerCase().split(/[?#]/)[0].endsWith(f));

/** Mensagem de erro para uma ligação, ou null se serve: só https, para a página não carregar nada inseguro. */
export function erroDaLigacao(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" ? null : "A ligação tem de começar por https://.";
  } catch {
    return "Escreva uma ligação completa, por exemplo https://fonts.googleapis.com/css2?family=Roboto.";
  }
}

/** Do Google Fonts, «…css2?family=Open+Sans:wght@400;700» → «Open Sans»; de outras ligações, null. */
export function familiaDaLigacao(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const f = u.searchParams.get("family");
    return f ? f.split(":")[0].replace(/\+/g, " ") : null;
  } catch {
    return null;
  }
}

const BASE = "painel-letras";
const LOJA = "ficheiros";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function pedir<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir();
  return new Promise((ok, erro) => {
    const r = f(bd.transaction(LOJA, modo).objectStore(LOJA));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

export const guardarFicheiro = (id: string, ficheiro: Blob) => pedir("readwrite", (s) => s.put(ficheiro, id));
export const lerFicheiro = (id: string) => pedir<Blob | undefined>("readonly", (s) => s.get(id));
export const apagarFicheiro = (id: string) => pedir("readwrite", (s) => s.delete(id));

const registadas = new Map<string, FontFace | HTMLLinkElement>();

/** Põe a letra a funcionar no painel; `false` se não foi possível (ficheiro em falta, ligação que não responde, letra inválida). */
export async function registarFonte(f: FonteCarregada): Promise<boolean> {
  if (registadas.has(f.id)) return true;
  try {
    if (f.origem === "ficheiro") {
      const ficheiro = await lerFicheiro(f.id);
      if (!ficheiro) return false;
      const letra = new FontFace(f.nome, await ficheiro.arrayBuffer(), { weight: "100 900" });
      await letra.load();
      document.fonts.add(letra);
      registadas.set(f.id, letra);
      return true;
    }
    if (!f.url || erroDaLigacao(f.url)) return false;
    if (eFicheiroDeLetra(f.url)) {
      const letra = new FontFace(f.nome, `url("${f.url}")`, { weight: "100 900" });
      await letra.load();
      document.fonts.add(letra);
      registadas.set(f.id, letra);
      return true;
    }
    const folha = document.createElement("link");
    folha.rel = "stylesheet";
    folha.href = f.url;
    folha.id = `letra-${f.id}`;
    document.head.appendChild(folha);
    registadas.set(f.id, folha);
    return true;
  } catch {
    return false;
  }
}

/** Tira a letra do painel (e, se for um ficheiro, apaga-o do navegador). */
export async function retirarFonte(f: FonteCarregada): Promise<void> {
  const r = registadas.get(f.id);
  if (r instanceof FontFace) document.fonts.delete(r);
  else r?.remove();
  registadas.delete(f.id);
  if (f.origem === "ficheiro") await apagarFicheiro(f.id).catch(() => undefined);
}

/** O ficheiro é uma letra válida? Tenta lê-la, sem a registar. */
export async function letraValida(ficheiro: Blob): Promise<boolean> {
  try {
    await new FontFace("teste", await ficheiro.arrayBuffer()).load();
    return true;
  } catch {
    return false;
  }
}
