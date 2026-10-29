import { describe, expect, it } from "vitest";
import { erroDaFaq, faqAtivas, faqComoDocumentos, faqNova, LIMITE_DA_PERGUNTA, moverFaq, perguntasProntas, type Faq } from "./faq";
import { CONTROLOS_DE_ORIGEM, instrucoesFinais, procurar } from "./ia-controlos";

const f = (id: string, pergunta: string, resposta: string, ativa = true, sugerida = true): Faq => ({ id, pergunta, resposta, ativa, sugerida, criado: "2026-01-01", atualizado: "2026-01-01" });

describe("erroDaFaq", () => {
  it("pede a pergunta e depois a resposta", () => {
    expect(erroDaFaq({ id: "1", pergunta: "  ", resposta: "x" })).toBe("Escreva a pergunta.");
    expect(erroDaFaq({ id: "1", pergunta: "Como?", resposta: " " })).toBe("Escreva a resposta.");
    expect(erroDaFaq({ id: "1", pergunta: "Como?", resposta: "Assim." })).toBeNull();
  });
  it("recusa textos acima do limite", () => {
    expect(erroDaFaq({ id: "1", pergunta: "a".repeat(LIMITE_DA_PERGUNTA + 1), resposta: "x" })).toMatch(/passa os 200/);
    expect(erroDaFaq({ id: "1", pergunta: "Como?", resposta: "a".repeat(2001) })).toMatch(/passa os 2000/);
  });
  it("recusa duas perguntas iguais, sem olhar a acentos, maiúsculas nem pontuação", () => {
    const outras = [f("a", "Qual é o horário?", "Das 9h às 18h.")];
    expect(erroDaFaq({ id: "b", pergunta: "qual e o horario", resposta: "x" }, outras)).toBe("Já existe uma pergunta igual.");
    expect(erroDaFaq({ id: "a", pergunta: "Qual é o horário?", resposta: "x" }, outras)).toBeNull();
  });
});

describe("lista", () => {
  const lista = [f("1", "A?", "a"), f("2", "B?", "b", false), f("3", "C?", ""), f("4", "D?", "d")];
  it("só as publicadas e completas contam", () => {
    expect(faqAtivas(lista).map((x) => x.id)).toEqual(["1", "4"]);
    expect(perguntasProntas(lista)).toEqual([
      { pergunta: "A?", resposta: "a" },
      { pergunta: "D?", resposta: "d" },
    ]);
  });
  it("mover troca de sítio e não passa das pontas", () => {
    expect(moverFaq(lista, "4", -1).map((x) => x.id)).toEqual(["1", "2", "4", "3"]);
    expect(moverFaq(lista, "1", 1).map((x) => x.id)).toEqual(["2", "1", "3", "4"]);
    expect(moverFaq(lista, "1", -1)).toBe(lista);
    expect(moverFaq(lista, "4", 1)).toBe(lista);
    expect(moverFaq(lista, "zzz", 1)).toBe(lista);
  });
  it("as perguntas prontas do chat são as publicadas que se sugerem; as outras só respondem", () => {
    const l = [f("1", "A?", "a"), f("2", "B?", "b", true, false), f("3", "C?", "c", false)];
    expect(perguntasProntas(l).map((p) => p.pergunta)).toEqual(["A?"]);
    expect(faqAtivas(l).map((x) => x.id)).toEqual(["1", "2"]);
  });
  it("uma pergunta nova nasce vazia, publicada e sugerida", () => {
    expect(faqNova("x", "2026-01-01")).toMatchObject({ id: "x", pergunta: "", resposta: "", ativa: true, sugerida: true });
  });
});

describe("o assistente usa a FAQ", () => {
  const lista = [f("1", "Qual é o horário de atendimento?", "Das 9h às 18h."), f("2", "Como pago?", "Por transferência.", false)];
  it("a pergunta e a resposta são uma só passagem na pesquisa", () => {
    const r = procurar(faqComoDocumentos(lista), "horario de atendimento");
    expect(r).toHaveLength(1);
    expect(r[0].documento).toBe("FAQ: Qual é o horário de atendimento?");
    expect(r[0].texto).toContain("Das 9h às 18h.");
  });
  it("as despublicadas ficam de fora", () => {
    expect(procurar(faqComoDocumentos(lista), "pago transferencia")).toHaveLength(0);
  });
  it("as instruções contam as perguntas e a memória deixa de estar vazia", () => {
    const i = instrucoesFinais({ ...CONTROLOS_DE_ORIGEM, soMemoria: true }, [], 3);
    expect(i).toMatch(/3 perguntas frequentes/);
    expect(i).not.toMatch(/memória está vazia/);
    expect(instrucoesFinais({ ...CONTROLOS_DE_ORIGEM, soMemoria: true }, [])).toMatch(/memória está vazia/);
  });
});
