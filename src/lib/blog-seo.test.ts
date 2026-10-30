import { describe, expect, it } from "vitest";
import { artigoNovo } from "./blog";
import { seoAoVivo } from "./blog-seo";

const base = () => ({ ...artigoNovo("a1", "2026-10-29T10:00:00.000Z"), titulo: "Como bloquear um IP no painel", html: "<p>Para bloquear um IP, abra o Firewall e escolha o endereço.</p>", conteudo: "" });

describe("SEO ao vivo", () => {
  it("sem nada escrito pela pessoa tudo vem do artigo", () => {
    const s = seoAoVivo(base());
    expect(s.titulo).toBe("Como bloquear um IP no painel");
    expect(s.descricao).toBe("Para bloquear um IP, abra o Firewall e escolha o endereço.");
    expect(s.tema).toBe(s.temas[0]);
    expect(s.temas.length).toBeGreaterThan(0);
    expect(s.indexar).toBe(true);
    expect(s.resultado.verificacoes.length).toBeGreaterThan(5);
  });
  it("o que a pessoa escolheu ganha ao automático", () => {
    const s = seoAoVivo({ ...base(), resumo: "A minha descrição", seo: { titulo: "O meu título", tema: "firewall", indexar: false } });
    expect(s).toMatchObject({ titulo: "O meu título", descricao: "A minha descrição", tema: "firewall", indexar: false });
  });
  it("a nota muda ao vivo com o texto", () => {
    const curto = seoAoVivo(base()).resultado.pontos;
    const longo = seoAoVivo({ ...base(), html: `<h2>Passos</h2><p>${"Para bloquear um IP no painel, abra o Firewall e escolha o endereço. ".repeat(40)}</p><p><a href="https://exemplo.pt">Mais</a></p>` }).resultado.pontos;
    expect(longo).toBeGreaterThan(curto);
  });
  it("um artigo antigo, em Markdown, também se analisa", () => {
    const s = seoAoVivo({ ...base(), html: undefined, conteudo: "## Passos\n\nAbra o **Firewall**." });
    expect(s.resultado.verificacoes.find((v) => v.id === "subtitulos")?.estado).toBe("bom");
  });
});
