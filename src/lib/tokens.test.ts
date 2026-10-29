import { describe, expect, it } from "vitest";
import { ENDPOINTS } from "./api/contrato";
import { MODELOS, RECURSOS, acessoDoEndpoint, descreverPermissao, endpointsPermitidos, erroDoRascunho, estadoDoToken, impressaoDoToken, ipNaGama, mudarEditar, mudarLer, niveisDasPermissoes, permissoesDosNiveis, permissoesForaDosInterruptores, resumoDaArea, todosOsNiveis, chaveDoNivel, modulosDoRecurso, ipOuGamaValido, ipPermitido, manifestoDeFerramentas, modeloPorId, novoToken, permitePedido, recursoDoEndpoint, resumoDasPermissoes, rodarToken, simplificarPermissoes, verificarToken, type PermissaoDeToken } from "./tokens";

const agora = new Date("2026-10-29T12:00:00.000Z");
const ler = (area: string, modulo = "*"): PermissaoDeToken => ({ area, modulo, acesso: "ler" });
const editar = (area: string, modulo = "*"): PermissaoDeToken => ({ area, modulo, acesso: "editar" });

describe("permissões", () => {
  it("escrevem-se em palavras e a lista mostra as duas primeiras e quantas mais", () => {
    expect(descreverPermissao(editar("dev", "firewall"))).toBe("Ferramentas de programador · Firewall: Editar");
    expect(descreverPermissao(ler("*"))).toBe("Todas as áreas: Ler");
    expect(descreverPermissao(ler("pagamentos"))).toBe("Pagamentos · Todos os módulos: Ler");
    const r = resumoDasPermissoes([ler("pagamentos"), ler("marketing"), editar("dev", "dns")]);
    expect(r.primeiras).toHaveLength(2);
    expect(r.mais).toBe(1);
  });
  it("simplifica o que se repete ou já está incluído", () => {
    expect(simplificarPermissoes([ler("dev"), ler("dev"), editar("dev"), ler("dev", "firewall")])).toEqual([editar("dev")]);
    expect(simplificarPermissoes([ler("*"), ler("dev", "dns"), editar("marketing")])).toEqual([ler("*"), editar("marketing")]);
    expect(simplificarPermissoes([ler("dev", "dns"), editar("dev", "firewall")])).toHaveLength(2);
  });
});

describe("o que se pode permitir", () => {
  it("as áreas e módulos vêm das APIs do contrato e cada modelo só usa o que existe", () => {
    expect(RECURSOS.map((r) => r.area)).toEqual(expect.arrayContaining(["pagamentos", "marketing", "dev", "painel"]));
    const dev = RECURSOS.find((r) => r.area === "dev")!;
    expect(dev.modulos.map((m) => m.id)).toEqual(expect.arrayContaining(["dns", "firewall", "logs"]));
    expect(dev.modulos.find((m) => m.id === "logs")?.rotulo).toBe("Registos do servidor");
    expect(RECURSOS.find((r) => r.area === "painel")!.modulos.map((m) => m.id)).toContain("tokens");
    for (const m of MODELOS)
      for (const p of m.permissoes) {
        if (p.area === "*") continue;
        const r = RECURSOS.find((x) => x.area === p.area);
        expect(r, `${m.id}: área ${p.area}`).toBeDefined();
        if (p.modulo !== "*") expect(r!.modulos.some((x) => x.id === p.modulo), `${m.id}: módulo ${p.modulo}`).toBe(true);
      }
  });
  it("cada modelo dá acesso a pelo menos um pedido da API", () => {
    for (const m of MODELOS) expect(endpointsPermitidos(m.permissoes).length, m.id).toBeGreaterThan(0);
  });
});

describe("o estado", () => {
  it("revogado, expirado, ainda não ativo e ativo", () => {
    expect(estadoDoToken({ revogado: true }, agora)).toBe("revogado");
    expect(estadoDoToken({ expira: "2026-10-29T11:00:00.000Z" }, agora)).toBe("expirado");
    expect(estadoDoToken({ inicio: "2026-10-30T00:00:00.000Z" }, agora)).toBe("ainda-nao");
    expect(estadoDoToken({ inicio: "2026-10-01T00:00:00.000Z", expira: "2026-12-01T00:00:00.000Z" }, agora)).toBe("ativo");
  });
});

describe("os endereços IP", () => {
  it("valida endereços e gamas", () => {
    for (const v of ["203.0.113.9", "10.0.0.0/8", "0.0.0.0/0", " 192.168.1.1 "]) expect(ipOuGamaValido(v), v).toBe(true);
    for (const v of ["999.1.1.1", "1.2.3", "1.2.3.4/33", "abc", "1.2.3.4/x", ""]) expect(ipOuGamaValido(v), v).toBe(false);
  });
  it("vê se um endereço está numa gama", () => {
    expect(ipNaGama("203.0.113.77", "203.0.113.0/24")).toBe(true);
    expect(ipNaGama("203.0.114.1", "203.0.113.0/24")).toBe(false);
    expect(ipNaGama("10.1.2.3", "10.0.0.0/8")).toBe(true);
    expect(ipNaGama("1.2.3.4", "1.2.3.4")).toBe(true);
    expect(ipNaGama("1.2.3.5", "1.2.3.4")).toBe(false);
    expect(ipNaGama("8.8.8.8", "0.0.0.0/0")).toBe(true);
  });
  it("o filtro «incluir» deixa só os da lista; «excluir» deixa todos menos esses; sem filtro passa tudo", () => {
    expect(ipPermitido("203.0.113.5", { modo: "incluir", valores: ["203.0.113.0/24"] })).toBe(true);
    expect(ipPermitido("8.8.8.8", { modo: "incluir", valores: ["203.0.113.0/24"] })).toBe(false);
    expect(ipPermitido("203.0.113.5", { modo: "excluir", valores: ["203.0.113.0/24"] })).toBe(false);
    expect(ipPermitido("8.8.8.8", { modo: "excluir", valores: ["203.0.113.0/24"] })).toBe(true);
    expect(ipPermitido("8.8.8.8", undefined)).toBe(true);
  });
});

describe("o que um token pode fazer", () => {
  const fw = ENDPOINTS.find((e) => e.id === "firewall-regras-guardar")!;
  const dns = ENDPOINTS.find((e) => e.id === "dns-listar")!;
  const pag = ENDPOINTS.find((e) => e.id === "pagamentos-listar")!;
  it("cada endpoint tem a sua área e o seu módulo, e pede ler ou editar", () => {
    expect(recursoDoEndpoint(fw)).toEqual({ area: "dev", modulo: "firewall" });
    expect(recursoDoEndpoint(dns)).toEqual({ area: "dev", modulo: "dns" });
    expect(recursoDoEndpoint(pag)).toEqual({ area: "pagamentos", modulo: "pagamentos" });
    expect(acessoDoEndpoint(fw)).toBe("editar");
    expect(acessoDoEndpoint(dns)).toBe("ler");
  });
  it("ler não deixa editar; editar inclui ler; o módulo e a área têm de bater", () => {
    expect(permitePedido([ler("dev")], dns)).toBe(true);
    expect(permitePedido([ler("dev")], fw)).toBe(false);
    expect(permitePedido([editar("dev", "firewall")], fw)).toBe(true);
    expect(permitePedido([editar("dev", "firewall")], dns)).toBe(false);
    expect(permitePedido([editar("pagamentos")], fw)).toBe(false);
    expect(permitePedido([editar("*")], fw)).toBe(true);
    expect(permitePedido([], pag)).toBe(false);
  });
  it("o manifesto tem uma ferramenta por pedido permitido, com o caminho, o método e os parâmetros", () => {
    const m = manifestoDeFerramentas([editar("dev", "firewall")]);
    expect(m.length).toBe(endpointsPermitidos([editar("dev", "firewall")]).length);
    expect(m.length).toBeGreaterThan(3);
    const guardar = m.find((f) => f.name === "firewall-regras-guardar")!;
    expect(guardar["x-painel"]).toEqual({ metodo: "PUT", caminho: "/v1/dev/firewall/regras/{id}", acesso: "editar" });
    expect(guardar.input_schema.required).toEqual(["id"]);
    expect(Object.keys(guardar.input_schema.properties)).toEqual(expect.arrayContaining(["id", "acao", "alvo", "ativa"]));
    expect(manifestoDeFerramentas([])).toEqual([]);
    expect(manifestoDeFerramentas(modeloPorId("agente-ia")!.permissoes).length).toBe(ENDPOINTS.length);
  });
});

describe("criar e verificar", () => {
  const rascunho = { nome: " Meu token ", permissoes: [ler("pagamentos")] };
  it("valida o rascunho", () => {
    expect(erroDoRascunho({ nome: "", permissoes: [ler("dev")] })).toMatch(/nome/);
    expect(erroDoRascunho({ nome: "x", permissoes: [] })).toMatch(/permissão/);
    expect(erroDoRascunho({ ...rascunho, ips: { modo: "incluir", valores: ["xyz"] } })).toMatch(/não é um endereço/);
    expect(erroDoRascunho({ ...rascunho, ips: { modo: "incluir", valores: [] } })).toMatch(/pelo menos um endereço/);
    expect(erroDoRascunho({ ...rascunho, expira: "2020-01-01T00:00:00.000Z" }, agora)).toMatch(/passado/);
    expect(erroDoRascunho({ ...rascunho, inicio: "2026-12-01T00:00:00.000Z", expira: "2026-11-01T00:00:00.000Z" }, agora)).toMatch(/antes do fim/);
    expect(erroDoRascunho(rascunho, agora)).toBeNull();
  });
  it("o segredo não se guarda: só o início, o fim e a impressão", async () => {
    const { token, segredo } = await novoToken(rascunho, agora);
    expect(segredo).toMatch(/^bpt_[A-Za-z0-9]{40}$/);
    expect(JSON.stringify(token)).not.toContain(segredo);
    expect(token).toMatchObject({ nome: "Meu token", prefixo: segredo.slice(0, 8), fim: segredo.slice(-4), usos: 0, ultimoUso: null });
    expect(token.impressao).toBe(await impressaoDoToken(segredo));
    expect(token.impressao).toHaveLength(64);
  });
  it("verifica o token: certo, errado, expirado, IP não permitido; rodar invalida o antigo", async () => {
    const { token, segredo } = await novoToken({ ...rascunho, ips: { modo: "incluir", valores: ["203.0.113.0/24"] }, expira: "2026-12-01T00:00:00.000Z" }, agora);
    expect(await verificarToken(segredo, [token], "203.0.113.5", agora)).toMatchObject({ ativo: true, nome: "Meu token", permissoes: ["Pagamentos · Todos os módulos: Ler"] });
    expect(await verificarToken(segredo, [token], "8.8.8.8", agora)).toMatchObject({ ativo: false, motivo: expect.stringMatching(/IP/) });
    expect(await verificarToken(segredo, [token], "203.0.113.5", new Date("2027-01-01T00:00:00.000Z"))).toMatchObject({ ativo: false, motivo: expect.stringMatching(/expirado/) });
    expect(await verificarToken(segredo + "x", [token], null, agora)).toMatchObject({ ativo: false });
    expect(await verificarToken("outra-coisa", [token], null, agora)).toMatchObject({ ativo: false, motivo: expect.stringMatching(/Não é um token/) });
    expect(await verificarToken(segredo, [{ ...token, revogado: true }], null, agora)).toMatchObject({ ativo: false, motivo: expect.stringMatching(/revogado/) });
    const r = await rodarToken(token, agora);
    expect(r.segredo).not.toBe(segredo);
    expect(await verificarToken(segredo, [r.token], "203.0.113.5", agora)).toMatchObject({ ativo: false });
    expect(await verificarToken(r.segredo, [r.token], "203.0.113.5", agora)).toMatchObject({ ativo: true });
  });
});

describe("as permissões como interruptores", () => {
  // uma área com pelo menos dois módulos, qualquer que seja o projeto
  const r = RECURSOS.find((x) => x.modulos.length >= 2)!;
  const [m1, m2] = r.modulos;
  const so = (area: string, ...mods: string[]) => mods.map((m) => chaveDoNivel(area, m));

  it("tudo a ler ou a editar vira uma só permissão «*»", () => {
    expect(permissoesDosNiveis(todosOsNiveis("ler"))).toEqual([{ area: "*", modulo: "*", acesso: "ler" }]);
    expect(permissoesDosNiveis(todosOsNiveis("editar"))).toEqual([{ area: "*", modulo: "*", acesso: "editar" }]);
    expect(permissoesDosNiveis(todosOsNiveis("nada"))).toEqual([]);
  });
  it("uma área toda a editar é uma só permissão; só um módulo é só esse módulo", () => {
    const base = todosOsNiveis("nada");
    const areaToda = mudarEditar(base, r.area, null, true);
    expect(permissoesDosNiveis(areaToda)).toEqual([{ area: r.area, modulo: "*", acesso: "editar" }]);
    const um = mudarLer(base, r.area, m1.id, true);
    expect(permissoesDosNiveis(um)).toEqual([{ area: r.area, modulo: m1.id, acesso: "ler" }]);
  });
  it("ler tudo e editar um módulo dá «ler *» mais esse módulo", () => {
    const n = mudarEditar(todosOsNiveis("ler"), r.area, m2.id, true);
    expect(permissoesDosNiveis(n)).toEqual(expect.arrayContaining([{ area: "*", modulo: "*", acesso: "ler" }, { area: r.area, modulo: m2.id, acesso: "editar" }]));
    expect(permissoesDosNiveis(n)).toHaveLength(2);
  });
  it("ida e volta: os níveis saem iguais depois de passarem pelas permissões", () => {
    const n = mudarEditar(mudarLer(todosOsNiveis("nada"), r.area, m1.id, true), r.area, m2.id, true);
    expect(niveisDasPermissoes(permissoesDosNiveis(n))).toEqual(n);
    for (const p of MODELOS) expect(permissoesDosNiveis(niveisDasPermissoes(p.permissoes)).length).toBeGreaterThan(0);
    for (const p of MODELOS) expect(endpointsPermitidos(permissoesDosNiveis(niveisDasPermissoes(p.permissoes))).map((e) => e.id)).toEqual(endpointsPermitidos(p.permissoes).map((e) => e.id));
  });
  it("desligar «ler» tira também o editar; ligar «editar» dá também o ler; desligar «editar» deixa o ler", () => {
    const base = todosOsNiveis("nada");
    expect(mudarEditar(base, r.area, m1.id, true)[chaveDoNivel(r.area, m1.id)]).toBe("editar");
    expect(mudarEditar(mudarEditar(base, r.area, m1.id, true), r.area, m1.id, false)[chaveDoNivel(r.area, m1.id)]).toBe("ler");
    expect(mudarLer(mudarEditar(base, r.area, m1.id, true), r.area, m1.id, false)[chaveDoNivel(r.area, m1.id)]).toBe("nada");
    expect(mudarLer(mudarEditar(base, r.area, m1.id, true), r.area, m1.id, true)[chaveDoNivel(r.area, m1.id)]).toBe("editar");
  });
  it("conta os módulos que a área lê e edita", () => {
    const n = mudarEditar(mudarLer(todosOsNiveis("nada"), r.area, m1.id, true), r.area, m2.id, true);
    expect(resumoDaArea(n, r)).toEqual({ total: modulosDoRecurso(r).length, podeLer: 2, podeEditar: 1 });
    expect(so(r.area, m1.id, m2.id).every((c) => n[c] !== "nada")).toBe(true);
  });
  it("o que os interruptores não mostram (uma área que já não existe) guarda-se como está", () => {
    const antigas = [{ area: "area-antiga", modulo: "*", acesso: "ler" as const }];
    expect(permissoesForaDosInterruptores([...antigas, ler("*")])).toEqual(antigas);
    expect(permissoesDosNiveis(mudarLer(todosOsNiveis("nada"), r.area, null, true), antigas)).toEqual(expect.arrayContaining(antigas));
  });
});
