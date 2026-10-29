import { describe, expect, it } from "vitest";
import { descodificarEntidades, resultadosDaWikipedia, resultadosDeNoticias, resultadosDoBrave, resultadosDoDuckDuckGo, resultadosDoDuckDuckGoApi, resultadosParaTexto, textoDaPagina, urlPermitida } from "./web-pesquisa";

describe("urlPermitida", () => {
  it("aceita sítios públicos", () => {
    expect(urlPermitida("https://pt.wikipedia.org/wiki/Angola")?.hostname).toBe("pt.wikipedia.org");
    expect(urlPermitida("http://exemplo.com:80/a?b=1")).not.toBeNull();
  });
  it("recusa o que não é http, as máquinas internas e as redes privadas", () => {
    for (const u of ["file:///etc/passwd", "ftp://exemplo.com/a", "http://localhost/x", "http://127.0.0.1/x", "http://10.0.0.5/", "http://192.168.1.1/", "http://172.20.0.1/", "http://169.254.169.254/latest", "http://[::1]/", "http://servidor/x", "http://nas.local/", "http://api.internal/", "https://user:pass@exemplo.com/", "https://exemplo.com:8443/", "http://2130706433/", "not a url"]) expect(urlPermitida(u), u).toBeNull();
  });
});

describe("resultadosDoDuckDuckGo", () => {
  const html = `<div class="result"><h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexemplo.com%2Fa%3Fx%3D1&amp;rut=abc">Exemplo <b>um</b> &amp; mais</a></h2><a class="result__snippet" href="//duckduckgo.com/l/?uddg=x">O <b>resumo</b> do primeiro.</a></div>
  <div class="result"><a class="result__a" href="https://segundo.pt/pag">Segundo</a><a class="result__snippet" href="#">Resumo dois</a></div>
  <div class="result"><a class="result__a" href="http://localhost/admin">Mau</a></div>`;
  it("traz o endereço verdadeiro, o título e o resumo sem marcas, e deixa de fora o que não se pode abrir", () => {
    const r = resultadosDoDuckDuckGo(html);
    expect(r).toEqual([
      { titulo: "Exemplo um & mais", url: "https://exemplo.com/a?x=1", resumo: "O resumo do primeiro.", fonte: "web" },
      { titulo: "Segundo", url: "https://segundo.pt/pag", resumo: "Resumo dois", fonte: "web" },
    ]);
  });
  it("respeita o máximo", () => {
    expect(resultadosDoDuckDuckGo(html, 1)).toHaveLength(1);
  });
});

describe("resultadosDaWikipedia", () => {
  it("ordena pelo índice e junta o idioma ao título", () => {
    const r = resultadosDaWikipedia({ query: { pages: { "1": { title: "B", extract: "texto b", fullurl: "https://pt.wikipedia.org/wiki/B", index: 2 }, "2": { title: "A", extract: "texto a", fullurl: "https://pt.wikipedia.org/wiki/A", index: 1 }, "3": { title: "sem url", index: 3 } } } }, "pt");
    expect(r.map((x) => x.titulo)).toEqual(["A — Wikipédia (pt)", "B — Wikipédia (pt)"]);
    expect(resultadosDaWikipedia({}, "pt")).toEqual([]);
  });
});

describe("textoDaPagina", () => {
  const html = `<html><head><title>Mercado &amp; petróleo</title><meta name="description" content="Resumo da página"><style>p{color:red}</style></head><body><nav>Menu Início Contactos</nav><main><h1>O petróleo</h1><p>O preço subiu 4&nbsp;% em outubro.</p><ul><li>Angola</li><li>Brasil</li></ul><script>alert(1)</script></main><footer>© 2026</footer></body></html>`;
  it("tira o que não é texto, e guarda os títulos, os parágrafos e as listas", () => {
    const p = textoDaPagina(html);
    expect(p.titulo).toBe("Mercado & petróleo");
    expect(p.descricao).toBe("Resumo da página");
    expect(p.texto).toContain("## O petróleo");
    expect(p.texto).toContain("O preço subiu 4 % em outubro.");
    expect(p.texto).toContain("- Angola");
    expect(p.texto).not.toMatch(/alert|Menu Início|©|color:red/);
  });
  it("corta o texto comprido", () => {
    expect(textoDaPagina(`<body><p>${"palavra ".repeat(2000)}</p></body>`, 200).texto.length).toBeLessThanOrEqual(202);
  });
});

describe("pequenas peças", () => {
  it("descodifica entidades", () => {
    expect(descodificarEntidades("a&nbsp;&amp;&#233;&#x20AC;&eacute;&inexistente;")).toBe("a &é€é&inexistente;");
  });
  it("os resultados para a IA vêm numerados", () => {
    expect(resultadosParaTexto([{ titulo: "T", url: "https://a.pt", resumo: "R", fonte: "web" }])).toBe("1. T\n   https://a.pt\n   R");
    expect(resultadosParaTexto([])).toMatch(/Nenhum resultado/);
  });
});

describe("Brave, notícias e resposta direta", () => {
  const brave = `<div class="snippet svelte-x" data-pos="0" data-type="web"><a href="https://br.investing.com/commodities/brent-oil" class="l1"><div class="title search-snippet-title" title="x">Petróleo Brent &amp; Futuros</div></a><div class="generic-snippet"><div class="content desktop"><span>há 2 semanas -</span> O preço de abertura é <strong>109,78.</strong></div></div></div>
  <div class="snippet" data-pos="1" data-type="web"><a href="https://search.brave.com/outro"><div class="title">Interno</div></a></div>
  <div class="snippet" data-pos="2" data-type="web"><a href="https://segundo.pt/x"><div class="title t2">Segundo</div></a><div class="content">Resumo dois</div></div>`;
  it("Brave: título, endereço e resumo, sem os resultados do próprio Brave", () => {
    const r = resultadosDoBrave(brave);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ titulo: "Petróleo Brent & Futuros", url: "https://br.investing.com/commodities/brent-oil", fonte: "web" });
    expect(r[0].resumo).toContain("109,78.");
    expect(r[1]).toMatchObject({ titulo: "Segundo", resumo: "Resumo dois" });
  });
  const rss = `<rss><channel><item><title>Brent sobe 1,26% - Portal Impala</title><link>https://news.google.com/rss/articles/CBMabc?oc=5</link><pubDate>Wed, 28 Oct 2026 20:00:00 GMT</pubDate><source url="https://impala.pt">Portal Impala</source></item><item><title>Sem ligação</title><link>file:///x</link></item></channel></rss>`;
  it("notícias: tira a fonte do título e diz que só se vê o título", () => {
    const r = resultadosDeNoticias(rss);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ titulo: "Brent sobe 1,26%", fonte: "noticias" });
    expect(r[0].resumo).toMatch(/Portal Impala, 2026-10-28/);
  });
  it("resposta direta: o resumo e os temas relacionados", () => {
    const r = resultadosDoDuckDuckGoApi({ Heading: "Angola", AbstractText: "País de África.", AbstractURL: "https://pt.wikipedia.org/wiki/Angola", RelatedTopics: [{ Text: "Luanda - capital", FirstURL: "https://duckduckgo.com/Luanda" }, { Text: "Mau", FirstURL: "http://localhost/x" }] });
    expect(r.map((x) => x.titulo)).toEqual(["Angola", "Luanda - capital"]);
  });
});
