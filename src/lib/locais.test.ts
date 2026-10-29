// Testes dos locais das imagens: que imagens aparecem num local e ligar ou desligar uma imagem a um local.
import { describe, expect, it } from "vitest";
import { LOCAIS_DE_IMAGEM } from "@/dados/locais";
import type { ItemDaBiblioteca } from "./biblioteca";
import { comLocal, contagemPorLocal, imagensDoLocal, localPorId, locaisDe, semRepetidas, tornarPrincipal } from "./locais";

const img = (id: string, criado: string, locais?: string[], tipo = "image/png"): ItemDaBiblioteca => ({ id, nome: `${id}.png`, tipo, tamanho: 1, criado, pasta: "Galeria", locais });

describe("locais das imagens", () => {
  it("o registo tem ids únicos e rótulos", () => {
    expect(new Set(LOCAIS_DE_IMAGEM.map((l) => l.id)).size).toBe(LOCAIS_DE_IMAGEM.length);
    for (const l of LOCAIS_DE_IMAGEM) {
      expect(l.rotulo.length).toBeGreaterThan(2);
      expect(l.grupo.length).toBeGreaterThan(1);
    }
    expect(localPorId("produtos")?.grupo).toBe("Produtos");
    expect(localPorId("nao-existe")).toBeUndefined();
  });
  it("um local que já não existe deixa de contar", () => {
    expect(locaisDe(img("a", "2026-01-01", ["produtos", "antigo"]))).toEqual(["produtos"]);
    expect(locaisDe(img("a", "2026-01-01"))).toEqual([]);
  });
  it("as imagens de um local vêm das mais recentes para as mais antigas e só as imagens contam", () => {
    const itens = [img("a", "2026-01-01", ["produtos"]), img("b", "2026-03-01", ["produtos"]), img("c", "2026-02-01", ["blog-capa"]), img("d", "2026-04-01", ["produtos"], "application/pdf")];
    expect(imagensDoLocal(itens, "produtos").map((i) => i.id)).toEqual(["b", "a"]);
    expect(contagemPorLocal(itens)).toEqual({ "blog-capa": 1, "blog-corpo": 0, produtos: 2 });
  });
  it("ligar e desligar um local não repete nem deixa uma lista vazia", () => {
    const i = img("a", "2026-01-01", ["produtos"]);
    expect(comLocal(i, "blog-capa", true).locais).toEqual(["produtos", "blog-capa"]);
    expect(comLocal(comLocal(i, "blog-capa", true), "blog-capa", true).locais).toEqual(["produtos", "blog-capa"]);
    expect(comLocal(i, "produtos", false).locais).toBeUndefined();
    expect(i.locais).toEqual(["produtos"]);
  });
  it("a imagem principal vai para a frente e as outras mantêm a ordem", () => {
    expect(tornarPrincipal(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
    expect(tornarPrincipal(["a", "b"], "a")).toEqual(["a", "b"]);
    expect(tornarPrincipal(["a", "b"], "z")).toEqual(["a", "b"]);
    expect(semRepetidas(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });
});
