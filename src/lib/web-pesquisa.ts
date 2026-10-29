// A internet da pesquisa a fundo, do lado do Worker: procurar (DuckDuckGo e Wikipédia, sem chave nenhuma) e ler uma página como texto limpo. Aqui ficam as partes puras (ler os resultados, limpar o HTML, e decidir que endereços se podem abrir: nunca máquinas internas); o Worker (servidor-ia/ia.mjs) é que faz os pedidos.

export interface ResultadoWeb {
  titulo: string;
  url: string;
  resumo: string;
  fonte: "web" | "wikipedia" | "noticias";
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", euro: "€", copy: "©", eacute: "é", aacute: "á", iacute: "í", oacute: "ó", uacute: "ú", atilde: "ã", otilde: "õ", ccedil: "ç", agrave: "à", ecirc: "ê", ocirc: "ô", acirc: "â" };

export function descodificarEntidades(t: string): string {
  return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTIDADES[e.toLowerCase()] ?? m;
  });
}

const semMarcas = (t: string) => descodificarEntidades(t.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();

/** Os endereços que a pesquisa pode abrir: só http e https, nas portas normais, nunca máquinas do próprio servidor nem de redes privadas. */
export function urlPermitida(texto: string): URL | null {
  let u: URL;
  try {
    u = new URL(texto);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "80" && u.port !== "443") return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(".") && !h.includes(":")) return null; // «localhost», nomes simples
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(h)) return null;
  if (/^(0|10|127)\./.test(h) || /^169\.254\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return null;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h.startsWith("::ffff:")) return null;
  if (/^\d+$/.test(h.replace(/\./g, "")) && !/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return null; // endereços escritos em decimal ou hexadecimal
  return u;
}

/** Os resultados da página HTML do DuckDuckGo (título, endereço verdadeiro e resumo). */
export function resultadosDoDuckDuckGo(html: string, max = 6): ResultadoWeb[] {
  const out: ResultadoWeb[] = [];
  const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    let href = descodificarEntidades(m[1]);
    try {
      const u = new URL(href, "https://duckduckgo.com");
      const alvo = u.searchParams.get("uddg");
      href = alvo ? alvo : u.toString();
    } catch {
      continue;
    }
    const permitido = urlPermitida(href);
    if (!permitido || /(^|\.)duckduckgo\.com$/.test(permitido.hostname)) continue;
    const resto = html.slice(m.index + m[0].length, m.index + m[0].length + 3500);
    const s = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(resto) ?? /<td[^>]*class="[^"]*result-snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/i.exec(resto);
    out.push({ titulo: semMarcas(m[2]).slice(0, 200), url: permitido.toString(), resumo: s ? semMarcas(s[1]).slice(0, 400) : "", fonte: "web" });
  }
  return out;
}

/** Os resultados da página de pesquisa do Brave (um bloco `data-type="web"` por resultado). */
export function resultadosDoBrave(html: string, max = 6): ResultadoWeb[] {
  const out: ResultadoWeb[] = [];
  const marcas = [...html.matchAll(/<div[^>]*class="snippet[^"]*"[^>]*data-type="web"/g)].map((m) => m.index ?? 0);
  for (let i = 0; i < marcas.length && out.length < max; i++) {
    const bloco = html.slice(marcas[i], marcas[i + 1] ?? marcas[i] + 6000);
    const href = /<a[^>]*href="(https?:\/\/[^"]+)"/i.exec(bloco)?.[1];
    const permitido = href ? urlPermitida(descodificarEntidades(href)) : null;
    if (!permitido || /(^|\.)brave\.com$/.test(permitido.hostname)) continue;
    const titulo = /<div[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(bloco)?.[1];
    const conteudo = /<div[^>]*class="content[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(bloco)?.[1];
    out.push({ titulo: semMarcas(titulo ?? permitido.hostname).slice(0, 200), url: permitido.toString(), resumo: semMarcas(conteudo ?? "").slice(0, 400), fonte: "web" });
  }
  return out;
}

/** As notícias de um feed RSS do Google Notícias: título, fonte e data (a ligação é a do Google, que leva à notícia). */
export function resultadosDeNoticias(xml: string, max = 4): ResultadoWeb[] {
  const out: ResultadoWeb[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    if (out.length >= max) break;
    const item = m[1];
    const campo = (c: string) => semMarcas(new RegExp(`<${c}[^>]*>([\\s\\S]*?)</${c}>`, "i").exec(item)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "") ?? "");
    const url = campo("link");
    if (!urlPermitida(url)) continue;
    const fonte = campo("source");
    const data = campo("pubDate");
    const completo = campo("title");
    const titulo = fonte && completo.endsWith(` - ${fonte}`) ? completo.slice(0, -(fonte.length + 3)) : completo;
    out.push({ titulo: titulo.slice(0, 200), url, resumo: `Notícia${fonte ? ` de ${fonte}` : ""}${data ? `, ${new Date(data).toISOString().slice(0, 10)}` : ""}. Só se vê o título: a página não se lê aqui.`, fonte: "noticias" });
  }
  return out;
}

/** A resposta direta («instant answer») do DuckDuckGo, que não pede captcha: o resumo e os temas relacionados. */
export function resultadosDoDuckDuckGoApi(dados: unknown, max = 3): ResultadoWeb[] {
  const d = dados as { Heading?: string; AbstractText?: string; AbstractURL?: string; RelatedTopics?: { Text?: string; FirstURL?: string; Topics?: unknown[] }[] };
  const out: ResultadoWeb[] = [];
  const url = d?.AbstractURL ? urlPermitida(d.AbstractURL) : null;
  if (url && d.AbstractText) out.push({ titulo: String(d.Heading ?? url.hostname).slice(0, 200), url: url.toString(), resumo: String(d.AbstractText).slice(0, 500), fonte: "web" });
  for (const r of d?.RelatedTopics ?? []) {
    if (out.length >= max) break;
    const u = r.FirstURL ? urlPermitida(r.FirstURL) : null;
    if (u && r.Text) out.push({ titulo: String(r.Text).slice(0, 90), url: u.toString(), resumo: String(r.Text).slice(0, 400), fonte: "web" });
  }
  return out;
}

/** Os resultados da API da Wikipédia (`generator=search` com `prop=extracts|info`). */
export function resultadosDaWikipedia(dados: unknown, lingua: string, max = 3): ResultadoWeb[] {
  const paginas = (dados as { query?: { pages?: Record<string, { title?: string; extract?: string; fullurl?: string; index?: number }> } })?.query?.pages;
  if (!paginas || typeof paginas !== "object") return [];
  return Object.values(paginas)
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
    .slice(0, max)
    .filter((p) => p.title && p.fullurl)
    .map((p) => ({ titulo: `${p.title} — Wikipédia (${lingua})`, url: String(p.fullurl), resumo: String(p.extract ?? "").replace(/\s+/g, " ").trim().slice(0, 500), fonte: "wikipedia" as const }));
}

export interface PaginaLida {
  titulo: string;
  descricao: string;
  texto: string;
}

/** O texto de uma página: sem scripts, estilos, menus nem rodapés, com os parágrafos e as listas em linhas. */
export function textoDaPagina(html: string, max = 6500): PaginaLida {
  const titulo = semMarcas(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").slice(0, 200);
  const descricao = semMarcas(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1] ?? /<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["'](?:description|og:description)["']/i.exec(html)?.[1] ?? "").slice(0, 400);
  let corpo = /<(article|main)[\s>][\s\S]*<\/\1>/i.exec(html)?.[0] ?? /<body[\s\S]*<\/body>/i.exec(html)?.[0] ?? html;
  corpo = corpo
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|header|footer|form|iframe|aside|template|button|select)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|tr|h[1-6]|blockquote|article|ul|ol|table)>/gi, "\n")
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<h([1-6])[^>]*>/gi, "\n## ")
    .replace(/<[^>]*>/g, " ");
  const linhas = descodificarEntidades(corpo)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l, i, a) => l.length > 1 && !(l.length < 3 && a[i - 1] === l));
  let texto = linhas.join("\n");
  if (texto.length > max) texto = `${texto.slice(0, max).replace(/\s\S*$/, "")}…`;
  return { titulo, descricao, texto };
}

/** O resultado de procurar, em texto curto para a IA ler (numerado). */
export function resultadosParaTexto(r: ResultadoWeb[]): string {
  return r.length ? r.map((x, i) => `${i + 1}. ${x.titulo}\n   ${x.url}\n   ${x.resumo}`).join("\n") : "Nenhum resultado: tenta outras palavras.";
}
