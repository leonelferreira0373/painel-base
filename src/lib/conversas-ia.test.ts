import { describe, expect, it } from "vitest";
import { juntarItem, limitarConversas, MAXIMO_DE_CONVERSAS, MAXIMO_DE_ITENS, MAXIMO_DO_TEXTO, type ConversaGuardada } from "./conversas-ia";

const t0 = new Date("2026-10-29T10:00:00.000Z");
const t1 = new Date("2026-10-29T10:00:05.000Z");

describe("conversas com a IA", () => {
  it("cria a conversa no primeiro item e acrescenta os seguintes pela ordem em que aconteceram", () => {
    const a = juntarItem(undefined, "c1", "pessoa", "Como bloqueio um IP?", t0);
    expect(a).toMatchObject({ id: "c1", inicio: t0.toISOString(), ultima: t0.toISOString() });
    const b = juntarItem(a, "c1", "ia", "Abra a página do Firewall.", t1);
    expect(b.itens.map((i) => i.papel)).toEqual(["pessoa", "ia"]);
    expect(b.inicio).toBe(t0.toISOString());
    expect(b.ultima).toBe(t1.toISOString());
    expect(a.itens).toHaveLength(1);
  });
  it("corta os textos enormes e as conversas com itens a mais", () => {
    const longo = juntarItem(undefined, "c1", "ia", "x".repeat(MAXIMO_DO_TEXTO + 500), t0);
    expect(longo.itens[0].texto).toHaveLength(MAXIMO_DO_TEXTO);
    let c: ConversaGuardada | undefined;
    for (let i = 0; i < MAXIMO_DE_ITENS + 20; i++) c = juntarItem(c, "c1", "passo", `passo ${i}`, t0);
    expect(c!.itens).toHaveLength(MAXIMO_DE_ITENS);
    expect(c!.itens.at(-1)!.texto).toBe(`passo ${MAXIMO_DE_ITENS + 19}`);
  });
  it("guarda só as conversas mais recentes, mas nunca perde as que se pede para manter", () => {
    const lista: ConversaGuardada[] = Array.from({ length: MAXIMO_DE_CONVERSAS + 5 }, (_, i) => ({ id: `c${i}`, inicio: t0.toISOString(), ultima: new Date(t0.getTime() + i * 1000).toISOString(), itens: [] }));
    const curta = limitarConversas(lista);
    expect(curta).toHaveLength(MAXIMO_DE_CONVERSAS);
    expect(curta[0].id).toBe(`c${MAXIMO_DE_CONVERSAS + 4}`);
    expect(curta.some((c) => c.id === "c0")).toBe(false);
    expect(limitarConversas(lista, new Set(["c0"])).some((c) => c.id === "c0")).toBe(true);
  });
});
