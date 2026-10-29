import { describe, expect, it } from "vitest";
import { eRota, frasaDaRota, partesDaRota, textoDaRota } from "./rotas";

describe("partesDaRota", () => {
  it("a raiz é o início", () => {
    expect(partesDaRota("/")).toEqual(["Início"]);
    expect(partesDaRota("")).toEqual(["Início"]);
  });
  it("usa o nome conhecido, com acentos", () => {
    expect(partesDaRota("/precos")).toEqual(["Preços"]);
    expect(partesDaRota("/servicos/consultoria")).toEqual(["Serviços", "Consultoria"]);
  });
  it("o que não se conhece fica por extenso e com maiúscula", () => {
    expect(partesDaRota("/pedir-proposta")).toEqual(["Pedir proposta"]);
    expect(partesDaRota("/area_de_clientes/novo-pedido")).toEqual(["Area de clientes", "Novo pedido"]);
  });
  it("ignora a barra do fim, a pesquisa e o fragmento", () => {
    expect(partesDaRota("/blog/novidades/?utm_source=x#topo")).toEqual(["Blog", "Novidades"]);
  });
  it("descodifica os endereços escritos com %", () => {
    expect(partesDaRota("/ol%C3%A1")).toEqual(["Olá"]);
    expect(partesDaRota("/100%")).toEqual(["100%"]);
  });
  it("não se importa com a caixa", () => {
    expect(partesDaRota("/Precos")).toEqual(["Preços"]);
  });
});

describe("texto e frase", () => {
  it("o texto junta com o chevron simples", () => {
    expect(textoDaRota("/compras/homens")).toBe("Compras › Homens");
  });
  it("a frase dá um pill por pedaço e um chevron entre eles", () => {
    expect(frasaDaRota("/compras/homens")).toBe("«Compras» > «Homens»");
    expect(frasaDaRota("/")).toBe("«Início»");
  });
});

describe("eRota", () => {
  it("só as páginas, não os endereços técnicos", () => {
    expect(eRota("/")).toBe(true);
    expect(eRota("/blog/novidades")).toBe(true);
    expect(eRota("/api/pedidos")).toBe(false);
    expect(eRota("/v1/dev/saude")).toBe(false);
    expect(eRota("/_next/static/chunks/app.js")).toBe(false);
    expect(eRota("/favicon.ico")).toBe(false);
    expect(eRota("/.env")).toBe(false);
    expect(eRota("//cdn.exemplo.com/x")).toBe(false);
    expect(eRota("Pedir proposta")).toBe(false);
  });
});
