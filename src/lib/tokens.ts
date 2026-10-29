// Os tokens da API do painel, como os da Cloudflare: cada token tem um nome, permissões (uma área ou um módulo, para ler ou para editar), filtros de IP e um prazo de validade. Mostra-se uma única vez, quando se cria ou se roda; o painel guarda só a impressão (SHA-256), o início e o fim. Uma IA usa um token para controlar o painel por inteiro, só pelas APIs: o manifesto de ferramentas diz-lhe o que pode fazer com as permissões que o token tem. Aqui estão as contas puras (permissões, estado, IP, validade, manifesto) e o armazenamento.
"use client";

import { AREAS } from "@/dados/estrutura";
import { ENDPOINTS, type Endpoint } from "./api/contrato";
import { useColecao } from "./api/colecao";

export type Acesso = "ler" | "editar";

export interface PermissaoDeToken {
  /** A área do painel («pagamentos», «dev») ou «*» para todas. */
  area: string;
  /** O módulo («firewall»), ou «*» para todos os da área. */
  modulo: string;
  acesso: Acesso;
}

export interface FiltroDeIp {
  /** «incluir»: só estes endereços; «excluir»: todos menos estes. */
  modo: "incluir" | "excluir";
  /** Endereços IPv4 ou gamas CIDR (203.0.113.0/24). */
  valores: string[];
}

export interface TokenDaApi {
  id: string;
  nome: string;
  /** O início do token («bpt_a1b2c3»), para o reconhecer na lista. */
  prefixo: string;
  fim: string;
  /** A impressão do token (SHA-256 em hexadecimal): o token em si nunca se guarda. */
  impressao: string;
  permissoes: PermissaoDeToken[];
  ips?: FiltroDeIp;
  /** O token só vale a partir daqui (ISO). */
  inicio?: string;
  /** O token deixa de valer aqui (ISO). */
  expira?: string;
  criado: string;
  modificado: string;
  ultimoUso: string | null;
  usos: number;
  revogado?: boolean;
  /** O modelo de onde partiu («agente-ia»). */
  modelo?: string;
}

export const PREFIXO_DO_TOKEN = "bpt_";

// ---------- o que se pode permitir ----------

export interface OpcaoDeRecurso {
  area: string;
  rotuloDaArea: string;
  modulos: { id: string; rotulo: string }[];
}


export const rotuloDaArea = (area: string): string => (area === "*" ? "Todas as áreas" : (RECURSOS.find((r) => r.area === area)?.rotuloDaArea ?? area));
export const rotuloDoModulo = (area: string, modulo: string): string => (modulo === "*" ? "Todos os módulos" : (RECURSOS.find((r) => r.area === area)?.modulos.find((m) => m.id === modulo)?.rotulo ?? modulo));
export const rotuloDoAcesso = (a: Acesso): string => (a === "editar" ? "Editar" : "Ler");

/** Uma permissão em palavras: «Developer tools · Firewall: Editar». */
export const descreverPermissao = (p: PermissaoDeToken): string => `${rotuloDaArea(p.area)}${p.area === "*" ? "" : ` · ${rotuloDoModulo(p.area, p.modulo)}`}: ${rotuloDoAcesso(p.acesso)}`;

/** A lista da tabela: as duas primeiras permissões e quantas mais há. */
export function resumoDasPermissoes(permissoes: PermissaoDeToken[], quantas = 2): { primeiras: string[]; mais: number } {
  return { primeiras: permissoes.slice(0, quantas).map(descreverPermissao), mais: Math.max(0, permissoes.length - quantas) };
}

/** Juntas, as permissões repetidas ou contidas noutras saem (editar já inclui ler; «todos os módulos» inclui cada módulo). */
export function simplificarPermissoes(ps: PermissaoDeToken[]): PermissaoDeToken[] {
  const unicas = ps.filter((p, i) => ps.findIndex((q) => q.area === p.area && q.modulo === p.modulo && q.acesso === p.acesso) === i);
  return unicas.filter((p) => !unicas.some((q) => q !== p && cobre(q, p)));
}

/** A permissão `q` já inclui a `p`? */
function cobre(q: PermissaoDeToken, p: PermissaoDeToken): boolean {
  const area = q.area === "*" || q.area === p.area;
  const modulo = q.modulo === "*" || q.modulo === p.modulo;
  const acesso = q.acesso === "editar" || q.acesso === p.acesso;
  return area && modulo && acesso && !(q.area === p.area && q.modulo === p.modulo && q.acesso === p.acesso);
}

// ---------- os modelos ----------

export interface ModeloDeToken {
  id: string;
  rotulo: string;
  permissoes: PermissaoDeToken[];
}

const tudo = (acesso: Acesso): PermissaoDeToken[] => [{ area: "*", modulo: "*", acesso }];
const area = (a: string, acesso: Acesso): PermissaoDeToken => ({ area: a, modulo: "*", acesso });

export const MODELOS: ModeloDeToken[] = [
  { id: "ler-tudo", rotulo: "Ler tudo", permissoes: tudo("ler") },
  { id: "agente-ia", rotulo: "Agente de IA (controla o painel por inteiro)", permissoes: tudo("editar") },
  { id: "pagamentos", rotulo: "Gerir pagamentos e comprovativos", permissoes: [area("pagamentos", "editar")] },
  { id: "marketing", rotulo: "Gerir o marketing e os e-mails", permissoes: [area("marketing", "editar")] },
  { id: "dns", rotulo: "Editar o DNS", permissoes: [{ area: "dev", modulo: "dns", acesso: "editar" }] },
  { id: "firewall", rotulo: "Gerir o firewall", permissoes: [{ area: "dev", modulo: "firewall", acesso: "editar" }] },
  { id: "logs", rotulo: "Ler os registos do servidor", permissoes: [{ area: "dev", modulo: "logs", acesso: "ler" }, { area: "dev", modulo: "erros", acesso: "ler" }] },
  { id: "tokens", rotulo: "Criar tokens adicionais", permissoes: [{ area: "painel", modulo: "tokens", acesso: "editar" }] },
];

export const modeloPorId = (id: string): ModeloDeToken | undefined => MODELOS.find((m) => m.id === id);

// ---------- o estado ----------

export type EstadoDoToken = "ativo" | "revogado" | "expirado" | "ainda-nao";
export const ROTULO_DO_ESTADO: Record<EstadoDoToken, string> = { ativo: "Ativo", revogado: "Revogado", expirado: "Expirado", "ainda-nao": "Ainda não vale" };

export function estadoDoToken(t: Pick<TokenDaApi, "revogado" | "inicio" | "expira">, agora: Date): EstadoDoToken {
  if (t.revogado) return "revogado";
  if (t.expira && new Date(t.expira).getTime() <= agora.getTime()) return "expirado";
  if (t.inicio && new Date(t.inicio).getTime() > agora.getTime()) return "ainda-nao";
  return "ativo";
}

// ---------- os endereços IP ----------

const octetos = (ip: string): number[] | null => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim());
  if (!m) return null;
  const n = m.slice(1).map(Number);
  return n.every((x) => x <= 255) ? n : null;
};
const comoNumero = (o: number[]) => ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;

/** Um endereço IPv4 («203.0.113.9») ou uma gama CIDR («203.0.113.0/24»). */
export function ipOuGamaValido(v: string): boolean {
  const [ip, bits] = v.trim().split("/");
  if (!octetos(ip)) return false;
  return bits === undefined || (/^\d{1,2}$/.test(bits) && Number(bits) <= 32);
}

/** O endereço está dentro da gama (ou é igual ao endereço)? */
export function ipNaGama(ip: string, gama: string): boolean {
  const o = octetos(ip);
  const [base, bits] = gama.trim().split("/");
  const b = octetos(base);
  if (!o || !b) return false;
  const n = bits === undefined ? 32 : Number(bits);
  if (n === 0) return true;
  const mascara = (0xffffffff << (32 - n)) >>> 0;
  return (comoNumero(o) & mascara) === (comoNumero(b) & mascara);
}

/** Um pedido deste IP é aceite pelo filtro? Sem filtro, é. */
export function ipPermitido(ip: string, filtro?: FiltroDeIp): boolean {
  if (!filtro || filtro.valores.length === 0) return true;
  const dentro = filtro.valores.some((g) => ipNaGama(ip, g));
  return filtro.modo === "incluir" ? dentro : !dentro;
}

// ---------- o que um token pode fazer ----------

const MODULO_DO_CAMINHO: [RegExp, string][] = [
  [/^\/v1\/dev\/saude/, "saude"],
  [/^\/v1\/dev\/pedidos/, "pedidos-web"],
  [/^\/v1\/dev\/erros/, "erros"],
  [/^\/v1\/dev\/logs/, "logs"],
  [/^\/v1\/dev\/bd/, "bd"],
  [/^\/v1\/dev\/backups/, "backups"],
  [/^\/v1\/dev\/limpeza/, "limpeza"],
  [/^\/v1\/dev\/firewall/, "firewall"],
  [/^\/v1\/dev\/dns/, "dns"],
  [/^\/v1\/dev\/paginas/, "paginas"],
  [/^\/v1\/dev\/emails/, "envios"],
  [/^\/v1\/dev\/(implementacoes|github|conectores)/, "implementacoes"],
  [/^\/v1\/pagamentos\/metricas/, "metricas"],
  [/^\/v1\/pagamentos/, "pagamentos"],
  [/^\/v1\/comprovativos/, "comprovativos"],
  [/^\/v1\/contas-bancarias/, "contas"],
  [/^\/v1\/marketing\/campanhas-email/, "campanhas-email"],
  [/^\/v1\/marketing\/emails/, "enviados"],
  [/^\/v1\/painel\/tokens/, "tokens"],
  [/^\/v1\/painel\/(sessoes|atividade|convites)/, "atividade"],
  [/^\/v1\/painel\/reciclagem/, "reciclagem"],
  [/^\/v1\/painel\/notas/, "notas"],
  [/^\/v1\/painel\/configuracao/, "modulos"],
];

/** A que área e módulo pertence um endpoint do contrato (para saber se um token o pode usar). */
export function recursoDoEndpoint(e: Pick<Endpoint, "area" | "caminho">): { area: string; modulo: string } {
  const m = MODULO_DO_CAMINHO.find(([re]) => re.test(e.caminho));
  return { area: e.area, modulo: m?.[1] ?? "*" };
}

/** O que o endpoint pede: ler (GET) ou editar (o resto). */
export const acessoDoEndpoint = (e: Pick<Endpoint, "metodo">): Acesso => (e.metodo === "GET" ? "ler" : "editar");

/** Os módulos que só existem como grupo de APIs, sem uma página com o mesmo nome. */
const ROTULOS_EXTRA: Record<string, string> = { tokens: "Tokens da API", notas: "Notas", logs: "Registos do servidor", reciclagem: "Reciclagem", modulos: "Módulos e pacotes", atividade: "Sessões e atividade" };
const rotuloDaPagina = (modulo: string): string | undefined => AREAS.flatMap((a) => a.modulos).find((m) => m.id === modulo)?.rotulo;

/** As áreas e os módulos a que as APIs do contrato dão acesso: as permissões de um token escolhem-se daqui (só o que tem APIs). */
export const RECURSOS: OpcaoDeRecurso[] = (() => {
  const porArea = new Map<string, Set<string>>();
  for (const e of ENDPOINTS) {
    const r = recursoDoEndpoint(e);
    const s = porArea.get(r.area) ?? new Set<string>();
    if (r.modulo !== "*") s.add(r.modulo);
    porArea.set(r.area, s);
  }
  const ordem = AREAS.map((a) => a.id);
  return [...porArea.entries()]
    .sort(([a], [b]) => ordem.indexOf(a) - ordem.indexOf(b))
    .map(([area, modulos]) => ({ area, rotuloDaArea: AREAS.find((a) => a.id === area)?.rotulo ?? area, modulos: [...modulos].map((id) => ({ id, rotulo: ROTULOS_EXTRA[id] ?? rotuloDaPagina(id) ?? id })) }));
})();

/** O token com estas permissões pode fazer este pedido? */
export function permitePedido(permissoes: PermissaoDeToken[], e: Pick<Endpoint, "area" | "caminho" | "metodo">): boolean {
  const r = recursoDoEndpoint(e);
  const pedido = acessoDoEndpoint(e);
  return permissoes.some((p) => (p.area === "*" || p.area === r.area) && (p.modulo === "*" || p.modulo === r.modulo) && (p.acesso === "editar" || pedido === "ler"));
}

/** Os endpoints que um token com estas permissões pode usar. */
export const endpointsPermitidos = (permissoes: PermissaoDeToken[]): Endpoint[] => ENDPOINTS.filter((e) => permitePedido(permissoes, e));

export interface FerramentaParaIa {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required: string[] };
  "x-painel": { metodo: string; caminho: string; acesso: Acesso };
}

/** Os parâmetros de um endpoint em esquema JSON (o `{id}` do caminho, mais os campos do exemplo do corpo). */
function esquemaDe(e: Endpoint): FerramentaParaIa["input_schema"] {
  const propriedades: Record<string, unknown> = {};
  const obrigatorios: string[] = [];
  for (const [, nome] of e.caminho.matchAll(/\{(\w+)\}/g)) {
    propriedades[nome] = { type: "string", description: `O identificador (${nome}) no caminho.` };
    obrigatorios.push(nome);
  }
  const exemplo = e.exemplo && typeof e.exemplo === "object" && !Array.isArray(e.exemplo) ? (e.exemplo as Record<string, unknown>) : null;
  if (exemplo && e.metodo !== "GET" && e.metodo !== "DELETE") {
    for (const [k, v] of Object.entries(exemplo)) propriedades[k] = { type: typeof v === "number" ? "number" : typeof v === "boolean" ? "boolean" : Array.isArray(v) ? "array" : typeof v === "object" ? "object" : "string", description: `Exemplo: ${JSON.stringify(v).slice(0, 80)}` };
  }
  return { type: "object", properties: propriedades, required: obrigatorios };
}

/** O manifesto de ferramentas para uma IA (no formato das ferramentas da Anthropic, que a OpenAI e outras aceitam com pequenas mudanças): uma ferramenta por pedido que o token permite. */
export function manifestoDeFerramentas(permissoes: PermissaoDeToken[]): FerramentaParaIa[] {
  return endpointsPermitidos(permissoes).map((e) => ({ name: e.id.replace(/[^a-zA-Z0-9_-]/g, "_"), description: `${e.descricao} (${e.metodo} ${e.caminho})`, input_schema: esquemaDe(e), "x-painel": { metodo: e.metodo, caminho: e.caminho, acesso: acessoDoEndpoint(e) } }));
}

// ---------- criar e validar ----------

export interface RascunhoDeToken {
  nome: string;
  permissoes: PermissaoDeToken[];
  ips?: FiltroDeIp;
  inicio?: string;
  expira?: string;
}

export function erroDoRascunho(r: RascunhoDeToken, agora = new Date()): string | null {
  if (!r.nome.trim()) return "O token precisa de um nome.";
  if (r.nome.trim().length > 80) return "O nome tem no máximo 80 letras.";
  if (r.permissoes.length === 0) return "Escolha pelo menos uma permissão.";
  for (const v of r.ips?.valores ?? []) if (!ipOuGamaValido(v)) return `«${v}» não é um endereço IPv4 nem uma gama (por exemplo 203.0.113.0/24).`;
  if (r.ips && r.ips.valores.length === 0) return "O filtro de IP precisa de pelo menos um endereço, ou tire-o.";
  if (r.expira && new Date(r.expira).getTime() <= agora.getTime()) return "O token não pode expirar no passado.";
  if (r.inicio && r.expira && new Date(r.inicio).getTime() >= new Date(r.expira).getTime()) return "O início tem de ser antes do fim.";
  return null;
}

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Um token novo: «bpt_» e 40 letras e números aleatórios (de uma fonte criptográfica). */
export function gerarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  return PREFIXO_DO_TOKEN + [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join("");
}

export async function impressaoDoToken(token: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function novoToken(r: RascunhoDeToken, agora = new Date(), modelo?: string): Promise<{ token: TokenDaApi; segredo: string }> {
  const segredo = gerarToken();
  const iso = agora.toISOString();
  return {
    segredo,
    token: {
      id: `tk-${agora.getTime().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      nome: r.nome.trim(),
      prefixo: segredo.slice(0, PREFIXO_DO_TOKEN.length + 4),
      fim: segredo.slice(-4),
      impressao: await impressaoDoToken(segredo),
      permissoes: simplificarPermissoes(r.permissoes),
      ...(r.ips && r.ips.valores.length ? { ips: r.ips } : {}),
      ...(r.inicio ? { inicio: r.inicio } : {}),
      ...(r.expira ? { expira: r.expira } : {}),
      criado: iso,
      modificado: iso,
      ultimoUso: null,
      usos: 0,
      ...(modelo ? { modelo } : {}),
    },
  };
}

/** Roda um token: um segredo novo no lugar do antigo (que deixa de valer), com as mesmas permissões. */
export async function rodarToken(t: TokenDaApi, agora = new Date()): Promise<{ token: TokenDaApi; segredo: string }> {
  const segredo = gerarToken();
  return { segredo, token: { ...t, prefixo: segredo.slice(0, PREFIXO_DO_TOKEN.length + 4), fim: segredo.slice(-4), impressao: await impressaoDoToken(segredo), modificado: agora.toISOString(), ultimoUso: null, usos: 0, revogado: false } };
}

export interface RespostaDaVerificacao {
  ativo: boolean;
  motivo?: string;
  id?: string;
  nome?: string;
  expira?: string | null;
  permissoes?: string[];
}

/** O que o servidor diria a um pedido com este token (também se usa no «Testar este token» e no servidor de exemplo). */
export async function verificarToken(segredo: string, lista: TokenDaApi[], ip: string | null, agora = new Date()): Promise<RespostaDaVerificacao> {
  if (!segredo.startsWith(PREFIXO_DO_TOKEN)) return { ativo: false, motivo: "Não é um token do painel." };
  const imp = await impressaoDoToken(segredo);
  const t = lista.find((x) => x.impressao === imp);
  if (!t) return { ativo: false, motivo: "O token não existe (ou foi rodado)." };
  const estado = estadoDoToken(t, agora);
  if (estado !== "ativo") return { ativo: false, motivo: `O token está ${ROTULO_DO_ESTADO[estado].toLowerCase()}.`, id: t.id, nome: t.nome };
  if (ip && !ipPermitido(ip, t.ips)) return { ativo: false, motivo: "O endereço IP não é permitido por este token.", id: t.id, nome: t.nome };
  return { ativo: true, id: t.id, nome: t.nome, expira: t.expira ?? null, permissoes: t.permissoes.map(descreverPermissao) };
}

// ---------- guardar ----------

export const CAMINHO_DOS_TOKENS = "/v1/painel/tokens";

/** Os tokens: em modo simulado vivem no navegador; em modo ligado são do servidor. */
export function useTokens() {
  return useColecao<TokenDaApi>(CAMINHO_DOS_TOKENS, "tokens-api", []);
}
