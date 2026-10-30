import { describe, expect, it } from "vitest";
import { artigoNovo } from "./blog";
import { cabecalhoHtml, dataDeLeitura, htmlDoArtigo, leituraHtml, markdownParaHtml, mostrarImagens, paraHtml, primeiraImagemDoHtml, seoAutomatico, seoDoArtigo, textoDoHtml } from "./blog-html";

const agora = "2026-10-29T10:00:00.000Z";
const artigo = (parcial = {}) => ({ ...artigoNovo("a1", agora), titulo: "Olá, Mundo!", ...parcial });

describe("texto do HTML", () => {
  it("tira as etiquetas e separa os parágrafos", () => {
    expect(textoDoHtml("<h2>Título</h2><p>Um <strong>forte</strong> &amp; claro.</p><ul><li>a</li><li>b</li></ul>")).toBe("Título Um forte & claro. a b");
  });
  it("acha a primeira imagem da biblioteca", () => {
    expect(primeiraImagemDoHtml('<p>x</p><img data-bib="i1" alt=""><img data-bib="i2">')).toBe("i1");
    expect(primeiraImagemDoHtml("<p>sem imagens</p>")).toBeUndefined();
  });
});

describe("Markdown antigo para HTML", () => {
  it("converte títulos, listas, citações e o texto em linha", () => {
    const html = markdownParaHtml("# Grande\n\n## Médio\n\nTexto **forte**, *itálico* e `código`.\n\n- um\n- dois\n\n1. a\n2. b\n\n> citação\n\n---");
    expect(html).toContain("<h2>Grande</h2>");
    expect(html).toContain("<h3>Médio</h3>");
    expect(html).toContain("<p>Texto <strong>forte</strong>, <em>itálico</em> e <code>código</code>.</p>");
    expect(html).toContain("<ul><li><p>um</p></li><li><p>dois</p></li></ul>");
    expect(html).toContain("<ol><li><p>a</p></li><li><p>b</p></li></ol>");
    expect(html).toContain("<blockquote><p>citação</p></blockquote>");
    expect(html).toContain("<hr>");
  });
  it("escapa o HTML escrito à mão e só deixa ligações seguras", () => {
    const html = markdownParaHtml("<script>x</script> [bom](https://a.pt) [mau](javascript:alert(1))");
    expect(html).not.toContain("<script>");
    expect(html).toContain('<a href="https://a.pt">bom</a>');
    expect(html).not.toContain("javascript:");
  });
  it("tira as imagens da biblioteca de dentro do parágrafo", () => {
    expect(markdownParaHtml("Antes ![foto](biblioteca:i9) depois")).toBe('<p>Antes</p><img data-bib="i9" alt="foto"><p>depois</p>');
  });
  it("um artigo com HTML usa-o; um antigo usa o Markdown", () => {
    expect(htmlDoArtigo({ html: "<p>novo</p>", conteudo: "antigo" })).toBe("<p>novo</p>");
    expect(htmlDoArtigo({ html: undefined, conteudo: "antigo" })).toBe("<p>antigo</p>");
  });
});

describe("SEO automático", () => {
  it("faz o título, a descrição, o endereço e a imagem sozinho", () => {
    const a = artigo({ conteudo: "Um texto bem escrito. ".repeat(20), html: '<p>x</p><img data-bib="i1">' });
    const s = seoAutomatico(a);
    expect(s).toMatchObject({ titulo: "Olá, Mundo!", endereco: "ola-mundo", imagem: "i1", indexar: true });
    expect(s.descricao.length).toBeLessThanOrEqual(155);
    expect(s.descricao.endsWith("…")).toBe(true);
  });
  it("a capa ganha à primeira imagem do texto e os campos escritos ganham ao automático", () => {
    const a = artigo({ conteudo: "Texto.", html: '<img data-bib="i1">', capa: "c1" });
    expect(seoAutomatico(a).imagem).toBe("c1");
    const s = seoDoArtigo({ ...a, resumo: "O meu resumo", slug: "meu-endereco", seo: { titulo: "Título para a pesquisa", indexar: false } });
    expect(s).toMatchObject({ titulo: "Título para a pesquisa", descricao: "O meu resumo", endereco: "meu-endereco", imagem: "c1", indexar: false });
  });
  it("corta o título comprido sem partir palavras", () => {
    const s = seoAutomatico(artigo({ titulo: "palavra ".repeat(20) }));
    expect(s.titulo.length).toBeLessThanOrEqual(60);
    expect(s.titulo.endsWith("…")).toBe(true);
  });
});

describe("mostrar e exportar", () => {
  it("põe o endereço, a largura e o alinhamento nas imagens", () => {
    const html = mostrarImagens('<img src="biblioteca:i1" data-bib="i1" alt="Foto" data-largura="50" data-alinhar="direita"><img data-bib="falta">', (id) => (id === "i1" ? "blob:x" : undefined));
    expect(html).toContain('src="blob:x"');
    expect(html).toContain("width:50%");
    expect(html).toContain("margin:1em 0 1em auto");
    expect(html).not.toContain("falta");
  });
  it("o ficheiro HTML leva o SEO e a partilha no cabeçalho", () => {
    const a = artigo({ conteudo: "Texto do artigo.", html: "<p>Texto do artigo.</p>", etiquetas: ["a", "b"], capa: "c1", seo: { indexar: false } });
    const f = paraHtml(a, (id) => (id === "c1" ? "data:image/png;base64,AA" : undefined), "https://exemplo.pt/blog/ola-mundo");
    expect(f).toContain("<title>Olá, Mundo!</title>");
    expect(f).toContain('<meta name="description" content="Texto do artigo.">');
    expect(f).toContain('<meta name="robots" content="noindex,nofollow">');
    expect(f).toContain('<meta property="og:image" content="data:image/png;base64,AA">');
    expect(f).toContain('<link rel="canonical" href="https://exemplo.pt/blog/ola-mundo">');
    expect(f).toContain('<meta name="keywords" content="a, b">');
    expect(f).toContain("Olá, Mundo!</h1>");
    expect(f).toContain("<article class=\"blog-corpo\">");
    expect(f).toContain("p.capitular::first-letter");
  });
});

describe("figuras, colagens e ficheiros", () => {
  const urlDe = (id: string) => ({ i1: "blob:a", i2: "blob:b", i3: "blob:c", f1: "blob:f" })[id as "i1"];
  it("a legenda fica por baixo da imagem, como nos livros", () => {
    const html = mostrarImagens('<img src="biblioteca:i1" data-bib="i1" alt="Mapa" data-largura="80" data-alinhar="centro" data-legenda="Figura 1: o mapa da região">', urlDe);
    expect(html).toContain("<figcaption");
    expect(html).toContain("Figura 1: o mapa da região</figcaption>");
    expect(html).toContain("width:80%");
    expect(mostrarImagens('<img data-bib="i1" alt="">', urlDe)).not.toContain("figcaption");
  });
  it("a colagem vira uma grelha, com os formatos prontos e a legenda", () => {
    const col = (modelo: string) => `<div data-colagem="" data-modelo="${modelo}" data-ids="i1,i2,i3" data-alt="Fotos" data-legenda="As três vistas"><img src="biblioteca:i1" data-bib-colagem="i1"></div>`;
    expect(mostrarImagens(col("topo"), urlDe)).toContain("grid-column:span 2");
    expect(mostrarImagens(col("carrossel"), urlDe)).toContain("scroll-snap-type:x mandatory");
    expect(mostrarImagens(col("quatro"), urlDe)).toContain("repeat(2, 1fr)");
    expect(mostrarImagens(col("seis"), urlDe)).toContain("repeat(3, 1fr)");
    expect(mostrarImagens(col("duas"), urlDe)).toContain("As três vistas</figcaption>");
    expect((mostrarImagens(col("duas"), urlDe).match(/<img/g) ?? []).length).toBe(3);
  });
  it("o áudio, o vídeo e os documentos da biblioteca ganham o seu leitor ou botão", () => {
    expect(mostrarImagens('<div data-ficheiro="audio" data-id="f1" data-nome="entrevista.mp3" data-legenda=""></div>', urlDe)).toContain("<audio controls");
    expect(mostrarImagens('<div data-ficheiro="video" data-id="f1" data-nome="clip.mp4" data-legenda="O clip"></div>', urlDe)).toContain("O clip</figcaption>");
    const doc = mostrarImagens('<div data-ficheiro="documento" data-id="f1" data-nome="relatorio.pdf" data-tamanho="2048000"></div>', urlDe);
    expect(doc).toContain('download="relatorio.pdf"');
    expect(doc).toContain("2.0 MB");
    expect(mostrarImagens('<div data-ficheiro="audio" data-id="falta" data-nome="x.mp3"></div>', urlDe)).toBe("");
  });
  it("o cabeçalho leva o título ao centro, as linhas e o subtítulo", () => {
    const h = cabecalhoHtml({ titulo: "Os números", cabecalho: { centrado: true, linhas: true, subtitulo: "Da liderança à vice-presidência", fonte: '"Playfair Display", serif' } });
    expect(h).toContain("text-align:center");
    expect(h).toContain("border-top:1px solid");
    expect(h).toContain("Da liderança à vice-presidência");
    expect(h).toContain("Playfair Display");
  });
  it("a página de leitura tem o caminho, o título, a linha de dados, a capa e o texto", () => {
    const a = artigo({ titulo: "Do sistema à prateleira", conteudo: "um dois três", html: "<p>um dois três</p>", etiquetas: ["ESL", "Lojas"], capa: "c1", publicado: "2026-10-19T10:00:00.000Z" });
    const h = leituraHtml(a, (id) => (id === "c1" ? "data:image/png;base64,AA" : undefined), [{ rotulo: "Início", href: "/" }, { rotulo: "Notícias", href: "/blog" }]);
    expect(h).toContain('<li><a href="/">Início</a></li>');
    expect(h).toContain('<li aria-current="page">Do sistema à prateleira</li>');
    expect(h).toContain("Do sistema à prateleira</h1>");
    expect(h).toContain("ESL, Lojas · 19 de outubro de 2026 · 1 min de leitura");
    expect(h).toContain('<figure class="leitura-capa"><img src="data:image/png;base64,AA"');
    expect(h).toContain('<article class="blog-corpo">');
    expect(h.indexOf("leitura-migalhas")).toBeLessThan(h.indexOf("<h1"));
    expect(h.indexOf("<h1")).toBeLessThan(h.indexOf("leitura-nota"));
    expect(h.indexOf("leitura-nota")).toBeLessThan(h.indexOf("leitura-capa"));
  });
  it("sem capa nem etiquetas a página de leitura não deixa buracos", () => {
    const h = leituraHtml(artigo({ conteudo: "texto", html: "<p>texto</p>", etiquetas: [] }), () => undefined);
    expect(h).not.toContain("leitura-capa");
    expect(h).not.toMatch(/^ ·|· ·|·\s*<\/p>/m);
    expect(dataDeLeitura("isto não é uma data")).toBe("");
  });
});
