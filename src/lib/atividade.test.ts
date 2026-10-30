import { describe, expect, it } from "vitest";
import { agruparConversas, descreverAgente, duracaoDe, fecharInativas, filtrarAcoes, mascarar, paraCsv, textoDaDuracao, type Acao, type Sessao } from "./atividade";

const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const EDGE = `${CHROME_WIN} Edg/141.0.3537.57`;
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0";

describe("descreverAgente", () => {
  it("lê o navegador, o sistema e o tipo de aparelho", () => {
    expect(descreverAgente(CHROME_WIN)).toMatchObject({ navegador: "Chrome", versao: "141", sistema: "Windows 10/11", tipo: "computador" });
    expect(descreverAgente(EDGE)).toMatchObject({ navegador: "Edge", versao: "141" });
    expect(descreverAgente(IPHONE)).toMatchObject({ navegador: "Safari", versao: "18", sistema: "iOS 18.1", tipo: "telemovel" });
    expect(descreverAgente(ANDROID)).toMatchObject({ navegador: "Chrome", sistema: "Android 14", tipo: "telemovel" });
    expect(descreverAgente(IPAD).tipo).toBe("tablet");
    expect(descreverAgente(FIREFOX)).toMatchObject({ navegador: "Firefox", versao: "130", sistema: "Linux" });
  });
  it("junta o ecrã, o idioma e o fuso", () => {
    expect(descreverAgente(CHROME_WIN, { largura: 1920, altura: 1080, idioma: "pt-PT", fuso: "Africa/Luanda" })).toMatchObject({ ecra: "1920×1080", idioma: "pt-PT", fuso: "Africa/Luanda" });
  });
});

describe("mascarar", () => {
  it("nunca guarda o que é secreto", () => {
    expect(mascarar("Palavra-passe", "abc123")).toBe("••••••");
    expect(mascarar("Nome", "segredo", "password")).toBe("••••••");
    expect(mascarar("Token de acesso", "tok_live_123")).toBe("••••••");
    expect(mascarar("Código de recuperação", "123456")).toBe("••••••");
  });
  it("guarda o resto, limpo e cortado", () => {
    expect(mascarar("Nome", "  Ana   Costa ")).toBe("Ana Costa");
    expect(mascarar("Nota", "x".repeat(200))).toHaveLength(91);
  });
});

const sessao = (parcial: Partial<Sessao> = {}): Sessao => ({ id: "s1", utilizador: "Ana", funcao: "Administrador", inicio: "2026-10-29T10:00:00.000Z", ultima: "2026-10-29T10:42:00.000Z", dispositivo: descreverAgente(CHROME_WIN), acoes: 3, ...parcial });
const acao = (parcial: Partial<Acao> = {}): Acao => ({ id: "a1", sessao: "s1", quando: "2026-10-29T10:05:00.000Z", tipo: "clique", texto: "Clicou em «Guardar»", ...parcial });

describe("duração", () => {
  it("conta até ao fim, ou até à última atividade", () => {
    expect(duracaoDe(sessao({ fim: "2026-10-29T10:30:00.000Z" }))).toBe(30 * 60_000);
    expect(duracaoDe(sessao(), new Date("2026-10-29T12:00:00.000Z").getTime())).toBe(42 * 60_000);
  });
  it("escreve-se em palavras", () => {
    expect(textoDaDuracao(40_000)).toBe("40 s");
    expect(textoDaDuracao(12 * 60_000)).toBe("12 min");
    expect(textoDaDuracao(95 * 60_000)).toBe("1 h 35 min");
  });
});

describe("fecharInativas", () => {
  it("termina por inatividade as sessões paradas há mais do limite, na hora da última atividade", () => {
    const agora = new Date("2026-10-29T12:00:00.000Z").getTime();
    const [a, b, c] = fecharInativas([sessao({ id: "a" }), sessao({ id: "b", ultima: "2026-10-29T11:50:00.000Z" }), sessao({ id: "c" })], agora, 30 * 60_000, "c");
    expect(a).toMatchObject({ fim: "2026-10-29T10:42:00.000Z", motivoDoFim: "inatividade" });
    expect(b.fim).toBeUndefined();
    expect(c.fim).toBeUndefined();
  });
});

describe("filtrarAcoes", () => {
  const lista = [acao({ id: "1" }), acao({ id: "2", tipo: "definicao", texto: "Ligou «Autenticação em dois passos»", antes: "desligado", depois: "ligado" }), acao({ id: "3", sessao: "s2", tipo: "ia", texto: "Perguntou à IA: «abre o firewall»", quando: "2026-10-29T11:00:00.000Z" })];
  it("filtra por sessão, tipo e texto sem acentos", () => {
    expect(filtrarAcoes(lista, { sessao: "s2" }).map((a) => a.id)).toEqual(["3"]);
    expect(filtrarAcoes(lista, { tipos: ["definicao"] }).map((a) => a.id)).toEqual(["2"]);
    expect(filtrarAcoes(lista, { texto: "autenticacao" }).map((a) => a.id)).toEqual(["2"]);
    expect(filtrarAcoes(lista, { texto: "desligado" }).map((a) => a.id)).toEqual(["2"]);
  });
  it("filtra por período", () => {
    expect(filtrarAcoes(lista, { de: "2026-10-29T10:30:00.000Z" }).map((a) => a.id)).toEqual(["3"]);
    expect(filtrarAcoes(lista, { ate: "2026-10-29T10:30:00.000Z" }).map((a) => a.id)).toEqual(["1", "2"]);
  });
});

describe("paraCsv", () => {
  it("escreve uma linha por ação, com as aspas e as quebras de linha protegidas", () => {
    const csv = paraCsv([sessao({ ip: "102.67.1.4", cidade: "Luanda", pais: "AO" })], [acao({ texto: 'Escreveu "olá"; linha\nnova' })]);
    const linhas = csv.replace("﻿", "").split("\r\n");
    expect(linhas[0].split(";")[0]).toBe("Quando");
    expect(csv).toContain('"Escreveu ""olá""; linha\nnova"');
    expect(csv).toContain("102.67.1.4");
    expect(csv).toContain("Chrome 141 em Windows 10/11");
  });
});

describe("agruparConversas", () => {
  const ia = (id: string, texto: string, conversa?: string) => acao({ id, tipo: "ia", texto, ...(conversa ? { conversa } : {}) });
  it("junta cada conversa numa linha, no lugar da ação mais recente, com a primeira pergunta", () => {
    // da mais recente para a mais antiga
    const lista = [ia("5", "A IA respondeu: «Abra o Firewall.»", "c1"), acao({ id: "4", texto: "Abriu «Firewall»" }), ia("3", "Perguntou à IA: «E depois?»", "c1"), ia("2", "A IA: A ver o ecrã", "c1"), ia("1", "Perguntou à IA: «Como bloqueio um IP?»", "c1")];
    const g = agruparConversas(lista);
    expect(g.map((a) => a.id)).toEqual(["conversa-c1", "4"]);
    expect(g[0]).toMatchObject({ texto: "Conversa com a IA", conversa: "c1", resumo: { perguntas: 2, primeira: "Como bloqueio um IP?" } });
  });
  it("conversas diferentes ficam em linhas diferentes e o que não é conversa não se mexe", () => {
    const lista = [ia("3", "Perguntou à IA: «B»", "c2"), ia("2", "Abriu a conversa com a IA"), ia("1", "Perguntou à IA: «A»", "c1")];
    expect(agruparConversas(lista).map((a) => a.id)).toEqual(["conversa-c2", "2", "conversa-c1"]);
  });
});
