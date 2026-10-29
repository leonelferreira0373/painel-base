import { describe, expect, it } from "vitest";
import { exportarFonte, gerarFormato, paraSvg, paraTxt } from "./gerar";
import { estaLigado, formatosDaFonte, formatosOferecidos, nomeDoFicheiro, type FonteDeExportacao } from "./formatos";

const dados = { nome: "pedidos", titulo: "Pedidos <hoje> & ontem", colunas: ["Nome", "Valor"], linhas: [["Ana", 10], ["Rui & Cia", 2500]] as (string | number)[][] };
const fonte: FonteDeExportacao = { nome: "Pedidos de hoje", titulo: dados.titulo, dados };
const texto = async (b: Blob) => new TextDecoder().decode(await b.arrayBuffer());

describe("formatos", () => {
  it("uma tabela sabe tudo menos BIND e ZIP; uma zona DNS acrescenta o BIND", () => {
    expect(formatosDaFonte(fonte)).toEqual(["pdf", "csv", "xlsx", "docx", "txt", "json", "png", "jpg", "svg"]);
    expect(formatosDaFonte({ ...fonte, bind: { zona: "exemplo.com", registos: [] } })).toContain("bind");
  });
  it("só oferece o que está ligado nas definições, e o ZIP quando há mais de um", () => {
    const o = formatosOferecidos(fonte, { pdf: false, xlsx: false });
    expect(o.formatos).not.toContain("pdf");
    expect(o.desligados).toEqual(["pdf", "xlsx"]);
    expect(o.zip).toBe(true);
    expect(formatosOferecidos(fonte, { zip: false }).zip).toBe(false);
    expect(formatosOferecidos(fonte, Object.fromEntries(formatosDaFonte(fonte).slice(1).map((f) => [f, false]))).zip).toBe(false);
  });
  it("sem nada escrito, tudo está ligado", () => {
    expect(estaLigado(undefined, "pdf")).toBe(true);
    expect(estaLigado({ pdf: false }, "pdf")).toBe(false);
  });
  it("o nome do ficheiro não tem acentos nem símbolos", () => {
    expect(nomeDoFicheiro("Pedidos de transporte (hoje)", "xlsx")).toBe("Pedidos-de-transporte-hoje.xlsx");
    expect(nomeDoFicheiro("zona", "bind")).toBe("zona.zone");
  });
});

describe("gerar", () => {
  it("TXT alinha as colunas", () => {
    const t = paraTxt(dados).split("\r\n");
    expect(t[3]).toBe("Nome       Valor");
    expect(t[5]).toBe("Ana        10");
  });
  it("SVG protege os símbolos do XML", () => {
    const s = paraSvg(dados);
    expect(s).toContain("Pedidos &lt;hoje&gt; &amp; ontem");
    expect(s).toContain("Rui &amp; Cia");
    expect(s.startsWith("<?xml")).toBe(true);
  });
  it("CSV e JSON vêm da tabela", async () => {
    expect(await texto(await gerarFormato(fonte, "csv"))).toContain("Rui & Cia");
    expect(JSON.parse(await texto(await gerarFormato(fonte, "json")))).toEqual([{ Nome: "Ana", Valor: 10 }, { Nome: "Rui & Cia", Valor: 2500 }]);
  });
  it("Word abre-se com o texto da tabela", async () => {
    const mammoth = await import("mammoth");
    const b = await gerarFormato(fonte, "docx");
    const r = await mammoth.extractRawText({ buffer: Buffer.from(await b.arrayBuffer()) });
    expect(r.value).toContain("Pedidos <hoje> & ontem");
    expect(r.value).toContain("Rui & Cia");
    expect(r.value).toContain("2500");
  });
  it("Excel lê-se de volta", async () => {
    const XLSX = await import("xlsx");
    const b = await gerarFormato(fonte, "xlsx");
    const livro = XLSX.read(await b.arrayBuffer(), { type: "array" });
    expect(XLSX.utils.sheet_to_json(livro.Sheets[livro.SheetNames[0]], { header: 1 })).toEqual([["Nome", "Valor"], ["Ana", 10], ["Rui & Cia", 2500]]);
  });
  it("BIND só com registos DNS", async () => {
    await expect(gerarFormato(fonte, "bind")).rejects.toThrow(/DNS/);
    const f = { ...fonte, bind: { zona: "exemplo.com", registos: [{ id: "1", tipo: "A" as const, nome: "@", valor: "203.0.113.1", ttl: 300 }] } };
    expect(await texto(await gerarFormato(f, "bind"))).toContain("$ORIGIN exemplo.com.");
  });
  it("a fonte pode gerar o seu próprio formato", async () => {
    const f = { ...fonte, gerar: { pdf: async () => new Blob(["%PDF-meu"]) } };
    expect(await texto(await gerarFormato(f, "pdf"))).toBe("%PDF-meu");
  });
  it("ZIP junta os ficheiros escolhidos", async () => {
    const { default: JSZip } = await import("jszip");
    const [z] = await exportarFonte(fonte, ["csv", "txt", "json"], true);
    expect(z.nome).toBe("Pedidos-de-hoje.zip");
    const dentro = await JSZip.loadAsync(await z.blob.arrayBuffer());
    expect(Object.keys(dentro.files).sort()).toEqual(["Pedidos-de-hoje.csv", "Pedidos-de-hoje.json", "Pedidos-de-hoje.txt"]);
  });
  it("sem ZIP, ou com um só formato, vêm ficheiros separados", async () => {
    expect((await exportarFonte(fonte, ["csv", "txt"], false)).map((x) => x.nome)).toEqual(["Pedidos-de-hoje.csv", "Pedidos-de-hoje.txt"]);
    expect((await exportarFonte(fonte, ["csv"], true)).map((x) => x.nome)).toEqual(["Pedidos-de-hoje.csv"]);
  });
});

describe("documento rico", () => {
  const doc = {
    titulo: "Mercado offshore",
    resumo: "Cresce [1].",
    blocos: [
      { tipo: "paragrafo" as const, texto: "O «Brent» subiu **4 %** [1]." },
      { tipo: "tabela" as const, colunas: ["Ano", "Valor"], linhas: [[2025, 10], [2026, 12]], legenda: "Milhões" },
      { tipo: "grafico" as const, grafico: "barras" as const, titulo: "Receita", categorias: ["A", "B"], series: [{ nome: "2026", valores: [1, 2] }] },
    ],
    fontes: [{ n: 1, titulo: "Fonte um", url: "https://exemplo.com/a" }],
    limitacoes: ["Sem dados de 2026."],
  };
  const f: FonteDeExportacao = { nome: "analise", titulo: doc.titulo, documento: doc };
  it("oferece os formatos de documento e, com tabelas, o CSV e o Excel", () => {
    expect(formatosDaFonte(f)).toEqual(["pdf", "csv", "xlsx", "docx", "txt", "md", "html", "json"]);
    expect(formatosDaFonte({ ...f, documento: { ...doc, blocos: [doc.blocos[0]] } })).toEqual(["pdf", "docx", "txt", "md", "html", "json"]);
  });
  it("Markdown, HTML, texto e JSON saem do documento", async () => {
    expect(await texto(await gerarFormato(f, "md"))).toContain("# Mercado offshore");
    expect(await texto(await gerarFormato(f, "html"))).toContain('<sup><a href="#fonte-1">[1]</a></sup>');
    expect(await texto(await gerarFormato(f, "txt"))).toContain("Fonte um (https://exemplo.com/a)");
    expect(JSON.parse(await texto(await gerarFormato(f, "json"))).titulo).toBe("Mercado offshore");
  });
  it("Word abre-se com o texto, a tabela e as fontes", async () => {
    const mammoth = await import("mammoth");
    const b = await gerarFormato(f, "docx");
    const r = await mammoth.extractRawText({ buffer: Buffer.from(await b.arrayBuffer()) });
    expect(r.value).toContain("Mercado offshore");
    expect(r.value).toContain("O Brent subiu 4 % [1].");
    expect(r.value).toContain("Receita");
    expect(r.value).toContain("Fonte um — https://exemplo.com/a");
  });
  it("Excel tem uma folha por tabela e por gráfico", async () => {
    const XLSX = await import("xlsx");
    const b = await gerarFormato(f, "xlsx");
    const livro = XLSX.read(await b.arrayBuffer(), { type: "array" });
    expect(livro.SheetNames).toEqual(["Milhões", "Receita 2"]);
  });
  it("PDF gera um ficheiro", async () => {
    const b = await gerarFormato(f, "pdf");
    expect(b.size).toBeGreaterThan(1500);
    expect(new TextDecoder().decode((await b.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
  });
});
