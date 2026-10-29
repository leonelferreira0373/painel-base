// As permissões de uma pessoa, como interruptores: para cada área, se vê e se edita, e quais módulos ficam fechados. Serve o convite («Convidar para o painel»): parte de uma função pronta, a pessoa liga e desliga o que quiser e o resultado é uma função personalizada. Puro.
import { AREAS } from "@/dados/estrutura";
import type { Funcao, Permissao } from "@/dados/rbac";

export interface PermissoesDaArea {
  ver: boolean;
  editar: boolean;
  /** Os módulos desta área que ficam fechados mesmo com a área aberta. */
  fechados: string[];
}

export type MatrizDePermissoes = Record<string, PermissoesDaArea>;

/** As áreas do convite: todas as do painel menos as pessoais (a conta de cada um é sempre da própria pessoa). */
export const AREAS_COM_ACESSO = AREAS.filter((a) => a.id !== "conta");

/** A matriz de uma função pronta. */
export function matrizDaFuncao(f: Funcao): MatrizDePermissoes {
  const m: MatrizDePermissoes = {};
  for (const a of AREAS_COM_ACESSO) {
    const p = f.areas[a.id] ?? [];
    m[a.id] = { ver: p.includes("ver"), editar: p.includes("ver") && p.includes("editar"), fechados: a.modulos.filter((x) => f.fechados?.includes(x.id)).map((x) => x.id) };
  }
  return m;
}

/** Liga ou desliga «ver» numa área: sem ver não há editar. */
export function alternarVer(m: MatrizDePermissoes, area: string, ligado: boolean): MatrizDePermissoes {
  const a = m[area] ?? { ver: false, editar: false, fechados: [] };
  return { ...m, [area]: { ...a, ver: ligado, editar: ligado ? a.editar : false } };
}

/** Liga ou desliga «editar» numa área: para editar é preciso ver. */
export function alternarEditar(m: MatrizDePermissoes, area: string, ligado: boolean): MatrizDePermissoes {
  const a = m[area] ?? { ver: false, editar: false, fechados: [] };
  return { ...m, [area]: { ...a, editar: ligado, ver: ligado ? true : a.ver } };
}

/** Abre ou fecha um módulo dentro de uma área. */
export function alternarModulo(m: MatrizDePermissoes, area: string, modulo: string, aberto: boolean): MatrizDePermissoes {
  const a = m[area] ?? { ver: false, editar: false, fechados: [] };
  const fechados = aberto ? a.fechados.filter((x) => x !== modulo) : a.fechados.includes(modulo) ? a.fechados : [...a.fechados, modulo];
  return { ...m, [area]: { ...a, fechados } };
}

/** Liga ou desliga tudo de uma vez (ver e editar em todas as áreas). */
export function todasAsAreas(ver: boolean, editar: boolean): MatrizDePermissoes {
  return Object.fromEntries(AREAS_COM_ACESSO.map((a) => [a.id, { ver, editar: ver && editar, fechados: [] }]));
}

/** Uma função (a que o painel aplica) a partir de uma matriz. */
export function funcaoDaMatriz(id: string, rotulo: string, pessoa: string, m: MatrizDePermissoes): Funcao {
  const areas: Record<string, Permissao[]> = {};
  const fechados: string[] = [];
  for (const [area, p] of Object.entries(m)) {
    if (!p.ver) continue;
    areas[area] = p.editar ? ["ver", "editar"] : ["ver"];
    fechados.push(...p.fechados);
  }
  // a conta de cada um (Definições da conta) é sempre da própria pessoa
  areas.conta = ["ver", "editar"];
  return { id, rotulo, pessoa, areas, ...(fechados.length ? { fechados } : {}) };
}

/** Duas matrizes iguais (para saber se a pessoa mexeu na função pronta). */
export function matrizesIguais(a: MatrizDePermissoes, b: MatrizDePermissoes): boolean {
  const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const id of ids) {
    const x = a[id] ?? { ver: false, editar: false, fechados: [] };
    const y = b[id] ?? { ver: false, editar: false, fechados: [] };
    if (x.ver !== y.ver || x.editar !== y.editar || [...x.fechados].sort().join() !== [...y.fechados].sort().join()) return false;
  }
  return true;
}

export interface ResumoDeAcesso {
  areasVistas: number;
  areasEditadas: number;
  modulosFechados: number;
  totalDeAreas: number;
}

export function resumoDeAcesso(m: MatrizDePermissoes): ResumoDeAcesso {
  const v = Object.values(m);
  return { areasVistas: v.filter((p) => p.ver).length, areasEditadas: v.filter((p) => p.editar).length, modulosFechados: v.filter((p) => p.ver).reduce((s, p) => s + p.fechados.length, 0), totalDeAreas: AREAS_COM_ACESSO.length };
}

/** O resumo escrito: «Vê 7 de 12 áreas · edita 3 · 2 módulos fechados». */
export function textoDoResumo(r: ResumoDeAcesso): string {
  const partes = [`Vê ${r.areasVistas} de ${r.totalDeAreas} áreas`, `edita ${r.areasEditadas}`];
  if (r.modulosFechados) partes.push(`${r.modulosFechados} ${r.modulosFechados === 1 ? "módulo fechado" : "módulos fechados"}`);
  return partes.join(" · ");
}
