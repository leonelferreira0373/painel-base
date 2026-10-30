// Testes dos estilos da tabela do blog: o de partida, a passagem de um ao seguinte e o que acontece com um valor que não existe.
import { describe, expect, it } from "vitest";
import { ESTILOS_DE_TABELA, estiloDeTabela, proximoEstiloDeTabela, rotuloDoEstiloDeTabela } from "./blog-tabela";

describe("estilos da tabela do blog", () => {
  it("um valor que não existe fica com o estilo de partida", () => {
    expect(estiloDeTabela(undefined)).toBe("grelha");
    expect(estiloDeTabela("xpto")).toBe("grelha");
    expect(estiloDeTabela("listrada")).toBe("listrada");
  });
  it("passa de um estilo ao seguinte e do último volta ao primeiro", () => {
    expect(proximoEstiloDeTabela("grelha")).toBe("linhas");
    expect(proximoEstiloDeTabela(ESTILOS_DE_TABELA[ESTILOS_DE_TABELA.length - 1].id)).toBe("grelha");
    expect(proximoEstiloDeTabela(null)).toBe("linhas");
  });
  it("dá o nome que se vê", () => {
    expect(rotuloDoEstiloDeTabela("destaque")).toBe("Cabeçalho escuro");
    expect(rotuloDoEstiloDeTabela("xpto")).toBe("Grelha");
  });
});

describe("opções da tabela (cores e bordas)", () => {
  it("escreve e lê as mesmas opções", async () => {
    const { escreverOpcoesDaTabela, lerOpcoesDaTabela } = await import("./blog-tabela");
    const o = { corBorda: "#DC2626", larguraBorda: 2, traco: "dashed" as const, fundoCabecalho: "#112233", corCabecalho: "#FFFFFF" };
    const texto = escreverOpcoesDaTabela(o);
    expect(texto).not.toContain('"');
    expect(lerOpcoesDaTabela(texto)).toEqual({ ...o, corBorda: "#dc2626", corCabecalho: "#ffffff" });
    expect(escreverOpcoesDaTabela({})).toBe("");
  });
  it("o que não serve fica de fora", async () => {
    const { lerOpcoesDaTabela } = await import("./blog-tabela");
    expect(lerOpcoesDaTabela("corBorda:red;larguraBorda:99;traco:laser;fundoCabecalho:%23abcdef;lixo")).toEqual({ fundoCabecalho: "#abcdef" });
    expect(lerOpcoesDaTabela("larguraBorda:%E0%A4%A")).toEqual({});
  });
  it("as variáveis de CSS só levam o que foi escolhido (e uma largura de 0 tira as linhas)", async () => {
    const { estiloDasOpcoesDaTabela } = await import("./blog-tabela");
    expect(estiloDasOpcoesDaTabela({})).toBe("");
    expect(estiloDasOpcoesDaTabela({ corBorda: "#dc2626", larguraBorda: 0, traco: "dotted" })).toBe("--t-linha:#dc2626;--t-larg:0px;--t-traco:dotted");
    expect(estiloDasOpcoesDaTabela({ larguraBorda: 50 })).toBe("--t-larg:8px");
  });
  it("o alinhamento vertical que não existe não vale", async () => {
    const { alinhamentoVerticalValido } = await import("./blog-tabela");
    expect(alinhamentoVerticalValido("middle")).toBe("middle");
    expect(alinhamentoVerticalValido("centro")).toBeNull();
  });
});
