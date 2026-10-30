// Incorporar ligações no texto do blog: um vídeo do YouTube ou do Vimeo, uma faixa do Spotify, um mapa (o endereço ou uma ligação do Google Maps ou do OpenStreetMap) ou, para qualquer outra ligação, um cartão com o endereço. Só se incorporam estes sítios conhecidos (nunca uma página qualquer num «iframe»); o resto fica como cartão. Funções puras.
import { figcaptionHtml, type AspetoDaLegenda } from "./blog-legenda";

export type TipoDeIncorporacao = "youtube" | "vimeo" | "spotify" | "mapa" | "ligacao";

export interface Incorporacao {
  tipo: TipoDeIncorporacao;
  /** O endereço a pôr no «iframe» (vazio num cartão de ligação). */
  src: string;
  /** A proporção do quadro («16 / 9»). */
  proporcao: string;
  /** O que se escreve no cartão ou no título do quadro. */
  titulo: string;
  /** A ligação original (o cartão leva para lá). */
  url: string;
}

const ligacaoSegura = (url: string) => /^https?:\/\//i.test(url);

function analisar(url: string): URL | null {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/** O endereço do mapa incorporado a partir do que se procura («Hotel Miragem, Luanda»). */
export const mapaDe = (procura: string): string => `https://www.google.com/maps?q=${encodeURIComponent(procura.trim())}&output=embed`;

/** O que uma ligação (ou um endereço escrito) é: um vídeo, uma faixa, um mapa ou só uma ligação. `null` se não é nada que se possa usar. */
export function incorporacaoDe(entrada: string): Incorporacao | null {
  const bruto = entrada.trim();
  if (!bruto) return null;
  // uma ligação não tem espaços e tem um ponto («youtu.be/…», «https://…»); o resto é um sítio para o mapa («Hotel Miragem, Luanda»)
  const pareceLigacao = /^https?:\/\/\S+$/i.test(bruto) || /^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(bruto);
  if (!pareceLigacao) return { tipo: "mapa", src: mapaDe(bruto), proporcao: "4 / 3", titulo: bruto, url: `https://www.google.com/maps/search/${encodeURIComponent(bruto)}` };
  const u = analisar(bruto);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, "");
  const url = u.toString();
  if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const id = host === "youtu.be" ? u.pathname.slice(1).split("/")[0] : (u.searchParams.get("v") ?? /^\/(?:embed|shorts|live)\/([\w-]{6,})/.exec(u.pathname)?.[1] ?? "");
    if (/^[\w-]{6,15}$/.test(id)) return { tipo: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}`, proporcao: u.pathname.startsWith("/shorts/") ? "9 / 16" : "16 / 9", titulo: "Vídeo do YouTube", url };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = /(\d{5,})/.exec(u.pathname)?.[1];
    if (id) return { tipo: "vimeo", src: `https://player.vimeo.com/video/${id}`, proporcao: "16 / 9", titulo: "Vídeo do Vimeo", url };
  }
  if (host === "open.spotify.com") {
    const m = /^\/(?:intl-\w+\/)?(track|album|playlist|episode|show|artist)\/(\w+)/.exec(u.pathname);
    if (m) return { tipo: "spotify", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, proporcao: m[1] === "track" || m[1] === "episode" ? "3 / 1" : "1 / 1", titulo: "Spotify", url };
  }
  if ((host === "google.com" || host === "maps.google.com") && (u.pathname.startsWith("/maps") || host === "maps.google.com")) {
    const q = u.searchParams.get("q") ?? u.searchParams.get("query") ?? /\/maps\/(?:place|search)\/([^/@]+)/.exec(u.pathname)?.[1];
    if (q) return { tipo: "mapa", src: mapaDe(decodeURIComponent(q.replace(/\+/g, " "))), proporcao: "4 / 3", titulo: decodeURIComponent(q.replace(/\+/g, " ")), url };
    const coord = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(u.pathname);
    if (coord) return { tipo: "mapa", src: mapaDe(`${coord[1]},${coord[2]}`), proporcao: "4 / 3", titulo: `${coord[1]}, ${coord[2]}`, url };
  }
  if (host === "openstreetmap.org") {
    const m = /#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/.exec(u.hash);
    if (m) return { tipo: "mapa", src: mapaDe(`${m[1]},${m[2]}`), proporcao: "4 / 3", titulo: `${m[1]}, ${m[2]}`, url };
  }
  return ligacaoSegura(url) ? { tipo: "ligacao", src: "", proporcao: "", titulo: host, url } : null;
}

/** Os endereços que se podem pôr num quadro: o HTML guardado pode ser editado, por isso confere-se outra vez antes de o mostrar. */
export const srcPermitido = (src: string): boolean => /^https:\/\/(www\.youtube-nocookie\.com\/embed\/[\w-]{6,15}|player\.vimeo\.com\/video\/\d+|open\.spotify\.com\/embed\/\w+\/\w+|www\.google\.com\/maps\?q=[^"<>\s]*&output=embed)$/.test(src);

/** O HTML de uma incorporação: o quadro («iframe») com a proporção, ou o cartão da ligação. */
export function htmlDaIncorporacao(i: Incorporacao, legenda = "", aspetoDaLegenda?: AspetoDaLegenda): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const nota = figcaptionHtml(legenda ? esc(legenda) : "", aspetoDaLegenda, "center", esc);
  if (i.tipo === "ligacao" || !srcPermitido(i.src)) return `<p style="margin:1em 0"><a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer" style="display:block;padding:.8em 1em;border:1px solid rgba(127,127,127,.5);border-radius:10px;text-decoration:none;color:inherit"><strong>${esc(legenda || i.titulo)}</strong><br><small style="opacity:.7">${esc(i.url)}</small></a></p>`;
  return `<figure style="margin:1em 0"><div style="position:relative;overflow:hidden;border-radius:10px;aspect-ratio:${esc(i.proporcao)}"><iframe src="${esc(i.src)}" title="${esc(i.titulo)}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>${nota}</figure>`;
}
