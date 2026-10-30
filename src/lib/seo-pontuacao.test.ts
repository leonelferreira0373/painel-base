import { describe, expect, it } from "vitest";
import { analisarSeo, contarTema, descricaoAutomatica, sugerirTemas, type EntradaDoSeo } from "./seo-pontuacao";

const frase = "Para bloquear um IP no painel, abra o Firewall e escolha o endereço. ";
const paragrafo = (n: number) => `<p>${frase.repeat(n)}</p>`;
const bom = (): EntradaDoSeo => ({
  titulo: "Como bloquear um IP no painel de administração",
  descricao: "Aprenda a bloquear um endereço IP no painel em três passos simples, com o Firewall, e veja como confirmar que o bloqueio ficou ativo.",
  html: `<p>Vamos bloquear um IP no painel. ${frase.repeat(2)}</p><h2>Passos</h2>${paragrafo(6)}${paragrafo(6)}${paragrafo(6)}<p><a href="https://exemplo.pt">Saiba mais</a></p><img data-bib="i1" alt="O ecrã do Firewall">`,
  tema: "bloquear um ip",
  capa: true,
  indexar: true,
});
const estado = (r: ReturnType<typeof analisarSeo>, id: string) => r.verificacoes.find((x) => x.id === id)?.estado;

describe("pontuação de SEO", () => {
  it("um artigo bem feito tem nota boa e nada fraco", () => {
    const r = analisarSeo(bom());
    expect(r.nivel).toBe("bom");
    expect(r.pontos).toBeGreaterThanOrEqual(80);
    expect(r.verificacoes.filter((v) => v.estado === "fraco")).toEqual([]);
  });
  it("um artigo vazio tem nota fraca e diz o que falta", () => {
    const r = analisarSeo({ titulo: "", descricao: "", html: "", tema: "", capa: false, indexar: true });
    expect(r.nivel).toBe("fraco");
    expect(estado(r, "titulo")).toBe("fraco");
    expect(estado(r, "descricao")).toBe("fraco");
    expect(estado(r, "texto")).toBe("fraco");
    expect(r.verificacoes.find((v) => v.id === "titulo")?.mensagem).toMatch(/Falta o título/);
  });
  it("mede o título e a descrição pelas letras", () => {
    expect(estado(analisarSeo({ ...bom(), titulo: "Curto" }), "titulo")).toBe("melhorar");
    expect(estado(analisarSeo({ ...bom(), titulo: "x".repeat(65) }), "titulo")).toBe("melhorar");
    expect(estado(analisarSeo({ ...bom(), titulo: "x".repeat(90) }), "titulo")).toBe("fraco");
    expect(estado(analisarSeo({ ...bom(), descricao: "Curta demais." }), "descricao")).toBe("fraco");
    expect(estado(analisarSeo({ ...bom(), descricao: "y".repeat(100) }), "descricao")).toBe("melhorar");
    expect(estado(analisarSeo({ ...bom(), descricao: "z".repeat(200) }), "descricao")).toBe("fraco");
  });
  it("o tema tem de estar no título, no início, na descrição e no texto sem exagero", () => {
    const sem = analisarSeo({ ...bom(), tema: "cozinha portuguesa" });
    expect(estado(sem, "tema-titulo")).toBe("fraco");
    expect(estado(sem, "tema-inicio")).toBe("melhorar");
    expect(estado(sem, "tema-texto")).toBe("fraco");
    const demais = analisarSeo({ ...bom(), html: `<p>${"bloquear ".repeat(80)} outras palavras.</p>`, tema: "bloquear" });
    expect(estado(demais, "tema-texto")).toBe("melhorar");
    expect(analisarSeo({ ...bom(), tema: "" }).verificacoes.some((v) => v.id === "tema")).toBe(true);
  });
  it("vê os subtítulos, as imagens, o texto alternativo e as ligações", () => {
    const longo = `<p>${"palavra ".repeat(250)}.</p>`;
    expect(estado(analisarSeo({ ...bom(), html: longo }), "subtitulos")).toBe("melhorar");
    expect(estado(analisarSeo({ ...bom(), html: "<p>curto</p>" }), "subtitulos")).toBe("bom");
    expect(estado(analisarSeo({ ...bom(), html: longo, capa: false }), "imagens")).toBe("melhorar");
    expect(estado(analisarSeo({ ...bom(), html: '<img data-bib="a" alt=""><img data-bib="b" alt="Foto">' }), "alt")).toBe("melhorar");
    expect(estado(analisarSeo({ ...bom(), html: longo }), "ligacoes")).toBe("melhorar");
  });
  it("vê as frases compridas e os parágrafos compridos", () => {
    const comprida = `<p>${`${"palavra ".repeat(30)}fim. `.repeat(4)}</p>`;
    const r = analisarSeo({ ...bom(), html: comprida });
    expect(estado(r, "frases")).toBe("fraco");
    expect(estado(r, "paragrafos")).toBe("melhorar");
  });
  it("avisa quando o artigo está escondido da pesquisa", () => {
    expect(estado(analisarSeo({ ...bom(), indexar: false }), "indexar")).toBe("melhorar");
    expect(analisarSeo(bom()).verificacoes.some((v) => v.id === "indexar")).toBe(false);
  });
});

describe("tema e descrição automáticos", () => {
  it("conta o tema sem ligar a maiúsculas nem a acentos", () => {
    expect(contarTema("A Ação rápida e a acao lenta", "ação")).toBe(2);
    expect(contarTema("reação", "ação")).toBe(0);
    expect(contarTema("qualquer coisa", "")).toBe(0);
  });
  it("sugere primeiro a expressão do título e depois as palavras que mais contam", () => {
    const s = sugerirTemas("Bloquear endereços no Firewall", "O Firewall bloqueia o tráfego. Abra o Firewall e escolha o endereço. O endereço fica bloqueado.");
    expect(s[0]).toBe("bloquear endereços");
    expect(s).toContain("endereços no firewall");
    expect(s).toContain("firewall");
    expect(s.length).toBeLessThanOrEqual(5);
    expect(s.every((p) => !["para", "uma", "com"].includes(p))).toBe(true);
    expect(sugerirTemas("", "")).toEqual([]);
  });
  it("a expressão proposta está mesmo no título, com os acentos e as palavras de ligação como estão", () => {
    const titulo = "Como bloquear um IP no painel";
    const s = sugerirTemas(titulo, "Para bloquear um IP no painel, abra o Firewall.");
    expect(s[0]).toBe("bloquear um ip");
    expect(contarTema(titulo, s[0])).toBe(1);
    expect(s.slice(0, 2).every((f) => contarTema(titulo, f) > 0)).toBe(true);
  });
  it("faz a descrição com o início do texto, em palavras inteiras", () => {
    expect(descricaoAutomatica("Texto curto.")).toBe("Texto curto.");
    const d = descricaoAutomatica("palavra ".repeat(60));
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d.endsWith("…")).toBe(true);
    expect(d).not.toMatch(/palavr…$/);
  });
});
