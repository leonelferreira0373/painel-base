// Formatos de texto estruturado: CSV/TSV/TXT delimitado, JSON, NDJSON, XML e tabelas de HTML.
import type { Celula, Tabela } from "@/lib/tipos";
import { aTabela, analisarCsv, detetarSeparador } from "./texto";

export interface Contexto {
  ficheiroId: string;
  origem: string;
}

let contador = 0;
export const novoId = (prefixo: string) => `${prefixo}-${Date.now().toString(36)}-${(contador++).toString(36)}`;

function tabela(ctx: Contexto, nome: string, colunas: string[], linhas: Celula[][], confianca?: number): Tabela {
  return { id: novoId("t"), ficheiroId: ctx.ficheiroId, nome, origem: `${ctx.origem} › ${nome}`, colunas, linhas, confianca };
}

const NOMES_SEPARADOR: Record<string, string> = { ",": "vírgula", ";": "ponto e vírgula", "\t": "tabulação", "|": "barra vertical" };

export function csvParaTabelas(texto: string, ctx: Contexto): { tabelas: Tabela[]; formato: string } {
  const sep = detetarSeparador(texto);
  const matriz = analisarCsv(texto, sep);
  const largura = matriz.reduce((m, l) => Math.max(m, l.length), 0);
  if (matriz.length === 0) return { tabelas: [], formato: "Texto vazio" };
  if (largura < 2) {
    const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
    return { tabelas: [tabela(ctx, "Linhas", ["Linha"], linhas.map((l) => [l]))], formato: "Texto simples" };
  }
  const { colunas, linhas } = aTabela(matriz);
  return { tabelas: [tabela(ctx, "Dados", colunas, linhas)], formato: sep === "\t" ? "TSV" : `CSV (separador: ${NOMES_SEPARADOR[sep] ?? sep})` };
}

type Plano = Record<string, Celula>;

function achatar(valor: unknown, prefixo: string, saida: Plano, prof: number): void {
  if (valor === null || valor === undefined) {
    saida[prefixo || "valor"] = null;
  } else if (Array.isArray(valor)) {
    if (valor.every((v) => v === null || ["string", "number", "boolean"].includes(typeof v))) saida[prefixo || "valor"] = valor.join("; ");
    else if (prof < 3 && valor.length === 1) achatar(valor[0], prefixo, saida, prof + 1);
    else saida[prefixo || "valor"] = JSON.stringify(valor);
  } else if (typeof valor === "object") {
    const entradas = Object.entries(valor as Record<string, unknown>);
    if (entradas.length === 0) saida[prefixo || "valor"] = null;
    for (const [k, v] of entradas) achatar(v, prefixo ? `${prefixo}.${k}` : k, saida, prof + 1);
  } else saida[prefixo || "valor"] = valor as Celula;
}

function registosParaTabela(registos: unknown[], nome: string, ctx: Contexto): Tabela {
  const planos: Plano[] = registos.map((r) => {
    const p: Plano = {};
    achatar(r, "", p, 0);
    return p;
  });
  const colunas: string[] = [];
  const vistas = new Set<string>();
  for (const p of planos) {
    for (const k of Object.keys(p)) {
      if (!vistas.has(k)) {
        vistas.add(k);
        colunas.push(k);
      }
    }
  }
  return tabela(ctx, nome, colunas, planos.map((p) => colunas.map((c) => p[c] ?? null)));
}

export function jsonParaTabelas(valor: unknown, ctx: Contexto, nome = "Registos"): Tabela[] {
  if (Array.isArray(valor)) {
    if (valor.length === 0) return [];
    const objetos = valor.some((v) => v !== null && typeof v === "object");
    return [objetos ? registosParaTabela(valor, nome, ctx) : tabela(ctx, nome, ["valor"], valor.map((v) => [v as Celula]))];
  }
  if (valor !== null && typeof valor === "object") {
    const tabelas: Tabela[] = [];
    const escalares: Plano = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      if (Array.isArray(v) && v.length > 0 && v.some((x) => x !== null && typeof x === "object")) tabelas.push(registosParaTabela(v, k, ctx));
      else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        const interior = Object.values(v as Record<string, unknown>).find((x) => Array.isArray(x) && x.length > 0 && x.some((y) => y !== null && typeof y === "object"));
        if (interior) tabelas.push(...jsonParaTabelas(v, ctx, k));
        else achatar(v, k, escalares, 0);
      } else achatar(v, k, escalares, 0);
    }
    if (Object.keys(escalares).length > 0 || tabelas.length === 0) {
      const colunas = Object.keys(escalares);
      tabelas.unshift(tabela(ctx, "Propriedades", colunas, [colunas.map((c) => escalares[c])]));
    }
    return tabelas;
  }
  return [tabela(ctx, nome, ["valor"], [[valor as Celula]])];
}

export function ndjsonParaValores(texto: string): unknown[] | null {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (linhas.length < 2) return null;
  const valores: unknown[] = [];
  for (const l of linhas) {
    try {
      valores.push(JSON.parse(l));
    } catch {
      return null;
    }
  }
  return valores;
}

function textoDe(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function achatarXml(el: Element, prefixo: string, saida: Plano, prof: number): void {
  for (const a of Array.from(el.attributes)) saida[prefixo ? `${prefixo}.@${a.name}` : `@${a.name}`] = a.value;
  const filhos = Array.from(el.children);
  if (filhos.length === 0) {
    const t = textoDe(el);
    if (t !== "" || el.attributes.length === 0) saida[prefixo || el.tagName] = t === "" ? null : t;
    return;
  }
  const porNome = new Map<string, Element[]>();
  for (const f of filhos) porNome.set(f.tagName, [...(porNome.get(f.tagName) ?? []), f]);
  for (const [nome, lista] of porNome) {
    const chave = prefixo ? `${prefixo}.${nome}` : nome;
    if (lista.length > 1) saida[chave] = lista.map(textoDe).join("; ");
    else if (prof < 4) achatarXml(lista[0], chave, saida, prof + 1);
    else saida[chave] = textoDe(lista[0]);
  }
}

export function xmlParaTabelas(texto: string, ctx: Contexto): Tabela[] {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(texto, "application/xml");
  if (doc.querySelector("parsererror") || !doc.documentElement) return [];
  const raiz = doc.documentElement;
  let melhor: Element[] = [];
  let nomeMelhor = raiz.tagName;
  const visitar = (el: Element, prof: number) => {
    const grupos = new Map<string, Element[]>();
    for (const f of Array.from(el.children)) grupos.set(f.tagName, [...(grupos.get(f.tagName) ?? []), f]);
    for (const [nome, lista] of grupos) {
      if (lista.length >= 2 && lista.length > melhor.length) {
        melhor = lista;
        nomeMelhor = nome;
      }
    }
    if (prof < 4) for (const f of Array.from(el.children)) visitar(f, prof + 1);
  };
  visitar(raiz, 0);
  const alvo = melhor.length > 0 ? melhor : [raiz];
  const planos = alvo.map((el) => {
    const p: Plano = {};
    achatarXml(el, "", p, 0);
    return p;
  });
  const colunas: string[] = [];
  const vistas = new Set<string>();
  for (const p of planos) for (const k of Object.keys(p)) if (!vistas.has(k)) (vistas.add(k), colunas.push(k));
  return [tabela(ctx, nomeMelhor, colunas, planos.map((p) => colunas.map((c) => p[c] ?? null)))];
}

export function htmlParaTabelas(html: string, ctx: Contexto): { tabelas: Tabela[]; texto: string } {
  if (typeof DOMParser === "undefined") return { tabelas: [], texto: "" };
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tabelas: Tabela[] = [];
  doc.querySelectorAll("table").forEach((t, n) => {
    const matriz: Celula[][] = Array.from(t.rows).map((r) => Array.from(r.cells).map((c) => textoDe(c)));
    const util = matriz.filter((l) => l.some((c) => c !== ""));
    if (util.length === 0) return;
    const { colunas, linhas } = aTabela(util);
    const legenda = t.querySelector("caption");
    tabelas.push(tabela(ctx, legenda ? textoDe(legenda) : `Tabela ${n + 1}`, colunas, linhas));
  });
  doc.querySelectorAll("script,style,noscript").forEach((e) => e.remove());
  const texto = (doc.body?.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  return { tabelas, texto };
}
