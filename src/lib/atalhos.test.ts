// Testes dos atalhos de teclado: ler a combinação de um evento, recusar as que não servem e juntar as de origem com as do utilizador.
import { describe, expect, it } from "vitest";
import { ATALHOS } from "@/dados/atalhos";
import { atalhosEfetivos, combinacaoDe, erroDeCombinacao, mostrarCombinacao } from "./atalhos";

const evento = (campos: Partial<KeyboardEvent>) => ({ key: "", code: "", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...campos }) as KeyboardEvent;

describe("combinacaoDe", () => {
  it("lê Ctrl+K, e Cmd conta como Ctrl", () => {
    expect(combinacaoDe(evento({ key: "k", code: "KeyK", ctrlKey: true }))).toBe("Ctrl+K");
    expect(combinacaoDe(evento({ key: "k", code: "KeyK", metaKey: true }))).toBe("Ctrl+K");
  });
  it("usa a tecla física, para o Alt não mudar a letra", () => {
    expect(combinacaoDe(evento({ key: "˙", code: "KeyH", altKey: true }))).toBe("Alt+H");
    expect(combinacaoDe(evento({ key: ",", code: "Comma", altKey: true }))).toBe("Alt+,");
  });
  it("ordena Ctrl, Alt e Shift", () => {
    expect(combinacaoDe(evento({ key: "K", code: "KeyK", ctrlKey: true, altKey: true, shiftKey: true }))).toBe("Ctrl+Alt+Shift+K");
  });
  it("ignora as teclas modificadoras sozinhas", () => {
    expect(combinacaoDe(evento({ key: "Control", code: "ControlLeft", ctrlKey: true }))).toBeNull();
  });
});

describe("erroDeCombinacao", () => {
  const atuais = atalhosEfetivos();
  it("recusa teclas sem Ctrl ou Alt", () => {
    expect(erroDeCombinacao("K", "pesquisa", atuais)).not.toBeNull();
    expect(erroDeCombinacao("Shift+K", "pesquisa", atuais)).not.toBeNull();
  });
  it("aceita uma tecla F", () => {
    expect(erroDeCombinacao("F2", "pesquisa", atuais)).toBeNull();
  });
  it("recusa as do navegador", () => {
    expect(erroDeCombinacao("Ctrl+W", "pesquisa", atuais)).toMatch(/navegador/);
  });
  it("recusa as que já estão em uso noutra ação, mas aceita a da própria", () => {
    expect(erroDeCombinacao("Ctrl+B", "pesquisa", atuais)).toMatch(/Já é usada/);
    expect(erroDeCombinacao("Ctrl+K", "pesquisa", atuais)).toBeNull();
  });
});

describe("atalhosEfetivos", () => {
  it("devolve os de origem e deixa o utilizador mudar", () => {
    const origem = atalhosEfetivos();
    for (const a of ATALHOS) expect(origem[a.id]).toBe(a.padrao);
    expect(atalhosEfetivos({ pesquisa: "Ctrl+J" }).pesquisa).toBe("Ctrl+J");
    expect(atalhosEfetivos({ pesquisa: "Ctrl+J" }).barra).toBe("Ctrl+B");
  });
  it("as combinações de origem não se repetem nem são do navegador", () => {
    const todas = ATALHOS.map((a) => a.padrao);
    expect(new Set(todas).size).toBe(todas.length);
    for (const a of ATALHOS) expect(erroDeCombinacao(a.padrao, a.id, atalhosEfetivos())).toBeNull();
  });
  it("mostra as combinações com espaços", () => {
    expect(mostrarCombinacao("Ctrl+Shift+K")).toBe("Ctrl + Shift + K");
  });
});
