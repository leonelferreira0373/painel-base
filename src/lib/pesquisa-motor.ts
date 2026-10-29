// O motor da pesquisa a fundo: corre os trabalhos da fila (dois ao mesmo tempo) no navegador. Cada passo pergunta à IA o que fazer a seguir (procurar na internet, ler uma página, ou concluir), mostra o pensamento dela em direto, faz o pedido ao Worker, guarda o que apurou e, no fim, pede o documento final em JSON. A pessoa pode pausar, cancelar e corrigir a IA a meio: as correções entram no passo seguinte. Gasta a quota própria da «análise» (o Worker deixa sempre um quarto para o chat e para a pesquisa em linguagem natural).
"use client";

import { PROJETO } from "@/dados/projeto";
import { registar } from "./atividade";
import { marcarEmUso, registarUsoDaIa } from "./ia-uso";
import type { UsoDeChamada } from "./ia-modelos";
import { lerDocumento, type FonteDoDocumento } from "./pesquisa-documento";
import {
  acrescentarPasso,
  CONCORRENCIA,
  FOCOS,
  instrucoesDaPesquisa,
  instrucoesDoDocumento,
  lerTrabalhos,
  empurrao,
  mensagemDeCorrecao,
  podeConcluir,
  mudarTrabalho,
  paraComecar,
  pedidoInicial,
  PROFUNDIDADES,
  trabalhoPorId,
  EVENTO_PESQUISAS,
  type TrabalhoDePesquisa,
} from "./pesquisa-profunda";
import { resultadosParaTexto, type ResultadoWeb } from "./web-pesquisa";

export const EVENTO_PESQUISA_ACABOU = "painel:pesquisa-acabou";

type Mensagem = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: unknown[]; tool_call_id?: string };
interface Chamada {
  id: string;
  nome: string;
  argumentos: Record<string, unknown>;
}
interface RespostaDoWorker {
  texto: string;
  chamadas: Chamada[];
  uso: UsoDeChamada;
}

class ErroDaIa extends Error {
  constructor(
    mensagem: string,
    readonly codigo: string,
  ) {
    super(mensagem);
  }
}

// ---------- o controlo de cada trabalho (não se guarda) ----------

interface Controlo {
  pausado: boolean;
  cancelado: boolean;
  ctl: AbortController;
  retomar?: () => void;
}
const controlos = new Map<string, Controlo>();
const ativos = new Set<string>();
const controloDe = (id: string): Controlo => {
  let c = controlos.get(id);
  if (!c) {
    c = { pausado: false, cancelado: false, ctl: new AbortController() };
    controlos.set(id, c);
  }
  return c;
};

export function pausarPesquisa(id: string): void {
  const t = trabalhoPorId(id);
  if (!t || t.estado !== "a pesquisar") return;
  controloDe(id).pausado = true;
  mudarTrabalho(id, (x) => ({ ...x, estado: "em pausa" }));
}

export function retomarPesquisa(id: string): void {
  const c = controloDe(id);
  c.pausado = false;
  c.retomar?.();
  mudarTrabalho(id, (x) => (x.estado === "em pausa" ? { ...x, estado: "a pesquisar" } : x));
}

/** Cancela um trabalho: o que está na fila sai logo; o que corre pára no próximo instante. */
export function cancelarPesquisa(id: string): void {
  const t = trabalhoPorId(id);
  if (!t) return;
  const c = controloDe(id);
  c.cancelado = true;
  c.ctl.abort();
  c.retomar?.();
  if (!ativos.has(id)) mudarTrabalho(id, (x) => ({ ...x, estado: "cancelada", concluido: new Date().toISOString() }));
}

const esperar = (ms: number, sinal: AbortSignal) =>
  new Promise<void>((resolver) => {
    const t = window.setTimeout(resolver, ms);
    sinal.addEventListener("abort", () => (window.clearTimeout(t), resolver()), { once: true });
  });

// ---------- as chamadas ao Worker ----------

async function pedir<T>(caminho: string, corpo: unknown, sinal: AbortSignal, tentativas = 3): Promise<T> {
  for (let i = 0; i < tentativas; i++) {
    let r: Response;
    try {
      r = await fetch(`${PROJETO.urlIa}${caminho}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo), signal: sinal });
    } catch {
      if (sinal.aborted) throw new ErroDaIa("Cancelada.", "cancelada");
      if (i === tentativas - 1) throw new ErroDaIa("Não foi possível falar com o servidor da IA.", "indisponivel");
      await esperar(2000, sinal);
      continue;
    }
    if (r.status === 429) {
      const d = (await r.json().catch(() => ({}))) as { erro?: string; mensagem?: string };
      if (d.erro === "limite" && i < tentativas - 1) {
        await esperar(15_000, sinal);
        continue;
      }
      throw new ErroDaIa(d.mensagem ?? "A IA recusou o pedido por agora.", d.erro ?? "limite");
    }
    if (!r.ok) {
      const d = (await r.json().catch(() => ({}))) as { erro?: string };
      if (r.status >= 500 && i < tentativas - 1) {
        await esperar(2500, sinal);
        continue;
      }
      throw new ErroDaIa(d.erro ?? `O servidor respondeu ${r.status}.`, `http-${r.status}`);
    }
    return (await r.json()) as T;
  }
  throw new ErroDaIa("Não foi possível falar com o servidor da IA.", "indisponivel");
}

const fn = (nome: string, descricao: string, propriedades: Record<string, unknown>, obrigatorias: string[]) => ({ type: "function" as const, function: { name: nome, description: descricao, parameters: { type: "object", properties: propriedades, required: obrigatorias } } });

/** As ferramentas da pesquisa: procurar, ler uma página e concluir (cada uma traz o «pensamento» da IA). */
export function ferramentasDaPesquisa(internet: boolean) {
  const pensamento = { type: "string", description: "UMA frase curta com o que estás a pensar e porque vais fazer isto." };
  const f = [];
  if (internet) {
    f.push(
      fn("buscar_web", "Procura na internet. Usa palavras concretas; podes procurar várias vezes com palavras diferentes.", { pensamento, consulta: { type: "string", description: "O que procurar." } }, ["pensamento", "consulta"]),
      fn("ler_pagina", "Lê uma página inteira (um endereço que veio de buscar_web) para confirmar ou aprofundar.", { pensamento, url: { type: "string" }, nota: { type: "string", description: "O que aprendeste com a página anterior, em 1 a 2 frases, com números e nomes exatos." } }, ["pensamento", "url"]),
    );
  }
  f.push(fn("concluir", "Chama quando já sabes o suficiente para escrever o documento.", { pensamento, motivo: { type: "string" } }, ["pensamento"]));
  return f;
}

const texto = (v: unknown, n = 400): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");
const anfitriao = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Compacta o que a IA já leu: dos passos anteriores fica só uma linha por resultado (as notas guardam o que importa). */
export function podarMensagens(msgs: Mensagem[], manterUltimas = 1): Mensagem[] {
  const indicesDeFerramentas = msgs.map((m, i) => (m.role === "tool" ? i : -1)).filter((i) => i >= 0);
  const aPodar = new Set(indicesDeFerramentas.slice(0, Math.max(0, indicesDeFerramentas.length - manterUltimas * 2)));
  return msgs.map((m, i) => (aPodar.has(i) && m.content.length > 160 ? { ...m, content: `${m.content.slice(0, 120).replace(/\s+/g, " ")}… (já lido: ver as notas)` } : m));
}

// ---------- o trabalho ----------

const maisUm = (id: string) => mudarTrabalho(id, (t) => ({ ...t, passoAtual: t.passoAtual + 1 }));

async function esperarSePausado(id: string): Promise<void> {
  const c = controloDe(id);
  while (c.pausado && !c.cancelado) await new Promise<void>((r) => (c.retomar = r));
}

/** O que se gastou nesta chamada soma-se ao trabalho e ao histórico da IA. */
function contarUso(id: string, r: RespostaDoWorker, pergunta: string, ferramentas: string[], partes: { sistema: number; ferramentas: number; mensagens: number }): void {
  if (r.uso) {
    registarUsoDaIa({ origem: "analise", pergunta, resposta: r.texto || `(ferramentas: ${ferramentas.join(", ")})`, uso: r.uso, ferramentas, partes });
    mudarTrabalho(id, (t) => ({ ...t, chamadas: t.chamadas + 1, tokens: t.tokens + r.uso.tokensEntrada + r.uso.tokensSaida, neurons: t.neurons + r.uso.neurons, custoUsd: t.custoUsd + r.uso.custoUsd }));
  }
}

async function correr(id: string): Promise<void> {
  const c = controloDe(id);
  ativos.add(id);
  const inicial = trabalhoPorId(id);
  if (!inicial) {
    ativos.delete(id);
    return;
  }
  mudarTrabalho(id, (t) => ({ ...t, estado: "a pesquisar", iniciado: t.iniciado ?? new Date().toISOString(), passoAtual: 0, erro: undefined }));
  registar("ia", `A análise «${inicial.titulo}» começou`);
  const sinal = c.ctl.signal;
  const pool: ResultadoWeb[] = [];
  const lidas: FonteDoDocumento[] = [];
  const procuras = new Set<string>();
  let leituras = 0;
  let empurroes = 0;
  const lidoOuNao = () => ({ procuras: procuras.size, leituras, porLer: pool.filter((p) => !lidas.some((l) => l.url === p.url) && !/(^|\.)news\.google\.com$/.test(anfitriao(p.url))).length });
  const msgs: Mensagem[] = [];
  let duracoes: number[] = [];

  try {
    if (!PROJETO.urlIa) throw new ErroDaIa("A IA não está ligada neste painel.", "sem-ia");
    const atual = () => trabalhoPorId(id) as TrabalhoDePesquisa;
    msgs.push({ role: "system", content: instrucoesDaPesquisa(atual().config, atual().passosPrevistos) }, { role: "user", content: pedidoInicial(atual()) });
    // o que já se apurou antes de um recomeço
    if (atual().notas.length) msgs.push({ role: "user", content: `O que já apuraste:\n${atual().notas.map((n, i) => `${i + 1}. ${n}`).join("\n")}` });

    let passo = 0;
    for (;;) {
      await esperarSePausado(id);
      if (c.cancelado) break;
      const t = atual();
      const previstos = PROFUNDIDADES[t.config.profundidade].passos;
      if (passo >= previstos) break;
      passo++;
      const t0 = Date.now();
      marcarEmUso("analise", 20_000);

      // as correções da pessoa entram agora
      const novas = t.correcoes.filter((x) => !x.aplicada);
      if (novas.length) {
        for (const n of novas) {
          msgs.push({ role: "user", content: mensagemDeCorrecao(n.texto) });
          acrescentarPasso(id, "correcao", `Correção recebida: ${n.texto}`);
        }
        mudarTrabalho(id, (x) => ({ ...x, correcoes: x.correcoes.map((y) => (y.aplicada ? y : { ...y, aplicada: true })) }));
      }
      // o rumo pode ter mudado a meio (a profundidade, a internet): as instruções e as ferramentas lêem-se de novo
      msgs[0] = { role: "system", content: instrucoesDaPesquisa(t.config, previstos) };
      const ferramentas = ferramentasDaPesquisa(t.config.internet);

      let r: RespostaDoWorker;
      if (!t.config.internet) {
        // sem internet: a IA só pensa nos dados e depois conclui
        r = await pedir<RespostaDoWorker>("/assistente", { origem: "analise", sessao: id, mensagens: [...podarMensagens(msgs), { role: "user", content: "Em duas frases, o que vais analisar nestes dados e que ângulos vais seguir? Não escrevas o documento ainda." }], maxTokens: 260 }, sinal);
        contarUso(id, r, t.titulo, [], { sistema: msgs[0].content.length, ferramentas: 0, mensagens: msgs[1].content.length });
        if (c.cancelado) break;
        if (r.texto.trim()) acrescentarPasso(id, "pensamento", r.texto.trim());
        maisUm(id);
        break;
      }
      r = await pedir<RespostaDoWorker>("/assistente", { origem: "analise", sessao: id, mensagens: podarMensagens(msgs), ferramentas, maxTokens: 700 }, sinal);
      if (c.cancelado) break;
      contarUso(id, r, t.titulo, r.chamadas.map((x) => x.nome), { sistema: msgs[0].content.length, ferramentas: JSON.stringify(ferramentas).length, mensagens: msgs.slice(1).reduce((s, m) => s + m.content.length, 0) });
      if (r.texto.trim()) acrescentarPasso(id, "pensamento", r.texto.trim());
      if (r.chamadas.length === 0) {
        maisUm(id);
        // quis acabar cedo de mais: manda-se ler mais
        if (empurroes < 2 && passo < previstos && !podeConcluir(t.config, lidoOuNao())) {
          empurroes++;
          msgs.push({ role: "assistant", content: r.texto || "Já sei o suficiente." }, { role: "user", content: empurrao(t.config, lidoOuNao()) });
          acrescentarPasso(id, "nota", "A IA quis acabar cedo: pede-se-lhe que leia mais páginas.");
          continue;
        }
        break;
      }
      msgs.push({ role: "assistant", content: r.texto ?? "", tool_calls: r.chamadas.map((x) => ({ id: x.id, type: "function", function: { name: x.nome, arguments: JSON.stringify(x.argumentos) } })) });

      let concluir = false;
      for (const ch of r.chamadas) {
        if (c.cancelado) break;
        const a = ch.argumentos;
        const pens = texto(a.pensamento, 300);
        if (pens && pens !== r.texto.trim()) acrescentarPasso(id, "pensamento", pens);
        let resultado = "";
        if (ch.nome === "buscar_web") {
          const q = texto(a.consulta, 200);
          if (procuras.has(q.toLowerCase())) resultado = "Já procuraste isto: usa outras palavras ou lê uma das páginas.";
          else {
            procuras.add(q.toLowerCase());
            acrescentarPasso(id, "pesquisa", `A procurar «${q}»`);
            try {
              const d = await pedir<{ resultados: ResultadoWeb[] }>("/web/buscar", { consulta: q, max: 6 }, sinal);
              d.resultados.forEach((x) => !pool.some((p) => p.url === x.url) && pool.push(x));
              resultado = resultadosParaTexto(d.resultados).slice(0, 2400);
              acrescentarPasso(id, "resultados", `${d.resultados.length} ${d.resultados.length === 1 ? "resultado" : "resultados"} para «${q}»`, d.resultados.map((x) => `${x.titulo} — ${anfitriao(x.url)}`).join("\n"));
            } catch (e) {
              if (e instanceof ErroDaIa && e.codigo === "cancelada") break;
              resultado = "A procura falhou: tenta outra vez com outras palavras.";
              acrescentarPasso(id, "erro", "A procura na internet falhou.");
            }
          }
        } else if (ch.nome === "ler_pagina") {
          const url = texto(a.url, 500);
          const nota = texto(a.nota, 500);
          if (nota) mudarTrabalho(id, (x) => ({ ...x, notas: [...x.notas, nota].slice(-14) }));
          if (/(^|\.)news\.google\.com$/.test(anfitriao(url))) resultado = "Isto é só o título de uma notícia: a página não se lê aqui. Procura a mesma notícia noutras palavras.";
          else {
            acrescentarPasso(id, "leitura", `A ler ${anfitriao(url)}`, url);
            try {
              const d = await pedir<{ titulo: string; texto: string; url: string }>("/web/ler", { url }, sinal, 2);
              const fonte = { n: lidas.length + 1, titulo: d.titulo || anfitriao(d.url), url: d.url };
              if (!lidas.some((l) => l.url === fonte.url)) lidas.push(fonte);
              mudarTrabalho(id, (x) => ({ ...x, fontes: lidas.slice() }));
              resultado = `${d.titulo}\n${d.texto}`.slice(0, 3600);
              leituras = lidas.length;
            } catch (e) {
              if (e instanceof ErroDaIa && e.codigo === "cancelada") break;
              resultado = e instanceof ErroDaIa ? `Não foi possível ler esta página: ${e.message}` : "Não foi possível ler esta página.";
              acrescentarPasso(id, "erro", `Não foi possível ler ${anfitriao(url)}.`);
            }
          }
        } else if (ch.nome === "concluir") {
          if (empurroes < 2 && passo < previstos && !podeConcluir(t.config, lidoOuNao())) {
            empurroes++;
            resultado = empurrao(t.config, lidoOuNao());
            acrescentarPasso(id, "nota", "A IA quis acabar cedo: pede-se-lhe que leia mais páginas.");
          } else {
            concluir = true;
            resultado = "Está bem: vou escrever o documento.";
          }
        } else resultado = `Não existe a ferramenta ${ch.nome}.`;
        msgs.push({ role: "tool", tool_call_id: ch.id, content: resultado });
      }
      maisUm(id);
      duracoes = [...duracoes, Date.now() - t0].slice(-6);
      const media = Math.round(duracoes.reduce((s, x) => s + x, 0) / duracoes.length);
      mudarTrabalho(id, (x) => ({ ...x, mediaPassoMs: media }));
      if (concluir) break;
    }
    if (c.cancelado) throw new ErroDaIa("Cancelada.", "cancelada");

    // o documento final
    await esperarSePausado(id);
    const t = atual();
    acrescentarPasso(id, "escrita", "A escrever o documento…");
    marcarEmUso("analise", 60_000);
    const fontesParaEscrever: FonteDoDocumento[] = [...lidas];
    for (const p of pool) if (fontesParaEscrever.length < 12 && !fontesParaEscrever.some((f) => f.url === p.url)) fontesParaEscrever.push({ n: fontesParaEscrever.length + 1, titulo: p.titulo, url: p.url });
    fontesParaEscrever.forEach((f, i) => (f.n = i + 1));
    const correcoes = t.correcoes.map((x) => `- ${x.texto}`).join("\n");
    const mensagens: Mensagem[] = [
      { role: "system", content: `${instrucoesDaPesquisa(t.config, 0)}\n\n${instrucoesDoDocumento(t)}` },
      {
        role: "user",
        content: [
          pedidoInicial(t, 5000),
          t.notas.length ? `O que apuraste:\n${t.notas.map((n, i) => `${i + 1}. ${n}`).join("\n")}` : "",
          fontesParaEscrever.length ? `Fontes (n — título — endereço):\n${fontesParaEscrever.map((f) => `${f.n} — ${f.titulo} — ${f.url}`).join("\n")}` : "Não há fontes da internet: baseia-te só nos dados e diz que não foi confirmado fora deles.",
          correcoes ? `Correções que a pessoa te deu (têm de se notar):\n${correcoes}` : "",
          "Escreve o documento final em JSON.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ];
    const r = await pedir<RespostaDoWorker>("/assistente", { origem: "analise", sessao: id, mensagens, json: true, maxTokens: FOCOS[t.config.foco].tokens }, sinal);
    contarUso(id, r, t.titulo, [], { sistema: mensagens[0].content.length, ferramentas: 0, mensagens: mensagens[1].content.length });
    const { doc, avisos } = lerDocumento(r.texto, t.titulo);
    // só ficam as fontes que a pesquisa viu: a IA não inventa ligações
    const conhecidas = new Map(fontesParaEscrever.map((f) => [f.url, f]));
    const citadas = doc.fontes.map((f) => conhecidas.get(f.url)).filter((f): f is FonteDoDocumento => !!f);
    const finais = (citadas.length ? citadas : lidas).map((f, i) => ({ ...f, n: Number(doc.fontes.find((d) => d.url === f.url)?.n ?? i + 1) }));
    mudarTrabalho(id, (x) => ({ ...x, estado: "concluida", concluido: new Date().toISOString(), resultado: { ...doc, fontes: finais }, avisos, fontes: finais, lido: false }));
    window.dispatchEvent(new CustomEvent(EVENTO_PESQUISA_ACABOU, { detail: { id, estado: "concluida" } }));
  } catch (e) {
    const cancelada = c.cancelado || (e instanceof ErroDaIa && e.codigo === "cancelada");
    const mensagem = e instanceof Error ? e.message : "Erro desconhecido.";
    mudarTrabalho(id, (x) => ({ ...x, estado: cancelada ? "cancelada" : "falhou", concluido: new Date().toISOString(), erro: cancelada ? undefined : mensagem }));
    if (!cancelada) {
      acrescentarPasso(id, "erro", mensagem);
      window.dispatchEvent(new CustomEvent(EVENTO_PESQUISA_ACABOU, { detail: { id, estado: "falhou", erro: mensagem } }));
    }
  } finally {
    ativos.delete(id);
    controlos.delete(id);
    marcarEmUso("analise", 3000);
    agendar();
  }
}

/** Começa o que cabe na concorrência (os que estão em pausa também ocupam um lugar). Chama-se sempre que a fila muda. */
export function agendar(): void {
  if (typeof window === "undefined") return;
  const livres = CONCORRENCIA - ativos.size;
  if (livres <= 0) return;
  for (const t of paraComecar(lerTrabalhos().filter((x) => !ativos.has(x.id)), livres)) void correr(t.id);
}

/** Liga o motor à fila: arranca o que estiver à espera e reage a cada mudança. */
export function ligarMotor(): () => void {
  const ouvir = () => agendar();
  window.addEventListener(EVENTO_PESQUISAS, ouvir);
  agendar();
  return () => window.removeEventListener(EVENTO_PESQUISAS, ouvir);
}
