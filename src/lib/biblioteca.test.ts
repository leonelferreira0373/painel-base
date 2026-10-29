// Testes das funções puras da biblioteca de ficheiros: tamanhos, nomes únicos, pastas que se mexem com o que têm dentro e migalhas.
import { describe, expect, it } from "vitest";
import { acompanharPasta, daPasta, formatarTamanho, migalhas, nomeUnico, nomeValido, todasAsPastas, type ItemDaBiblioteca } from "./biblioteca";

const item = (nome: string, pasta: string, tipo = "text/plain"): ItemDaBiblioteca => ({ id: `${pasta}/${nome}`, nome, tipo, tamanho: 10, criado: "2026-10-29T00:00:00Z", pasta });

describe("biblioteca", () => {
  it("formata tamanhos", () => {
    expect(formatarTamanho(12)).toBe("12 B");
    expect(formatarTamanho(2048)).toBe("2 KB");
    expect(formatarTamanho(5 * 1024 * 1024)).toBe("5 MB");
  });
  it("dá um nome que ainda não existe", () => {
    const itens = [item("foto.png", ""), item("foto (2).png", "")];
    expect(nomeUnico(itens, "", "foto.png")).toBe("foto (3).png");
    expect(nomeUnico(itens, "outra", "foto.png")).toBe("foto.png");
    // ao renomear, o próprio item não conta: o nome dele continua livre
    expect(nomeUnico(itens, "", "foto.png", itens[0].id)).toBe("foto.png");
  });
  it("uma pasta leva consigo tudo o que tem dentro", () => {
    const itens = [item("a.txt", "Faturas"), item("b.txt", "Faturas/2026"), item("c.txt", "Outra")];
    const mudados = acompanharPasta(itens, "Faturas", "Contas/Faturas");
    expect(mudados.map((i) => i.pasta)).toEqual(["Contas/Faturas", "Contas/Faturas/2026"]);
  });
  it("lista as pastas primeiro e por nome", () => {
    const itens = [item("z.txt", ""), item("Docs", "", "pasta"), item("a.txt", "")];
    expect(daPasta(itens, "").map((i) => i.nome)).toEqual(["Docs", "a.txt", "z.txt"]);
    expect(todasAsPastas([item("Docs", "", "pasta"), item("2026", "Docs", "pasta")])).toEqual(["", "Docs", "Docs/2026"]);
  });
  it("migalhas e nomes", () => {
    expect(migalhas("Faturas/2026")).toEqual([
      { nome: "Faturas", caminho: "Faturas" },
      { nome: "2026", caminho: "Faturas/2026" },
    ]);
    expect(migalhas("")).toEqual([]);
    expect(nomeValido("Relatório 2026")).toBe(true);
    expect(nomeValido("a/b")).toBe(false);
    expect(nomeValido("  ")).toBe(false);
  });
});
