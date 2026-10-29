import { beforeEach, describe, expect, it, vi } from "vitest";
import { coresDoAnel, definirCorDoAnel, lerCorDoAnel } from "./ia-aparencia";

// o vitest corre em node: um `window` mínimo, com armazenamento e eventos
function janelaDeMentira() {
  const dados = new Map<string, string>();
  const localStorage = { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => void dados.set(k, v), removeItem: (k: string) => void dados.delete(k), clear: () => dados.clear() };
  return { localStorage, dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
}

describe("a cor do anel de contexto", () => {
  beforeEach(() => {
    vi.stubGlobal("window", janelaDeMentira());
  });
  it("sem escolha, o anel usa as cores do aviso", () => {
    expect(lerCorDoAnel()).toBeNull();
  });
  it("guarda uma cor de seis dígitos em minúsculas e volta às cores do aviso com null", () => {
    definirCorDoAnel("#7C3AED");
    expect(lerCorDoAnel()).toBe("#7c3aed");
    definirCorDoAnel(null);
    expect(lerCorDoAnel()).toBeNull();
  });
  it("não guarda o que não é uma cor", () => {
    definirCorDoAnel("#7c3aed");
    definirCorDoAnel("azul");
    expect(lerCorDoAnel()).toBeNull();
    window.localStorage.setItem("painel.ia.corDoAnel", "vermelho");
    expect(lerCorDoAnel()).toBeNull();
  });
  it("o anel desenha-se com o arco, o fio e o fundo da cor", () => {
    const c = coresDoAnel("#7c3aed");
    expect(c.arco).toBe("#7c3aed");
    expect(c.fio).toContain("#7c3aed 28%");
    expect(c.fundo).toContain("#7c3aed 16%");
  });
});
