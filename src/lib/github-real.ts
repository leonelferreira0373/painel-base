// O GitHub a sério: o painel lê, a partir do navegador, a API pública do GitHub (api.github.com) do repositório que a pessoa ligar: o repositório, os ramos, os últimos commits com o resultado das execuções (GitHub Actions) e as implementações (Deployments). Repositórios públicos lêem-se sem token (60 pedidos por hora); com um token de leitura a pessoa vê também os privados e o limite sobe para 5000. O token fica só neste navegador (armazenamento local) e só é enviado a api.github.com; nunca vai para o servidor do painel nem entra no código.
import type { Commit } from "@/dados/deploys";

const API = "https://api.github.com";
const CHAVE_LIGACAO = "painel.github.real";
const CHAVE_TOKEN = "painel.github.token";
export const EVENTO_GITHUB_REAL = "painel:github-real";

export interface LigacaoReal {
  /** «dono/nome». */
  repositorio: string;
  ramo: string;
}

export class ErroDoGitHub extends Error {
  constructor(
    mensagem: string,
    readonly estado: number,
  ) {
    super(mensagem);
  }
}

/** «dono/nome» válido: letras, números, ponto, hífen e sublinhado, dos dois lados. */
export const repositorioValido = (v: string): boolean => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v.trim());

// ---------- guardar e ler a ligação (só no navegador) ----------

export function lerLigacaoReal(): LigacaoReal | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE_LIGACAO) ?? "null") as Partial<LigacaoReal> | null;
    return v && typeof v.repositorio === "string" && repositorioValido(v.repositorio) ? { repositorio: v.repositorio, ramo: typeof v.ramo === "string" ? v.ramo : "" } : null;
  } catch {
    return null;
  }
}

export function lerTokenReal(): string {
  try {
    return window.localStorage.getItem(CHAVE_TOKEN) ?? "";
  } catch {
    return "";
  }
}

/** Guarda a ligação e o token (`undefined` mantém o que lá está; `""` apaga o token). `null` desliga tudo. */
export function guardarLigacaoReal(ligacao: LigacaoReal | null, token?: string): void {
  try {
    if (!ligacao) {
      window.localStorage.removeItem(CHAVE_LIGACAO);
      window.localStorage.removeItem(CHAVE_TOKEN);
    } else {
      window.localStorage.setItem(CHAVE_LIGACAO, JSON.stringify(ligacao));
      if (token !== undefined) {
        if (token) window.localStorage.setItem(CHAVE_TOKEN, token.trim());
        else window.localStorage.removeItem(CHAVE_TOKEN);
      }
    }
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(EVENTO_GITHUB_REAL));
}

// ---------- falar com o GitHub ----------

export interface LimiteDoGitHub {
  restante: number;
  total: number;
  /** Quando o limite volta ao máximo (ISO). */
  reposicao: string;
}

export interface RespostaDoGitHub<T> {
  dados: T;
  limite?: LimiteDoGitHub;
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

function limiteDe(cabecalhos: Headers): LimiteDoGitHub | undefined {
  const restante = Number(cabecalhos.get("x-ratelimit-remaining"));
  const total = Number(cabecalhos.get("x-ratelimit-limit"));
  const reposicao = Number(cabecalhos.get("x-ratelimit-reset"));
  return Number.isFinite(restante) && Number.isFinite(total) && total > 0 && Number.isFinite(reposicao) ? { restante, total, reposicao: new Date(reposicao * 1000).toISOString() } : undefined;
}

/** A mensagem de um erro do GitHub, em português claro e com o que fazer. */
export function mensagemDoErro(estado: number, limite: LimiteDoGitHub | undefined, comToken: boolean): string {
  if (estado === 401) return "O token não é válido ou expirou. Crie outro no GitHub (Settings > Developer settings > Personal access tokens).";
  if (estado === 403 || estado === 429) {
    if (limite && limite.restante === 0) return `Limite de pedidos do GitHub atingido; volta às ${hora(limite.reposicao)}.${comToken ? "" : " Com um token o limite sobe de 60 para 5000 por hora."}`;
    return "O token não tem permissão para ler isto. Precisa de leitura de Contents, Metadata, Actions e Deployments.";
  }
  if (estado === 404) return comToken ? "Repositório não encontrado, ou o token não tem acesso a ele." : "Repositório não encontrado. Se for privado, junte um token de leitura.";
  return `O GitHub respondeu ${estado}.`;
}

export async function chamarGitHub<T>(caminho: string, token: string, sinal?: AbortSignal): Promise<RespostaDoGitHub<T>> {
  let r: Response;
  try {
    r = await fetch(`${API}${caminho}`, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: sinal, cache: "no-store" });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ErroDoGitHub("Sem ligação ao GitHub. Verifique a rede.", 0);
  }
  const limite = limiteDe(r.headers);
  if (!r.ok) throw new ErroDoGitHub(mensagemDoErro(r.status, limite, !!token), r.status);
  return { dados: (await r.json()) as T, limite };
}

// ---------- o que o painel mostra ----------

export type ResultadoDaExecucao = "Passou" | "Falhou" | "A correr" | "Pendente" | "Cancelada" | "Ignorada";

/** O resultado de uma execução do GitHub Actions a partir do estado e da conclusão que o GitHub dá. */
export function resultadoDaExecucao(estado: string | null | undefined, conclusao: string | null | undefined): ResultadoDaExecucao {
  if (estado === "completed") {
    if (conclusao === "success") return "Passou";
    if (conclusao === "cancelled") return "Cancelada";
    if (conclusao === "skipped" || conclusao === "neutral") return "Ignorada";
    if (conclusao === "action_required") return "Pendente";
    return "Falhou";
  }
  if (estado === "in_progress") return "A correr";
  return "Pendente";
}

export type EstadoDaImplementacao = "Concluída" | "Falhou" | "A correr" | "Pendente" | "Inativa" | "Sem estado";

/** O estado de uma implementação (Deployment) a partir do último estado que o GitHub lhe registou. */
export function estadoDaImplementacao(estado: string | null | undefined): EstadoDaImplementacao {
  switch (estado) {
    case "success":
      return "Concluída";
    case "failure":
    case "error":
      return "Falhou";
    case "in_progress":
      return "A correr";
    case "queued":
    case "pending":
      return "Pendente";
    case "inactive":
      return "Inativa";
    default:
      return "Sem estado";
  }
}

export interface RepositorioReal {
  nome: string;
  descricao: string;
  privado: boolean;
  ramoPadrao: string;
  url: string;
  atualizado: string;
  estrelas: number;
}

export interface CommitReal extends Omit<Commit, "testes"> {
  testes: Commit["testes"] | "Sem execução";
  url: string;
}

export interface ExecucaoReal {
  id: number;
  nome: string;
  ramo: string;
  sha: string;
  resultado: ResultadoDaExecucao;
  quando: string;
  /** Segundos, se a execução acabou. */
  duracao?: number;
  evento: string;
  autor: string;
  url: string;
}

export interface ImplementacaoReal {
  id: number;
  ambiente: string;
  ref: string;
  sha: string;
  estado: EstadoDaImplementacao;
  quando: string;
  autor: string;
  descricao: string;
  /** O endereço do ambiente publicado, se o GitHub o guardou. */
  endereco?: string;
  url: string;
}

interface RepoCru {
  name?: string;
  full_name?: string;
  description?: string | null;
  private?: boolean;
  default_branch?: string;
  html_url?: string;
  pushed_at?: string;
  updated_at?: string;
  stargazers_count?: number;
}
interface CommitCru {
  sha: string;
  html_url?: string;
  commit?: { message?: string; author?: { name?: string; date?: string } };
  author?: { login?: string } | null;
}
interface ExecucaoCrua {
  id: number;
  name?: string | null;
  display_title?: string;
  head_branch?: string | null;
  head_sha?: string;
  status?: string | null;
  conclusion?: string | null;
  created_at?: string;
  run_started_at?: string;
  updated_at?: string;
  event?: string;
  html_url?: string;
  actor?: { login?: string } | null;
}
interface ImplementacaoCrua {
  id: number;
  environment?: string;
  ref?: string;
  sha?: string;
  created_at?: string;
  description?: string | null;
  creator?: { login?: string } | null;
  url?: string;
}
interface EstadoCru {
  state?: string;
  environment_url?: string | null;
  target_url?: string | null;
  log_url?: string | null;
}

export function mapearRepositorio(r: RepoCru): RepositorioReal {
  return { nome: r.full_name ?? r.name ?? "", descricao: r.description ?? "", privado: !!r.private, ramoPadrao: r.default_branch ?? "main", url: r.html_url ?? "", atualizado: r.pushed_at ?? r.updated_at ?? "", estrelas: r.stargazers_count ?? 0 };
}

export function mapearExecucao(e: ExecucaoCrua): ExecucaoReal {
  const inicio = e.run_started_at ?? e.created_at;
  const resultado = resultadoDaExecucao(e.status, e.conclusion);
  const duracao = e.status === "completed" && inicio && e.updated_at ? Math.max(0, Math.round((Date.parse(e.updated_at) - Date.parse(inicio)) / 1000)) : undefined;
  return { id: e.id, nome: e.name ?? e.display_title ?? "Execução", ramo: e.head_branch ?? "", sha: (e.head_sha ?? "").slice(0, 7), resultado, quando: e.created_at ?? "", duracao, evento: e.event ?? "", autor: e.actor?.login ?? "", url: e.html_url ?? "" };
}

/** O resultado que vale para um commit: se tem execuções, o pior (falhou > a correr > passou); sem execuções, «Sem execução». */
export function testesDoCommit(execucoes: ExecucaoReal[]): CommitReal["testes"] {
  if (execucoes.length === 0) return "Sem execução";
  if (execucoes.some((e) => e.resultado === "Falhou")) return "Falharam";
  if (execucoes.some((e) => e.resultado === "A correr" || e.resultado === "Pendente")) return "A correr";
  return execucoes.some((e) => e.resultado === "Passou") ? "Passaram" : "Sem execução";
}

export function mapearCommit(c: CommitCru, ramo: string, execucoes: ExecucaoReal[]): CommitReal {
  const sha = c.sha.slice(0, 7);
  return {
    sha,
    mensagem: (c.commit?.message ?? "").split("\n")[0],
    autor: c.author?.login ?? c.commit?.author?.name ?? "",
    quando: c.commit?.author?.date ?? "",
    ramo,
    testes: testesDoCommit(execucoes.filter((e) => e.sha === sha)),
    url: c.html_url ?? "",
  };
}

export function mapearImplementacao(d: ImplementacaoCrua, ultimo: EstadoCru | undefined): ImplementacaoReal {
  return {
    id: d.id,
    ambiente: d.environment ?? "",
    ref: d.ref ?? "",
    sha: (d.sha ?? "").slice(0, 7),
    estado: estadoDaImplementacao(ultimo?.state),
    quando: d.created_at ?? "",
    autor: d.creator?.login ?? "",
    descricao: d.description ?? "",
    endereco: ultimo?.environment_url || ultimo?.target_url || undefined,
    url: ultimo?.log_url || ultimo?.target_url || "",
  };
}

// ---------- as leituras ----------

export interface PainelReal {
  repositorio: RepositorioReal;
  ramos: string[];
  commits: CommitReal[];
  limite?: LimiteDoGitHub;
}

/** O repositório, os ramos e os últimos commits do ramo (com o resultado das execuções de cada um). `ramo` vazio = o ramo padrão. */
export async function lerPainelReal(repo: string, ramo: string, token: string, sinal?: AbortSignal): Promise<PainelReal & { ramoUsado: string }> {
  const r = await chamarGitHub<RepoCru>(`/repos/${repo}`, token, sinal);
  const repositorio = mapearRepositorio(r.dados);
  const ramoUsado = ramo || repositorio.ramoPadrao;
  const [ramos, commits, execucoes] = await Promise.all([
    chamarGitHub<{ name: string }[]>(`/repos/${repo}/branches?per_page=100`, token, sinal),
    chamarGitHub<CommitCru[]>(`/repos/${repo}/commits?sha=${encodeURIComponent(ramoUsado)}&per_page=20`, token, sinal),
    chamarGitHub<{ workflow_runs: ExecucaoCrua[] }>(`/repos/${repo}/actions/runs?branch=${encodeURIComponent(ramoUsado)}&per_page=50`, token, sinal).catch(() => ({ dados: { workflow_runs: [] as ExecucaoCrua[] }, limite: undefined })),
  ]);
  const execs = execucoes.dados.workflow_runs.map(mapearExecucao);
  return { repositorio, ramoUsado, ramos: ramos.dados.map((b) => b.name), commits: commits.dados.map((c) => mapearCommit(c, ramoUsado, execs)), limite: commits.limite ?? r.limite };
}

export interface ImplementacoesReais {
  implementacoes: ImplementacaoReal[];
  execucoes: ExecucaoReal[];
  limite?: LimiteDoGitHub;
}

/** As implementações (Deployments) do repositório, cada uma com o último estado, e as últimas execuções do GitHub Actions. */
export async function lerImplementacoesReais(repo: string, token: string, sinal?: AbortSignal): Promise<ImplementacoesReais> {
  const [lista, execucoes] = await Promise.all([
    chamarGitHub<ImplementacaoCrua[]>(`/repos/${repo}/deployments?per_page=20`, token, sinal),
    chamarGitHub<{ workflow_runs: ExecucaoCrua[] }>(`/repos/${repo}/actions/runs?per_page=20`, token, sinal).catch(() => ({ dados: { workflow_runs: [] as ExecucaoCrua[] }, limite: undefined })),
  ]);
  const estados = await Promise.all(lista.dados.slice(0, 12).map((d) => chamarGitHub<EstadoCru[]>(`/repos/${repo}/deployments/${d.id}/statuses?per_page=1`, token, sinal).then((x) => x.dados[0]).catch(() => undefined)));
  return {
    implementacoes: lista.dados.map((d, i) => mapearImplementacao(d, estados[i])),
    execucoes: execucoes.dados.workflow_runs.map(mapearExecucao),
    limite: execucoes.limite ?? lista.limite,
  };
}
