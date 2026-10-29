// Testes dos módulos do painel: pacotes, exceções, o que nunca se desliga e a função de cada pessoa sem o que está desligado.
import { describe, expect, it } from "vitest";
import { AREAS } from "@/dados/estrutura";
import { PACOTES } from "@/dados/pacotes";
import { FUNCOES, funcaoPorId, podeEditar, podeVer } from "@/dados/rbac";
import { alternar, aplicarModulos, areaLigada, CONFIG_DE_ORIGEM, contagem, escolherPacote, moduloLigado, pacoteEfetivo, type ConfigDoPainel } from "./modulos";

const com = (pacote: string, ligados: Record<string, boolean> = {}): ConfigDoPainel => ({ pacote, ligados });

describe("pacotes", () => {
  it("todos os pacotes têm id único e ligam o início e o painel", () => {
    expect(new Set(PACOTES.map((p) => p.id)).size).toBe(PACOTES.length);
    for (const p of PACOTES) expect(p.areas, p.id).toEqual(expect.arrayContaining(["inicio", "painel"]));
  });
  it("cada pacote liga só áreas que existem (ou ids de outros painéis, que se ignoram)", () => {
    const todas = new Set(AREAS.map((a) => a.id));
    for (const p of PACOTES) {
      const algumaExiste = p.areas.filter((a) => todas.has(a)).length;
      expect(algumaExiste, p.id).toBeGreaterThan(3);
    }
  });
  it("o pacote de hotel liga o hotel e desliga o táxi e a loja", () => {
    const c = com("hotel");
    expect(areaLigada(c, "hotel")).toBe(true);
    expect(areaLigada(c, "taxi")).toBe(false);
    expect(areaLigada(c, "loja")).toBe(false);
  });
  it("um pacote que não existe liga tudo (nunca deixa o painel vazio)", () => {
    expect(areaLigada(com("nao-existe"), "pagamentos")).toBe(true);
  });
});

describe("interruptores", () => {
  it("o início e o painel nunca se desligam", () => {
    const c = alternar(com("hotel"), "inicio", false);
    expect(areaLigada(c, "inicio")).toBe(true);
    expect(areaLigada(alternar(c, "painel", false), "painel")).toBe(true);
    expect(areaLigada({ pacote: "hotel", ligados: { inicio: false, painel: false } }, "painel")).toBe(true);
  });
  it("desligar os pagamentos é uma exceção ao pacote e volta a ser o pacote ao religar", () => {
    const c = alternar(com("loja"), "pagamentos", false);
    expect(areaLigada(c, "pagamentos")).toBe(false);
    expect(c.ligados).toEqual({ pagamentos: false });
    expect(pacoteEfetivo(c)).toBe("personalizado");
    const de = alternar(c, "pagamentos", true);
    expect(de.ligados).toEqual({});
    expect(pacoteEfetivo(de)).toBe("loja");
  });
  it("ligar uma área de outro negócio é uma exceção", () => {
    const c = alternar(com("hotel"), "taxi", true);
    expect(areaLigada(c, "taxi")).toBe(true);
    expect(c.ligados).toEqual({ taxi: true });
  });
  it("desligar uma área desliga os módulos dela, mesmo os que estavam ligados à mão", () => {
    const c = { pacote: "hotel", ligados: { "hotel/reservas": true, hotel: false } };
    expect(moduloLigado(c, "hotel", "reservas")).toBe(false);
  });
  it("desligar só um módulo deixa os outros da área", () => {
    const c = alternar(com("hotel"), "hotel/quartos", false);
    expect(moduloLigado(c, "hotel", "quartos")).toBe(false);
    expect(moduloLigado(c, "hotel", "reservas")).toBe(true);
  });
  it("mexer num interruptor tira a predefinição ativa", () => {
    expect(alternar({ pacote: "hotel", ligados: {}, predefinicao: "hotel" }, "marketing", false).predefinicao).toBeUndefined();
  });
  it("escolher um pacote tira todas as exceções", () => {
    const c = escolherPacote(alternar(com("loja"), "pagamentos", false), "taxi");
    expect(c).toEqual({ pacote: "taxi", ligados: {}, predefinicao: undefined });
  });
  it("conta as áreas e os módulos que ficam", () => {
    const todas = contagem(com("personalizado"));
    const menos = contagem(alternar(com("personalizado"), "pagamentos", false));
    expect(menos.areas).toBe(todas.areas - 1);
    expect(menos.modulos).toBeLessThan(todas.modulos);
  });
});

describe("a função de cada pessoa", () => {
  it("o administrador deixa de ver o que está desligado (menu, pesquisa e páginas usam podeVer)", () => {
    const f = aplicarModulos(funcaoPorId("administrador"), alternar(CONFIG_DE_ORIGEM, "pagamentos", false));
    expect(podeVer(f, "pagamentos")).toBe(false);
    expect(podeVer(f, "pagamentos", "metricas")).toBe(false);
    expect(podeVer(f, "dev")).toBe(true);
  });
  it("um módulo desligado fecha-se só ele", () => {
    const f = aplicarModulos(funcaoPorId("administrador"), alternar(CONFIG_DE_ORIGEM, "dev/firewall", false));
    expect(podeVer(f, "dev", "firewall")).toBe(false);
    expect(podeVer(f, "dev", "backups")).toBe(true);
    expect(podeEditar(f, "dev", "backups")).toBe(true);
  });
  it("não se perdem os módulos que a função já tinha fechados", () => {
    const original = FUNCOES.find((f) => (f.fechados ?? []).length > 0)!;
    const f = aplicarModulos(original, CONFIG_DE_ORIGEM);
    for (const modulo of original.fechados!) expect(f.fechados, modulo).toContain(modulo);
  });
  it("só o Master Admin tem o painel; os outros nunca o veem", () => {
    expect(podeEditar(funcaoPorId("master"), "painel", "modulos")).toBe(true);
    for (const f of FUNCOES.filter((x) => x.id !== "master")) expect(podeVer(aplicarModulos(f, CONFIG_DE_ORIGEM), "painel"), f.id).toBe(false);
  });
  it("não muda a função original", () => {
    const f = funcaoPorId("administrador");
    const antes = JSON.stringify(f);
    aplicarModulos(f, alternar(CONFIG_DE_ORIGEM, "dev", false));
    expect(JSON.stringify(f)).toBe(antes);
  });
});

describe("predefinições", () => {
  it("cada predefinição parte de um pacote que existe e só toca em áreas e módulos que existem (ou de outro painel)", async () => {
    const { PREDEFINICOES } = await import("@/dados/predefinicoes");
    const { pacotePorId } = await import("@/dados/pacotes");
    expect(new Set(PREDEFINICOES.map((p) => p.id)).size).toBe(PREDEFINICOES.length);
    for (const p of PREDEFINICOES) {
      expect(pacotePorId(p.pacote), p.id).toBeDefined();
      for (const chave of Object.keys(p.ligados ?? {})) {
        const [area, modulo] = chave.split("/");
        const a = AREAS.find((x) => x.id === area);
        // «vendas» só existe na base: uma chave de outro painel não faz mal
        if (a && modulo) expect(a.modulos.some((m) => m.id === modulo), chave).toBe(true);
      }
    }
  });
  it("aplicar uma predefinição dá o pacote, as exceções, a aparência e o nome", async () => {
    const { aplicarPredefinicao } = await import("./modulos");
    const { predefinicaoPorId } = await import("@/dados/predefinicoes");
    const c = aplicarPredefinicao(predefinicaoPorId("hotel")!);
    expect(c.pacote).toBe("hotel");
    expect(c.predefinicao).toBe("hotel");
    expect(c.aparencia?.claro?.acento).toBe("#9a6b2f");
    expect(areaLigada(c, "hotel")).toBe(true);
    expect(areaLigada(c, "taxi")).toBe(false);
  });
  it("«só o essencial» deixa a análise, os clientes, os pagamentos e a administração", async () => {
    const { aplicarPredefinicao } = await import("./modulos");
    const { predefinicaoPorId } = await import("@/dados/predefinicoes");
    const c = aplicarPredefinicao(predefinicaoPorId("essencial")!);
    for (const ligada of ["inicio", "analise", "clientes", "pagamentos", "admin", "painel"]) expect(areaLigada(c, ligada), ligada).toBe(true);
    for (const desligada of ["marketing", "dev", "hotel", "taxi", "conteudo"]) expect(areaLigada(c, desligada), desligada).toBe(false);
  });
  it("uma predefinição não deixa a aparência de outra", async () => {
    const { aplicarPredefinicao } = await import("./modulos");
    const { predefinicaoPorId } = await import("@/dados/predefinicoes");
    const { PREDEFINICOES } = await import("@/dados/predefinicoes");
    expect(aplicarPredefinicao(PREDEFINICOES[0]).aparencia).toBeUndefined();
  });
});
