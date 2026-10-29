import { describe, expect, it } from "vitest";
import { anexosUsados, cifrarBytes, cifrarConteudo, decifrarBytes, decifrarConteudo, destinatarioDoLembrete, emailDoLembrete, erroDaNota, euSou, expirou, haTempo, notaVisivel, notasDoSitio, paraMim, sanitizarHtml, textoDaExpiracao, textoDeHtml, type Nota } from "./notas";

const agora = new Date("2026-10-29T12:00:00.000Z");
const nota = (p: Partial<Nota> = {}): Nota => ({
  id: "n1",
  alvo: { tipo: "kpi", chave: "pagamentos/metricas:volume", rotulo: "Volume confirmado", pagina: "/pagamentos/metricas/" },
  autor: "Ana Costa",
  autorEmail: "ana@empresa.pt",
  para: [],
  cor: "amarelo",
  criada: "2026-10-29T10:00:00.000Z",
  atualizada: "2026-10-29T10:00:00.000Z",
  corpo: "<p>Rever o valor</p>",
  texto: "Rever o valor",
  anexos: [],
  lembretes: [],
  ...p,
});

describe("sanitizarHtml", () => {
  it("deixa a formatação e as listas", () => {
    expect(sanitizarHtml("<p>Olá <strong>mundo</strong> e <em>tu</em></p><ul><li>um</li><li>dois</li></ul><h2>Título</h2>")).toBe("<p>Olá <strong>mundo</strong> e <em>tu</em></p><ul><li>um</li><li>dois</li></ul><h2>Título</h2>");
  });
  it("tira o que é perigoso", () => {
    expect(sanitizarHtml('<p onclick="x()">oi</p><script>alert(1)</script><img src=x onerror=alert(1)><iframe src="//mau"></iframe>fim')).toBe("<p>oi</p>fim");
    expect(sanitizarHtml('<a href="javascript:alert(1)">mau</a>')).toBe("<a>mau</a>");
    expect(sanitizarHtml('<a href=" JaVa\nScript:alert(1)">mau</a>')).toBe("<a>mau</a>");
    expect(sanitizarHtml('<style>p{}</style><svg onload=x><circle/></svg>texto')).toBe("texto");
  });
  it("as ligações boas abrem fora, sem referrer", () => {
    expect(sanitizarHtml('<a href="https://exemplo.com/a?b=1&c=2" style="color:red">ver</a>')).toBe('<a href="https://exemplo.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">ver</a>');
    expect(sanitizarHtml('<a href="mailto:a@b.pt">e-mail</a>')).toContain('href="mailto:a@b.pt"');
  });
  it("os ficheiros ficam só pelo identificador", () => {
    expect(sanitizarHtml('<img data-anexo="abc123" src="blob:xyz" onerror="x" alt="foto"><audio data-anexo="som-1" src="https://mau"></audio>')).toBe('<img data-anexo="abc123" alt="foto"><audio data-anexo="som-1" controls></audio>');
    expect(sanitizarHtml('<a data-anexo="doc-9" data-nome="Relatório.pdf" href="https://x.pt">Relatório.pdf</a>')).toBe('<a data-anexo="doc-9" data-nome="Relatório.pdf" class="nota-anexo">Relatório.pdf</a>');
    expect(sanitizarHtml('<img data-anexo="../../x"><audio></audio>')).toBe("");
  });
  it("fecha o que ficou aberto e protege um < solto", () => {
    expect(sanitizarHtml("<p><strong>aberto")).toBe("<p><strong>aberto</strong></p>");
    expect(sanitizarHtml("1 < 2 e 3 > 2")).toBe("1 &lt; 2 e 3 &gt; 2");
    expect(sanitizarHtml("<p>a</div></p>")).toBe("<p>a</p>");
  });
});

describe("texto e ficheiros", () => {
  it("o texto simples tem linhas e listas", () => {
    expect(textoDeHtml("<h2>Título</h2><p>Um &amp; dois</p><ul><li>a</li><li>b</li></ul>")).toBe("Título\nUm & dois\n- a\n- b");
  });
  it("conta os ficheiros usados, sem repetir", () => {
    expect(anexosUsados('<img data-anexo="a1"><audio data-anexo="b2"></audio><img data-anexo="a1">')).toEqual(["a1", "b2"]);
  });
});

describe("quem vê e quando acaba", () => {
  const eu = { nome: "Rui Matos", email: "rui@empresa.pt", funcao: "Analista de dados" };
  const dona = { nome: "Ana Costa", email: "ana@empresa.pt", funcao: "Administrador" };
  it("sem destinatários vê toda a gente; com eles, só eles e a autora", () => {
    expect(notaVisivel(nota(), eu, agora)).toBe(true);
    expect(notaVisivel(nota({ para: ["Rui Matos"] }), eu, agora)).toBe(true);
    expect(notaVisivel(nota({ para: ["rui@empresa.pt"] }), eu, agora)).toBe(true);
    expect(notaVisivel(nota({ para: ["Analista de dados"] }), eu, agora)).toBe(true);
    expect(notaVisivel(nota({ para: ["Outra Pessoa"] }), eu, agora)).toBe(false);
    expect(notaVisivel(nota({ para: ["Outra Pessoa"] }), dona, agora)).toBe(true);
    expect(euSou(nota(), dona)).toBe(true);
    expect(paraMim(nota({ para: ["Outra Pessoa"] }), eu)).toBe(false);
  });
  it("a nota expirada só a vê a autora", () => {
    const velha = nota({ expira: "2026-10-29T11:00:00.000Z" });
    expect(expirou(velha, agora)).toBe(true);
    expect(notaVisivel(velha, eu, agora)).toBe(false);
    expect(notaVisivel(velha, dona, agora)).toBe(true);
    expect(expirou(nota({ expira: "2026-10-30T00:00:00.000Z" }), agora)).toBe(false);
    expect(expirou(nota(), agora)).toBe(false);
  });
  it("as notas de um sítio vêm da mais recente para a mais antiga", () => {
    const l = [nota({ id: "a", atualizada: "2026-10-29T09:00:00.000Z" }), nota({ id: "b", atualizada: "2026-10-29T11:00:00.000Z" }), nota({ id: "c", alvo: { tipo: "kpi", chave: "outro", rotulo: "x", pagina: "/" } })];
    expect(notasDoSitio(l, "pagamentos/metricas:volume").map((n) => n.id)).toEqual(["b", "a"]);
  });
  it("as notas afixadas ficam no topo, e em cada grupo as mais recentes primeiro", () => {
    const l = [nota({ id: "a", atualizada: "2026-10-29T09:00:00.000Z", afixada: true }), nota({ id: "b", atualizada: "2026-10-29T11:00:00.000Z" }), nota({ id: "c", atualizada: "2026-10-29T10:00:00.000Z", afixada: true }), nota({ id: "d", atualizada: "2026-10-29T12:00:00.000Z" })];
    expect(notasDoSitio(l, "pagamentos/metricas:volume").map((n) => n.id)).toEqual(["c", "a", "d", "b"]);
  });
  it("escreve-se em palavras", () => {
    expect(haTempo("2026-10-29T11:55:00.000Z", agora)).toBe("há 5 min");
    expect(haTempo("2026-10-29T09:00:00.000Z", agora)).toBe("há 3 h");
    expect(haTempo("2026-10-26T12:00:00.000Z", agora)).toBe("há 3 d");
    expect(textoDaExpiracao("2026-10-29T12:30:00.000Z", agora)).toBe("Expira em 30 min");
    expect(textoDaExpiracao("2026-10-31T12:00:00.000Z", agora)).toBe("Expira em 2 d");
    expect(textoDaExpiracao("2026-10-29T11:00:00.000Z", agora)).toBe("Expirada");
  });
});

describe("a palavra-passe", () => {
  const conteudo = { corpo: "<p>Segredo</p>", texto: "Segredo", anexos: [{ id: "a1", nome: "foto.png", tipo: "image/png", tamanho: 10 }] };
  it("cifra e decifra, e a cifra não deixa ver o texto", async () => {
    const { cifra } = await cifrarConteudo(conteudo, "palavra-passe-certa");
    expect(JSON.stringify(cifra)).not.toContain("Segredo");
    const r = await decifrarConteudo(cifra, "palavra-passe-certa");
    expect(r?.conteudo).toEqual(conteudo);
  });
  it("com a palavra-passe errada não abre", async () => {
    const { cifra } = await cifrarConteudo(conteudo, "palavra-passe-certa");
    expect(await decifrarConteudo(cifra, "errada")).toBeNull();
    expect(await decifrarConteudo({ ...cifra, dados: cifra.dados.slice(0, -4) + "AAAA" }, "palavra-passe-certa")).toBeNull();
  });
  it("os ficheiros cifram-se com a mesma chave", async () => {
    const { cifra, chave } = await cifrarConteudo(conteudo, "x1y2z3");
    const bytes = new Uint8Array([1, 2, 3, 250, 251]);
    const c = await cifrarBytes(chave, bytes);
    expect(new Uint8Array(c.dados)).not.toEqual(bytes);
    const aberto = await decifrarConteudo(cifra, "x1y2z3");
    expect(new Uint8Array((await decifrarBytes(aberto!.chave, c.iv, c.dados))!)).toEqual(bytes);
    expect(await decifrarBytes(aberto!.chave, c.iv, new Uint8Array(c.dados).slice(1))).toBeNull();
  }, 20_000);
});

describe("os lembretes por e-mail", () => {
  const l = { id: "l1", quando: "2026-10-30T09:00:00.000Z", para: "dono" };
  it("o dono é o autor; senão o e-mail escolhido", () => {
    expect(destinatarioDoLembrete(nota(), l)).toBe("ana@empresa.pt");
    expect(destinatarioDoLembrete(nota(), { ...l, para: "rui@empresa.pt" })).toBe("rui@empresa.pt");
  });
  it("o e-mail entra na fila dos agendados, com a ligação e o texto", () => {
    const e = emailDoLembrete(nota(), l, "https://painel.exemplo.com/", "Painel <nao-responder@exemplo.com>", null);
    expect(e).toMatchObject({ id: "em-nota-n1-l1", pasta: "agendados", estado: "Agendado", para: "ana@empresa.pt", data: "2026-10-30T09:00:00.000Z" });
    expect(e.assunto).toContain("Volume confirmado");
    expect(e.corpo).toContain("Rever o valor");
    expect(e.corpo).toContain("https://painel.exemplo.com/pagamentos/metricas/");
  });
  it("uma nota com palavra-passe nunca mostra o texto no e-mail", () => {
    const e = emailDoLembrete(nota({ corpo: "", texto: "", cifra: { sal: "", iv: "", dados: "" } }), l, "https://p.pt", "x@y.pt", "Segredo");
    expect(e.corpo).toContain("protegida por palavra-passe");
    expect(e.corpo).not.toContain("Segredo");
  });
});

describe("erroDaNota", () => {
  const base = { corpo: "<p>x</p>", para: [], lembretes: [] };
  it("pede texto ou um ficheiro", () => {
    expect(erroDaNota({ ...base, corpo: "<p></p>" }, false, agora)).toMatch(/Escreva/);
    expect(erroDaNota({ ...base, corpo: "" }, true, agora)).toBeNull();
  });
  it("a expiração e os lembretes têm de ser no futuro e de fazer sentido", () => {
    expect(erroDaNota({ ...base, expira: "2026-10-29T11:00:00.000Z" }, false, agora)).toMatch(/passado/);
    expect(erroDaNota({ ...base, lembretes: [{ id: "1", quando: "2026-10-29T11:00:00.000Z", para: "dono" }] }, false, agora)).toMatch(/futuro/);
    expect(erroDaNota({ ...base, lembretes: [{ id: "1", quando: "2026-10-30T11:00:00.000Z", para: "sem-arroba" }] }, false, agora)).toMatch(/não é válido/);
    expect(erroDaNota({ ...base, expira: "2026-10-30T00:00:00.000Z", lembretes: [{ id: "1", quando: "2026-10-31T11:00:00.000Z", para: "dono" }] }, false, agora)).toMatch(/depois de a nota expirar/);
    expect(erroDaNota({ ...base, expira: "2026-11-30T00:00:00.000Z", lembretes: [{ id: "1", quando: "2026-10-31T11:00:00.000Z", para: "a@b.pt" }] }, false, agora)).toBeNull();
  });
});
