// O cliente das APIs do super painel: a ligação (modo simulado ou ligado a um servidor, com endereço e token), o pedido e o hook que os ecrãs usam para ler dados. Em modo simulado devolve o que o gerador local der; em modo ligado pede ao servidor o mesmo caminho do contrato (contrato.ts) e mostra o erro se falhar, sem inventar dados.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Metodo } from "./contrato";

export interface LigacaoApi {
  modo: "simulado" | "ligado";
  base: string;
  token: string;
}

export const LIGACAO_DE_ORIGEM: LigacaoApi = { modo: "simulado", base: "", token: "" };
const CHAVE = "painel.api";
export const EVENTO_API = "painel:api";

export function lerLigacao(): LigacaoApi {
  try {
    return { ...LIGACAO_DE_ORIGEM, ...(JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}") as Partial<LigacaoApi>) };
  } catch {
    return LIGACAO_DE_ORIGEM;
  }
}

export function guardarLigacao(l: LigacaoApi): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(l));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_API));
}

/** A ligação em vigor, sempre atualizada. */
export function useLigacao(): LigacaoApi {
  const [l, setL] = useState<LigacaoApi>(LIGACAO_DE_ORIGEM);
  useEffect(() => {
    const ler = () => setL(lerLigacao());
    ler();
    window.addEventListener(EVENTO_API, ler);
    return () => window.removeEventListener(EVENTO_API, ler);
  }, []);
  return l;
}

/** Mensagem de erro para o endereço de um servidor, ou null se serve: só https (http só em localhost). */
export function erroDoEndereco(base: string): string | null {
  try {
    const u = new URL(base.trim());
    if (u.protocol === "https:") return null;
    if (u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname)) return null;
    return "Use https:// (http só vale para localhost).";
  } catch {
    return "Escreva o endereço completo, por exemplo https://api.exemplo.pt.";
  }
}

/** O endereço completo de um caminho, com os «{id}» trocados pelos valores dados. */
export function urlDe(base: string, caminho: string, valores: Record<string, string> = {}): string {
  const c = caminho.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(valores[k] ?? `{${k}}`));
  return `${base.trim().replace(/\/+$/, "")}${c}`;
}

/** Faz um pedido ao servidor da ligação e devolve o JSON; lança um erro com uma mensagem clara. */
export async function chamar<T>(l: LigacaoApi, metodo: Metodo, caminho: string, corpo?: unknown, valores?: Record<string, string>): Promise<T> {
  const erro = erroDoEndereco(l.base);
  if (erro) throw new Error(erro);
  let r: Response;
  try {
    r = await fetch(urlDe(l.base, caminho, valores), { method: metodo, headers: { Accept: "application/json", ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}), ...(l.token ? { Authorization: `Bearer ${l.token}` } : {}) }, body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
  } catch {
    throw new Error("Não foi possível ligar ao servidor (endereço errado, sem rede ou o servidor não aceita pedidos deste sítio).");
  }
  if (r.status === 401 || r.status === 403) throw new Error("O servidor recusou o token.");
  if (!r.ok) throw new Error(`O servidor respondeu ${r.status}.`);
  return (await r.json()) as T;
}

/**
 * Lê dados de um endpoint: em modo simulado devolve o que o gerador local der; em modo ligado pede-os ao servidor
 * (e repete o pedido de `intervaloMs` em `intervaloMs`, se for dado, para o tempo real).
 */
export function useApi<T>(caminho: string, simulado: () => T, intervaloMs?: number): { dados: T | null; erro: string | null; aCarregar: boolean; modo: LigacaoApi["modo"]; recarregar: () => void } {
  const ligacao = useLigacao();
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const gerar = useRef(simulado);
  gerar.current = simulado;
  const ler = useCallback(async () => {
    try {
      const novos = ligacao.modo === "ligado" ? await chamar<T>(ligacao, "GET", caminho) : gerar.current();
      setDados(novos);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    }
    setACarregar(false);
  }, [ligacao, caminho]);
  useEffect(() => {
    setACarregar(true);
    void ler();
    if (!intervaloMs) return;
    const t = window.setInterval(() => void ler(), intervaloMs);
    return () => window.clearInterval(t);
  }, [ler, intervaloMs]);
  return { dados, erro, aCarregar, modo: ligacao.modo, recarregar: () => void ler() };
}
