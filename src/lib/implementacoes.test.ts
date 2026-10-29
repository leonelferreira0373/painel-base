// Testes das implementações: teste A/B, promover, cancelar, rollback e lançar uma versão nova.
import { describe, expect, it } from "vitest";
import { cancelarTeste, dividir, erroDaDivisao, erroDoRollback, lancar, promoverB, reverter, trafegoTotal, type EstadoDeImplementacoes, type Implementacao } from "./implementacoes";

const versao = (id: string, estado: Implementacao["estado"], trafego = 0): Implementacao => ({ id, versao: `v-${id}`, ramo: "main", commit: `c${id}`, mensagem: `mensagem ${id}`, autor: "Ana", quando: "2026-10-29T10:00:00.000Z", estado, trafego });
const inicial = (): EstadoDeImplementacoes => ({ itens: [versao("3", "Ativa", 100), versao("2", "Anterior"), versao("1", "Falhou"), versao("0", "Pronta")], a: "3", b: null, percentagemB: 0, historico: [] });
const AGORA = "2026-10-29T12:00:00.000Z";
const estados = (e: EstadoDeImplementacoes) => Object.fromEntries(e.itens.map((i) => [i.id, `${i.estado}:${i.trafego}`]));

describe("teste A/B", () => {
  it("divide o tráfego e a soma dá sempre 100", () => {
    const e = dividir(inicial(), "2", 10, AGORA);
    expect(estados(e)).toEqual({ "3": "Ativa:90", "2": "Em teste:10", "1": "Falhou:0", "0": "Pronta:0" });
    expect(trafegoTotal(e)).toBe(100);
    expect(e.historico[0].texto).toContain("90 %");
    expect(e.historico[0].texto).toContain("10 %");
  });
  it("recusa uma divisão que não serve, com a razão", () => {
    const e = inicial();
    expect(erroDaDivisao(e, "", 10)).toContain("Escolha");
    expect(erroDaDivisao(e, "3", 10)).toContain("diferente");
    expect(erroDaDivisao(e, "1", 10)).toContain("falhou");
    expect(erroDaDivisao(e, "2", 0)).toContain("1 a 99");
    expect(erroDaDivisao(e, "2", 100)).toContain("1 a 99");
    expect(erroDaDivisao(e, "2", 12.5)).toContain("1 a 99");
    expect(erroDaDivisao(e, "2", 50)).toBeNull();
    expect(dividir(e, "3", 10, AGORA)).toBe(e);
  });
  it("mudar a divisão não duplica a B nem perde tráfego", () => {
    const e = dividir(dividir(inicial(), "2", 10, AGORA), "2", 40, AGORA);
    expect(estados(e)["3"]).toBe("Ativa:60");
    expect(estados(e)["2"]).toBe("Em teste:40");
    expect(trafegoTotal(e)).toBe(100);
  });
  it("trocar de B deixa a antiga pronta, para voltar a testar-se", () => {
    const e = dividir(dividir(inicial(), "2", 10, AGORA), "0", 20, AGORA);
    expect(estados(e)).toEqual({ "3": "Ativa:80", "2": "Pronta:0", "1": "Falhou:0", "0": "Em teste:20" });
  });
  it("promover a B dá-lhe todo o tráfego e a A fica anterior", () => {
    const e = promoverB(dividir(inicial(), "2", 10, AGORA), AGORA);
    expect(estados(e)).toEqual({ "3": "Anterior:0", "2": "Ativa:100", "1": "Falhou:0", "0": "Pronta:0" });
    expect(e.a).toBe("2");
    expect(e.b).toBeNull();
    expect(e.percentagemB).toBe(0);
  });
  it("cancelar o teste devolve o tráfego à A e deixa a B pronta", () => {
    const e = cancelarTeste(dividir(inicial(), "0", 10, AGORA), AGORA);
    expect(estados(e)).toEqual({ "3": "Ativa:100", "2": "Anterior:0", "1": "Falhou:0", "0": "Pronta:0" });
    expect(e.b).toBeNull();
  });
  it("promover ou cancelar sem teste não muda nada", () => {
    const e = inicial();
    expect(promoverB(e, AGORA)).toBe(e);
    expect(cancelarTeste(e, AGORA)).toBe(e);
  });
});

describe("rollback", () => {
  it("volta a uma versão anterior e escreve no histórico", () => {
    const e = reverter(inicial(), "2", AGORA);
    expect(estados(e)).toEqual({ "3": "Anterior:0", "2": "Ativa:100", "1": "Falhou:0", "0": "Pronta:0" });
    expect(e.historico[0].texto).toBe("Rollback: de v-3 para v-2");
  });
  it("acaba o teste A/B que estivesse a decorrer", () => {
    const e = reverter(dividir(inicial(), "0", 30, AGORA), "2", AGORA);
    expect(e.b).toBeNull();
    expect(trafegoTotal(e)).toBe(100);
    expect(estados(e)["0"]).toBe("Pronta:0");
  });
  it("não deixa voltar a uma versão que falhou, que não existe ou que já serve tudo", () => {
    const e = inicial();
    expect(erroDoRollback(e, "1")).toContain("falhou");
    expect(erroDoRollback(e, "9")).toContain("já não existe");
    expect(erroDoRollback(e, "3")).toContain("já recebe");
    expect(erroDoRollback(e, "2")).toBeNull();
    expect(reverter(e, "1", AGORA)).toBe(e);
  });
  it("com um teste a decorrer, voltar à A é possível (acaba o teste)", () => {
    const e = dividir(inicial(), "2", 10, AGORA);
    expect(erroDoRollback(e, "3")).toBeNull();
    expect(estados(reverter(e, "3", AGORA))["3"]).toBe("Ativa:100");
  });
});

describe("lançar uma versão", () => {
  it("cria uma versão pronta, sem tráfego, no topo da lista", () => {
    const e = lancar(inicial(), { ramo: "desenvolvimento", commit: "ab12cd3", mensagem: "Novo ecrã", autor: "Rui" }, new Date(2026, 9, 29, 14, 5));
    expect(e.itens[0]).toMatchObject({ versao: "20261029-1405", estado: "Pronta", trafego: 0, ramo: "desenvolvimento", commit: "ab12cd3" });
    expect(trafegoTotal(e)).toBe(100);
    expect(e.historico[0].texto).toContain("desenvolvimento");
  });
  it("não cria a mesma versão duas vezes", () => {
    const dados = { ramo: "main", commit: "ab12cd3", mensagem: "x", autor: "Rui" };
    const um = lancar(inicial(), dados, new Date(2026, 9, 29, 14, 5));
    expect(lancar(um, dados, new Date(2026, 9, 29, 14, 5))).toBe(um);
  });
});
