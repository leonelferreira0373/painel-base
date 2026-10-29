import { describe, expect, it } from "vitest";
import { ferramentasDaPesquisa, podarMensagens } from "./pesquisa-motor";

describe("ferramentas da pesquisa", () => {
  it("com internet há procurar, ler e concluir; sem internet só concluir; todas pedem o pensamento", () => {
    const com = ferramentasDaPesquisa(true).map((f) => f.function.name);
    expect(com).toEqual(["buscar_web", "ler_pagina", "concluir"]);
    expect(ferramentasDaPesquisa(false).map((f) => f.function.name)).toEqual(["concluir"]);
    for (const f of ferramentasDaPesquisa(true)) expect(f.function.parameters.required).toContain("pensamento");
  });
});

describe("podarMensagens", () => {
  const longo = "x".repeat(900);
  const msgs = [
    { role: "system" as const, content: "s" },
    { role: "user" as const, content: "u" },
    { role: "assistant" as const, content: "", tool_calls: [{}] },
    { role: "tool" as const, tool_call_id: "1", content: longo },
    { role: "assistant" as const, content: "", tool_calls: [{}] },
    { role: "tool" as const, tool_call_id: "2", content: longo },
    { role: "assistant" as const, content: "", tool_calls: [{}] },
    { role: "tool" as const, tool_call_id: "3", content: longo },
  ];
  it("compacta o que já foi lido e deixa a última volta inteira", () => {
    const p = podarMensagens(msgs);
    expect(p[3].content).toContain("já lido");
    expect(p[3].content.length).toBeLessThan(200);
    expect(p[7].content).toBe(longo);
    expect(p.length).toBe(msgs.length);
    expect(p[3].tool_call_id).toBe("1");
  });
  it("não mexe no que é curto nem nas mensagens normais", () => {
    expect(podarMensagens([{ role: "tool", tool_call_id: "1", content: "curto" }, { role: "tool", tool_call_id: "2", content: "curto" }, { role: "tool", tool_call_id: "3", content: "curto" }])[0].content).toBe("curto");
    expect(podarMensagens(msgs)[0]).toEqual(msgs[0]);
  });
});
