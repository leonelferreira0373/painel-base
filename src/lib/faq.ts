// As perguntas frequentes (FAQ) do painel: a pergunta e a resposta que a equipa escreve. As publicadas valem para o site e para o assistente de IA, que as usa como respostas oficiais. Funções puras para validar, ordenar e converter; o resto é guardar e ler no navegador, com todos os ecrãs (o assistente incluído) a ver as alterações no momento.
import { useCallback, useEffect, useState } from "react";
import { FAQ_DE_ORIGEM } from "@/dados/faq";
import type { DocumentoDeMemoria } from "./ia-controlos";

export interface Faq {
  id: string;
  pergunta: string;
  resposta: string;
  /** Só as publicadas aparecem no site e no assistente. */
  ativa: boolean;
  criado: string;
  atualizado: string;
}

export const LIMITE_DA_PERGUNTA = 200;
export const LIMITE_DA_RESPOSTA = 2000;

/** Uma pergunta nova e vazia, já publicada. */
export function faqNova(id: string, agora = new Date().toISOString()): Faq {
  return { id, pergunta: "", resposta: "", ativa: true, criado: agora, atualizado: agora };
}

/** Para comparar perguntas: sem acentos, sem maiúsculas, sem pontuação e sem o «?» do fim. */
const chave = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** O que falta ou está mal numa pergunta antes de a guardar (`outras` são as restantes, para não haver duas iguais). */
export function erroDaFaq(f: Pick<Faq, "id" | "pergunta" | "resposta">, outras: Pick<Faq, "id" | "pergunta">[] = []): string | null {
  const p = f.pergunta.trim();
  const r = f.resposta.trim();
  if (!p) return "Escreva a pergunta.";
  if (p.length > LIMITE_DA_PERGUNTA) return `A pergunta passa os ${LIMITE_DA_PERGUNTA} caracteres.`;
  if (outras.some((o) => o.id !== f.id && chave(o.pergunta) === chave(p))) return "Já existe uma pergunta igual.";
  if (!r) return "Escreva a resposta.";
  if (r.length > LIMITE_DA_RESPOSTA) return `A resposta passa os ${LIMITE_DA_RESPOSTA} caracteres.`;
  return null;
}

/** As perguntas publicadas e completas, pela ordem da lista. */
export const faqAtivas = (lista: Faq[]) => lista.filter((f) => f.ativa && f.pergunta.trim() && f.resposta.trim());

/** Sobe (-1) ou desce (+1) uma pergunta; nas pontas fica onde está. */
export function moverFaq(lista: Faq[], id: string, passo: -1 | 1): Faq[] {
  const i = lista.findIndex((f) => f.id === id);
  const j = i + passo;
  if (i < 0 || j < 0 || j >= lista.length) return lista;
  const novo = [...lista];
  [novo[i], novo[j]] = [novo[j], novo[i]];
  return novo;
}

/** No formato das perguntas prontas do assistente (`ai-chat`): as publicadas, pela ordem da lista. */
export const perguntasProntas = (lista: Faq[]) => faqAtivas(lista).map((f) => ({ pergunta: f.pergunta.trim(), resposta: f.resposta.trim() }));

/** As publicadas como documentos da memória do assistente, para procurar nelas e contá-las nas instruções (cada pergunta com a sua resposta é uma só passagem). */
export function faqComoDocumentos(lista: Faq[]): DocumentoDeMemoria[] {
  return faqAtivas(lista).map((f) => {
    const texto = `${f.pergunta.trim()}\n\n${f.resposta.trim()}`;
    return { id: `faq-${f.id}`, nome: `FAQ: ${f.pergunta.trim()}`, origem: "faq", tamanho: texto.length, criado: f.criado, ativo: true, texto };
  });
}

// ---------- guardar e ler (só no navegador) ----------

const CHAVE = "painel.faq";
/** O evento que avisa os ecrãs (e o assistente) de que as perguntas mudaram. */
export const EVENTO_FAQ = "painel:faq";

const valida = (x: unknown): x is Faq => {
  const f = x as Faq;
  return !!f && typeof f.id === "string" && typeof f.pergunta === "string" && typeof f.resposta === "string" && typeof f.ativa === "boolean";
};

/** As perguntas guardadas; sem nada guardado, as de partida. */
export function lerFaq(): Faq[] {
  try {
    const texto = window.localStorage.getItem(CHAVE);
    if (texto !== null) {
      const v: unknown = JSON.parse(texto);
      if (Array.isArray(v)) return v.filter(valida);
    }
  } catch {
    /* sem armazenamento ou texto estragado: ficam as de partida */
  }
  return FAQ_DE_ORIGEM;
}

function gravarFaq(lista: Faq[]): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_FAQ));
}

/** As perguntas em vigor, sempre atualizadas, e o que as muda. */
export function useFaq() {
  const [faq, setFaq] = useState<Faq[]>(FAQ_DE_ORIGEM);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const ler = () => setFaq(lerFaq());
    ler();
    setPronto(true);
    window.addEventListener(EVENTO_FAQ, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO_FAQ, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  const guardar = useCallback((f: Faq) => {
    const lista = lerFaq();
    gravarFaq(lista.some((x) => x.id === f.id) ? lista.map((x) => (x.id === f.id ? f : x)) : [...lista, f]);
  }, []);
  const remover = useCallback((id: string) => gravarFaq(lerFaq().filter((x) => x.id !== id)), []);
  const mover = useCallback((id: string, passo: -1 | 1) => gravarFaq(moverFaq(lerFaq(), id, passo)), []);
  return { faq, pronto, guardar, remover, mover };
}
