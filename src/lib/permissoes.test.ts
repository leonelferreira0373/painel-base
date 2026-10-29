import { describe, expect, it } from "vitest";
import { podeEditar, podeVer, type Funcao } from "@/dados/rbac";
import { alternarEditar, alternarModulo, alternarVer, AREAS_COM_ACESSO, funcaoDaMatriz, matrizDaFuncao, matrizesIguais, resumoDeAcesso, textoDoResumo, todasAsAreas } from "./permissoes";

// uma função de teste feita com as áreas que o projeto tem (cada projeto tem as suas): a 1.ª edita, a 2.ª só vê, a 3.ª não vê; um módulo da 1.ª fica fechado
const [a0, a1, a2] = AREAS_COM_ACESSO.filter((a) => a.modulos.length >= 2);
const fechado = a0.modulos[a0.modulos.length - 1].id;
const aberto = a0.modulos[0].id;
const funcao: Funcao = { id: "teste", rotulo: "Teste", pessoa: "Ana", areas: { [a0.id]: ["ver", "editar"], [a1.id]: ["ver"] }, fechados: [fechado] };

describe("as permissões como interruptores", () => {
  it("a matriz de uma função diz o que vê, o que edita e o que fica fechado", () => {
    const m = matrizDaFuncao(funcao);
    expect(m[a0.id]).toMatchObject({ ver: true, editar: true, fechados: [fechado] });
    expect(m[a1.id]).toMatchObject({ ver: true, editar: false });
    expect(m[a2.id]).toMatchObject({ ver: false, editar: false });
  });
  it("sem ver não há editar, e editar obriga a ver", () => {
    let m = matrizDaFuncao(funcao);
    m = alternarVer(m, a0.id, false);
    expect(m[a0.id]).toMatchObject({ ver: false, editar: false });
    m = alternarEditar(m, a2.id, true);
    expect(m[a2.id]).toMatchObject({ ver: true, editar: true });
    m = alternarEditar(m, a2.id, false);
    expect(m[a2.id]).toMatchObject({ ver: true, editar: false });
  });
  it("fechar e abrir um módulo", () => {
    let m = matrizDaFuncao(funcao);
    m = alternarModulo(m, a0.id, aberto, false);
    expect(m[a0.id].fechados).toEqual(expect.arrayContaining([fechado, aberto]));
    m = alternarModulo(m, a0.id, aberto, true);
    expect(m[a0.id].fechados).not.toContain(aberto);
    m = alternarModulo(m, a0.id, fechado, false);
    expect(m[a0.id].fechados.filter((x) => x === fechado)).toHaveLength(1);
  });
  it("a função feita da matriz aplica o que os interruptores dizem", () => {
    let m = matrizDaFuncao(funcao);
    m = alternarModulo(m, a0.id, aberto, false);
    const f = funcaoDaMatriz("pers-1", "Personalizada", "Ana", m);
    expect(podeVer(f, a0.id, aberto)).toBe(false);
    expect(podeVer(f, a0.id)).toBe(true);
    expect(podeEditar(f, a0.id)).toBe(true);
    expect(podeEditar(f, a1.id)).toBe(false);
    expect(podeVer(f, a2.id)).toBe(false);
    // a conta de cada um é sempre da própria pessoa
    expect(podeEditar(f, "conta")).toBe(true);
  });
  it("uma função não mexida dá a mesma matriz; mexer muda-a", () => {
    const m = matrizDaFuncao(funcao);
    expect(matrizesIguais(m, matrizDaFuncao(funcao))).toBe(true);
    expect(matrizesIguais(m, alternarVer(m, a1.id, false))).toBe(false);
  });
  it("o resumo conta áreas vistas, editadas e módulos fechados", () => {
    const r = resumoDeAcesso(matrizDaFuncao(funcao));
    expect(r).toMatchObject({ areasVistas: 2, areasEditadas: 1, modulosFechados: 1, totalDeAreas: AREAS_COM_ACESSO.length });
    expect(textoDoResumo(r)).toBe(`Vê 2 de ${AREAS_COM_ACESSO.length} áreas · edita 1 · 1 módulo fechado`);
    expect(resumoDeAcesso(todasAsAreas(true, true))).toMatchObject({ areasVistas: AREAS_COM_ACESSO.length, areasEditadas: AREAS_COM_ACESSO.length, modulosFechados: 0 });
    expect(resumoDeAcesso(todasAsAreas(false, true)).areasVistas).toBe(0);
  });
});
