// Ponto de autenticação do painel. Sem dependências: node:http, node:crypto e um ficheiro JSON.
//   POST /api/auth/registar        { email, senha, nome? }                 → cria a conta (função «cliente») e abre a sessão
//   POST /api/auth/entrar          { email, senha, lembrar }               → abre a sessão, ou devolve { codigo: true, bilhete } se a conta tem dois passos
//   POST /api/auth/mfa             { bilhete, codigo }                     → conclui a entrada com o código da aplicação autenticadora
//   POST /api/auth/mfa/preparar    (sessão)                                → devolve o segredo para a aplicação autenticadora
//   POST /api/auth/mfa/ativar      (sessão) { codigo }                     → liga os dois passos
//   POST /api/auth/terminar        (sessão)                                → termina a sessão
//   GET  /api/auth/sessao          (sessão)                                → quem está com a sessão aberta
//   POST /api/auth/recuperar       { email }                               → responde sempre o mesmo; envia a ligação se a conta existir
//   POST /api/auth/repor           { token, senha }                        → define a nova palavra-passe e termina todas as sessões
//   POST /api/auth/recuperar-email { nome }                                → devolve uma pista do e-mail, sem o mostrar inteiro
//   GET  /api/auth/saude
import { createServer } from "node:http";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { promisify } from "node:util";

const scryptP = promisify(scrypt);
const PRODUCAO = process.env.NODE_ENV === "production";
const PORTA = Number(process.env.AUTH_PORTA ?? 8787);
const FICHEIRO = process.env.AUTH_DADOS ?? "./dados/utilizadores.json";
const ORIGENS = (process.env.AUTH_ORIGENS ?? "http://localhost:3010").split(",").map((o) => o.trim());
const SEGREDO = process.env.AUTH_SEGREDO ?? (PRODUCAO ? null : randomBytes(32).toString("hex"));
if (!SEGREDO) {
  console.error("Falta AUTH_SEGREDO (pelo menos 32 caracteres aleatórios).");
  process.exit(1);
}

// ---------- armazenamento ----------
let bd = { utilizadores: {}, reposicoes: {}, sessoes: {} };
if (existsSync(FICHEIRO)) bd = { ...bd, ...JSON.parse(readFileSync(FICHEIRO, "utf8")) };
function gravar() {
  mkdirSync(dirname(FICHEIRO), { recursive: true });
  const tmp = `${FICHEIRO}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(bd), { mode: 0o600 });
  renameSync(tmp, FICHEIRO);
}

// ---------- palavras-passe ----------
const regras = (s) => s.length >= 8 && /\d/.test(s) && /[^A-Za-z0-9\s]/.test(s) && s === s.trim();
const emailValido = (e) => typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const normal = (e) => e.trim().toLowerCase();
async function cifrar(senha, sal = randomBytes(16)) {
  const chave = await scryptP(senha, sal, 64, { N: 16384, r: 8, p: 1 });
  return { sal: sal.toString("hex"), hash: chave.toString("hex") };
}
const SENHA_FALSA = await cifrar("senha-falsa-para-igualar-o-tempo");
async function confere(senha, u) {
  const alvo = u ?? SENHA_FALSA; // gasta o mesmo tempo quando a conta não existe
  const { hash } = await cifrar(senha, Buffer.from(alvo.sal, "hex"));
  const certo = timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(alvo.hash, "hex"));
  return !!u && certo;
}

// ---------- dois passos (RFC 6238: HMAC-SHA1, 6 dígitos, 30 s) ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const paraBase32 = (b) => {
  let bits = "";
  for (const x of b) bits += x.toString(2).padStart(8, "0");
  return (bits.match(/.{1,5}/g) ?? []).map((g) => B32[parseInt(g.padEnd(5, "0"), 2)]).join("");
};
const deBase32 = (s) => Buffer.from((s.replace(/=+$/, "").split("").map((c) => B32.indexOf(c).toString(2).padStart(5, "0")).join("").match(/.{8}/g) ?? []).map((x) => parseInt(x, 2)));
function totp(segredo, t = Date.now()) {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(t / 30_000)));
  const h = createHmac("sha1", deBase32(segredo)).update(contador).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
}
const codigoCerto = (segredo, codigo) => [-30_000, 0, 30_000].some((d) => totp(segredo, Date.now() + d) === String(codigo).replace(/\s/g, ""));

// ---------- sessões e cookie assinado ----------
const assinar = (id) => `${id}.${createHmac("sha256", SEGREDO).update(id).digest("base64url")}`;
function lerCookie(req) {
  const m = /(?:^|;\s*)sessao=([^;]+)/.exec(req.headers.cookie ?? "");
  if (!m) return null;
  const [id, sig] = decodeURIComponent(m[1]).split(".");
  if (!id || !sig) return null;
  const esperado = createHmac("sha256", SEGREDO).update(id).digest("base64url");
  if (sig.length !== esperado.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null;
  const s = bd.sessoes[id];
  return s && s.expira > Date.now() ? { id, ...s } : null;
}
function abrirSessao(email, lembrar) {
  const id = randomBytes(32).toString("hex");
  const duracao = lembrar ? 30 * 86_400_000 : 12 * 3_600_000;
  bd.sessoes[id] = { email, expira: Date.now() + duracao };
  gravar();
  const atributos = ["Path=/", "HttpOnly", "SameSite=Strict", PRODUCAO && "Secure", lembrar && `Max-Age=${Math.floor(duracao / 1000)}`].filter(Boolean).join("; ");
  return `sessao=${encodeURIComponent(assinar(id))}; ${atributos}`;
}
const apagarCookie = () => `sessao=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${PRODUCAO ? "; Secure" : ""}`;
const quem = (email) => {
  const u = bd.utilizadores[email];
  return u ? { email, nome: u.nome, funcaoId: u.funcaoId, doisPassos: !!u.mfa?.ativo } : null;
};

// ---------- limite de tentativas ----------
const tentativas = new Map();
function limitar(chave, max = 8, janela = 15 * 60_000) {
  const agora = Date.now();
  const t = (tentativas.get(chave) ?? []).filter((x) => agora - x < janela);
  t.push(agora);
  tentativas.set(chave, t);
  return t.length > max ? Math.ceil((janela - (agora - t[0])) / 1000) : 0;
}
setInterval(() => {
  const agora = Date.now();
  for (const [k, v] of tentativas) if (v.every((x) => agora - x > 15 * 60_000)) tentativas.delete(k);
  for (const [id, s] of Object.entries(bd.sessoes)) if (s.expira < agora) delete bd.sessoes[id];
  for (const [k, r] of Object.entries(bd.reposicoes)) if (r.expira < agora) delete bd.reposicoes[k];
}, 60_000).unref();

const bilhetes = new Map(); // entrada à espera do código dos dois passos
const enviarEmail = (para, assunto, corpo) => console.log(`[e-mail] para ${para} | ${assunto} | ${corpo}`);

// ---------- pedidos ----------
async function corpo(req) {
  const partes = [];
  let tamanho = 0;
  for await (const p of req) {
    tamanho += p.length;
    if (tamanho > 10_000) throw Object.assign(new Error("grande"), { estado: 413 });
    partes.push(p);
  }
  try {
    return partes.length ? JSON.parse(Buffer.concat(partes).toString("utf8")) : {};
  } catch {
    throw Object.assign(new Error("json"), { estado: 400 });
  }
}
function responder(res, estado, dados, cabecalhos = {}) {
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...cabecalhos });
  res.end(JSON.stringify(dados));
}

const rotas = {
  "GET /api/auth/saude": async (_req, res) => responder(res, 200, { ok: true }),

  "POST /api/auth/registar": async (req, res, d) => {
    const email = normal(d.email ?? "");
    if (!emailValido(email)) return responder(res, 400, { ok: false, erro: "Introduza um e-mail válido." });
    if (typeof d.senha !== "string" || !regras(d.senha)) return responder(res, 400, { ok: false, erro: "A palavra-passe não cumpre os requisitos." });
    if (bd.utilizadores[email]) return responder(res, 409, { ok: false, erro: "Já existe uma conta com esse e-mail." });
    bd.utilizadores[email] = { nome: String(d.nome ?? "").trim().slice(0, 80) || email.split("@")[0], funcaoId: "cliente", ...(await cifrar(d.senha)), criado: new Date().toISOString() };
    const cookie = abrirSessao(email, true);
    return responder(res, 201, { ok: true, sessao: quem(email) }, { "Set-Cookie": cookie });
  },

  "POST /api/auth/entrar": async (req, res, d) => {
    const email = normal(d.email ?? "");
    const espera = limitar(`${req.socket.remoteAddress}|${email}`);
    if (espera) return responder(res, 429, { ok: false, erro: "Demasiadas tentativas. Tente outra vez mais tarde." }, { "Retry-After": String(espera) });
    const u = bd.utilizadores[email];
    const certo = typeof d.senha === "string" && (await confere(d.senha, u));
    if (!certo) return responder(res, 401, { ok: false, erro: "E-mail ou palavra-passe errados." });
    if (u.mfa?.ativo) {
      const bilhete = randomBytes(24).toString("base64url");
      bilhetes.set(bilhete, { email, lembrar: !!d.lembrar, expira: Date.now() + 5 * 60_000 });
      return responder(res, 200, { ok: true, codigo: true, bilhete });
    }
    return responder(res, 200, { ok: true, sessao: quem(email) }, { "Set-Cookie": abrirSessao(email, !!d.lembrar) });
  },

  "POST /api/auth/mfa": async (req, res, d) => {
    const b = bilhetes.get(String(d.bilhete ?? ""));
    if (!b || b.expira < Date.now()) return responder(res, 401, { ok: false, erro: "A entrada expirou. Comece outra vez." });
    const espera = limitar(`mfa|${d.bilhete}`, 5, 5 * 60_000);
    if (espera) return responder(res, 429, { ok: false, erro: "Demasiadas tentativas." }, { "Retry-After": String(espera) });
    if (!codigoCerto(bd.utilizadores[b.email].mfa.segredo, d.codigo)) return responder(res, 401, { ok: false, erro: "Esse código não está certo." });
    bilhetes.delete(d.bilhete);
    return responder(res, 200, { ok: true, sessao: quem(b.email) }, { "Set-Cookie": abrirSessao(b.email, b.lembrar) });
  },

  "POST /api/auth/mfa/preparar": async (req, res) => {
    const s = lerCookie(req);
    if (!s) return responder(res, 401, { ok: false, erro: "Sem sessão." });
    const segredo = paraBase32(randomBytes(20));
    bd.utilizadores[s.email].mfa = { segredo, ativo: false };
    gravar();
    return responder(res, 200, { ok: true, segredo, uri: `otpauth://totp/Painel:${encodeURIComponent(s.email)}?secret=${segredo}&issuer=Painel` });
  },

  "POST /api/auth/mfa/ativar": async (req, res, d) => {
    const s = lerCookie(req);
    const m = s && bd.utilizadores[s.email].mfa;
    if (!s || !m) return responder(res, 401, { ok: false, erro: "Sem sessão." });
    if (!codigoCerto(m.segredo, d.codigo)) return responder(res, 400, { ok: false, erro: "Esse código não está certo." });
    m.ativo = true;
    gravar();
    return responder(res, 200, { ok: true });
  },

  "POST /api/auth/terminar": async (req, res) => {
    const s = lerCookie(req);
    if (s) {
      delete bd.sessoes[s.id];
      gravar();
    }
    return responder(res, 200, { ok: true }, { "Set-Cookie": apagarCookie() });
  },

  "GET /api/auth/sessao": async (req, res) => {
    const s = lerCookie(req);
    return s ? responder(res, 200, { ok: true, sessao: quem(s.email) }) : responder(res, 401, { ok: false });
  },

  "POST /api/auth/recuperar": async (req, res, d) => {
    const email = normal(d.email ?? "");
    const espera = limitar(`rec|${req.socket.remoteAddress}`, 5);
    if (espera) return responder(res, 429, { ok: false, erro: "Demasiados pedidos." }, { "Retry-After": String(espera) });
    if (emailValido(email) && bd.utilizadores[email]) {
      const token = randomBytes(32).toString("base64url");
      bd.reposicoes[createHash("sha256").update(token).digest("hex")] = { email, expira: Date.now() + 30 * 60_000 };
      gravar();
      enviarEmail(email, "Repor a palavra-passe", `${ORIGENS[0]}/repor-palavra-passe/?token=${token}`);
    }
    return responder(res, 200, { ok: true }); // igual exista a conta ou não
  },

  "POST /api/auth/repor": async (req, res, d) => {
    if (typeof d.senha !== "string" || !regras(d.senha)) return responder(res, 400, { ok: false, erro: "A palavra-passe não cumpre os requisitos." });
    const chave = createHash("sha256").update(String(d.token ?? "")).digest("hex");
    const r = bd.reposicoes[chave];
    if (!r || r.expira < Date.now() || !bd.utilizadores[r.email]) return responder(res, 400, { ok: false, erro: "A ligação expirou ou já foi usada." });
    Object.assign(bd.utilizadores[r.email], await cifrar(d.senha));
    delete bd.reposicoes[chave];
    for (const [id, s] of Object.entries(bd.sessoes)) if (s.email === r.email) delete bd.sessoes[id];
    gravar();
    return responder(res, 200, { ok: true });
  },

  "POST /api/auth/recuperar-email": async (req, res, d) => {
    const espera = limitar(`pista|${req.socket.remoteAddress}`, 5);
    if (espera) return responder(res, 429, { ok: false, erro: "Demasiados pedidos." }, { "Retry-After": String(espera) });
    const alvo = String(d.nome ?? "").trim().toLowerCase();
    const e = Object.entries(bd.utilizadores).find(([, u]) => u.nome.toLowerCase() === alvo)?.[0];
    if (!e) return responder(res, 200, { ok: true, pista: null });
    const [a, b] = e.split("@");
    return responder(res, 200, { ok: true, pista: `${a[0]}${"•".repeat(Math.max(2, a.length - 2))}${a.slice(-1)}@${b}` });
  },
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://x");
    const rota = rotas[`${req.method} ${url.pathname}`];
    if (!rota) return responder(res, 404, { ok: false, erro: "Não existe." });
    let dados = {};
    if (req.method === "POST") {
      // Só aceita pedidos feitos pelo próprio painel: origem conhecida e corpo JSON.
      if (req.headers.origin && !ORIGENS.includes(req.headers.origin)) return responder(res, 403, { ok: false, erro: "Origem não permitida." });
      if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) return responder(res, 415, { ok: false, erro: "Use JSON." });
      dados = await corpo(req);
    }
    await rota(req, res, dados);
  } catch (e) {
    const estado = e?.estado ?? 500;
    if (estado === 500) console.error(e);
    responder(res, estado, { ok: false, erro: estado === 500 ? "Erro interno." : "Pedido inválido." });
  }
}).listen(PORTA, () => console.log(`autenticação a escutar na porta ${PORTA}`));
