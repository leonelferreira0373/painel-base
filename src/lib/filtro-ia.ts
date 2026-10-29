// A IA no filtro das colunas: a pessoa escreve o que quer ver («tudo o que tem a ver com e-mails») e a IA escolhe, entre as opções da coluna, as que servem. Gasta como a pesquisa em linguagem natural (o anel fica a cores enquanto pensa). Sem IA ligada, ou se ela falha, usa-se a pesquisa pelas palavras.
"use client";

import { PROJETO } from "@/dados/projeto";
import { registar } from "./atividade";
import { escolhaLocal, mensagensDaEscolha, opcoesEscolhidas, type Opcao } from "./filtro-colunas";
import { marcarEmUso, registarUsoDaIa } from "./ia-uso";
import type { UsoDeChamada } from "./ia-modelos";

export interface EscolhaDeOpcoes {
  escolhidas: string[];
  /** Se foi a IA a escolher (senão foi a pesquisa pelas palavras). */
  viaIa: boolean;
}

export async function escolherComIa(coluna: string, opcoes: Opcao[], pedido: string, sinal?: AbortSignal): Promise<EscolhaDeOpcoes> {
  const local = () => ({ escolhidas: escolhaLocal(opcoes, pedido), viaIa: false });
  if (!PROJETO.urlIa || opcoes.length === 0) return local();
  const mensagens = mensagensDaEscolha(coluna, opcoes, pedido);
  marcarEmUso("pesquisa", 20_000);
  try {
    const r = await fetch(`${PROJETO.urlIa}/assistente`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origem: "pesquisa", sessao: "filtro", mensagens, json: true, maxTokens: 500 }), signal: sinal });
    if (!r.ok) return local();
    const d = (await r.json()) as { texto: string; uso?: UsoDeChamada };
    if (d.uso) registarUsoDaIa({ origem: "pesquisa", pergunta: `Filtro «${coluna}»: ${pedido}`, resposta: d.texto, uso: d.uso, partes: { sistema: mensagens[0].content.length, ferramentas: 0, mensagens: mensagens[1].content.length } });
    const escolhidas = opcoesEscolhidas(d.texto, opcoes);
    registar("ia", `Filtrou «${coluna}» com a IA: «${pedido.slice(0, 100)}» (${escolhidas.length} ${escolhidas.length === 1 ? "opção" : "opções"})`);
    return { escolhidas, viaIa: true };
  } catch {
    return local();
  } finally {
    marcarEmUso("pesquisa", 2500);
  }
}
