import { beforeEach, describe, expect, it, vi } from "vitest";
import { aplicarCoresDoAssistente, CORES_DO_ASSISTENTE, coresDoAnel, coresDoAssistente, definirCorDoAnel, definirCorDoAssistente, lerCorDoAnel, lerCoresDoAssistente, reporCoresDoAssistente } from "./ia-aparencia";

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

describe("as cores do assistente", () => {
  beforeEach(() => {
    vi.stubGlobal("window", janelaDeMentira());
    vi.stubGlobal("document", { documentElement: { style: { setProperty: vi.fn(), removeProperty: vi.fn() } } });
  });
  it("de partida são leves e há uma para cada coisa", () => {
    expect(Object.keys(CORES_DO_ASSISTENTE)).toHaveLength(9);
    expect(CORES_DO_ASSISTENTE.ausente.padrao).toBe("#fcd34d");
    expect(coresDoAssistente({}).online).toBe(CORES_DO_ASSISTENTE.online.padrao);
    for (const c of Object.values(CORES_DO_ASSISTENTE)) expect(c.padrao).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("guarda uma cor, junta-a às de partida e volta atrás com null", () => {
    definirCorDoAssistente("ausente", "#F59E0B");
    expect(lerCoresDoAssistente()).toEqual({ ausente: "#f59e0b" });
    expect(coresDoAssistente(lerCoresDoAssistente()).ausente).toBe("#f59e0b");
    expect(coresDoAssistente(lerCoresDoAssistente()).online).toBe(CORES_DO_ASSISTENTE.online.padrao);
    definirCorDoAssistente("ausente", null);
    expect(lerCoresDoAssistente()).toEqual({});
  });
  it("não guarda o que não é uma cor e ignora o que está estragado", () => {
    definirCorDoAssistente("online", "verde");
    expect(lerCoresDoAssistente()).toEqual({});
    window.localStorage.setItem("painel.ia.cores", JSON.stringify({ online: "#abc123", ausente: "amarelo", desconhecida: "#ffffff" }));
    expect(lerCoresDoAssistente()).toEqual({ online: "#abc123" });
    window.localStorage.setItem("painel.ia.cores", "isto não é JSON");
    expect(lerCoresDoAssistente()).toEqual({});
  });
  it("pôr as cores no documento usa as variáveis de CSS e tira as que voltaram à partida", () => {
    aplicarCoresDoAssistente({ online: "#123456" });
    const estilo = document.documentElement.style as unknown as { setProperty: ReturnType<typeof vi.fn>; removeProperty: ReturnType<typeof vi.fn> };
    expect(estilo.setProperty).toHaveBeenCalledWith("--ia-online", "#123456");
    expect(estilo.removeProperty).toHaveBeenCalledWith("--ia-ausente");
  });
  it("repor todas limpa as cores e a cor única do anel", () => {
    definirCorDoAssistente("anelBom", "#112233");
    definirCorDoAnel("#445566");
    reporCoresDoAssistente();
    expect(lerCoresDoAssistente()).toEqual({});
    expect(lerCorDoAnel()).toBeNull();
  });
});
