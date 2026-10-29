// A configuração dos módulos do painel: que áreas e módulos estão ligados. Parte de um pacote de negócio (dados/pacotes.ts) e guarda só as exceções que o Master Admin fez (`ligados`). A regra que esconde o que está desligado aplica-se à função de cada pessoa (`aplicarModulos`), por isso o menu, a pesquisa e as páginas já respeitam tudo sem mais nada. Funções puras.
import { AREAS } from "@/dados/estrutura";
import type { Aparencia } from "@/dados/aparencia";
import { AREAS_ESSENCIAIS, PACOTE_DE_ORIGEM, pacotePorId } from "@/dados/pacotes";
import type { Funcao } from "@/dados/rbac";

export interface ConfigDoPainel {
  /** O pacote de que se parte. */
  pacote: string;
  /** As exceções ao pacote: «area» ou «area/modulo» → ligado ou desligado. */
  ligados: Record<string, boolean>;
  /** A predefinição aplicada por último, se ainda vale (mudar um interruptor tira-a). */
  predefinicao?: string;
  /** A aparência que a predefinição deu a todo o painel; quem tem a sua própria aparência (Definições da conta) mantém-na. */
  aparencia?: Aparencia;
}

export const CONFIG_DE_ORIGEM: ConfigDoPainel = { pacote: PACOTE_DE_ORIGEM, ligados: {} };

export const chaveDe = (areaId: string, moduloId?: string) => (moduloId ? `${areaId}/${moduloId}` : areaId);

/** O valor de uma chave segundo o pacote, sem as exceções. */
function doPacote(pacoteId: string, chave: string): boolean {
  const p = pacotePorId(pacoteId);
  if (!p) return true;
  const [area] = chave.split("/");
  return chave.includes("/") ? !(p.modulosFora ?? []).includes(chave) : p.areas.includes(area);
}

export function areaLigada(c: ConfigDoPainel, areaId: string): boolean {
  if (AREAS_ESSENCIAIS.includes(areaId)) return true;
  return c.ligados[areaId] ?? doPacote(c.pacote, areaId);
}

export function moduloLigado(c: ConfigDoPainel, areaId: string, moduloId: string): boolean {
  if (!areaLigada(c, areaId)) return false;
  if (AREAS_ESSENCIAIS.includes(areaId)) return true;
  const chave = chaveDe(areaId, moduloId);
  return c.ligados[chave] ?? doPacote(c.pacote, chave);
}

/** O pacote que se mostra: o escolhido, ou «Personalizado» se há exceções. */
export const pacoteEfetivo = (c: ConfigDoPainel): string => (Object.keys(c.ligados).length > 0 ? "personalizado" : c.pacote);

/** Liga ou desliga uma área (ou um módulo). Se o novo valor é o do pacote, a exceção desaparece. */
export function alternar(c: ConfigDoPainel, chave: string, ligar: boolean): ConfigDoPainel {
  if (AREAS_ESSENCIAIS.includes(chave.split("/")[0]) && !chave.includes("/")) return c;
  const ligados = { ...c.ligados };
  if (ligar === doPacote(c.pacote, chave)) delete ligados[chave];
  else ligados[chave] = ligar;
  return { ...c, ligados, predefinicao: undefined };
}

/** Escolher um pacote tira todas as exceções. */
export const escolherPacote = (c: ConfigDoPainel, pacote: string): ConfigDoPainel => ({ ...c, pacote, ligados: {}, predefinicao: undefined });

/** Quantos módulos e áreas estão ligados (as áreas contam os módulos que lhes sobram). */
export function contagem(c: ConfigDoPainel): { areas: number; modulos: number } {
  const ligadas = AREAS.filter((a) => areaLigada(c, a.id));
  return { areas: ligadas.length, modulos: ligadas.reduce((n, a) => n + a.modulos.filter((m) => moduloLigado(c, a.id, m.id)).length, 0) };
}

/** A função de uma pessoa sem as áreas e os módulos que estão desligados: o resto do painel só vê o que sobra. */
export function aplicarModulos(f: Funcao, c: ConfigDoPainel): Funcao {
  const areas = Object.fromEntries(Object.entries(f.areas).filter(([id]) => areaLigada(c, id)));
  const fora = AREAS.flatMap((a) => (areaLigada(c, a.id) ? a.modulos.filter((m) => !moduloLigado(c, a.id, m.id)).map((m) => m.id) : []));
  return { ...f, areas, fechados: [...new Set([...(f.fechados ?? []), ...fora])] };
}

/** A configuração que uma predefinição dá ao painel: o pacote, as exceções e a aparência. */
export function aplicarPredefinicao(p: Pick<import("@/dados/predefinicoes").Predefinicao, "id" | "pacote" | "ligados" | "aparencia">): ConfigDoPainel {
  return { pacote: p.pacote, ligados: { ...(p.ligados ?? {}) }, predefinicao: p.id, aparencia: p.aparencia };
}
