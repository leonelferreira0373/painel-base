// O acesso revogado: quando se revoga o acesso de uma pessoa, vale logo, no mesmo instante. A pessoa passa a uma lista de acessos revogados e tudo o que depende da sessão dela fecha: a sessão deixa de existir (em qualquer separador do mesmo navegador, pelo evento «storage»), não há nova entrada (palavra-passe, código ou chave do navegador) e nada do que ela estava a fazer continua. Em modo ligado é o servidor que recusa o token e a sessão; isto é a parte do navegador. Funções puras, mais o armazenamento.

export interface Revogacao {
  email: string;
  /** Quando foi revogado (ISO). */
  quando: string;
  /** Quem revogou. */
  por: string;
}

const CHAVE = "painel.acessos-revogados";
/** Avisa, neste separador, que a lista mudou (os outros separadores recebem o «storage»). */
export const EVENTO_REVOGACAO = "painel:acessos-revogados";

const norm = (email: string) => email.trim().toLowerCase();

export function lerRevogacoes(): Revogacao[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as Revogacao[]).filter((r) => r && typeof r.email === "string") : [];
  } catch {
    return [];
  }
}

function guardar(lista: Revogacao[]): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_REVOGACAO));
}

export const estaRevogado = (email: string | undefined | null, lista: Revogacao[] = lerRevogacoes()): boolean => !!email && lista.some((r) => r.email === norm(email));

/** Revoga o acesso, agora. */
export function revogarAcesso(email: string, por: string, agora = new Date()): void {
  const e = norm(email);
  guardar([...lerRevogacoes().filter((r) => r.email !== e), { email: e, quando: agora.toISOString(), por }]);
}

/** Repõe o acesso (quando a pessoa é convidada de novo e aceita). */
export function reporAcesso(email: string): void {
  const e = norm(email);
  if (lerRevogacoes().some((r) => r.email === e)) guardar(lerRevogacoes().filter((r) => r.email !== e));
}

/** Subscreve as mudanças da lista, neste separador e nos outros. Devolve quem cancela. */
export function aoMudarAsRevogacoes(f: () => void): () => void {
  const ouvir = (e: Event) => {
    if (e.type === EVENTO_REVOGACAO || (e as StorageEvent).key === CHAVE || (e as StorageEvent).key === null) f();
  };
  window.addEventListener(EVENTO_REVOGACAO, ouvir);
  window.addEventListener("storage", ouvir);
  return () => {
    window.removeEventListener(EVENTO_REVOGACAO, ouvir);
    window.removeEventListener("storage", ouvir);
  };
}

/** O que ver quando o acesso foi revogado. */
export const MENSAGEM_DE_REVOGACAO = "O seu acesso foi revogado.";
