// Os elementos de cada gráfico (cada barra, fatia ou série), para a janela da cor os poder listar. O gráfico regista-os quando se desenha e a janela (que está noutro sítio, no menu do cartão) lê-os daqui.
"use client";

import { useEffect, useState } from "react";

export interface ElementoDoGrafico {
  /** Identifica o elemento nas cores guardadas (a chave da barra ou da fatia, o nome da série). */
  chave: string;
  /** Como se mostra à pessoa. */
  rotulo: string;
  /** A cor com que o gráfico o desenha se a pessoa não escolher outra. */
  padrao: string;
}

export const EVENTO_ELEMENTOS = "painel:elementos-do-grafico";
const registo = new Map<string, ElementoDoGrafico[]>();
const assinatura = (l: ElementoDoGrafico[]) => l.map((e) => `${e.chave}\u0001${e.rotulo}\u0001${e.padrao}`).join("\u0002");

export function registarElementos(grafico: string, elementos: ElementoDoGrafico[]): void {
  const antes = registo.get(grafico);
  if (antes && assinatura(antes) === assinatura(elementos)) return;
  registo.set(grafico, elementos);
  window.dispatchEvent(new Event(EVENTO_ELEMENTOS));
}

export function retirarElementos(grafico: string): void {
  if (registo.delete(grafico)) window.dispatchEvent(new Event(EVENTO_ELEMENTOS));
}

const NENHUM: ElementoDoGrafico[] = [];

/** Os elementos que o gráfico com este id tem agora no ecrã (vazio se não tem, ou se tem um só). */
export function useElementosDoGrafico(grafico?: string): ElementoDoGrafico[] {
  const [lista, setLista] = useState<ElementoDoGrafico[]>(NENHUM);
  useEffect(() => {
    const ler = () => setLista((grafico && registo.get(grafico)) || NENHUM);
    ler();
    window.addEventListener(EVENTO_ELEMENTOS, ler);
    return () => window.removeEventListener(EVENTO_ELEMENTOS, ler);
  }, [grafico]);
  return lista;
}

/** Há um gráfico com este id no ecrã (mesmo sem elementos para pintar à parte, como uma linha). */
export function useTemGrafico(grafico?: string): boolean {
  const [tem, setTem] = useState(false);
  useEffect(() => {
    const ler = () => setTem(!!grafico && registo.has(grafico));
    ler();
    window.addEventListener(EVENTO_ELEMENTOS, ler);
    return () => window.removeEventListener(EVENTO_ELEMENTOS, ler);
  }, [grafico]);
  return tem;
}
