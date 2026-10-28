// Passos seguintes de um estado, tirados do fluxo real do módulo e da função ativa.
import { AREAS } from "@/dados/estrutura";
import { REGISTOS } from "@/dados/modulos";
import { FUNCOES, podeEditar, type Funcao } from "@/dados/rbac";

export interface PassoSeguinte {
  rotulo: string;
  /** Quem o pode executar, por extenso. */
  quem: string;
  /** Se a função ativa o pode executar. */
  permitido: boolean;
}

const nomesDasFuncoes = (ids: string[]) =>
  ids
    .map((id) => FUNCOES.find((f) => f.id === id)?.rotulo ?? id)
    .join(" ou ");

export function passosSeguintes(modulo: string, estado: string, funcao: Funcao): PassoSeguinte[] {
  const def = REGISTOS[modulo];
  if (!def?.transicoes) return [];
  const area = AREAS.find((a) => a.modulos.some((m) => m.id === modulo));
  const edita = !!area && podeEditar(funcao, area.id, modulo);
  return def.transicoes
    .filter((t) => t.de.includes(estado))
    .map((t) => ({ rotulo: t.rotulo, quem: nomesDasFuncoes(t.funcoes), permitido: edita && t.funcoes.includes(funcao.id) }));
}
