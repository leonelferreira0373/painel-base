// As notas adesivas: uma nota deixa-se num cartão (um KPI), numa janela ou numa página, para outra pessoa (ou para si) ver. Tem texto rico (títulos, listas, ligações, citações, código), ficheiros de qualquer formato (imagens, áudio, vídeo, documentos), pode ser para membros escolhidos, expirar, ter palavra-passe (o texto e os ficheiros ficam cifrados no navegador, com AES-GCM) e mandar lembretes por e-mail ao dono ou a quem se escolher (entram na fila dos e-mails agendados do Marketing). Aqui estão os tipos, as contas puras (visibilidade, expiração, texto limpo, cifra, lembretes) e o armazenamento; a janela das notas está em components/notas/.
"use client";

import { useEffect, useState } from "react";
import { FUNCOES } from "@/dados/rbac";
import { chamar, lerLigacao } from "./api/cliente";
import { aleatorios, cifrarAes, decifrarAes, derivarChaveAes, type ChaveAes } from "./cripto";
import { registar } from "./atividade";
import { emailNovo, agendarEmail, type Email } from "./email";
import { reciclar } from "./reciclagem";
import { EVENTO_GUARDADO } from "./reciclagem-tipos";

export type TipoDeAlvo = "kpi" | "janela" | "pagina" | "registo";

/** O sítio onde uma nota está pregada. */
export interface AlvoDeNota {
  tipo: TipoDeAlvo;
  /** Identifica o sítio («marketing/cliques:cliques-por-pagina»): é por isto que a nota volta a aparecer lá. */
  chave: string;
  /** O nome do sítio, para a pessoa saber onde a deixou. */
  rotulo: string;
  pagina: string;
}

export const EVENTO_ABRIR_NOTA = "painel:abrir-nota";

/** Abre as notas deste sítio (para ler as que lá estão e deixar uma). */
export function abrirNota(alvo: AlvoDeNota): void {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_NOTA, { detail: { alvo } }));
}

// ---------- os tipos ----------

export const CORES_DE_NOTA = ["amarelo", "rosa", "verde", "azul", "cinza"] as const;
export type CorDeNota = (typeof CORES_DE_NOTA)[number];

export interface AnexoDaNota {
  id: string;
  nome: string;
  /** O tipo MIME do ficheiro. */
  tipo: string;
  tamanho: number;
}

export interface LembreteDaNota {
  id: string;
  /** Quando se avisa (ISO). */
  quando: string;
  /** «dono» (quem escreveu a nota) ou o e-mail de uma pessoa. */
  para: string;
}

/** O que fica escondido numa nota com palavra-passe. */
export interface ConteudoDaNota {
  /** O título da nota (opcional). Numa nota com palavra-passe fica cifrado com o resto. */
  titulo?: string;
  corpo: string;
  texto: string;
  anexos: AnexoDaNota[];
}

export interface Cifra {
  /** Base64. */
  sal: string;
  iv: string;
  dados: string;
}

export interface Nota extends ConteudoDaNota {
  id: string;
  alvo: AlvoDeNota;
  autor: string;
  autorEmail: string;
  /** Para quem é (nomes ou e-mails); vazio é para toda a gente que vê o sítio. */
  para: string[];
  cor: CorDeNota;
  criada: string;
  atualizada: string;
  expira?: string;
  /** Com palavra-passe o conteúdo está aqui, cifrado, e `corpo`, `texto` e `anexos` ficam vazios. */
  cifra?: Cifra;
  /** A palavra-passe cifrada com a chave de recuperação (que está no cofre): serve para a recuperar por e-mail. */
  recuperacao?: { iv: string; dados: string };
  /** O conteúdo só se vê depois de se carregar no olho. */
  oculta?: boolean;
  /** Fica no topo da lista. */
  afixada?: boolean;
  lembretes: LembreteDaNota[];
}

// ---------- o texto rico, limpo ----------

const PERMITIDAS = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "strike", "h2", "h3", "ul", "ol", "li", "blockquote", "code", "pre", "a", "img", "audio", "video", "div", "span"]);
const VAZIAS = new Set(["br", "img"]);
const ID_DE_ANEXO = /^[a-z0-9-]{4,40}$/i;

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Deixa só o que uma nota pode ter: formatação, listas, ligações http(s) e mailto, e os ficheiros (que se guardam à parte, só por identificador). Tudo o resto (scripts, estilos, eventos, ligações javascript:) cai. */
export function sanitizarHtml(html: string): string {
  const saida: string[] = [];
  const abertas: string[] = [];
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)\s*\/?>|[^<]+|</g;
  let m: RegExpExecArray | null;
  let ignorarAte: string | null = null;
  while ((m = re.exec(html))) {
    const bruto = m[0];
    if (!m[1]) {
      if (bruto.startsWith("<!--") || ignorarAte) continue;
      // texto: sem o que parece uma marca por fechar
      saida.push(bruto === "<" ? "&lt;" : bruto.replace(/>/g, "&gt;"));
      continue;
    }
    const fecho = bruto.startsWith("</");
    const nome = m[1].toLowerCase();
    if (ignorarAte) {
      if (fecho && nome === ignorarAte) ignorarAte = null;
      continue;
    }
    if (!PERMITIDAS.has(nome)) {
      // o que é perigoso perde-se com o conteúdo (script, estilo…); o resto perde só a marca
      if (!fecho && ["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math"].includes(nome)) ignorarAte = nome;
      continue;
    }
    if (fecho) {
      const i = abertas.lastIndexOf(nome);
      if (i < 0) continue;
      while (abertas.length > i) saida.push(`</${abertas.pop()}>`);
      continue;
    }
    const atributos: string[] = [];
    const resto = m[2] ?? "";
    for (const a of resto.matchAll(/([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      const k = a[1].toLowerCase();
      const v = (a[2] ?? a[3] ?? a[4] ?? "").trim();
      if (k === "href" && nome === "a" && /^(https?:|mailto:)/i.test(v.replace(/[\u0000- ]/g, ""))) atributos.push(`href="${escapar(v)}" target="_blank" rel="noopener noreferrer"`);
      else if (k === "data-anexo" && ["img", "audio", "video", "a", "span"].includes(nome) && ID_DE_ANEXO.test(v)) atributos.push(`data-anexo="${v}"`);
      else if (k === "data-nome" && nome === "a") atributos.push(`data-nome="${escapar(v.slice(0, 120))}"`);
      else if (k === "alt" && nome === "img") atributos.push(`alt="${escapar(v.slice(0, 160))}"`);
    }
    // um áudio ou um vídeo sem ficheiro, ou uma imagem sem ficheiro, não serve
    if (["img", "audio", "video"].includes(nome) && !atributos.some((x) => x.startsWith("data-anexo"))) continue;
    if (nome === "audio" || nome === "video") atributos.push("controls");
    // o chip de um ficheiro não aponta para fora: abre o ficheiro guardado
    if (nome === "a" && atributos.some((x) => x.startsWith("data-anexo"))) {
      const sem = atributos.filter((x) => !x.startsWith("href=") && !x.startsWith("target=") && !x.startsWith("rel=") && !x.includes(' rel="'));
      atributos.length = 0;
      atributos.push(...sem, 'class="nota-anexo"');
    }
    saida.push(`<${nome}${atributos.length ? ` ${atributos.join(" ")}` : ""}>`);
    if (!VAZIAS.has(nome)) abertas.push(nome);
  }
  while (abertas.length) saida.push(`</${abertas.pop()}>`);
  return saida.join("");
}

/** O texto de uma nota sem formatação (para pesquisar, para o e-mail e para a IA). */
export function textoDeHtml(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/blockquote)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Os identificadores dos ficheiros que o texto usa. */
export const anexosUsados = (html: string): string[] => [...new Set([...html.matchAll(/data-anexo="([^"]+)"/g)].map((m) => m[1]))];

// ---------- quem vê, quando acaba ----------

export interface Quem {
  nome: string;
  email: string;
  funcao: string;
}

/** Os membros que se podem escolher como destinatários (as pessoas das funções do painel). */
export const MEMBROS = FUNCOES.map((f) => ({ nome: f.pessoa, funcao: f.rotulo }));

export const expirou = (n: Pick<Nota, "expira">, agora: Date): boolean => !!n.expira && new Date(n.expira).getTime() <= agora.getTime();

const mesma = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Quem escreveu a nota e quem é um dos destinatários. */
export const euSou = (n: Pick<Nota, "autor" | "autorEmail">, q: Quem): boolean => mesma(n.autor, q.nome) || (!!q.email && mesma(n.autorEmail, q.email));
export const paraMim = (n: Pick<Nota, "para">, q: Quem): boolean => n.para.length === 0 || n.para.some((p) => mesma(p, q.nome) || (!!q.email && mesma(p, q.email)) || mesma(p, q.funcao));

/** A pessoa vê a nota? O autor vê sempre (as expiradas aparecem-lhe à parte); os outros só vêem as que são para eles e ainda não expiraram. */
export function notaVisivel(n: Nota, q: Quem, agora: Date): boolean {
  if (euSou(n, q)) return true;
  return !expirou(n, agora) && paraMim(n, q);
}

/** As notas de um sítio: as afixadas primeiro, e em cada grupo as mais recentes. */
export const notasDoSitio = (todas: Nota[], chave: string): Nota[] => todas.filter((n) => n.alvo.chave === chave).sort((a, b) => Number(!!b.afixada) - Number(!!a.afixada) || b.atualizada.localeCompare(a.atualizada));

/** «agora», «há 5 min», «há 2 h», «há 3 d». */
export function haTempo(iso: string, agora = new Date()): string {
  const s = Math.max(0, Math.round((agora.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora mesmo";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86_400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86_400)} d`;
}

/** Quanto falta para a nota expirar, em palavras. */
export function textoDaExpiracao(expira: string, agora = new Date()): string {
  const ms = new Date(expira).getTime() - agora.getTime();
  if (ms <= 0) return "Expirada";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `Expira em ${Math.max(1, min)} min`;
  if (min < 24 * 60) return `Expira em ${Math.round(min / 60)} h`;
  return `Expira em ${Math.round(min / 1440)} d`;
}

/** As escolhas de duração para uma nota nova: o fim a contar de agora. */
export const DURACOES: Record<string, { rotulo: string; ms: number | null }> = {
  nunca: { rotulo: "Nunca", ms: null },
  hora: { rotulo: "Daqui a 1 hora", ms: 3_600_000 },
  dia: { rotulo: "Daqui a 1 dia", ms: 86_400_000 },
  semana: { rotulo: "Daqui a 7 dias", ms: 7 * 86_400_000 },
  mes: { rotulo: "Daqui a 30 dias", ms: 30 * 86_400_000 },
};

// ---------- a palavra-passe: cifrar de verdade ----------

const itens = 150_000;
const codificador = new TextEncoder();

export const paraBase64 = (b: ArrayBuffer | Uint8Array): string => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
export const deBase64 = (t: string): Uint8Array => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));

/** A chave AES de uma nota: a do navegador ou, em ligações sem Web Crypto (http), a de JavaScript puro. */
export type ChaveDeNota = ChaveAes;

/** A chave AES derivada da palavra-passe (PBKDF2, 150 000 voltas) e do sal. */
export const derivarChave = (senha: string, sal: Uint8Array): Promise<ChaveDeNota> => derivarChaveAes(senha, sal, itens);

export const novoSal = (): Uint8Array => aleatorios(16);

export async function cifrarBytes(chave: ChaveDeNota, bytes: ArrayBuffer | Uint8Array): Promise<{ iv: string; dados: ArrayBuffer }> {
  const iv = aleatorios(12);
  const dados = await cifrarAes(chave, iv, bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return { iv: paraBase64(iv), dados };
}

/** Decifra; `null` se a palavra-passe está errada (o AES-GCM não deixa passar dados alterados). */
export async function decifrarBytes(chave: ChaveDeNota, iv: string, dados: ArrayBuffer | Uint8Array): Promise<ArrayBuffer | null> {
  try {
    return await decifrarAes(chave, deBase64(iv), dados instanceof Uint8Array ? dados : new Uint8Array(dados));
  } catch {
    return null;
  }
}

/** Cifra o conteúdo de uma nota com a palavra-passe; devolve a chave para cifrar também os ficheiros. */
export async function cifrarConteudo(c: ConteudoDaNota, senha: string, sal = novoSal()): Promise<{ cifra: Cifra; chave: ChaveDeNota }> {
  const chave = await derivarChave(senha, sal);
  const { iv, dados } = await cifrarBytes(chave, codificador.encode(JSON.stringify(c)));
  return { cifra: { sal: paraBase64(sal), iv, dados: paraBase64(dados) }, chave };
}

export async function decifrarConteudo(cifra: Cifra, senha: string): Promise<{ conteudo: ConteudoDaNota; chave: ChaveDeNota } | null> {
  const chave = await derivarChave(senha, deBase64(cifra.sal));
  const bytes = await decifrarBytes(chave, cifra.iv, deBase64(cifra.dados));
  if (!bytes) return null;
  try {
    return { conteudo: JSON.parse(new TextDecoder().decode(bytes)) as ConteudoDaNota, chave };
  } catch {
    return null;
  }
}

// ---------- os lembretes por e-mail ----------

export const idDoEmailDoLembrete = (nota: Pick<Nota, "id">, l: Pick<LembreteDaNota, "id">): string => `em-nota-${nota.id}-${l.id}`;

/** O endereço de quem recebe o lembrete («dono» é o autor da nota). */
export const destinatarioDoLembrete = (nota: Pick<Nota, "autorEmail">, l: Pick<LembreteDaNota, "para">): string => (l.para === "dono" ? nota.autorEmail : l.para);

/** O e-mail de um lembrete, pronto para a fila dos agendados. Uma nota com palavra-passe nunca mostra o texto no e-mail. */
export function emailDoLembrete(nota: Nota, l: LembreteDaNota, painel: string, remetente: string, texto: string | null): Email {
  const corpo = nota.cifra ? "Tem uma nota protegida por palavra-passe." : (texto ?? nota.texto);
  const ligacao = `${painel.replace(/\/$/, "")}${nota.alvo.pagina}`;
  return agendarEmail(
    emailNovo(idDoEmailDoLembrete(nota, l), {
      de: remetente,
      para: destinatarioDoLembrete(nota, l),
      assunto: `Lembrete: nota em ${nota.alvo.rotulo}`,
      corpo: `${nota.autor} deixou uma nota em «${nota.alvo.rotulo}»:\n\n${corpo}\n\nAbrir: ${ligacao}`,
    }),
    l.quando,
  );
}

export function erroDaNota(n: { corpo: string; para: string[]; expira?: string; lembretes: LembreteDaNota[] }, comAnexos: boolean, agora = new Date()): string | null {
  if (!textoDeHtml(n.corpo) && !comAnexos) return "Escreva alguma coisa ou junte um ficheiro.";
  if (n.expira && new Date(n.expira).getTime() <= agora.getTime()) return "A nota não pode expirar no passado.";
  for (const l of n.lembretes) {
    if (new Date(l.quando).getTime() <= agora.getTime()) return "Os lembretes têm de ser no futuro.";
    if (l.para !== "dono" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(l.para)) return `O e-mail do lembrete não é válido: ${l.para}.`;
    if (n.expira && new Date(l.quando).getTime() > new Date(n.expira).getTime()) return "Um lembrete não pode ser depois de a nota expirar.";
  }
  return null;
}

// ---------- guardar e ler ----------

const CHAVE = "painel.notas";
const CAMINHO = "/v1/painel/notas";
export const EVENTO_NOTAS = "painel:notas";

let memoria: Nota[] | null = null;

function lerLocal(): Nota[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as Nota[]).filter((n) => n && typeof n.id === "string" && n.alvo?.chave) : [];
  } catch {
    return [];
  }
}

export const lerNotas = (): Nota[] => (memoria ??= lerLocal());

function escrever(lista: Nota[]): void {
  memoria = lista;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_NOTAS));
}

/** As notas do servidor (modo ligado); em modo simulado vêm do navegador. */
export async function sincronizarNotas(): Promise<void> {
  const l = lerLigacao();
  if (l.modo !== "ligado") return;
  try {
    const r = await chamar<{ itens: Nota[] }>(l, "GET", CAMINHO);
    memoria = r.itens;
    window.dispatchEvent(new Event(EVENTO_NOTAS));
  } catch {
    /* o servidor não respondeu: ficam as que já se tinham */
  }
}

export async function guardarNota(n: Nota): Promise<void> {
  const l = lerLigacao();
  if (l.modo === "ligado") {
    await chamar(l, "PUT", `${CAMINHO}/{id}`, n, { id: n.id });
    await sincronizarNotas();
  } else {
    const lista = lerNotas();
    escrever(lista.some((x) => x.id === n.id) ? lista.map((x) => (x.id === n.id ? n : x)) : [n, ...lista]);
  }
}

/** Apaga uma nota (vai para a reciclagem). Os ficheiros ficam para o caso de ela voltar. */
export async function removerNota(n: Nota): Promise<void> {
  const l = lerLigacao();
  if (l.modo === "ligado") {
    await chamar(l, "DELETE", `${CAMINHO}/{id}`, undefined, { id: n.id });
    await sincronizarNotas();
    return;
  }
  await reciclar({ tipo: "Nota", rotulo: n.cifra ? `Nota protegida em ${n.alvo.rotulo}` : `Nota em ${n.alvo.rotulo}: ${n.texto.slice(0, 50)}`, dados: n, origem: { kind: "colecao", chave: "notas", caminho: CAMINHO } });
  escrever(lerNotas().filter((x) => x.id !== n.id));
  registar("nota", `Apagou uma nota em «${n.alvo.rotulo}»`);
}

/** As notas, sempre atualizadas (também quando uma é restaurada da reciclagem). */
export function useNotas(): { notas: Nota[]; versao: number } {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const ler = () => setVersao((v) => v + 1);
    const restaurada = (e: Event) => {
      if ((e as CustomEvent<{ chave?: string }>).detail?.chave === "notas") {
        memoria = lerLocal();
        ler();
      }
    };
    window.addEventListener(EVENTO_NOTAS, ler);
    window.addEventListener(EVENTO_GUARDADO, restaurada);
    window.addEventListener("storage", ler);
    void sincronizarNotas();
    const t = window.setInterval(() => void sincronizarNotas(), 30_000);
    return () => {
      window.removeEventListener(EVENTO_NOTAS, ler);
      window.removeEventListener(EVENTO_GUARDADO, restaurada);
      window.removeEventListener("storage", ler);
      window.clearInterval(t);
    };
  }, []);
  return { notas: typeof window === "undefined" ? [] : lerNotas(), versao };
}

export const novoIdDeNota = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
