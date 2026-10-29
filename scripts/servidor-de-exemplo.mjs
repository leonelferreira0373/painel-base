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
