// A reciclagem, no navegador: guarda o que se apaga (no IndexedDB, porque um ficheiro leva o seu conteúdo), restaura-o para o sítio de onde veio, apaga-o de vez (à mão, ou quando o prazo acaba) e diz o prazo em vigor (90 dias por omissão; o Master Admin muda-o). Em modo ligado a reciclagem é do servidor (/v1/painel/reciclagem): o servidor guarda o que se apaga e este ficheiro só pede a lista, restaura e apaga.
"use client";

import { useCallback, useEffect, useState } from "react";
import { guardar as guardarNoArmazem, remover as removerDoArmazem, todos, useArmazem } from "./armazem";
import { chamar, lerLigacao } from "./api/cliente";
import { sessaoAtual, registar, reporAtividade } from "./atividade";
import { reporHistoricoDaIa } from "./ia-uso";
import { reporTrabalho } from "./pesquisa-profunda";
import { DIAS_DE_ORIGEM, diasValidos, EVENTO_GUARDADO, EVENTO_RESTAURAR_CONTA, expirados, novoItemApagado, type ItemApagado, type OrigemDoItem } from "./reciclagem-tipos";

const CHAVE_DIAS = "painel.reciclagem.dias";
export const EVENTO_PRAZO = "painel:reciclagem-prazo";

export function lerDias(): number {
  try {
    const v = Number(window.localStorage.getItem(CHAVE_DIAS));
    return diasValidos(v) ? v : DIAS_DE_ORIGEM;
  } catch {
    return DIAS_DE_ORIGEM;
  }
}

/** O prazo em vigor muda aqui e nos outros separadores (só o Master Admin o chama). */
export function definirDias(dias: number): void {
  if (!diasValidos(dias)) return;
  try {
    window.localStorage.setItem(CHAVE_DIAS, String(dias));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_PRAZO));
}

const quem = () => sessaoAtual()?.utilizador ?? "Sistema";

/** Põe um item na reciclagem (antes de o apagar). Em modo ligado é o servidor que o faz, ao apagar. */
export async function reciclar(p: { tipo: string; dados: unknown; origem: OrigemDoItem; rotulo?: string }): Promise<void> {
  if (typeof window === "undefined" || lerLigacao().modo === "ligado") return;
  const item = novoItemApagado({ ...p, por: quem(), pagina: window.location.pathname });
  try {
    await guardarNoArmazem<ItemApagado>("reciclagem", item);
  } catch {
    /* sem armazenamento: apaga-se na mesma, como antes */
  }
  registar("dados", `Apagou «${item.rotulo}» (${item.tipo.toLowerCase()}): fica na reciclagem`);
}

/** Escreve o item de volta no sítio de onde veio. */
async function repor(item: ItemApagado): Promise<void> {
  const o = item.origem;
  if (o.kind === "colecao") {
    const ligacao = lerLigacao();
    if (ligacao.modo === "ligado" && o.caminho) {
      await chamar(ligacao, "PUT", `${o.caminho}/{id}`, item.dados, { id: String((item.dados as { id: string }).id) });
      return;
    }
    const chave = `painel.${o.chave}`;
    const lista = JSON.parse(window.localStorage.getItem(chave) ?? "[]") as { id: string }[];
    const d = item.dados as { id: string };
    if (!lista.some((x) => x.id === d.id)) window.localStorage.setItem(chave, JSON.stringify([...lista, d]));
    window.dispatchEvent(new CustomEvent(EVENTO_GUARDADO, { detail: { chave: o.chave } }));
  } else if (o.kind === "armazem") await guardarNoArmazem(o.loja, item.dados as { id: string });
  else if (o.kind === "faq") (await import("./faq")).guardarFaqAgora(item.dados as Parameters<(typeof import("./faq"))["guardarFaqAgora"]>[0]);
  else if (o.kind === "conta") window.dispatchEvent(new CustomEvent(EVENTO_RESTAURAR_CONTA, { detail: { campo: o.campo, dados: item.dados } }));
  else if (o.kind === "pesquisa") reporTrabalho(item.dados as Parameters<typeof reporTrabalho>[0]);
  else if (o.kind === "atividade") reporAtividade(item.dados as Parameters<typeof reporAtividade>[0]);
  else if (o.kind === "uso-ia") reporHistoricoDaIa(item.dados as Parameters<typeof reporHistoricoDaIa>[0]);
}

export async function restaurar(item: ItemApagado): Promise<void> {
  await repor(item);
  await removerDoArmazem("reciclagem", item.id);
  registar("dados", `Restaurou «${item.rotulo}» (${item.tipo.toLowerCase()})`);
}

export async function apagarDeVez(item: ItemApagado, motivo: "mao" | "prazo" = "mao"): Promise<void> {
  await removerDoArmazem("reciclagem", item.id);
  registar("dados", motivo === "prazo" ? `«${item.rotulo}» foi apagado de vez: acabou o prazo da reciclagem` : `Apagou de vez «${item.rotulo}»`);
}

export async function esvaziar(): Promise<number> {
  const itens = await todos<ItemApagado>("reciclagem");
  for (const i of itens) await removerDoArmazem("reciclagem", i.id);
  registar("dados", `Esvaziou a reciclagem (${itens.length} ${itens.length === 1 ? "item" : "itens"} apagados de vez)`);
  return itens.length;
}

/** Apaga de vez o que já passou do prazo; devolve quantos. */
export async function purgarExpirados(agora = new Date()): Promise<number> {
  if (lerLigacao().modo === "ligado") return 0;
  const velhos = expirados(await todos<ItemApagado>("reciclagem"), lerDias(), agora);
  for (const i of velhos) await apagarDeVez(i, "prazo");
  return velhos.length;
}

/** Os itens da reciclagem (ou, em modo ligado, os do servidor) e o prazo em vigor, sempre atualizados. */
export function useReciclagem() {
  const local = useArmazem<ItemApagado>("reciclagem");
  const [dias, setDias] = useState(DIAS_DE_ORIGEM);
  useEffect(() => {
    const ler = () => setDias(lerDias());
    ler();
    window.addEventListener(EVENTO_PRAZO, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO_PRAZO, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  const ordenados = [...local.itens].sort((a, b) => b.apagadoEm.localeCompare(a.apagadoEm));
  const restaurarItem = useCallback((i: ItemApagado) => restaurar(i), []);
  return { itens: ordenados, pronto: local.pronto, dias, restaurar: restaurarItem, apagarDeVez: (i: ItemApagado) => apagarDeVez(i) };
}
