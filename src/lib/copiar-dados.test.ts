import { describe, expect, it } from "vitest";
import { estruturaDeRegisto, estruturaDeTabela, htmlDe, textoDe } from "./copiar-dados";

const agora = new Date("2026-10-29T10:00:00.000Z");
const dados = { nome: "pedidos", titulo: "Pedidos <hoje>", colunas: ["Nome", "Valor"], linhas: [["Ana", 10], ["Rui & Cia", 2500]] as (string | number)[][] };

describe("copiar dados", () => {
  it("uma tabela vira lista de objetos com o nome das colunas, e leva o título, a origem e a hora", () => {
    const p = estruturaDeTabela(dados, "/dev/dns/", agora);
    expect(p).toMatchObject({ tipo: "lista", titulo: "Pedidos <hoje>", origem: "/dev/dns/", geradoEm: "2026-10-29T10:00:00.000Z" });
    expect(p.dados).toEqual({ colunas: ["Nome", "Valor"], linhas: [{ Nome: "Ana", Valor: 10 }, { Nome: "Rui & Cia", Valor: 2500 }] });
  });
  it("um registo leva todos os campos", () => {
    const p = estruturaDeRegisto("Conta bancária", { banco: "BAI", iban: "AO06004000001234567810142", principal: true }, undefined, agora);
    expect(JSON.parse(textoDe(p))).toMatchObject({ tipo: "registo", dados: { banco: "BAI", iban: "AO06004000001234567810142", principal: true } });
    expect(p.origem).toBeUndefined();
  });
  it("o HTML é uma tabela com os símbolos protegidos", () => {
    const h = htmlDe(estruturaDeTabela(dados, undefined, agora));
    expect(h).toContain("<th>Nome</th>");
    expect(h).toContain("Rui &amp; Cia");
    expect(h).toContain("Pedidos &lt;hoje&gt;");
    const r = htmlDe(estruturaDeRegisto("Commit", { sha: "8e0b231", testes: { passaram: 12 } }, undefined, agora));
    expect(r).toContain("<th>Campo</th>");
    expect(r).toContain("<td>sha</td><td>8e0b231</td>");
    expect(r).toContain("{&quot;passaram&quot;:12}");
  });
});
