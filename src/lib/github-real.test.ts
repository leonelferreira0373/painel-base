import { afterEach, describe, expect, it, vi } from "vitest";
import { chamarGitHub, ErroDoGitHub, estadoDaImplementacao, lerImplementacoesReais, lerPainelReal, mapearCommit, mapearExecucao, mapearImplementacao, mensagemDoErro, repositorioValido, resultadoDaExecucao, testesDoCommit } from "./github-real";

const execucao = (sha: string, estado: string, conclusao: string | null) => mapearExecucao({ id: Math.floor(Math.random() * 1e6), name: "CI", head_branch: "main", head_sha: `${sha}0000000`, status: estado, conclusion: conclusao, created_at: "2026-10-29T10:00:00Z", run_started_at: "2026-10-29T10:00:00Z", updated_at: "2026-10-29T10:02:30Z", event: "push", html_url: "https://github.com/o/r/actions/runs/1", actor: { login: "ana" } });

describe("o resultado das execuções do GitHub Actions", () => {
  it("passou, falhou, a correr, pendente, cancelada ou ignorada", () => {
    expect(resultadoDaExecucao("completed", "success")).toBe("Passou");
    expect(resultadoDaExecucao("completed", "failure")).toBe("Falhou");
    expect(resultadoDaExecucao("completed", "timed_out")).toBe("Falhou");
    expect(resultadoDaExecucao("completed", "cancelled")).toBe("Cancelada");
    expect(resultadoDaExecucao("completed", "skipped")).toBe("Ignorada");
    expect(resultadoDaExecucao("in_progress", null)).toBe("A correr");
    expect(resultadoDaExecucao("queued", null)).toBe("Pendente");
  });
  it("a execução leva a duração quando acabou", () => {
    const e = execucao("abc1234", "completed", "success");
    expect(e).toMatchObject({ nome: "CI", ramo: "main", sha: "abc1234", resultado: "Passou", evento: "push", autor: "ana", duracao: 150 });
    expect(execucao("abc1234", "in_progress", null).duracao).toBeUndefined();
  });
  it("o resultado de um commit é o pior das suas execuções; sem execuções diz-se", () => {
    expect(testesDoCommit([])).toBe("Sem execução");
    expect(testesDoCommit([execucao("a", "completed", "success"), execucao("a", "completed", "failure")])).toBe("Falharam");
    expect(testesDoCommit([execucao("a", "completed", "success"), execucao("a", "in_progress", null)])).toBe("A correr");
    expect(testesDoCommit([execucao("a", "completed", "success")])).toBe("Passaram");
    expect(testesDoCommit([execucao("a", "completed", "skipped")])).toBe("Sem execução");
  });
});

describe("os commits e as implementações", () => {
  it("o commit leva o sha curto, a primeira linha da mensagem, o autor e o resultado das execuções desse sha", () => {
    const c = mapearCommit({ sha: "1234567890abcdef", html_url: "https://github.com/o/r/commit/1234567", commit: { message: "Corrige o login\n\nDetalhe", author: { name: "Ana", date: "2026-10-29T09:00:00Z" } }, author: { login: "ana" } }, "main", [execucao("1234567", "completed", "success")]);
    expect(c).toMatchObject({ sha: "1234567", mensagem: "Corrige o login", autor: "ana", ramo: "main", testes: "Passaram", url: "https://github.com/o/r/commit/1234567" });
    expect(mapearCommit({ sha: "ffffffffff", commit: { message: "x", author: { name: "Rui", date: "2026-10-29T09:00:00Z" } }, author: null }, "main", []).autor).toBe("Rui");
  });
  it("o estado de uma implementação vem do último estado que o GitHub lhe registou", () => {
    expect(estadoDaImplementacao("success")).toBe("Concluída");
    expect(estadoDaImplementacao("failure")).toBe("Falhou");
    expect(estadoDaImplementacao("error")).toBe("Falhou");
    expect(estadoDaImplementacao("in_progress")).toBe("A correr");
    expect(estadoDaImplementacao("queued")).toBe("Pendente");
    expect(estadoDaImplementacao("inactive")).toBe("Inativa");
    expect(estadoDaImplementacao(undefined)).toBe("Sem estado");
    const i = mapearImplementacao({ id: 7, environment: "production", ref: "main", sha: "abcdef123456", created_at: "2026-10-29T08:00:00Z", description: "Publicar", creator: { login: "ana" } }, { state: "success", environment_url: "https://exemplo.pt", log_url: "https://github.com/o/r/runs/1" });
    expect(i).toMatchObject({ id: 7, ambiente: "production", ref: "main", sha: "abcdef1", estado: "Concluída", autor: "ana", endereco: "https://exemplo.pt", url: "https://github.com/o/r/runs/1" });
  });
});

describe("o repositório e os erros", () => {
  it("só aceita dono/nome", () => {
    expect(repositorioValido("leonelferreira0373/painel-base")).toBe(true);
    expect(repositorioValido("painel-base")).toBe(false);
    expect(repositorioValido("a/b/c")).toBe(false);
    expect(repositorioValido("a b/c")).toBe(false);
  });
  it("as mensagens dizem o que fazer", () => {
    expect(mensagemDoErro(404, undefined, false)).toMatch(/privado, junte um token/);
    expect(mensagemDoErro(404, undefined, true)).toMatch(/não tem acesso/);
    expect(mensagemDoErro(401, undefined, true)).toMatch(/não é válido/);
    expect(mensagemDoErro(403, { restante: 0, total: 60, reposicao: "2026-10-29T12:00:00Z" }, false)).toMatch(/Limite de pedidos.*60 para 5000/);
    expect(mensagemDoErro(403, { restante: 40, total: 60, reposicao: "2026-10-29T12:00:00Z" }, true)).toMatch(/permissão/);
  });
});

describe("falar com o GitHub", () => {
  afterEach(() => vi.unstubAllGlobals());
  const resposta = (corpo: unknown, estado = 200, cabecalhos: Record<string, string> = {}) => ({ ok: estado < 400, status: estado, headers: new Headers({ "x-ratelimit-remaining": "58", "x-ratelimit-limit": "60", "x-ratelimit-reset": "1793300000", ...cabecalhos }), json: async () => corpo });

  it("envia o token só no cabeçalho e devolve o limite", async () => {
    const pedidos: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => (pedidos.push({ url, init }), resposta({ ok: 1 })));
    const r = await chamarGitHub<{ ok: number }>("/repos/o/r", "segredo123");
    expect(r.dados.ok).toBe(1);
    expect(r.limite).toMatchObject({ restante: 58, total: 60 });
    expect(pedidos[0].url).toBe("https://api.github.com/repos/o/r");
    expect((pedidos[0].init.headers as Record<string, string>).Authorization).toBe("Bearer segredo123");
    await chamarGitHub("/repos/o/r", "");
    expect((pedidos[1].init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
  it("um erro do GitHub vira uma mensagem clara", async () => {
    vi.stubGlobal("fetch", async () => resposta({}, 404));
    await expect(chamarGitHub("/repos/o/r", "")).rejects.toMatchObject({ estado: 404, message: expect.stringMatching(/não encontrado/) });
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("falhou");
    });
    await expect(chamarGitHub("/repos/o/r", "")).rejects.toBeInstanceOf(ErroDoGitHub);
  });
  it("lê o painel: repositório, ramos e commits com o resultado das execuções", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("/repos/o/r")) return resposta({ full_name: "o/r", description: "d", private: false, default_branch: "main", html_url: "https://github.com/o/r", pushed_at: "2026-10-29T00:00:00Z", stargazers_count: 3 });
      if (url.includes("/branches")) return resposta([{ name: "main" }, { name: "dev" }]);
      if (url.includes("/commits")) return resposta([{ sha: "abcdef1234567", commit: { message: "Um", author: { name: "A", date: "2026-10-29T09:00:00Z" } }, author: { login: "a" } }]);
      return resposta({ workflow_runs: [{ id: 1, name: "CI", head_branch: "main", head_sha: "abcdef1234567", status: "completed", conclusion: "success", created_at: "2026-10-29T09:01:00Z", updated_at: "2026-10-29T09:03:00Z", event: "push", html_url: "x", actor: { login: "a" } }] });
    });
    const p = await lerPainelReal("o/r", "", "");
    expect(p.repositorio).toMatchObject({ nome: "o/r", privado: false, ramoPadrao: "main", estrelas: 3 });
    expect(p.ramoUsado).toBe("main");
    expect(p.ramos).toEqual(["main", "dev"]);
    expect(p.commits[0]).toMatchObject({ sha: "abcdef1", testes: "Passaram" });
  });
  it("lê as implementações com o último estado de cada uma", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/deployments/1/statuses")) return resposta([{ state: "success", environment_url: "https://exemplo.pt" }]);
      if (url.includes("/deployments/2/statuses")) return resposta([]);
      if (url.includes("/deployments?")) return resposta([{ id: 1, environment: "production", ref: "main", sha: "aaaaaaaa", created_at: "2026-10-29T08:00:00Z", creator: { login: "a" } }, { id: 2, environment: "preview", ref: "dev", sha: "bbbbbbbb", created_at: "2026-10-28T08:00:00Z", creator: { login: "b" } }]);
      return resposta({ workflow_runs: [] });
    });
    const r = await lerImplementacoesReais("o/r", "");
    expect(r.implementacoes.map((i) => [i.ambiente, i.estado])).toEqual([["production", "Concluída"], ["preview", "Sem estado"]]);
    expect(r.implementacoes[0].endereco).toBe("https://exemplo.pt");
    expect(r.execucoes).toEqual([]);
  });
});
