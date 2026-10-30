// As campanhas do Marketing sem escrever nada à mão: cada campo tem opções prontas (onde vai aparecer, que tipo de divulgação, para quê, quando, que versão) e quem sabe o que faz acrescenta a sua. Daqui sai a ligação com os parâmetros UTM, sempre certa: o que se escolhe ou escreve passa a minúsculas, sem acentos nem espaços.
import type { ParametrosUtm } from "./marketing";

/** Escreve um nome como o rastreio o quer: minúsculas, sem acentos e com hífen no lugar de tudo o que não é letra, número, ponto, sublinhado ou til. */
export function slugUtm(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface OpcaoDeCampanha {
  rotulo: string;
  valor: string;
}

/** Os tipos de divulgação (o «meio» do UTM): o que se vê e o nome que o relatório usa. */
export const MEIOS_DE_CAMPANHA: OpcaoDeCampanha[] = [
  { rotulo: "Anúncio pago", valor: "cpc" },
  { rotulo: "Anúncio em rede social", valor: "paid-social" },
  { rotulo: "Publicação", valor: "social" },
  { rotulo: "E-mail", valor: "email" },
  { rotulo: "Mensagem", valor: "mensagem" },
  { rotulo: "Vídeo", valor: "video" },
  { rotulo: "Parceiro", valor: "afiliado" },
  { rotulo: "Banner", valor: "display" },
  { rotulo: "Cartaz ou QR", valor: "qr" },
  { rotulo: "Pesquisa gratuita", valor: "organico" },
];

/** Onde a ligação vai aparecer (a «fonte» do UTM), com o tipo de divulgação que costuma ir com ela, que fica já escolhido. */
export const FONTES_DE_CAMPANHA: (OpcaoDeCampanha & { meio: string })[] = [
  { rotulo: "Google", valor: "google", meio: "Anúncio pago" },
  { rotulo: "Facebook", valor: "facebook", meio: "Anúncio em rede social" },
  { rotulo: "Instagram", valor: "instagram", meio: "Anúncio em rede social" },
  { rotulo: "LinkedIn", valor: "linkedin", meio: "Anúncio em rede social" },
  { rotulo: "TikTok", valor: "tiktok", meio: "Anúncio em rede social" },
  { rotulo: "X", valor: "twitter", meio: "Publicação" },
  { rotulo: "YouTube", valor: "youtube", meio: "Vídeo" },
  { rotulo: "WhatsApp", valor: "whatsapp", meio: "Mensagem" },
  { rotulo: "Newsletter", valor: "newsletter", meio: "E-mail" },
  { rotulo: "Parceiro", valor: "parceiro", meio: "Parceiro" },
  { rotulo: "Cartaz", valor: "cartaz", meio: "Cartaz ou QR" },
];

/** Para que serve a campanha (o nome dela, sem a data). */
export const OBJETIVOS_DE_CAMPANHA = ["Promoção", "Lançamento", "Newsletter", "Black Friday", "Natal", "Webinar", "Recrutamento", "Pedir proposta"];

/** Que versão da mensagem a ligação leva (o «conteúdo» do UTM), para comparar o que funciona melhor. */
export const VARIANTES_DE_CAMPANHA = ["Botão", "Imagem", "Texto", "Vídeo", "Versão A", "Versão B"];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const SEM_DATA = "Sem data";

/** Os períodos que se escolhem: o mês de hoje, o seguinte e «Sem data». */
export function periodosDeCampanha(agora: Date): string[] {
  const a = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
  const nome = (d: Date) => `${MESES[d.getMonth()].charAt(0).toUpperCase()}${MESES[d.getMonth()].slice(1)} de ${d.getFullYear()}`;
  return [nome(a), nome(b), SEM_DATA];
}

/** «Outubro de 2026» → «outubro-2026»; «Sem data» → nada; o que se escreveu → o nome certo. */
export function periodoEmUtm(periodo: string): string {
  if (!periodo || periodo === SEM_DATA) return "";
  const m = /^(\p{L}+) de (\d{4})$/u.exec(periodo.trim());
  return m ? `${slugUtm(m[1])}-${m[2]}` : slugUtm(periodo);
}

/** Tudo o que a pessoa escolhe para uma campanha, com o texto que se vê em cada opção (as pré-feitas e as que escreveu). */
export interface EscolhasDeCampanha {
  /** O site, como «https://exemplo.pt». */
  site: string;
  /** A página: um caminho («/precos») ou um endereço completo. */
  pagina: string;
  fonte: string;
  meio: string;
  objetivo: string;
  periodo: string;
  variante: string;
  palavra: string;
}

export const ESCOLHAS_VAZIAS: EscolhasDeCampanha = { site: "", pagina: "", fonte: "", meio: "", objetivo: "", periodo: "", variante: "", palavra: "" };

/** O site como se guarda: com «https://» e sem a barra do fim. */
export function normalizarSite(texto: string): string {
  const t = texto.trim().replace(/\/+$/, "");
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/** A página como se guarda: um endereço completo fica como está e o resto leva a barra do princípio («promo» → «/promo»). */
export function normalizarPagina(texto: string): string {
  const t = texto.trim();
  if (!t || /^https?:\/\//i.test(t) || t.startsWith("/")) return t;
  return `/${t}`;
}

/** O endereço da página: um caminho junta-se ao site; um endereço completo fica como está. */
export function enderecoDaPagina(site: string, pagina: string): string {
  const p = pagina.trim();
  if (/^https?:\/\//i.test(p)) return p;
  if (!p.startsWith("/") || !site.trim()) return "";
  return `${normalizarSite(site)}${p}`;
}

/** O tipo de divulgação que costuma ir com uma fonte («Google» → «Anúncio pago»); vazio se não houver. */
export const meioHabitual = (fonte: string): string => FONTES_DE_CAMPANHA.find((f) => f.rotulo === fonte)?.meio ?? "";

const valorDe = (opcoes: OpcaoDeCampanha[], rotulo: string) => opcoes.find((o) => o.rotulo === rotulo)?.valor ?? slugUtm(rotulo);

/** O que ainda falta escolher, pelo nome que o campo tem no ecrã. */
export function faltaEscolher(e: EscolhasDeCampanha): string[] {
  const falta: string[] = [];
  if (!e.site.trim()) falta.push("Site");
  if (!enderecoDaPagina(e.site, e.pagina)) falta.push("Página");
  if (!e.fonte.trim()) falta.push("Onde vai aparecer");
  if (!e.meio.trim()) falta.push("Tipo de divulgação");
  if (!e.objetivo.trim()) falta.push("Para quê");
  return falta;
}

/** Os parâmetros UTM do que se escolheu, ou null se ainda falta alguma coisa. */
export function parametrosDeCampanha(e: EscolhasDeCampanha): ParametrosUtm | null {
  if (faltaEscolher(e).length) return null;
  const nome = [valorDe(OBJETIVOS_DE_CAMPANHA.map((o) => ({ rotulo: o, valor: slugUtm(o) })), e.objetivo), periodoEmUtm(e.periodo)].filter(Boolean).join("-");
  const fonte = valorDe(FONTES_DE_CAMPANHA, e.fonte);
  const meio = valorDe(MEIOS_DE_CAMPANHA, e.meio);
  if (!nome || !fonte || !meio) return null;
  return { url: enderecoDaPagina(e.site, e.pagina), fonte, meio, campanha: nome, termo: slugUtm(e.palavra) || undefined, conteudo: slugUtm(e.variante) || undefined };
}
