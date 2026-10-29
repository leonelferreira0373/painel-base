// Os locais das imagens da galeria: que imagens aparecem num local e o que gravar quando se liga ou desliga uma imagem a um local. Funções puras, partilhadas pela galeria e pelos campos com imagens.
import { LOCAIS_DE_IMAGEM, type LocalDeImagem } from "@/dados/locais";
import { eImagem, type ItemDaBiblioteca } from "./biblioteca";

export const localPorId = (id: string): LocalDeImagem | undefined => LOCAIS_DE_IMAGEM.find((l) => l.id === id);

/** Os locais de uma imagem que ainda existem (um local que já não existe deixa de contar). */
export const locaisDe = (i: Pick<ItemDaBiblioteca, "locais">): string[] => (i.locais ?? []).filter((l) => !!localPorId(l));

/** As imagens ligadas a um local, as mais recentes primeiro. */
export const imagensDoLocal = (itens: ItemDaBiblioteca[], local: string): ItemDaBiblioteca[] =>
  itens.filter((i) => eImagem(i) && locaisDe(i).includes(local)).sort((a, b) => b.criado.localeCompare(a.criado));

/** Quantas imagens há em cada local (todos os locais, também os vazios). */
export const contagemPorLocal = (itens: ItemDaBiblioteca[]): Record<string, number> =>
  Object.fromEntries(LOCAIS_DE_IMAGEM.map((l) => [l.id, itens.filter((i) => eImagem(i) && locaisDe(i).includes(l.id)).length]));

/** A imagem com o local ligado ou desligado (sem repetir; sem locais fica sem o campo). */
export function comLocal(i: ItemDaBiblioteca, local: string, ligar: boolean): ItemDaBiblioteca {
  const atuais = locaisDe(i).filter((l) => l !== local);
  const locais = ligar ? [...atuais, local] : atuais;
  return { ...i, locais: locais.length ? locais : undefined };
}

/** A imagem passa a ser a principal (a primeira da lista); as outras mantêm a ordem. */
export function tornarPrincipal(imagens: string[], id: string): string[] {
  return imagens.includes(id) ? [id, ...imagens.filter((x) => x !== id)] : imagens;
}

/** Sem repetidos, mantendo a primeira ocorrência. */
export const semRepetidas = (ids: string[]): string[] => ids.filter((id, i) => ids.indexOf(id) === i);
