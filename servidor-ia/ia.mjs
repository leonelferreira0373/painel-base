// O Worker da IA do painel (Cloudflare Workers + Workers AI, camada gratuita), com a contagem verdadeira do que cada chamada gasta:
//   POST /pesquisa    { consulta }                              → { termos, uso }   as palavras-chave do assunto (a pesquisa em linguagem natural)
//   POST /assistente  { mensagens, ferramentas, sessao }        → { texto, chamadas, uso }   um passo do assistente, com ferramentas (quem as executa é o painel)
//   GET  /uso/hoje                                              → o que se gastou hoje e o que resta da quota gratuita
//   GET  /uso/historico?dias=30                                 → o gasto por dia e as últimas chamadas (só números: o texto das perguntas nunca se guarda)
//   POST /web/buscar  { consulta, max }                         → { resultados }   procura na internet (DuckDuckGo e Wikipédia), para a pesquisa a fundo
//   POST /web/ler     { url }                                   → { titulo, descricao, texto }   lê uma página como texto (nunca máquinas internas)
//   GET  /eu                                                    → o endereço IP e o local de quem pergunta (para o histórico de sessões)
// Só responde às origens de ORIGENS (CORS), limita a 20 pedidos por minuto e por IP e PARA quando a quota gratuita do dia acaba (nunca gasta dinheiro).
import { MODELO_PADRAO, MODELOS_DE_IA, NEURONS_GRATIS_POR_DIA, usoDaResposta } from "../src/lib/ia-modelos.ts";
import { mensagensDaPesquisa, pedidoValido, termosDaResposta, textoDaResposta } from "../src/lib/pesquisa-ia.ts";
import { resultadosDaWikipedia, resultadosDeNoticias, resultadosDoBrave, resultadosDoDuckDuckGo, resultadosDoDuckDuckGoApi, textoDaPagina, urlPermitida } from "../src/lib/web-pesquisa.ts";

const UMA_HORA = 3600;
/** Muda quando muda a pergunta da pesquisa, para as respostas antigas guardadas deixarem de valer. */
const VERSAO_DA_PERGUNTA = "v3";
const MAXIMO_DO_PEDIDO = 64 * 1024;

const cabecalhosCors = (origem, permitidas) => ({
  "Access-Control-Allow-Origin": origem && permitidas.includes(origem) ? origem : permitidas[0] ?? "",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Sessao-Ia",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const json = (corpo, estado, cors) => new Response(JSON.stringify(corpo), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors } });

async function impressao(texto) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const hoje = () => new Date().toISOString().slice(0, 10);

async function registar(env, origem, uso, sessao) {
  try {
    await env.DB.prepare("INSERT INTO uso (quando, dia, origem, modelo, tokens_in, tokens_out, neurons, custo_usd, ms, estimado, sessao) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(new Date().toISOString(), hoje(), origem, uso.modelo, uso.tokensEntrada, uso.tokensSaida, uso.neurons, uso.custoUsd, uso.ms, uso.estimado ? 1 : 0, sessao || null)
      .run();
  } catch {
    /* sem base de dados a chamada continua: só não fica no histórico */
  }
}

async function resumoDeHoje(env) {
  const linha = await env.DB.prepare("SELECT COUNT(*) AS chamadas, COALESCE(SUM(tokens_in),0) AS tin, COALESCE(SUM(tokens_out),0) AS tout, COALESCE(SUM(neurons),0) AS neurons, COALESCE(SUM(custo_usd),0) AS custo FROM uso WHERE dia = ?").bind(hoje()).first();
  const porOrigem = await env.DB.prepare("SELECT origem, COUNT(*) AS chamadas, COALESCE(SUM(neurons),0) AS neurons, COALESCE(SUM(custo_usd),0) AS custo FROM uso WHERE dia = ? GROUP BY origem").bind(hoje()).all();
  const limite = Number(env.NEURONS_POR_DIA) || NEURONS_GRATIS_POR_DIA;
  return {
    dia: hoje(),
    chamadas: linha?.chamadas ?? 0,
    tokensEntrada: linha?.tin ?? 0,
    tokensSaida: linha?.tout ?? 0,
    neurons: linha?.neurons ?? 0,
    custoUsd: linha?.custo ?? 0,
    limiteGratis: limite,
    restantes: Math.max(0, limite - (linha?.neurons ?? 0)),
    porOrigem: porOrigem.results ?? [],
  };
}

/** As ferramentas e as mensagens vêm de fora: só passa o que tem a forma certa e cabe nos limites. */
function pedidoDoAssistente(corpo) {
  const c = corpo && typeof corpo === "object" ? corpo : {};
  const mensagens = Array.isArray(c.mensagens) ? c.mensagens.slice(-60) : [];
  const limpas = [];
  for (const m of mensagens) {
    if (!m || !["system", "user", "assistant", "tool"].includes(m.role)) continue;
    const item = { role: m.role, content: typeof m.content === "string" ? m.content.slice(0, 12000) : "" };
    if (m.role === "assistant" && Array.isArray(m.tool_calls)) item.tool_calls = m.tool_calls.slice(0, 8);
    if (m.role === "tool" && typeof m.tool_call_id === "string") item.tool_call_id = m.tool_call_id.slice(0, 80);
    limpas.push(item);
  }
  if (!limpas.some((m) => m.role === "user")) return { erro: "Falta a mensagem." };
  const ferramentas = (Array.isArray(c.ferramentas) ? c.ferramentas : [])
    .slice(0, 40)
    .filter((f) => f && f.type === "function" && f.function && typeof f.function.name === "string" && /^[a-z0-9_]{1,48}$/.test(f.function.name))
    .map((f) => ({ type: "function", function: { name: f.function.name, description: String(f.function.description ?? "").slice(0, 400), parameters: f.function.parameters && typeof f.function.parameters === "object" ? f.function.parameters : { type: "object", properties: {} } } }));
  const modelo = typeof c.modelo === "string" && MODELOS_DE_IA[c.modelo] ? c.modelo : MODELO_PADRAO;
  return {
    mensagens: limpas,
    ferramentas,
    modelo,
    sessao: typeof c.sessao === "string" ? c.sessao.slice(0, 64) : "",
    // a pesquisa a fundo (origem «analise») gasta à parte e pode pedir respostas mais compridas e em JSON
    origem: c.origem === "analise" ? "analise" : c.origem === "pesquisa" ? "pesquisa" : "assistente",
    maxTokens: Math.min(3000, Math.max(200, Number(c.maxTokens) || 700)),
    json: c.json === true,
  };
}

function chamadasDe(r) {
  const brutas = r?.choices?.[0]?.message?.tool_calls ?? r?.tool_calls ?? [];
  return (Array.isArray(brutas) ? brutas : []).slice(0, 8).map((c, i) => {
    const f = c.function ?? c;
    let argumentos = f.arguments ?? {};
    if (typeof argumentos === "string") {
      try {
        argumentos = JSON.parse(argumentos);
      } catch {
        argumentos = {};
      }
    }
    return { id: String(c.id ?? `chamada-${i}`), nome: String(f.name ?? ""), argumentos: argumentos && typeof argumentos === "object" ? argumentos : {} };
  }).filter((c) => c.nome);
}

const AGENTE = "Mozilla/5.0 (compatible; PainelBot/1.0; +https://simulador.ferreirakorp.com)";
const IDIOMAS = "pt-PT,pt;q=0.9,en;q=0.8";
/** Os motores recusam quem não parece um navegador: a procura apresenta-se como um. */
const NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

/** Procura na internet: o Brave e o DuckDuckGo (as páginas HTML, ou as chaves Tavily e Brave se existirem), as notícias do Google e a Wikipédia em português e em inglês. Guarda 1 hora. */
async function buscarNaWeb(corpo, env) {
  const consulta = typeof corpo?.consulta === "string" ? corpo.consulta.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  if (consulta.length < 2) return { erro: "Falta o que procurar.", resultados: [] };
  const max = Math.min(8, Math.max(1, Number(corpo?.max) || 6));
  const chave = new Request(`https://cache.web.local/b/${await impressao(`${consulta.toLowerCase()}|${max}`)}`);
  const guardada = await caches.default.match(chave);
  if (guardada) return { ...(await guardada.json()), guardada: true };
  const resultados = [];
  const tenta = async (nome, f) => {
    try {
      resultados.push(...(await f()));
    } catch {
      /* esta fonte não respondeu: as outras continuam */
    }
  };
  const cab = { "User-Agent": NAVEGADOR, "Accept-Language": IDIOMAS };
  // as chaves (opcionais) dão resultados de motores a sério; sem elas, vai o que não pede chave
  if (env.TAVILY_KEY) await tenta("tavily", async () => {
    const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.TAVILY_KEY}` }, body: JSON.stringify({ query: consulta, max_results: max, search_depth: "basic" }), signal: AbortSignal.timeout(12000) });
    const d = r.ok ? await r.json() : {};
    return (d.results ?? []).map((x) => ({ titulo: String(x.title ?? "").slice(0, 200), url: String(x.url ?? ""), resumo: String(x.content ?? "").slice(0, 400), fonte: "web" })).filter((x) => urlPermitida(x.url));
  });
  if (env.BRAVE_KEY) await tenta("brave-api", async () => {
    const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(consulta)}&count=${max}&search_lang=pt`, { headers: { "X-Subscription-Token": env.BRAVE_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    const d = r.ok ? await r.json() : {};
    return (d.web?.results ?? []).map((x) => ({ titulo: String(x.title ?? "").slice(0, 200), url: String(x.url ?? ""), resumo: String(x.description ?? "").replace(/<[^>]*>/g, "").slice(0, 400), fonte: "web" })).filter((x) => urlPermitida(x.url));
  });
  if (resultados.length < 3) await tenta("brave", async () => {
    const r = await fetch(`https://search.brave.com/search?q=${encodeURIComponent(consulta)}&source=web`, { headers: cab, signal: AbortSignal.timeout(10000) });
    return r.ok ? resultadosDoBrave(await r.text(), max) : [];
  });
  if (resultados.length < 3) await tenta("duckduckgo", async () => {
    const r = await fetch("https://html.duckduckgo.com/html/", { method: "POST", headers: { ...cab, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ q: consulta, kl: "pt-pt" }), signal: AbortSignal.timeout(9000) });
    return r.ok ? resultadosDoDuckDuckGo(await r.text(), max) : [];
  });
  if (resultados.length < 2) await tenta("resposta-direta", async () => {
    const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(consulta)}&format=json&no_html=1&skip_disambig=1`, { headers: cab, signal: AbortSignal.timeout(7000) });
    return r.ok ? resultadosDoDuckDuckGoApi(await r.json(), 3) : [];
  });
  // as notícias recentes (só o título e a fonte) e a Wikipédia dão contexto e datas
  await tenta("noticias", async () => {
    const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(consulta)}&hl=pt-PT&gl=PT&ceid=PT:pt-150`, { headers: cab, signal: AbortSignal.timeout(8000) });
    return r.ok ? resultadosDeNoticias(await r.text(), 4) : [];
  });
  // com bons resultados da web a Wikipédia só traria ruído
  for (const lingua of resultados.filter((x) => x.fonte === "web").length >= 4 ? [] : ["pt", "en"]) {
    await tenta("wikipedia", async () => {
      const u = `https://${lingua}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(consulta)}&gsrlimit=3&prop=extracts%7Cinfo&exintro=1&explaintext=1&exchars=500&inprop=url&format=json&origin=*`;
      const r = await fetch(u, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(7000) });
      return r.ok ? resultadosDaWikipedia(await r.json(), lingua, 2) : [];
    });
  }
  const vistos = new Set();
  const saida = { resultados: resultados.filter((x) => (vistos.has(x.url) ? false : vistos.add(x.url))).slice(0, max + 2) };
  if (saida.resultados.length > 0) await caches.default.put(chave, new Response(JSON.stringify(saida), { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=3600" } }));
  return saida;
}

/** Lê uma página: segue até 4 redireções (cada uma tem de ser um endereço permitido) e devolve o texto limpo. */
async function lerPaginaDaWeb(corpo) {
  let atual = urlPermitida(typeof corpo?.url === "string" ? corpo.url.trim() : "");
  if (!atual) return { estado: 400, corpo: { erro: "Esse endereço não se pode abrir." } };
  let r;
  try {
    for (let i = 0; i < 5; i++) {
      r = await fetch(atual.toString(), { redirect: "manual", headers: { "User-Agent": AGENTE, Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5", "Accept-Language": IDIOMAS }, signal: AbortSignal.timeout(10000) });
      const local = r.headers.get("Location");
      if (r.status >= 300 && r.status < 400 && local) {
        const seguinte = urlPermitida(new URL(local, atual).toString());
        if (!seguinte) return { estado: 400, corpo: { erro: "A página reencaminha para um endereço que não se pode abrir." } };
        atual = seguinte;
        continue;
      }
      break;
    }
  } catch {
    return { estado: 502, corpo: { erro: "Não foi possível abrir a página." } };
  }
  if (!r.ok) return { estado: 502, corpo: { erro: `A página respondeu ${r.status}.` } };
  const tipo = (r.headers.get("Content-Type") ?? "").toLowerCase();
  if (!/(text\/|html|xml|json)/.test(tipo)) return { estado: 415, corpo: { erro: `Isto não é uma página de texto (${tipo || "tipo desconhecido"}).` } };
  const bruto = (await r.text()).slice(0, 900_000);
  if (/html|xml/.test(tipo)) return { estado: 200, corpo: { url: atual.toString(), ...textoDaPagina(bruto, 7000) } };
  return { estado: 200, corpo: { url: atual.toString(), titulo: atual.hostname, descricao: "", texto: bruto.slice(0, 7000) } };
}

export default {
  async fetch(pedido, env) {
    const permitidas = String(env.ORIGENS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const origem = pedido.headers.get("Origin") ?? "";
    const cors = cabecalhosCors(origem, permitidas);
    const url = new URL(pedido.url);
    const caminho = url.pathname;

    if (pedido.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (permitidas.length > 0 && !permitidas.includes(origem)) return json({ erro: "Origem não permitida." }, 403, cors);

    // ---------- leituras ----------
    if (pedido.method === "GET" && caminho === "/eu") {
      const cf = pedido.cf ?? {};
      return json({ ip: pedido.headers.get("CF-Connecting-IP") ?? "", pais: cf.country ?? "", regiao: cf.region ?? "", cidade: cf.city ?? "", fuso: cf.timezone ?? "", rede: cf.asOrganization ?? "", continente: cf.continent ?? "" }, 200, cors);
    }
    if (pedido.method === "GET" && caminho === "/uso/hoje") return json(await resumoDeHoje(env), 200, cors);
    if (pedido.method === "GET" && caminho === "/uso/historico") {
      const dias = Math.min(90, Math.max(1, Number(url.searchParams.get("dias")) || 30));
      const desde = new Date(Date.now() - (dias - 1) * 86_400_000).toISOString().slice(0, 10);
      const porDia = await env.DB.prepare("SELECT dia, COUNT(*) AS chamadas, SUM(tokens_in) AS tin, SUM(tokens_out) AS tout, SUM(neurons) AS neurons, SUM(custo_usd) AS custo FROM uso WHERE dia >= ? GROUP BY dia ORDER BY dia").bind(desde).all();
      const recentes = await env.DB.prepare("SELECT quando, origem, modelo, tokens_in AS tin, tokens_out AS tout, neurons, custo_usd AS custo, ms, estimado FROM uso ORDER BY id DESC LIMIT 100").all();
      return json({ dias: porDia.results ?? [], recentes: recentes.results ?? [] }, 200, cors);
    }

    // ---------- as chamadas à IA ----------
    const daWeb = caminho === "/web/buscar" || caminho === "/web/ler";
    if (pedido.method !== "POST" || (caminho !== "/pesquisa" && caminho !== "/assistente" && !daWeb)) return json({ erro: "Não existe." }, 404, cors);
    if (Number(pedido.headers.get("Content-Length") ?? 0) > MAXIMO_DO_PEDIDO) return json({ erro: "Pedido demasiado grande." }, 413, cors);

    const ip = pedido.headers.get("CF-Connecting-IP") ?? "";
    if (env.LIMITE) {
      const { success } = await env.LIMITE.limit({ key: ip || "sem-ip" });
      if (!success) return json({ erro: "limite", mensagem: "Demasiados pedidos: tente daqui a um minuto." }, 429, cors);
    }
    let corpo;
    try {
      corpo = await pedido.json();
    } catch {
      return json({ erro: "Pedido inválido." }, 400, cors);
    }
    // a internet não gasta a quota da IA
    if (caminho === "/web/buscar") return json(await buscarNaWeb(corpo, env), 200, cors);
    if (caminho === "/web/ler") {
      const l = await lerPaginaDaWeb(corpo);
      return json(l.corpo, l.estado, cors);
    }
    // a quota gratuita do dia acabou: para (nunca se paga)
    const resumo = await resumoDeHoje(env).catch(() => null);
    if (resumo && resumo.restantes <= 0) return json({ erro: "quota", mensagem: "A quota gratuita de hoje da IA acabou; volta à meia-noite (UTC).", uso: resumo }, 429, cors);
    // a pesquisa a fundo deixa sempre um quarto da quota para o chat e para a pesquisa em linguagem natural
    if (corpo?.origem === "analise" && caminho === "/assistente" && resumo && resumo.restantes < resumo.limiteGratis * 0.25) return json({ erro: "reserva", mensagem: "Para não faltar ao chat e à pesquisa, as análises param quando sobra um quarto da quota de hoje.", uso: resumo }, 429, cors);
    const modeloDaPesquisa = env.MODELO || MODELO_PADRAO;

    if (caminho === "/pesquisa") {
      const v = pedidoValido(corpo);
      if ("erro" in v) return json({ erro: v.erro }, 400, cors);
      const chave = new Request(`https://cache.pesquisa.local/${await impressao(`${VERSAO_DA_PERGUNTA}|${modeloDaPesquisa}|${v.consulta.toLowerCase()}`)}`);
      const guardada = await caches.default.match(chave);
      if (guardada) return json({ ...(await guardada.json()), guardada: true }, 200, cors);
      const mensagens = mensagensDaPesquisa(v.consulta);
      const t0 = Date.now();
      let r;
      try {
        r = await env.AI.run(modeloDaPesquisa, { messages: mensagens, max_tokens: 120, temperature: 0 });
      } catch {
        return json({ erro: "A IA não respondeu." }, 502, cors);
      }
      const texto = textoDaResposta(r);
      const termos = termosDaResposta(texto);
      const uso = usoDaResposta(modeloDaPesquisa, r?.usage, Date.now() - t0, mensagens.map((m) => m.content).join("\n"), texto);
      await registar(env, "pesquisa", uso, pedido.headers.get("X-Sessao-Ia"));
      const saida = { termos, uso };
      if (termos.length > 0) await caches.default.put(chave, new Response(JSON.stringify(saida), { headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${UMA_HORA}` } }));
      return json(saida, 200, cors);
    }

    const p = pedidoDoAssistente(corpo);
    if ("erro" in p) return json({ erro: p.erro }, 400, cors);
    const t0 = Date.now();
    let r;
    try {
      r = await env.AI.run(p.modelo, { messages: p.mensagens, ...(p.ferramentas.length > 0 ? { tools: p.ferramentas } : {}), ...(p.json ? { response_format: { type: "json_object" } } : {}), max_tokens: p.maxTokens, temperature: p.origem === "analise" ? 0.3 : p.origem === "pesquisa" ? 0 : 0.2 });
    } catch {
      return json({ erro: "A IA não respondeu." }, 502, cors);
    }
    const texto = r?.choices?.[0]?.message?.content ?? (typeof r?.response === "string" ? r.response : "");
    const uso = usoDaResposta(p.modelo, r?.usage, Date.now() - t0, p.mensagens.map((m) => m.content).join("\n"), String(texto ?? ""));
    await registar(env, p.origem, uso, p.sessao);
    return json({ texto: String(texto ?? ""), chamadas: chamadasDe(r), uso }, 200, cors);
  },
};
