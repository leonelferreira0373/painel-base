// Testes dos controlos da IA: dividir a memória em pedaços, procurar a resposta, o limite e as instruções finais.
import { describe, expect, it } from "vitest";
import { caracteresAtivos, CONTROLOS_DE_ORIGEM, instrucoesFinais, pedacos, procurar, type DocumentoDeMemoria } from "./ia-controlos";

const doc = (nome: string, texto: string, ativo = true): DocumentoDeMemoria => ({ id: nome, nome, origem: "nota", tamanho: texto.length, criado: "2026-10-29T00:00:00Z", ativo, texto });

describe("memória da IA", () => {
  it("parte o texto em pedaços sem partir parágrafos", () => {
    const p = pedacos(["Um parágrafo curto.", "Outro parágrafo curto.", "x".repeat(900)].join("\n\n"), 100);
    expect(p[0]).toContain("Um parágrafo curto.");
    expect(p.every((x) => x.length > 0)).toBe(true);
    expect(p.length).toBeGreaterThan(2);
  });
  it("encontra o pedaço que responde, ignorando acentos e palavras vazias", () => {
    const docs = [doc("Férias", "As férias podem ser pedidas no portal do colaborador, até 22 dias úteis por ano.\n\nO recibo de vencimento está disponível todos os meses."), doc("Antigo", "As férias antigas.", false)];
    const r = procurar(docs, "Como peço ferias no portal?");
    expect(r[0].documento).toBe("Férias");
    expect(r[0].texto).toContain("portal do colaborador");
    expect(procurar(docs, "zzz").length).toBe(0);
    expect(procurar(docs, "antigas").length).toBe(0);
  });
  it("conta só os caracteres dos documentos ativos", () => {
    expect(caracteresAtivos([doc("a", "12345"), doc("b", "123", false)])).toBe(5);
  });
  it("monta as instruções com o tom, o tamanho, os limites e a memória", () => {
    const i = instrucoesFinais({ ...CONTROLOS_DE_ORIGEM, tom: "formal", tamanho: "curta", soMemoria: true, temasProibidos: "política\nsalários", instrucoes: "Nunca prometas prazos." }, [doc("Manual", "texto")]);
    expect(i).toContain("formal");
    expect(i).toContain("curtas");
    expect(i).toContain("Nunca prometas prazos.");
    expect(i).toContain("política; salários");
    expect(i).toContain("só com o que está na memória");
    expect(i).toContain("Manual");
  });
});
