// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { detetarFormato, extrairBytes } from "./index";
import { analisar } from "@/lib/analysis/perfil";

const enc = (s: string) => new TextEncoder().encode(s);
const ler = (nome: string, bytes: Uint8Array) => extrairBytes(nome, bytes, "", {}, 0, undefined);

describe("extração de vários formatos", () => {
  it("lê CSV em Windows-1252 com ponto e vírgula", async () => {
    const bytes = new Uint8Array([...enc("cidade;valor\n"), 0x4c, 0x75, 0x61, 0x6e, 0x64, 0x61, 0x3b, ...enc("1.250,50\n"), 0x4a, 0x6f, 0xe3, 0x6f, 0x3b, ...enc("30\n")]);
    const [r] = await ler("dados.csv", bytes);
    expect(r.tabelas[0].colunas).toEqual(["cidade", "valor"]);
    expect(r.tabelas[0].linhas[1][0]).toBe("João");
    expect(r.formato).toContain("CSV");
  });

  it("lê Excel com várias folhas e datas", async () => {
    const livro = XLSX.utils.book_new();
    const serie = (ano: number, mes: number, dia: number) => (Date.UTC(ano, mes - 1, dia) - Date.UTC(1899, 11, 30)) / 86_400_000;
    const folha = XLSX.utils.aoa_to_sheet([["Pedido", "Data", "Valor"], ["A1", 0, 10], ["A2", 0, 20]]);
    folha.B2 = { t: "n", v: serie(2026, 10, 28), z: "yyyy-mm-dd" };
    folha.B3 = { t: "n", v: serie(2026, 10, 29), z: "dd/mm/yyyy" };
    XLSX.utils.book_append_sheet(livro, folha, "Pedidos");
    XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([["x", "y"], [1, 2]]), "Outra");
    const bytes = new Uint8Array(XLSX.write(livro, { type: "array", bookType: "xlsx" }));
    const [r] = await ler("livro.xlsx", bytes);
    expect(r.formato).toContain("XLSX");
    expect(r.tabelas.map((t) => t.nome)).toEqual(["Pedidos", "Outra"]);
    expect(r.tabelas[0].linhas[0]).toEqual(["A1", "2026-10-28", 10]);
    expect(r.tabelas[0].linhas[1][1]).toBe("2026-10-29");
    expect(analisar(r.tabelas[0]).colunas[1].tipo).toBe("data");
  });

  it("abre um ZIP e extrai os ficheiros de dentro", async () => {
    const zip = new JSZip();
    zip.file("a.csv", "n,v\n1,2\n3,4\n");
    zip.file("pasta/b.json", JSON.stringify([{ k: "x" }, { k: "y" }]));
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const r = await ler("arquivo.zip", bytes);
    expect(r).toHaveLength(3);
    expect(r[1].dentroDe).toBe("arquivo.zip");
    expect(r.flatMap((x) => x.tabelas).map((t) => t.origem)).toContain("arquivo.zip › pasta/b.json › Registos");
  });

  it("lê um e-mail com anexo em base64", async () => {
    const anexo = btoa("a,b\n1,2\n3,4\n");
    const eml = [
      "From: Ana <ana@example.com>",
      "To: rui@example.com",
      "Subject: =?UTF-8?B?UmVsYXTDs3Jpbw==?=",
      "Date: Tue, 28 Oct 2026 10:00:00 +0100",
      "MIME-Version: 1.0",
      'Content-Type: multipart/mixed; boundary="LIM"',
      "",
      "--LIM",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Segue o relatório.",
      "--LIM",
      'Content-Type: text/csv; name="dados.csv"',
      'Content-Disposition: attachment; filename="dados.csv"',
      "Content-Transfer-Encoding: base64",
      "",
      anexo,
      "--LIM--",
      "",
    ].join("\r\n");
    const r = await ler("mensagem.eml", enc(eml));
    expect(r[0].formato).toContain("E-mail");
    expect(r[0].tabelas[0].linhas[0][3]).toBe("Relatório");
    expect(r[0].texto).toBe("Segue o relatório.");
    expect(r).toHaveLength(2);
    expect(r[1].tabelas[0].linhas).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("encontra a lista repetida num XML", async () => {
    const xml = '<?xml version="1.0"?><raiz><meta>x</meta><pedidos><p id="1"><cliente>Ana</cliente></p><p id="2"><cliente>Rui</cliente></p></pedidos></raiz>';
    const [r] = await ler("pedidos.xml", enc(xml));
    expect(r.tabelas[0].nome).toBe("p");
    expect(r.tabelas[0].colunas).toEqual(["@id", "cliente"]);
    expect(r.tabelas[0].linhas[1]).toEqual(["2", "Rui"]);
  });

  it("extrai as tabelas de uma página HTML", async () => {
    const html = "<html><body><h1>Relatório</h1><table><caption>Vendas</caption><tr><th>Mês</th><th>Total</th></tr><tr><td>Jan</td><td>10</td></tr></table></body></html>";
    const [r] = await ler("pagina.html", enc(html));
    expect(r.tabelas[0].nome).toBe("Vendas");
    expect(r.tabelas[0].linhas).toEqual([["Jan", "10"]]);
  });

  it("lê as tabelas de um documento Word", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    const celula = (t: string) => `<w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
    const linha = (...c: string[]) => `<w:tr>${c.map(celula).join("")}</w:tr>`;
    zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Introdução</w:t></w:r></w:p><w:tbl>${linha("Nome", "Idade")}${linha("Ana", "30")}${linha("Rui", "41")}</w:tbl></w:body></w:document>`);
    const bytes = await zip.generateAsync({ type: "uint8array" });
    expect(await detetarFormato("ficha.docx", bytes)).toBe("docx");
    const [r] = await ler("ficha.docx", bytes);
    expect(r.tabelas[0].colunas).toEqual(["Nome", "Idade"]);
    expect(r.tabelas[0].linhas).toEqual([["Ana", "30"], ["Rui", "41"]]);
    expect(r.texto).toContain("Introdução");
  });

  it("lê JSON e NDJSON", async () => {
    const [a] = await ler("a.json", enc('{"pedidos":[{"id":1,"c":{"n":"Ana"}},{"id":2,"c":{"n":"Rui"}}]}'));
    expect(a.tabelas[0].colunas).toEqual(["id", "c.n"]);
    const [b] = await ler("b.ndjson", enc('{"a":1}\n{"a":2}\n{"a":3}\n'));
    expect(b.formato).toBe("NDJSON");
    expect(b.tabelas[0].linhas).toHaveLength(3);
  });

  it("recupera o texto legível de um binário desconhecido", async () => {
    const bytes = new Uint8Array(400);
    bytes.set(enc("Relatório de vendas - Armazém 3"), 40);
    bytes.set(enc("Referência AB-12-34"), 200);
    const [r] = await ler("misterio.dat", bytes);
    expect(r.tabelas[0].linhas.flat().join(" ")).toContain("Referência");
    expect(r.avisos.length).toBeGreaterThan(0);
  });

  it("não falha com ficheiros vazios", async () => {
    const [r] = await ler("vazio.txt", new Uint8Array());
    expect(r.tabelas).toEqual([]);
  });
});
