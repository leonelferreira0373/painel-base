// Os registos do servidor, como os do Render: as linhas que o servidor escreve (o processo do site, os contentores Docker, os ficheiros de registo, o journald de um VPS, o Cloudflare Workers) a chegarem em direto, com o nível, a fonte e a hora de cada uma, pesquisa, filtros e descarregar. Em modo ligado vêm do servidor (/v1/dev/logs); em modo simulado geram-se linhas de demonstração (marcadas como simuladas). Aqui estão as contas puras: classificar uma linha, juntar as novas às que já se têm, filtrar, escrever e gerar as de demonstração.

export type NivelDeLog = "debug" | "info" | "aviso" | "erro";
export const NIVEIS: NivelDeLog[] = ["debug", "info", "aviso", "erro"];
export const ROTULO_DO_NIVEL: Record<NivelDeLog, string> = { debug: "Depuração", info: "Informação", aviso: "Aviso", erro: "Erro" };

export interface LinhaDeLog {
  /** Cresce sempre (com zeros à esquerda): serve de ponto de leitura («dá-me o que veio depois de…»). */
  id: string;
  /** Quando o servidor escreveu a linha (ISO). */
  quando: string;
  nivel: NivelDeLog;
  /** De onde veio («web», «docker:db», «/var/log/nginx/error.log»). */
  fonte: string;
  texto: string;
}

export type TipoDeFonte = "processo" | "docker" | "ficheiro" | "journald" | "cloudflare" | "simulada";

export interface FonteDeLogs {
  id: string;
  rotulo: string;
  tipo: TipoDeFonte;
  /** O ambiente em palavras: «VPS», «Cloudflare», «Demonstração». */
  ambiente: string;
  ativa: boolean;
}

export const ROTULO_DO_TIPO_DE_FONTE: Record<TipoDeFonte, string> = { processo: "Processo", docker: "Contentor Docker", ficheiro: "Ficheiro", journald: "journald", cloudflare: "Cloudflare Workers", simulada: "Demonstração" };

// ---------- o nível de uma linha crua ----------

/** Adivinha o nível de uma linha de texto: palavras de erro, o estado HTTP de um pedido e os níveis que muitos programas escrevem à cabeça. */
export function nivelDoTexto(t: string): NivelDeLog {
  const s = t.toLowerCase();
  if (/\b(fatal|panic|critical|crit|error|erro|exception|traceback|segfault|unhandled|econnrefused|failed|falhou)\b/.test(s)) return "erro";
  const http = /(?:^|\s)(?:"[a-z]+ [^"]*"|[a-z]+ \/\S*)\s+(\d{3})\b/.exec(s) ?? /\bstatus[= :]+(\d{3})\b/.exec(s);
  if (http) {
    const c = Number(http[1]);
    if (c >= 500) return "erro";
    if (c >= 400) return "aviso";
  }
  if (/\b(warn|warning|aviso|deprecated|timeout|retry|slow)\b/.test(s)) return "aviso";
  if (/\b(debug|trace|verbose)\b/.test(s)) return "debug";
  return "info";
}

// ---------- juntar e filtrar ----------

export const MAXIMO_DE_LINHAS = 3000;

/** Junta as linhas novas às que já se têm: sem repetir, por ordem do id e só as últimas `maximo`. */
export function juntarLinhas(atuais: LinhaDeLog[], novas: LinhaDeLog[], maximo = MAXIMO_DE_LINHAS): LinhaDeLog[] {
  if (novas.length === 0) return atuais;
  const vistos = new Set(atuais.map((l) => l.id));
  const todas = [...atuais, ...novas.filter((l) => !vistos.has(l.id))].sort((a, b) => a.id.localeCompare(b.id));
  return todas.length > maximo ? todas.slice(todas.length - maximo) : todas;
}

export interface FiltroDeLogs {
  niveis?: ReadonlySet<NivelDeLog>;
  fontes?: ReadonlySet<string>;
  texto?: string;
}

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** As linhas que passam nos filtros: os níveis e as fontes escolhidos (vazio é todos) e o texto (sem ligar a maiúsculas nem a acentos). */
export function filtrarLinhas(linhas: LinhaDeLog[], f: FiltroDeLogs): LinhaDeLog[] {
  const q = f.texto?.trim() ? sem(f.texto.trim()) : "";
  return linhas.filter((l) => (!f.niveis?.size || f.niveis.has(l.nivel)) && (!f.fontes?.size || f.fontes.has(l.fonte)) && (!q || sem(`${l.fonte} ${l.texto}`).includes(q)));
}

export const contagemPorNivel = (linhas: LinhaDeLog[]): Record<NivelDeLog, number> => linhas.reduce((c, l) => ({ ...c, [l.nivel]: c[l.nivel] + 1 }), { debug: 0, info: 0, aviso: 0, erro: 0 });

// ---------- escrever ----------

const p2 = (n: number) => String(n).padStart(2, "0");

/** A hora de uma linha: «14:32:07.412» (na hora do navegador ou em UTC). */
export function horaDaLinha(iso: string, utc = false): string {
  const d = new Date(iso);
  const h = utc ? [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()] : [d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()];
  return `${p2(h[0])}:${p2(h[1])}:${p2(h[2])}.${String(h[3]).padStart(3, "0")}`;
}

/** As linhas como um ficheiro de texto, uma por linha, como o servidor as escreveu. */
export const linhasParaTexto = (linhas: LinhaDeLog[]): string => linhas.map((l) => `${l.quando} [${l.nivel.toUpperCase()}] [${l.fonte}] ${l.texto}`).join("\n");

// ---------- as de demonstração ----------

const CAMINHOS = ["/", "/precos", "/entrar/", "/api/pedidos", "/api/pagamentos", "/contacto", "/blog/novidades", "/api/saude", "/painel/operacoes", "/img/logo.svg"];
const AGENTES = ["Chrome/141", "Safari/18", "Firefox/130", "curl/8.5", "Googlebot/2.1"];
const ESTADOS = [200, 200, 200, 200, 200, 200, 204, 301, 304, 304, 404, 401, 429, 500, 502];

/** Uma linha de demonstração, sempre a mesma para o mesmo `n` e a mesma hora (para os testes e para não saltar). */
export function linhaSimulada(n: number, agora: Date): LinhaDeLog {
  const r = (k: number, m: number) => Math.abs(Math.sin(n * 12.9898 + k * 78.233) * 43758.5453) % 1 * m;
  const escolha = <T,>(l: T[], k: number): T => l[Math.floor(r(k, l.length))];
  const quando = agora.toISOString();
  const id = String(n).padStart(9, "0");
  const tipo = Math.floor(r(1, 20));
  if (tipo === 0) return { id, quando, nivel: "erro", fonte: "web", texto: `TypeError: Cannot read properties of undefined (reading 'id') at /app/api/pedidos.js:${40 + Math.floor(r(2, 60))}:${Math.floor(r(3, 30))}` };
  if (tipo === 1) return { id, quando, nivel: "aviso", fonte: "db", texto: `slow query (${Math.round(300 + r(2, 1800))} ms): SELECT * FROM pedidos WHERE estado = 'Recebido' ORDER BY criado DESC LIMIT 50` };
  if (tipo === 2) return { id, quando, nivel: "info", fonte: "db", texto: `checkpoint complete: wrote ${Math.round(r(2, 900))} buffers (${(r(3, 6)).toFixed(1)}%)` };
  if (tipo === 3) return { id, quando, nivel: "info", fonte: "worker", texto: `fila de e-mails: ${Math.round(r(2, 12))} mensagens enviadas, ${Math.round(r(3, 2))} por tentar` };
  if (tipo === 4) return { id, quando, nivel: "debug", fonte: "web", texto: `cache ${r(2, 1) > 0.3 ? "hit" : "miss"} ${escolha(CAMINHOS, 5)} (${Math.round(r(3, 12))} ms)` };
  const estado = escolha(ESTADOS, 4);
  const texto = `${escolha(["GET", "GET", "GET", "POST", "PUT"], 6)} ${escolha(CAMINHOS, 5)} ${estado} ${Math.round(5 + r(7, 240))}ms ${escolha(AGENTES, 8)} 102.67.${Math.floor(r(10, 255))}.${Math.floor(r(11, 255))}`;
  return { id, quando, nivel: estado >= 500 ? "erro" : estado >= 400 ? "aviso" : "info", fonte: "web", texto };
}
