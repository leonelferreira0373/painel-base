import { describe, expect, it } from "vitest";
import { dataLegivel, estruturaDeRegisto, estruturaDeTabela, htmlDe, nomeDaPagina, rotuloDaChave, textoDe, valorLegivel } from "./copiar-dados";

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
    expect(p.dados).toMatchObject({ banco: "BAI", iban: "AO06004000001234567810142", principal: true });
    expect(p.origem).toBeUndefined();
  });
  it("o HTML é uma tabela com os símbolos protegidos e os campos escritos como se lêem", () => {
    const h = htmlDe(estruturaDeTabela(dados, undefined, agora));
    expect(h).toContain("<th>Nome</th>");
    expect(h).toContain("Rui &amp; Cia");
    expect(h).toContain("Pedidos &lt;hoje&gt;");
    const r = htmlDe(estruturaDeRegisto("Commit", { sha: "8e0b231", precoEntrada: 0.293, testes: { passaram: 12 } }, undefined, agora));
    expect(r).toContain("<th>Campo</th>");
    expect(r).toContain("<td>Commit</td><td>8e0b231</td>");
    expect(r).toContain("<td>Preço de entrada</td><td>0,293 USD por milhão de tokens</td>");
    expect(r).toContain("<td>Passaram: 12</td>");
    expect(r).not.toContain("{&quot;");
  });
});

describe("o texto copiado lê-se sem esforço", () => {
  const modelo = estruturaDeRegisto("Modelo Llama 3.3 70B (fp8, rápido)", { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", nome: "Llama 3.3 70B (fp8, rápido)", fornecedor: "Meta", janela: 24000, precoEntrada: 0.293, precoSaida: 2.253, ferramentas: true }, "/ia/uso/", agora);
  const texto = textoDe(modelo);

  it("um registo é uma lista com marcadores, rótulos em português e valores como se escrevem", () => {
    expect(texto).toContain("• Identificador: @cf/meta/llama-3.3-70b-instruct-fp8-fast");
    expect(texto).toContain("• Fornecedor: Meta");
    expect(texto).toContain("• Janela de contexto: 24\u00a0000 tokens".replace("\u00a0", texto.includes("24 000") ? " " : "\u00a0"));
    expect(texto).toContain("• Preço de entrada: 0,293 USD por milhão de tokens");
    expect(texto).toContain("• Preço de saída: 2,253 USD por milhão de tokens");
    expect(texto).toContain("• Usa ferramentas: sim");
  });
  it("começa pelo título, deixa uma linha em branco e acaba com a página e quando se copiou", () => {
    const linhas = texto.split("\n");
    expect(linhas[0]).toBe("Modelo Llama 3.3 70B (fp8, rápido)");
    expect(linhas[1]).toBe("");
    expect(linhas[linhas.length - 2]).toBe("");
    expect(linhas[linhas.length - 1]).toMatch(/^Copiado de Assistente de IA: .+ em 29\/10\/2026, às \d\d:\d\d$/);
  });
  it("não tem nada de JSON", () => {
    expect(texto).not.toMatch(/[{}"]/);
    expect(texto).not.toContain("geradoEm");
    expect(texto).not.toContain("true");
  });
  it("uma lista são linhas numeradas, com o primeiro valor por título e os outros campos por baixo", () => {
    const t = textoDe(estruturaDeTabela(dados, undefined, agora));
    expect(t).toContain("Pedidos <hoje> (2 linhas)");
    expect(t).toContain("1. Ana");
    expect(t).toMatch(/1\. Ana\n   • Valor: 10\n/);
    expect(t).toContain("2. Rui & Cia");
    expect(textoDe(estruturaDeTabela({ ...dados, linhas: [] }, undefined, agora))).toContain("Sem linhas.");
    expect(textoDe(estruturaDeTabela({ ...dados, linhas: [["Ana", 1]] }, undefined, agora))).toContain("(1 linha)");
  });
  it("os campos aninhados vão para dentro, as listas curtas ficam numa linha e as longas numeradas", () => {
    const t = textoDe(estruturaDeRegisto("Token", { nome: "Agente", permissoes: ["Todas as áreas: Editar", "Pagamentos: Ler"], filtro: { modo: "só estes", valores: ["203.0.113.0/24"] }, ultimasLinhas: Array.from({ length: 8 }, (_, i) => `linha número ${i + 1} com bastante texto para não caber numa só linha de leitura`) }, undefined, agora));
    expect(t).toContain("• Permissões: Todas as áreas: Editar; Pagamentos: Ler");
    expect(t).toMatch(/• Filtro:\n {2}– Modo: só estes\n {2}– Valores: 203\.0\.113\.0\/24/);
    expect(t).toMatch(/• Ultimas linhas:\n {2}1\. linha número 1/);
  });
  it("uma tabela dentro de um campo também é uma lista numerada", () => {
    const t = textoDe(estruturaDeRegisto("Cartão", { indicador: "Visitas", valor: "9 120", variacao: 12.5, serie: [10, 2500, 3], tabela: { colunas: ["Dia", "Visitas"], linhas: [{ Dia: "2026-10-28", Visitas: 1290 }] } }, undefined, agora));
    expect(t).toContain("• Variação: +12,5 %");
    expect(t).toContain("• Série: 10; 2500; 3");
    expect(t).toMatch(/• Tabela:\n {2}1\. 28\/10\/2026\n {5}– Visitas: 1290/);
  });
});

describe("os pormenores", () => {
  it("o nome de um campo escreve-se como se diz", () => {
    expect(rotuloDaChave("precoEntrada")).toBe("Preço de entrada");
    expect(rotuloDaChave("ultimoUso")).toBe("Último uso");
    expect(rotuloDaChave("pedidos_permitidos")).toBe("Pedidos permitidos");
    expect(rotuloDaChave("descricaoCurta")).toBe("Descrição curta");
    expect(rotuloDaChave("Data de início")).toBe("Data de início");
    expect(rotuloDaChave("iban formatado")).toBe("Iban formatado");
  });
  it("valores: sim e não, números com os milhares separados e datas como cá", () => {
    expect(valorLegivel(true)).toBe("sim");
    expect(valorLegivel(false)).toBe("não");
    expect(valorLegivel(null)).toBe("—");
    expect(valorLegivel("")).toBe("—");
    expect(valorLegivel(1250000)).toMatch(/^1.250.000$|^1\s250\s000$/);
    expect(valorLegivel(0.5)).toBe("0,5");
    expect(valorLegivel("texto livre")).toBe("texto livre");
  });
  it("datas: só o dia, ou o dia e a hora", () => {
    expect(dataLegivel("2026-10-29")).toBe("29/10/2026");
    expect(dataLegivel("2026-10-29T16:25:48.771Z")).toMatch(/^29\/10\/2026 às \d\d:\d\d$/);
    expect(dataLegivel("2026-10-29T16:25")).toBe("29/10/2026 às 16:25");
    expect(dataLegivel("29 de outubro")).toBeNull();
    expect(dataLegivel("2026-13-45")).toMatch(/^45\/13\/2026$|^$/);
  });
  it("a página de onde se copiou diz-se pelo nome que tem no menu", () => {
    expect(nomeDaPagina("/ia/uso/")).toBe("Assistente de IA: Utilização");
    expect(nomeDaPagina("/a5c836a030b7e18896e3bdfc86b13d78/dev/logs/")).toBe("Ferramentas de programador: Registos do servidor");
    expect(nomeDaPagina("/conta/tokens/")).toBe("Definições da conta: Tokens da API");
    expect(nomeDaPagina("/")).toBe("Página inicial");
    expect(nomeDaPagina("/qualquer/coisa/")).toBe("/qualquer/coisa/");
    expect(nomeDaPagina(undefined)).toBeNull();
  });
});
