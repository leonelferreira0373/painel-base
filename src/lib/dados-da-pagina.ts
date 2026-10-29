// O que a página aberta pode exportar e para onde pode importar. Os ecrãs com dados próprios registam a sua fonte (uma tabela, uma zona DNS) e o seu destino de importação; os que não registam nada exportam-se na mesma, pelas tabelas que têm no ecrã. A janela «Exportar e importar» (components/exportar/) lê isto e abre-se pelo botão do cabeçalho ou pelo «Exportar» de um cartão.
"use client";

import { useEffect, useRef, useState } from "react";
import type { DadosExportaveis } from "./exportar-dados";
import type { FonteDeExportacao } from "./exportar/formatos";
import type { ZonaLida } from "./dns-bind";
import type { ColunaDoAlvo } from "./importar";
import { textoVisivel } from "./ia-ecra";

export interface AlvoDeImportacao {
  /** O nome do que se importa («Pedidos de transporte»). */
  titulo: string;
  /** As colunas do módulo; um ficheiro com tabela casa os cabeçalhos com elas. */
  colunas?: ColunaDoAlvo[];
  aoLinhas?: (linhas: Record<string, string>[]) => void | Promise<void>;
  /** Com isto, os ficheiros de zona BIND importam-se para aqui. */
  aoZona?: (zona: ZonaLida) => void | Promise<void>;
}

const fontes = new Map<string, FonteDeExportacao>();
let alvo: { id: string; ler: () => AlvoDeImportacao | null } | null = null;
const EVENTO = "painel:dados-da-pagina";
const avisar = () => window.dispatchEvent(new Event(EVENTO));

/** Regista a fonte de exportação deste ecrã enquanto ele estiver aberto. */
export function useFonteDeExportacao(fonte: FonteDeExportacao | null): void {
  const id = useRef(`f${Math.random().toString(36).slice(2, 8)}`);
  const chave = fonte ? `${fonte.nome}|${fonte.dados?.linhas.length ?? 0}|${fonte.dados?.colunas.join(",") ?? ""}|${fonte.bind?.registos.length ?? 0}` : "";
  const ultima = useRef(fonte);
  ultima.current = fonte;
  useEffect(() => {
    const k = id.current;
    if (ultima.current) fontes.set(k, ultima.current);
    else fontes.delete(k);
    avisar();
    return () => {
      fontes.delete(k);
      avisar();
    };
  }, [chave]);
}

/** Regista o destino de importação deste ecrã enquanto ele estiver aberto. */
export function useAlvoDeImportacao(valor: AlvoDeImportacao | null): void {
  const id = useRef(`a${Math.random().toString(36).slice(2, 8)}`);
  const ultimo = useRef(valor);
  ultimo.current = valor;
  const tem = !!valor;
  useEffect(() => {
    if (!tem) return;
    const k = id.current;
    // as funções mudam a cada desenho: a janela lê sempre o valor mais recente
    alvo = { id: k, ler: () => ultimo.current };
    avisar();
    return () => {
      if (alvo?.id === k) alvo = null;
      avisar();
    };
  }, [tem]);
}

export const fontesRegistadas = (): FonteDeExportacao[] => [...fontes.values()];
export const alvoRegistado = (): AlvoDeImportacao | null => alvo?.ler() ?? null;

/** Os registos mudam durante a vida do ecrã: quem os mostra volta a ler. */
export function useDadosDaPagina() {
  const [, setN] = useState(0);
  useEffect(() => {
    const ler = () => setN((n) => n + 1);
    window.addEventListener(EVENTO, ler);
    return () => window.removeEventListener(EVENTO, ler);
  }, []);
  return { fontes: fontesRegistadas(), alvo: alvoRegistado() };
}

// ---------- as tabelas que o ecrã tem ----------

const nomeSeguro = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "dados";

/** As tabelas visíveis do ecrã como fontes de exportação (para as páginas que não registam a sua). */
export function fontesDoEcra(): FonteDeExportacao[] {
  const pagina = document.querySelector("main h1")?.textContent?.trim() || document.title.replace(/\s*[|·-].*$/, "") || "Dados";
  const tabelas = [...document.querySelectorAll("main table")].filter((t) => !t.closest(".aia") && (t as HTMLElement).offsetParent !== null);
  const fontesDeTabelas: FonteDeExportacao[] = [];
  tabelas.forEach((t, i) => {
    const copia = t.cloneNode(true) as HTMLElement;
    const limpo = textoVisivel(copia).trim();
    if (!limpo) return;
    const colunas = [...copia.querySelectorAll("thead th, thead td")].map((c) => textoVisivel(c).replace(/\s+/g, " ").trim());
    const linhas = [...copia.querySelectorAll("tbody tr")].map((r) => [...r.querySelectorAll("td, th")].map((c) => textoVisivel(c).replace(/\s+/g, " ").trim())).filter((l) => l.some(Boolean));
    if (colunas.length === 0 || linhas.length === 0) return;
    const titulo = tabelas.length > 1 ? `${pagina} (${i + 1})` : pagina;
    const dados: DadosExportaveis = { nome: nomeSeguro(titulo), titulo, colunas, linhas: linhas.map((l) => colunas.map((_, k) => l[k] ?? "")) };
    fontesDeTabelas.push({ nome: dados.nome, titulo, dados });
  });
  return fontesDeTabelas;
}

// ---------- abrir a janela ----------

export type AbaDeDados = "exportar" | "importar";
export const EVENTO_ABRIR_DADOS = "painel:abrir-dados";

/** Abre a janela «Exportar e importar»; com `fonte`, exporta essa (um cartão, uma lista). */
export function abrirDados(aba: AbaDeDados, fonte?: FonteDeExportacao): void {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_DADOS, { detail: { aba, fonte } }));
}
