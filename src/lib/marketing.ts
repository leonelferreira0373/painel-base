// Marketing: construir ligações com parâmetros UTM, ler a origem de um visitante e classificar de onde veio. Funções puras, usadas pelo construtor de campanhas e pelos testes do rastreio.

export interface ParametrosUtm {
  url: string;
  fonte: string;
  meio: string;
  campanha: string;
  termo?: string;
  conteudo?: string;
}

const SEM_ESPACOS = /^[a-z0-9._~-]+$/i;

/** Mensagem de erro para os parâmetros, ou null se servem. Os valores UTM não levam espaços nem acentos, para os relatórios não se partirem. */
export function erroDoUtm(p: ParametrosUtm): string | null {
  try {
    const u = new URL(p.url.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return "O endereço tem de começar por https://.";
  } catch {
    return "Escreva o endereço completo da página, por exemplo https://exemplo.pt/precos.";
  }
  for (const [nome, v] of [["fonte", p.fonte], ["meio", p.meio], ["campanha", p.campanha]] as const) {
    if (!v.trim()) return `Falta a ${nome}.`;
    if (!SEM_ESPACOS.test(v.trim())) return `A ${nome} só pode ter letras sem acento, números, ponto, hífen ou sublinhado (sem espaços).`;
  }
  for (const [nome, v] of [["termo", p.termo], ["conteúdo", p.conteudo]] as const) if (v && !SEM_ESPACOS.test(v.trim())) return `O ${nome} só pode ter letras sem acento, números, ponto, hífen ou sublinhado.`;
  return null;
}

/** O endereço com os parâmetros UTM (mantém os que já lá estavam e troca os UTM antigos). */
export function montarUrlUtm(p: ParametrosUtm): string {
  const u = new URL(p.url.trim());
  for (const k of [...u.searchParams.keys()]) if (k.startsWith("utm_")) u.searchParams.delete(k);
  u.searchParams.set("utm_source", p.fonte.trim());
  u.searchParams.set("utm_medium", p.meio.trim());
  u.searchParams.set("utm_campaign", p.campanha.trim());
  if (p.termo?.trim()) u.searchParams.set("utm_term", p.termo.trim());
  if (p.conteudo?.trim()) u.searchParams.set("utm_content", p.conteudo.trim());
  return u.toString();
}

const MOTORES = ["google.", "bing.", "duckduckgo.", "yahoo.", "ecosia.", "baidu.", "yandex."];
const REDES = ["facebook.", "instagram.", "linkedin.", "twitter.", "x.com", "t.co", "tiktok.", "youtube.", "whatsapp.", "wa.me", "pinterest.", "reddit."];

/** De onde veio um visitante: os parâmetros UTM mandam; sem eles, o endereço de onde veio (referrer) diz se foi pesquisa, rede social ou outro site, e sem nada foi tráfego direto. */
export function origemDoVisitante(referrer: string, utm?: { source?: string; medium?: string }): { fonte: string; meio: string } {
  if (utm?.source) return { fonte: utm.source.toLowerCase(), meio: (utm.medium ?? "nenhum").toLowerCase() };
  if (!referrer.trim()) return { fonte: "direto", meio: "nenhum" };
  let anfitriao = "";
  try {
    anfitriao = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return { fonte: "direto", meio: "nenhum" };
  }
  const base = anfitriao.split(".").slice(-2)[0];
  if (MOTORES.some((m) => `${anfitriao}.`.includes(m))) return { fonte: base, meio: "organico" };
  if (REDES.some((r) => `${anfitriao}.`.includes(r))) return { fonte: base === "t" ? "twitter" : base === "wa" ? "whatsapp" : base, meio: "social" };
  return { fonte: anfitriao, meio: "referencia" };
}

/** A taxa de conversão de uma origem, em fração (0 a 1). */
export const taxaDeConversao = (visitas: number, conversoes: number) => (visitas > 0 ? conversoes / visitas : 0);
