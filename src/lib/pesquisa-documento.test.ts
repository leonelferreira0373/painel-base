import { describe, expect, it } from "vitest";
import { extrairJson, lerDocumento, paraHtml, paraMarkdown, paraTextoSimples, repararJson, tabelasDoDocumento } from "./pesquisa-documento";

const bom = {
  titulo: "Mercado de transporte offshore",
  resumo: "O mercado cresce [1].",
  confianca: "media",
  limitacoes: ["Sem dados de 2026."],
  blocos: [
    { tipo: "titulo", texto: "Visão geral" },
    { tipo: "paragrafo", texto: "O «Brent» subiu 4 % [1] e **isso** pesa." },
    { tipo: "lista", itens: ["um", "dois"], ordenada: true },
    { tipo: "tabela", colunas: ["Ano", "Valor"], linhas: [[2025, "10 | 20"], [2026, 12]], legenda: "Valores em milhões" },
    { tipo: "metricas", itens: [{ rotulo: "Crescimento", valor: "4 %" }] },
    { tipo: "destaque", variante: "aviso", texto: "Cuidado." },
    { tipo: "grafico", grafico: "barras", titulo: "Receita", categorias: ["A", "B"], series: [{ nome: "2026", valores: [1, 2] }] },
    { tipo: "passos", itens: [{ titulo: "Fazer", texto: "isto" }] },
    { tipo: "pares", itens: [{ chave: "País", valor: "Angola" }] },
    { tipo: "citacao", texto: "Palavras", fonte: 1 },
  ],
  fontes: [{ n: 1, titulo: "Fonte um", url: "https://exemplo.com/a" }, { n: 2, titulo: "Má", url: "javascript:alert(1)" }],
};

describe("lerDocumento", () => {
  it("aceita um documento certo, dentro de ``` ou rodeado de frases", () => {
    const { doc, avisos } = lerDocumento(`Aqui está:\n\`\`\`json\n${JSON.stringify(bom)}\n\`\`\``);
    expect(avisos).toEqual([]);
    expect(doc.blocos).toHaveLength(10);
    expect(doc.confianca).toBe("media");
    expect(doc.fontes).toEqual([{ n: 1, titulo: "Fonte um", url: "https://exemplo.com/a" }]);
  });
  it("deixa de fora só o bloco que não cumpre a forma", () => {
    const { doc, avisos } = lerDocumento(JSON.stringify({ ...bom, blocos: [bom.blocos[1], { tipo: "tabela", colunas: [] }, { tipo: "desconhecido" }, bom.blocos[2]] }));
    expect(doc.blocos.map((b) => b.tipo)).toEqual(["paragrafo", "lista"]);
    expect(avisos).toHaveLength(2);
  });
  it("arranja um JSON cortado a meio", () => {
    const cortado = JSON.stringify(bom).slice(0, 700);
    const { doc, avisos } = lerDocumento(cortado);
    expect(doc.titulo).toBe("Mercado de transporte offshore");
    expect(doc.blocos.length).toBeGreaterThan(1);
    expect(avisos[0]).toMatch(/arranjado/);
  });
  it("sem JSON, o texto vira um parágrafo", () => {
    const { doc, avisos } = lerDocumento("Não consegui estruturar isto.", "Minha análise");
    expect(doc.titulo).toBe("Minha análise");
    expect(doc.blocos).toEqual([{ tipo: "paragrafo", texto: "Não consegui estruturar isto." }]);
    expect(avisos[0]).toMatch(/texto como veio/);
  });
});

describe("repararJson", () => {
  it("fecha aspas e chavetas", () => {
    expect(JSON.parse(repararJson('{"a": [1, 2, {"b": "texto abert'))).toEqual({ a: [1, 2, { b: "texto abert" }] });
  });
  it("extrairJson começa na primeira chaveta", () => {
    expect(extrairJson("ola {\"a\":1} fim")).toBe('{"a":1} fim');
    expect(extrairJson("sem json")).toBeNull();
  });
});

describe("conversões", () => {
  const { doc } = lerDocumento(JSON.stringify(bom));
  it("Markdown tem título, resumo, tabela, fontes e protege as barras da tabela", () => {
    const md = paraMarkdown(doc);
    expect(md).toContain("# Mercado de transporte offshore");
    expect(md).toContain("> O mercado cresce [1].");
    expect(md).toContain("O **Brent** subiu 4 % [1] e **isso** pesa.");
    expect(md).toContain("| Ano | Valor |");
    expect(md).toContain("10 \\| 20");
    expect(md).toContain("1. [Fonte um](https://exemplo.com/a)");
    expect(md).toContain("## Limitações");
  });
  it("HTML protege o texto e liga as citações às fontes", () => {
    const h = paraHtml({ ...doc, resumo: "<script>x</script>" });
    expect(h).not.toContain("<script>x");
    expect(h).toContain('<sup><a href="#fonte-1">[1]</a></sup>');
    expect(h).toContain('<mark>Brent</mark>');
    expect(h).toContain('<li id="fonte-1" value="1">');
  });
  it("texto simples não tem marcas", () => {
    const t = paraTextoSimples(doc);
    expect(t).not.toMatch(/\*\*|^#/m);
    expect(t).toContain("Fonte um (https://exemplo.com/a)");
  });
  it("as tabelas e os gráficos saem como dados", () => {
    const t = tabelasDoDocumento(doc);
    expect(t.map((x) => x.titulo)).toEqual(["Valores em milhões", "Receita"]);
    expect(t[1]).toMatchObject({ colunas: ["", "2026"], linhas: [["A", 1], ["B", 2]] });
  });
});
