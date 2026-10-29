import { describe, expect, it } from "vitest";
import { ateAoLimite, responderNoTeste } from "./ia-teste";
import type { DocumentoDeMemoria } from "./ia-controlos";

const doc = (nome: string, texto: string, origem: DocumentoDeMemoria["origem"] = "pdf"): DocumentoDeMemoria => ({ id: nome, nome, origem, tamanho: texto.length, criado: "2026-10-29T00:00:00.000Z", ativo: true, texto });
const memoria = [
  doc("FAQ: Como peço férias?", "Como peço férias?\n\nPeça no módulo de ausências, com pelo menos duas semanas de antecedência. A chefia aprova no painel.", "faq"),
  doc("Manual.pdf", "O horário de atendimento é das 9h às 18h, de segunda a sexta. Ao sábado só por marcação."),
];
const controlos = { soMemoria: true, tamanho: "media" as const, temasProibidos: "política\nsalários de outras pessoas" };

describe("o teste do assistente", () => {
  it("responde com a pergunta frequente, sem repetir a pergunta, e diz a fonte", () => {
    const r = responderNoTeste(controlos, memoria, "como peço as férias");
    expect(r.encontrou).toBe(true);
    expect(r.fonte).toBe("Pergunta frequente");
    expect(r.texto).toMatch(/^Peça no módulo de ausências/);
    expect(r.texto).not.toContain("Como peço férias?");
  });
  it("responde com a passagem do documento e o nome dele", () => {
    const r = responderNoTeste(controlos, memoria, "qual o horário de atendimento?");
    expect(r.fonte).toBe("Manual.pdf");
    expect(r.texto).toContain("9h às 18h");
  });
  it("sem nada na memória diz que não sabe (ou sugere as perguntas prontas)", () => {
    expect(responderNoTeste(controlos, memoria, "quanto custa um foguetão").texto).toBe("Não sei responder a isso.");
    expect(responderNoTeste({ ...controlos, soMemoria: false }, memoria, "quanto custa um foguetão").texto).toContain("perguntas prontas");
  });
  it("não trata dos temas proibidos", () => {
    const r = responderNoTeste(controlos, memoria, "o que acha da política?");
    expect(r.encontrou).toBe(false);
    expect(r.texto).toBe("Não posso ajudar com esse tema.");
  });
  it("respostas curtas ficam em poucas frases inteiras", () => {
    const r = responderNoTeste({ ...controlos, tamanho: "curta" }, [doc("Longo.pdf", "Um. Dois. Três. Quatro. Cinco. horário")], "horário");
    expect(r.texto).toBe("Um. Dois. Três.");
  });
  it("corta em frases inteiras", () => {
    expect(ateAoLimite("Primeira frase. Segunda frase muito comprida que não cabe.", 20)).toBe("Primeira frase.");
  });
});
