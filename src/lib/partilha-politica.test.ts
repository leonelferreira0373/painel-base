import { describe, expect, it } from "vitest";
import { FUNCOES } from "@/dados/rbac";
import { alternarFuncao, eProgramaOuScript, motivoDeRecusa, pastaValida, podeEnviar, podeReceber, POLITICA_DE_ORIGEM, politicaValida } from "./partilha-politica";

const [a, b] = FUNCOES;

describe("quem pode enviar e receber ficheiros", () => {
  it("de origem, cada função tem os dois interruptores pelo que pode ver e alterar no módulo", () => {
    expect(POLITICA_DE_ORIGEM.guardarNaBiblioteca).toBe(true);
    expect(POLITICA_DE_ORIGEM.pasta).toBe("Recebidos");
    for (const id of POLITICA_DE_ORIGEM.enviar) expect(POLITICA_DE_ORIGEM.receber).toContain(id);
  });
  it("liga e desliga uma função num sentido sem mexer no outro", () => {
    const p = alternarFuncao(alternarFuncao(POLITICA_DE_ORIGEM, "enviar", a.id, true), "receber", a.id, true);
    expect(podeEnviar(p, a.id) && podeReceber(p, a.id)).toBe(true);
    const so = alternarFuncao(p, "enviar", a.id, false);
    expect(podeEnviar(so, a.id)).toBe(false);
    expect(podeReceber(so, a.id)).toBe(true);
    expect(alternarFuncao(so, "enviar", a.id, true).enviar.filter((x) => x === a.id)).toHaveLength(1);
  });
  it("recusa por função, por programa e por tamanho; aceita o resto", () => {
    const p = { ...POLITICA_DE_ORIGEM, receber: [a.id], tamanhoMaximoMb: 10, recusarProgramas: true };
    expect(motivoDeRecusa(p, b.id, { nome: "foto.png", tamanho: 100 })).toContain("não pode receber");
    expect(motivoDeRecusa(p, a.id, { nome: "Instalar.EXE", tamanho: 100 })).toContain("programas");
    expect(motivoDeRecusa(p, a.id, { nome: "video.mp4", tamanho: 11 * 1024 * 1024 })).toContain("10 MB");
    expect(motivoDeRecusa(p, a.id, { nome: "fatura.pdf", tamanho: 2 * 1024 * 1024 })).toBeNull();
    expect(motivoDeRecusa({ ...p, recusarProgramas: false }, a.id, { nome: "script.sh", tamanho: 1 })).toBeNull();
    expect(motivoDeRecusa({ ...p, tamanhoMaximoMb: 0 }, a.id, { nome: "enorme.iso", tamanho: 9e9 })).toBeNull();
  });
  it("reconhece programas e scripts pela extensão", () => {
    expect(["a.exe", "a.BAT", "b.sh", "c.apk"].every(eProgramaOuScript)).toBe(true);
    expect(["a.pdf", "exe.txt", "sh"].some(eProgramaOuScript)).toBe(false);
  });
  it("a pasta de destino é uma só, sem barras", () => {
    expect(pastaValida("Recebidos")).toBe(true);
    expect(pastaValida("Faturas/2026")).toBe(false);
    expect(pastaValida("   ")).toBe(false);
  });
  it("uma política guardada com lixo reduz-se ao que serve", () => {
    const p = politicaValida({ enviar: [a.id, "função-que-já-não-existe"], pasta: "a/b", tamanhoMaximoMb: -4 });
    expect(p.enviar).toEqual([a.id]);
    expect(p.pasta).toBe("Recebidos");
    expect(p.tamanhoMaximoMb).toBe(0);
    expect(politicaValida(null)).toEqual(POLITICA_DE_ORIGEM);
  });
});
