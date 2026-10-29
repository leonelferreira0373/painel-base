// Servidor de exemplo do contrato das APIs do painel (docs/API.md): responde a todos os endereços de src/lib/api/contrato.ts, com dados em memória, token de acesso e CORS. Serve para ligar o painel já (Developer tools, «API e ligações») e para copiar como ponto de partida do servidor do seu projeto. Sem dependências: `node scripts/servidor-de-exemplo.mjs`.
// A saúde do servidor é real (os números do sistema), os pedidos são os que este servidor recebeu, o firewall bloqueia de verdade (regras e limite por minuto) e os eventos de marketing vêm do script public/rastreio.js. O resto é a lista em memória que cada área precisa.
import { createServer } from "node:http";
import { statfsSync } from "node:fs";
import os from "node:os";
import { randomBytes } from "node:crypto";

const porta = Number(process.env.PORTA ?? 4000);
const token = process.env.TOKEN ?? randomBytes(12).toString("hex");
const origem = process.env.ORIGEM ?? "*";

// ---------- estado em memória ----------

const agora = () => new Date().toISOString();
const p2 = (n) => String(n).padStart(2, "0");
function versaoDe(d) {
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
}
const id = (p) => `${p}-${randomBytes(3).toString("hex")}`;
const estado = {
  pagamentos: [],
  comprovativos: [],
  contas: [],
  eventos: [],
  pedidos: [],
  erros: [],
  bloqueios: [],
  backups: [{ id: "bk-1", quando: agora(), tipo: "Automático", bytes: 52_428_800, estado: "Concluído", destino: "/var/copias" }],
  destino: { tipo: "local", endereco: "/var/copias", frequencia: "diaria", hora: "02:00", retencao: 14 },
  firewall: { ativo: true, limitePorMinuto: 600 },
  regras: [],
  paginas: [],
  emails: [],
  emailConfig: {},
  painel: { pacote: "personalizado", ligados: {} },
  implementacoes: [{ id: "imp-1", versao: versaoDe(new Date()), ramo: "main", commit: "8e0b231", mensagem: "Versão inicial", autor: "Equipa", quando: new Date().toISOString(), estado: "Ativa", trafego: 100 }],
  divisao: { a: "imp-1", b: null, percentagemB: 0 },
  historico: [{ quando: new Date().toISOString(), texto: "Versão inicial em produção" }],
  github: { repositorio: "empresa-exemplo/painel", ramo: "main" },
  conectores: [
    { id: "github", rotulo: "GitHub", ligado: true, detalhe: "empresa-exemplo/painel" },
    { id: "cloudflare", rotulo: "Cloudflare", ligado: false, detalhe: "Cache e DNS" },
    { id: "imagens", rotulo: "Registo de imagens", ligado: true, detalhe: "ghcr.io" },
    { id: "avisos", rotulo: "Avisos por e-mail", ligado: false, detalhe: "Falhas e implementações" },
  ],
  mensagens: [],
  campanhasEmail: [],
  tabelas: [
    { nome: "pagamentos", linhas: 0, bytes: 0, rls: true, politicas: [] },
    { nome: "eventos", linhas: 0, bytes: 0, rls: false, politicas: [] },
  ],
};
const porIp = new Map();

// ---------- ajudantes ----------

const json = (res, codigo, corpo) => {
  res.writeHead(codigo, { "Content-Type": "application/json", "Access-Control-Allow-Origin": origem, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS" });
  res.end(JSON.stringify(corpo));
};
const lerCorpo = (req) => new Promise((resolve) => {
  let t = "";
  req.on("data", (c) => (t += c));
  req.on("end", () => {
    try {
      resolve(t ? JSON.parse(t) : {});
    } catch {
      resolve({});
    }
  });
});
const soma = (l, f = (x) => x) => l.reduce((t, x) => t + f(x), 0);
const contar = (l, chave) => {
  const m = new Map();
  for (const x of l) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].map(([k, n]) => ({ [chave]: k, n })).sort((a, b) => b.n - a.n);
};

function ipNaGama(ip, alvo) {
  if (/^[A-Za-z]{2}$/.test(alvo)) return false; // países precisam de uma base de GeoIP
  const [rede, bits = "32"] = alvo.split("/");
  const n = (x) => x.split(".").reduce((t, o) => (t << 8) + Number(o), 0) >>> 0;
  const mascara = Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (n(ip) & mascara) === (n(rede) & mascara);
}

function bloqueado(ip) {
  if (!estado.firewall.ativo) return null;
  const regras = estado.regras.filter((r) => r.ativa);
  if (regras.some((r) => r.acao === "permitir" && ipNaGama(ip, r.alvo))) return null;
  const r = regras.find((x) => x.acao === "bloquear" && ipNaGama(ip, x.alvo));
  if (r) return `Regra: ${r.alvo}`;
  const t = Date.now();
  const lista = (porIp.get(ip) ?? []).filter((x) => t - x < 60_000);
  lista.push(t);
  porIp.set(ip, lista);
  return lista.length > estado.firewall.limitePorMinuto ? `Limite de ${estado.firewall.limitePorMinuto} por minuto` : null;
}

function metricasDePagamentos() {
  const ok = estado.pagamentos.filter((p) => p.estado === "Confirmado");
  const recusados = estado.pagamentos.filter((p) => p.estado === "Recusado").length;
  const pend = estado.pagamentos.filter((p) => p.estado === "Pendente");
  const porDia = new Map();
  for (const p of ok) porDia.set(p.data.slice(0, 10), (porDia.get(p.data.slice(0, 10)) ?? 0) + p.valor);
  return {
    volume: soma(ok, (p) => p.valor),
    numero: estado.pagamentos.length,
    ticketMedio: ok.length ? Math.round(soma(ok, (p) => p.valor) / ok.length) : 0,
    taxaDeSucesso: ok.length + recusados ? ok.length / (ok.length + recusados) : 0,
    pendentes: pend.length,
    valorPendente: soma(pend, (p) => p.valor),
    reembolsado: soma(estado.pagamentos.filter((p) => p.estado === "Reembolsado"), (p) => p.valor),
    porMetodo: [...new Map(ok.map((p) => [p.metodo, 0]))].map(([metodo]) => ({ metodo, valor: soma(ok.filter((p) => p.metodo === metodo), (p) => p.valor) })),
    porDia: [...porDia].sort().map(([data, valor]) => ({ data, valor })),
  };
}

function resumoDeMarketing() {
  const visitas = estado.eventos.filter((e) => e.tipo === "visita");
  const porDia = new Map();
  for (const v of visitas) porDia.set(v.quando.slice(0, 10), (porDia.get(v.quando.slice(0, 10)) ?? 0) + 1);
  const visitantes = new Set(visitas.map((v) => v.visitante)).size;
  const porSessao = contar(estado.eventos.filter((e) => e.tipo === "visita").map((e) => e.sessao), "sessao");
  return { visitas: visitas.length, visitantes, paginasPorVisita: porSessao.length ? Math.round((visitas.length / porSessao.length) * 10) / 10 : 0, rejeicao: porSessao.length ? porSessao.filter((s) => s.n === 1).length / porSessao.length : 0, conversoes: estado.eventos.filter((e) => e.tipo === "clique" && /proposta|contacto/i.test(e.elemento ?? "")).length, porDia: [...porDia].sort().map(([data, n]) => ({ data, visitas: n })) };
}

function origemDe(e) {
  if (e.utm?.source) return { fonte: e.utm.source, meio: e.utm.medium ?? "nenhum", campanha: e.utm.campaign ?? "" };
  if (!e.referrer) return { fonte: "direto", meio: "nenhum", campanha: "" };
  try {
    return { fonte: new URL(e.referrer).hostname.replace(/^www\./, ""), meio: "referencia", campanha: "" };
  } catch {
    return { fonte: "direto", meio: "nenhum", campanha: "" };
  }
}

// ---------- implementações ----------

function reverterPara(alvo) {
  for (const v of estado.implementacoes) {
    if (v.id === alvo.id) Object.assign(v, { estado: "Ativa", trafego: 100 });
    else if (v.id === estado.divisao.a) Object.assign(v, { estado: "Anterior", trafego: 0 });
    else if (v.estado === "Em teste") Object.assign(v, { estado: "Pronta", trafego: 0 });
  }
  estado.divisao = { a: alvo.id, b: null, percentagemB: 0 };
  estado.historico.unshift({ quando: agora(), texto: `Versão ${alvo.versao} em produção` });
}

// ---------- e-mails e campanhas do Marketing ----------

const PESSOAS = { todos: 1240, ativos: 860, novos: 140, inativos: 215, newsletter: 2310 };
function pseudo(texto, n) {
  let h = 2166136261 ^ n;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}
// Este servidor não envia nada: devolve números simulados, sempre os mesmos para a mesma campanha. Um servidor a sério envia e conta.
function enviarCampanha(c, quando) {
  const destinatarios = PESSOAS[c.audiencia] ?? 100;
  const entregues = Math.round(destinatarios * (0.965 + pseudo(c.id, 1) * 0.03));
  const abertos = Math.round(entregues * (0.3 + pseudo(c.id, 2) * 0.22));
  const cliques = Math.round(abertos * (0.1 + pseudo(c.id, 3) * 0.2));
  Object.assign(c, { estado: "Enviada", enviadaEm: quando, agendadaPara: undefined, destinatarios, entregues, abertos, cliques, falhas: destinatarios - entregues, atualizada: agora() });
}
// A fila anda de 20 em 20 segundos: o que estava agendado e já passou de hora sai.
setInterval(() => {
  const t = Date.now();
  for (const m of estado.mensagens) if (m.pasta === "agendados" && new Date(m.data).getTime() <= t) Object.assign(m, { pasta: "enviados", estado: "Entregue", lido: true });
  for (const c of estado.campanhasEmail) if (c.estado === "Agendada" && c.agendadaPara && new Date(c.agendadaPara).getTime() <= t) enviarCampanha(c, c.agendadaPara);
}, 20_000).unref();

function guardarEm(lista, id, corpo, aoGuardar) {
  const item = { ...corpo, id };
  aoGuardar?.(item);
  const i = lista.findIndex((x) => x.id === id);
  if (i >= 0) lista[i] = item;
  else lista.push(item);
  return item;
}

// ---------- rotas ----------

async function tratar(req, res, url, corpo) {
  const m = req.method;
  const p = url.pathname;
  let r;
  const e = (re) => (r = re.exec(p));

  // pagamentos
  if (p === "/v1/pagamentos/metricas" && m === "GET") return json(res, 200, metricasDePagamentos());
  if (p === "/v1/pagamentos" && m === "GET") return json(res, 200, { itens: estado.pagamentos, total: estado.pagamentos.length });
  if (p === "/v1/pagamentos" && m === "POST") {
    const novo = { id: id("pg"), referencia: corpo.referencia ?? `PG-${estado.pagamentos.length + 1}`, cliente: corpo.cliente ?? "", metodo: corpo.metodo ?? "Transferência", valor: Number(corpo.valor ?? 0), moeda: corpo.moeda ?? "AOA", data: corpo.data ?? agora(), estado: "Pendente", conta: corpo.conta ?? "" };
    estado.pagamentos.unshift(novo);
    return json(res, 200, novo);
  }
  if (e(/^\/v1\/pagamentos\/([^/]+)$/) && m === "PATCH") {
    const x = estado.pagamentos.find((q) => q.id === r[1]);
    if (!x) return json(res, 404, { erro: "Não existe." });
    x.estado = corpo.estado ?? x.estado;
    return json(res, 200, x);
  }
  // comprovativos
  if (p === "/v1/comprovativos" && m === "GET") return json(res, 200, { itens: estado.comprovativos });
  if (p === "/v1/comprovativos" && m === "POST") {
    const novo = { id: id("cp"), ficheiro: corpo.ficheiro ?? "comprovativo", pagamento: corpo.pagamento ?? "", de: corpo.de ?? "", recebido: agora(), estado: "Por validar" };
    estado.comprovativos.unshift(novo);
    return json(res, 200, novo);
  }
  if (e(/^\/v1\/comprovativos\/([^/]+)$/) && m === "PATCH") {
    const x = estado.comprovativos.find((q) => q.id === r[1]);
    if (!x) return json(res, 404, { erro: "Não existe." });
    Object.assign(x, { estado: corpo.estado ?? x.estado, nota: corpo.nota });
    const pg = estado.pagamentos.find((q) => q.referencia === x.pagamento && q.estado === "Pendente");
    if (x.estado === "Validado" && pg) pg.estado = "Confirmado";
    return json(res, 200, x);
  }
  // contas bancárias
  if (p === "/v1/contas-bancarias" && m === "GET") return json(res, 200, { itens: estado.contas });
  if (e(/^\/v1\/contas-bancarias\/([^/]+)$/)) {
    if (m === "PUT") {
      const item = { ...corpo, id: r[1] };
      const i = estado.contas.findIndex((c) => c.id === r[1]);
      if (item.principal) estado.contas.forEach((c) => (c.principal = false));
      if (i >= 0) estado.contas[i] = item;
      else estado.contas.push(item);
      return json(res, 200, item);
    }
    if (m === "DELETE") {
      estado.contas = estado.contas.filter((c) => c.id !== r[1]);
      return json(res, 200, { removida: true });
    }
  }
  // marketing
  if (p === "/v1/eventos" && m === "POST") {
    estado.eventos.push({ ...corpo, quando: corpo.quando ?? agora() });
    estado.eventos = estado.eventos.slice(-20_000);
    return json(res, 200, { aceite: true });
  }
  if (p === "/v1/marketing/resumo" && m === "GET") return json(res, 200, resumoDeMarketing());
  if (p === "/v1/marketing/origens" && m === "GET") {
    const visitas = estado.eventos.filter((x) => x.tipo === "visita").map((x) => ({ ...origemDe(x), visitante: x.visitante }));
    const chaves = [...new Set(visitas.map((v) => `${v.fonte}|${v.meio}|${v.campanha}`))];
    return json(res, 200, { itens: chaves.map((k) => { const [fonte, meio, campanha] = k.split("|"); const dela = visitas.filter((v) => `${v.fonte}|${v.meio}|${v.campanha}` === k); return { fonte, meio, campanha, visitas: dela.length, visitantes: new Set(dela.map((v) => v.visitante)).size, conversoes: 0 }; }).sort((a, b) => b.visitas - a.visitas) });
  }
  if (p === "/v1/marketing/paginas" && m === "GET") return json(res, 200, { itens: contar(estado.eventos.filter((x) => x.tipo === "visita").map((x) => x.pagina), "pagina").map((x) => ({ pagina: x.pagina, visitas: x.n, tempoMedio: 0, rejeicao: 0, conversoes: 0 })) });
  if (p === "/v1/marketing/cliques" && m === "GET") {
    const cl = estado.eventos.filter((x) => x.tipo === "clique");
    return json(res, 200, { itens: contar(cl.map((x) => `${x.elemento}|${x.pagina}`), "k").map((x) => { const [elemento, pagina] = x.k.split("|"); return { elemento, pagina, cliques: x.n, visitantes: new Set(cl.filter((c) => c.elemento === elemento && c.pagina === pagina).map((c) => c.visitante)).size }; }) });
  }
  // developer tools: saúde e pedidos
  if (p === "/v1/dev/saude" && m === "GET") {
    const cpus = os.cpus().length;
    const [a, b, c] = os.loadavg();
    let disco = 0;
    try {
      const f = statfsSync("/");
      disco = 1 - f.bavail / f.blocks;
    } catch { /* sem statfs */ }
    return json(res, 200, { cpu: Math.min(1, a / cpus), memoria: 1 - os.freemem() / os.totalmem(), disco, redeEntrada: 0, redeSaida: 0, carga: [a, b, c], tempoLigado: Math.round(os.uptime()), servicos: [{ nome: "servidor de exemplo", estado: "saudavel", cpu: 0, memoria: process.memoryUsage().rss }] });
  }
  if (p === "/v1/dev/pedidos" && m === "GET") {
    const desde = url.searchParams.get("desde");
    return json(res, 200, { itens: (desde ? estado.pedidos.filter((q) => q.quando > desde) : estado.pedidos).slice(0, 300) });
  }
  // erros
  if (p === "/v1/dev/erros" && m === "GET") return json(res, 200, { itens: estado.erros });
  if (e(/^\/v1\/dev\/erros\/([^/]+)$/) && m === "PATCH") {
    const x = estado.erros.find((q) => q.id === r[1]);
    if (!x) return json(res, 404, { erro: "Não existe." });
    x.estado = corpo.estado ?? x.estado;
    return json(res, 200, x);
  }
  // base de dados
  if (p === "/v1/dev/bd/tabelas" && m === "GET") return json(res, 200, { itens: estado.tabelas.map((t) => ({ ...t, linhas: t.nome === "pagamentos" ? estado.pagamentos.length : t.nome === "eventos" ? estado.eventos.length : t.linhas })) });
  if (e(/^\/v1\/dev\/bd\/tabelas\/([^/]+)\/rls$/) && m === "PATCH") {
    const t = estado.tabelas.find((q) => q.nome === r[1]);
    if (!t) return json(res, 404, { erro: "Não existe." });
    t.rls = !!corpo.rls;
    return json(res, 200, { rls: t.rls });
  }
  if (e(/^\/v1\/dev\/bd\/tabelas\/([^/]+)\/linhas$/) && m === "DELETE") {
    const antes = new Date(Date.now() - Number(corpo.antes ?? 90) * 86_400_000).toISOString();
    let apagadas = 0;
    if (r[1] === "eventos") {
      const n = estado.eventos.length;
      estado.eventos = estado.eventos.filter((x) => x.quando >= antes);
      apagadas = n - estado.eventos.length;
    }
    return json(res, 200, { antes, apagadas });
  }
  // cópias de segurança
  if (p === "/v1/dev/backups" && m === "GET") return json(res, 200, { itens: estado.backups });
  if (p === "/v1/dev/backups" && m === "POST") {
    const novo = { id: id("bk"), quando: agora(), tipo: "Manual", bytes: 0, estado: "A decorrer", destino: estado.destino.endereco };
    estado.backups.unshift(novo);
    setTimeout(() => Object.assign(novo, { estado: "Concluído", bytes: 52_428_800 }), 3000);
    return json(res, 200, { id: novo.id, estado: novo.estado });
  }
  if (p === "/v1/dev/backups/destino" && m === "PUT") {
    estado.destino = corpo;
    return json(res, 200, corpo);
  }
  if (e(/^\/v1\/dev\/backups\/([^/]+)\/restaurar$/) && m === "POST") return json(res, 200, { estado: "A decorrer" });
  if (e(/^\/v1\/dev\/backups\/([^/]+)$/) && m === "DELETE") {
    estado.backups = estado.backups.filter((b) => b.id !== r[1]);
    return json(res, 200, { removida: true });
  }
  // firewall
  if (p === "/v1/dev/firewall" && m === "GET") return json(res, 200, estado.firewall);
  if (p === "/v1/dev/firewall" && m === "PATCH") {
    estado.firewall = { ...estado.firewall, ...corpo };
    return json(res, 200, estado.firewall);
  }
  if (p === "/v1/dev/firewall/regras" && m === "GET") return json(res, 200, { itens: estado.regras });
  if (e(/^\/v1\/dev\/firewall\/regras\/([^/]+)$/)) {
    if (m === "PUT") {
      const item = { ...corpo, id: r[1] };
      const i = estado.regras.findIndex((x) => x.id === r[1]);
      if (i >= 0) estado.regras[i] = item;
      else estado.regras.push(item);
      return json(res, 200, item);
    }
    if (m === "DELETE") {
      estado.regras = estado.regras.filter((x) => x.id !== r[1]);
      return json(res, 200, { removida: true });
    }
  }
  if (p === "/v1/dev/firewall/bloqueios" && m === "GET") return json(res, 200, { itens: estado.bloqueios.slice(0, 50) });
  // páginas
  if (p === "/v1/dev/paginas" && m === "GET") return json(res, 200, { itens: estado.paginas });
  if (p === "/v1/dev/paginas" && m === "PATCH") {
    const i = estado.paginas.findIndex((x) => x.caminho === corpo.caminho);
    if (i >= 0) estado.paginas[i] = corpo;
    else estado.paginas.push(corpo);
    return json(res, 200, corpo);
  }
  // e-mails
  if (p === "/v1/dev/emails" && m === "GET") return json(res, 200, { itens: estado.emails });
  if (p === "/v1/dev/emails/configuracao" && m === "PUT") {
    estado.emailConfig = { ...corpo, senha: undefined };
    return json(res, 200, estado.emailConfig);
  }
  if (p === "/v1/dev/emails/teste" && m === "POST") {
    const novo = { id: id("em"), para: corpo.para ?? "", assunto: "E-mail de teste do painel", estado: "Fila", quando: agora() };
    estado.emails.unshift(novo);
    setTimeout(() => (novo.estado = "Enviado"), 1000);
    return json(res, 200, { id: novo.id, estado: novo.estado });
  }
  if (p === "/v1/dev/emails/dns" && m === "GET") return json(res, 200, { itens: ["SPF", "DKIM", "DMARC", "PTR"].map((nome) => ({ nome, estado: "aviso", detalhe: "O servidor de exemplo não consulta o DNS: implemente esta verificação no seu servidor." })) });
  // configuração do painel (os módulos ligados e desligados)
  if (p === "/v1/painel/configuracao" && m === "GET") return json(res, 200, estado.painel);
  if (p === "/v1/painel/configuracao" && m === "PUT") {
    if (typeof corpo.pacote !== "string" || !corpo.pacote) return json(res, 400, { erro: "Falta o pacote." });
    estado.painel = { pacote: corpo.pacote, ligados: corpo.ligados && typeof corpo.ligados === "object" ? corpo.ligados : {}, predefinicao: corpo.predefinicao, aparencia: corpo.aparencia };
    return json(res, 200, estado.painel);
  }
  // implementações: versões, teste A/B e rollback
  if (p === "/v1/dev/implementacoes" && m === "GET") return json(res, 200, { itens: estado.implementacoes, ...estado.divisao, historico: estado.historico.slice(0, 50) });
  if (p === "/v1/dev/implementacoes" && m === "POST") {
    if (!corpo.ramo || !corpo.commit) return json(res, 400, { erro: "Faltam o ramo e o commit." });
    const nova = { id: id("imp"), versao: versaoDe(new Date()), ramo: corpo.ramo, commit: corpo.commit, mensagem: corpo.mensagem ?? "", autor: corpo.autor ?? "Equipa", quando: agora(), estado: "Pronta", trafego: 0 };
    estado.implementacoes.unshift(nova);
    estado.historico.unshift({ quando: agora(), texto: `Versão ${nova.versao} lançada do commit ${nova.commit}` });
    return json(res, 200, nova);
  }
  if (p === "/v1/dev/implementacoes/divisao" && m === "PUT") {
    const a = estado.implementacoes.find((v) => v.id === estado.divisao.a);
    if (!corpo.b) {
      for (const v of estado.implementacoes) if (v.estado === "Em teste") Object.assign(v, { estado: "Pronta", trafego: 0 });
      if (a) a.trafego = 100;
      estado.divisao = { a: estado.divisao.a, b: null, percentagemB: 0 };
      estado.historico.unshift({ quando: agora(), texto: "Teste A/B terminado" });
      return json(res, 200, estado.divisao);
    }
    const b = estado.implementacoes.find((v) => v.id === corpo.b);
    const pct = Math.round(Number(corpo.percentagemB));
    if (!b || b.id === estado.divisao.a) return json(res, 400, { erro: "Escolha uma versão B diferente da A." });
    if (!(pct >= 1 && pct <= 99)) return json(res, 400, { erro: "A percentagem da B vai de 1 a 99." });
    for (const v of estado.implementacoes) if (v.estado === "Em teste" && v.id !== b.id) Object.assign(v, { estado: "Pronta", trafego: 0 });
    Object.assign(b, { estado: "Em teste", trafego: pct });
    if (a) a.trafego = 100 - pct;
    estado.divisao = { a: estado.divisao.a, b: b.id, percentagemB: pct };
    estado.historico.unshift({ quando: agora(), texto: `Teste A/B: a versão ${b.versao} recebe ${pct} % do tráfego` });
    return json(res, 200, estado.divisao);
  }
  if (p === "/v1/dev/implementacoes/promover" && m === "POST") {
    const b = estado.implementacoes.find((v) => v.id === estado.divisao.b);
    if (!b) return json(res, 400, { erro: "Não há nenhum teste A/B a decorrer." });
    reverterPara(b);
    return json(res, 200, estado.divisao);
  }
  if (e(/^\/v1\/dev\/implementacoes\/([^/]+)\/reverter$/) && m === "POST") {
    const alvo = estado.implementacoes.find((v) => v.id === r[1]);
    if (!alvo) return json(res, 404, { erro: "Não existe." });
    reverterPara(alvo);
    return json(res, 200, estado.divisao);
  }
  // GitHub e conectores (este servidor não fala com o GitHub: os commits são de exemplo)
  if (p === "/v1/dev/github" && m === "GET") return json(res, 200, { ...estado.github, ramos: ["main", "desenvolvimento"] });
  if (p === "/v1/dev/github" && m === "PUT") {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(corpo.repositorio ?? ""))) return json(res, 400, { erro: "Use o formato dono/nome." });
    estado.github = { repositorio: corpo.repositorio, ramo: corpo.ramo ?? "main" };
    return json(res, 200, estado.github);
  }
  if (p === "/v1/dev/github/commits" && m === "GET") {
    const ramo = corpo.ramo ?? estado.github.ramo;
    const itens = ["Ajusta o seletor de contas", "Corrige o filtro dos pedidos", "Acrescenta a exportação em PDF", "Atualiza as dependências", "Melhora o carregamento", "Primeira versão"].map((mensagem, i) => ({
      sha: (pseudo(`${ramo}${i}`, 7).toString(16) + "0000000").slice(2, 9),
      mensagem,
      autor: "Equipa",
      quando: new Date(Date.now() - (i + 1) * 6 * 3_600_000).toISOString(),
      ramo,
      testes: i === 3 ? "Falharam" : i === 0 ? "A correr" : "Passaram",
    }));
    return json(res, 200, { itens });
  }
  if (p === "/v1/dev/conectores" && m === "GET") return json(res, 200, { itens: estado.conectores });
  if (e(/^\/v1\/dev\/conectores\/([^/]+)$/) && m === "PUT") {
    const c = estado.conectores.find((x) => x.id === r[1]);
    if (!c) return json(res, 404, { erro: "Não existe." });
    Object.assign(c, { ligado: !!corpo.ligado });
    return json(res, 200, c);
  }
  if (e(/^\/v1\/dev\/conectores\/([^/]+)\/testar$/) && m === "POST") {
    const c = estado.conectores.find((x) => x.id === r[1]);
    if (!c) return json(res, 404, { erro: "Não existe." });
    return json(res, 200, c.ligado ? { ok: true, mensagem: `Respondeu em ${90 + (c.id.length * 17) % 80} ms` } : { ok: false, mensagem: "Está desligado, ligue-o primeiro." });
  }
  // e-mails do Marketing: as mensagens de todas as pastas e as campanhas (este servidor não envia nada: marca como entregue)
  if (p === "/v1/marketing/emails" && m === "GET") return json(res, 200, { itens: estado.mensagens });
  if (e(/^\/v1\/marketing\/emails\/([^/]+)$/)) {
    if (m === "PUT") {
      const item = guardarEm(estado.mensagens, r[1], corpo, (x) => {
        if (x.pasta === "enviados" && !["Entregue", "Aberto", "Falhou", "Devolvido"].includes(x.estado)) x.estado = "Entregue";
        if (x.pasta === "agendados") x.estado = "Agendado";
      });
      return json(res, 200, item);
    }
    if (m === "DELETE") {
      estado.mensagens = estado.mensagens.filter((x) => x.id !== r[1]);
      return json(res, 200, { removida: true });
    }
  }
  if (p === "/v1/marketing/campanhas-email" && m === "GET") return json(res, 200, { itens: estado.campanhasEmail });
  if (e(/^\/v1\/marketing\/campanhas-email\/([^/]+)$/)) {
    if (m === "PUT") {
      const item = guardarEm(estado.campanhasEmail, r[1], corpo, (c) => {
        if (c.estado === "A enviar") enviarCampanha(c, agora());
      });
      return json(res, 200, item);
    }
    if (m === "DELETE") {
      estado.campanhasEmail = estado.campanhasEmail.filter((x) => x.id !== r[1]);
      return json(res, 200, { removida: true });
    }
  }
  // limpeza
  if (p === "/v1/dev/limpeza" && m === "POST") {
    const antes = new Date(Date.now() - Number(corpo.dias ?? 90) * 86_400_000).toISOString();
    if (corpo.alvo === "logs") estado.pedidos = estado.pedidos.filter((q) => q.quando >= antes);
    if (corpo.alvo === "eventos") estado.eventos = estado.eventos.filter((q) => q.quando >= antes);
    return json(res, 200, { alvo: corpo.alvo, antes });
  }
  return json(res, 404, { erro: "Endereço desconhecido." });
}

const servidor = createServer(async (req, res) => {
  const inicio = Date.now();
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0] ?? req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": origem, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS" });
    return res.end();
  }
  const registar = (codigo) => {
    // os pedidos do próprio painel (leitura da lista) não enchem o registo
    if (url.pathname === "/v1/dev/pedidos") return;
    estado.pedidos.unshift({ id: id("rq"), quando: agora(), metodo: req.method, caminho: url.pathname, estado: codigo, ms: Date.now() - inicio, ip, pais: "", agente: (req.headers["user-agent"] ?? "").slice(0, 60) });
    estado.pedidos = estado.pedidos.slice(0, 1000);
    if (codigo >= 500) {
      const mensagem = `Erro ${codigo} em ${req.method} ${url.pathname}`;
      const antigo = estado.erros.find((x) => x.mensagem === mensagem);
      if (antigo) Object.assign(antigo, { ocorrencias: antigo.ocorrencias + 1, ultimo: agora() });
      else estado.erros.unshift({ id: id("er"), nivel: "erro", mensagem, origem: url.pathname, ocorrencias: 1, ultimo: agora(), estado: "Novo" });
    }
  };
  const motivo = bloqueado(ip);
  if (motivo) {
    estado.bloqueios.unshift({ id: id("bl"), quando: agora(), ip, caminho: url.pathname, motivo });
    registar(429);
    return json(res, 429, { erro: "Bloqueado pelo firewall." });
  }
  if (req.headers.authorization !== `Bearer ${token}` && url.pathname !== "/v1/eventos") {
    registar(401);
    return json(res, 401, { erro: "Token em falta ou errado." });
  }
  const corpo = req.method === "GET" || req.method === "DELETE" ? Object.fromEntries(url.searchParams) : await lerCorpo(req);
  const fim = res.end.bind(res);
  res.end = (...a) => {
    registar(res.statusCode);
    return fim(...a);
  };
  try {
    await tratar(req, res, url, req.method === "DELETE" ? { ...Object.fromEntries(url.searchParams), ...(await lerCorpo(req)) } : corpo);
  } catch (erro) {
    json(res, 500, { erro: String(erro) });
  }
});

servidor.listen(porta, () => {
  console.log(`Servidor de exemplo a ouvir em http://localhost:${porta}`);
  console.log(`Token: ${token}`);
  console.log("No painel: Developer tools, «API e ligações», origem «Ligado a um servidor», com este endereço e este token.");
});
