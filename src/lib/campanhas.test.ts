// Testes das campanhas com opções prontas: os nomes certos para o rastreio, os períodos, o que falta escolher e a ligação que sai.
import { describe, expect, it } from "vitest";
import { enderecoDaPagina, ESCOLHAS_VAZIAS, faltaEscolher, FONTES_DE_CAMPANHA, MEIOS_DE_CAMPANHA, meioHabitual, normalizarPagina, normalizarSite, parametrosDeCampanha, periodoEmUtm, periodosDeCampanha, SEM_DATA, slugUtm } from "./campanhas";
import { erroDoUtm, montarUrlUtm } from "./marketing";

const pronta = { ...ESCOLHAS_VAZIAS, site: "https://exemplo.pt", pagina: "/precos", fonte: "Google", meio: "Anúncio pago", objetivo: "Promoção", periodo: "Outubro de 2026" };

describe("campanhas com opções prontas", () => {
  it("escreve os nomes como o rastreio os quer", () => {
    expect(slugUtm("Black Friday")).toBe("black-friday");
    expect(slugUtm("  Promoção de Verão! ")).toBe("promocao-de-verao");
    expect(slugUtm("a - b")).toBe("a-b");
    expect(slugUtm("é só")).toBe("e-so");
    expect(slugUtm("")).toBe("");
  });
  it("as opções prontas já são nomes certos", () => {
    for (const o of [...MEIOS_DE_CAMPANHA, ...FONTES_DE_CAMPANHA]) expect(slugUtm(o.valor)).toBe(o.valor);
    for (const f of FONTES_DE_CAMPANHA) expect(MEIOS_DE_CAMPANHA.map((m) => m.rotulo)).toContain(f.meio);
  });
  it("dá o mês de hoje, o seguinte e «Sem data»", () => {
    expect(periodosDeCampanha(new Date(2026, 9, 29))).toEqual(["Outubro de 2026", "Novembro de 2026", SEM_DATA]);
    expect(periodosDeCampanha(new Date(2026, 11, 3))).toEqual(["Dezembro de 2026", "Janeiro de 2027", SEM_DATA]);
  });
  it("passa o período a nome de campanha", () => {
    expect(periodoEmUtm("Março de 2027")).toBe("marco-2027");
    expect(periodoEmUtm(SEM_DATA)).toBe("");
    expect(periodoEmUtm("")).toBe("");
    expect(periodoEmUtm("Verão 2026")).toBe("verao-2026");
  });
  it("normaliza o site e junta-lhe a página", () => {
    expect(normalizarSite("exemplo.pt/")).toBe("https://exemplo.pt");
    expect(normalizarSite("http://exemplo.pt")).toBe("http://exemplo.pt");
    expect(normalizarSite("  ")).toBe("");
    expect(enderecoDaPagina("https://exemplo.pt", "/precos")).toBe("https://exemplo.pt/precos");
    expect(enderecoDaPagina("exemplo.pt/", "/")).toBe("https://exemplo.pt/");
    expect(enderecoDaPagina("https://exemplo.pt", "https://outro.pt/x")).toBe("https://outro.pt/x");
    expect(enderecoDaPagina("", "/precos")).toBe("");
    expect(enderecoDaPagina("https://exemplo.pt", "precos")).toBe("");
  });
  it("a página escrita ganha a barra do princípio", () => {
    expect(normalizarPagina("promo")).toBe("/promo");
    expect(normalizarPagina("/precos")).toBe("/precos");
    expect(normalizarPagina(" https://exemplo.pt/x ")).toBe("https://exemplo.pt/x");
    expect(normalizarPagina("")).toBe("");
  });
  it("a fonte traz o tipo de divulgação que costuma ir com ela", () => {
    expect(meioHabitual("Google")).toBe("Anúncio pago");
    expect(meioHabitual("Newsletter")).toBe("E-mail");
    expect(meioHabitual("Uma fonte minha")).toBe("");
  });
  it("diz o que ainda falta escolher, pelo nome que o campo tem", () => {
    expect(faltaEscolher(ESCOLHAS_VAZIAS)).toEqual(["Site", "Página", "Onde vai aparecer", "Tipo de divulgação", "Para quê"]);
    expect(faltaEscolher({ ...pronta, meio: "" })).toEqual(["Tipo de divulgação"]);
    expect(faltaEscolher(pronta)).toEqual([]);
  });
  it("monta a ligação certa só com opções prontas", () => {
    const p = parametrosDeCampanha(pronta)!;
    expect(erroDoUtm(p)).toBeNull();
    expect(p).toMatchObject({ url: "https://exemplo.pt/precos", fonte: "google", meio: "cpc", campanha: "promocao-outubro-2026", termo: undefined, conteudo: undefined });
    const u = new URL(montarUrlUtm(p));
    expect(u.searchParams.get("utm_campaign")).toBe("promocao-outubro-2026");
  });
  it("aceita o que a pessoa escreve e corrige-o sozinho", () => {
    const p = parametrosDeCampanha({ ...pronta, fonte: "Rádio Comercial", meio: "Spot de 30 s", objetivo: "Dia do Cliente", periodo: SEM_DATA, variante: "Versão B", palavra: "Transporte marítimo" })!;
    expect(erroDoUtm(p)).toBeNull();
    expect(p).toMatchObject({ fonte: "radio-comercial", meio: "spot-de-30-s", campanha: "dia-do-cliente", conteudo: "versao-b", termo: "transporte-maritimo" });
  });
  it("não monta nada enquanto falta alguma coisa", () => {
    expect(parametrosDeCampanha(ESCOLHAS_VAZIAS)).toBeNull();
    expect(parametrosDeCampanha({ ...pronta, fonte: "???" })).toBeNull();
  });
});
