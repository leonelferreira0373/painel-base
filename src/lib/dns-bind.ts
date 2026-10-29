// Os registos DNS de uma zona e o formato BIND (o ficheiro de zona que a Cloudflare, o Bind, o PowerDNS e quase todos os fornecedores de DNS exportam e importam). `paraBind` escreve a zona; `deBind` lê um ficheiro de zona (com $ORIGIN, $TTL, nomes relativos, comentários, linhas entre parênteses, TXT partidos em pedaços…) e diz o que não percebeu. Funções puras.

export type TipoDns = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV" | "CAA" | "PTR";
export const TIPOS_DNS: TipoDns[] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA", "PTR"];

export interface RegistoDns {
  id: string;
  tipo: TipoDns;
  /** «@» é a própria zona; o resto é relativo a ela («www», «mail._domainkey»). */
  nome: string;
  valor: string;
  /** Em segundos; abaixo de 60 é «automático» (escreve-se 300). */
  ttl: number;
  /** Só no MX e no SRV. */
  prioridade?: number;
  comentario?: string;
}

const TTL_AUTOMATICO = 300;
const COM_ALVO: TipoDns[] = ["CNAME", "NS", "PTR", "MX"];

/** Um nome de máquina completo para o ficheiro de zona: sem ponto final num nome relativo é relativo; aqui escreve-se sempre completo, com ponto final. */
const alvoCompleto = (valor: string, zona: string): string => {
  const v = valor.trim();
  if (v === "@" || v === "") return `${zona}.`;
  if (v.endsWith(".")) return v;
  return `${v}.`;
};

const escreverTxt = (valor: string): string => {
  const partes = valor.match(/[\s\S]{1,255}/g) ?? [""];
  return partes.map((p) => `"${p.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(" ");
};

/** O ficheiro de zona. */
export function paraBind(zona: string, registos: RegistoDns[], agora = new Date()): string {
  const linhas = [`; Zona DNS de ${zona}`, `; Exportada pelo painel em ${agora.toISOString()}`, `$ORIGIN ${zona}.`, `$TTL ${TTL_AUTOMATICO}`, ""];
  for (const r of registos) {
    const ttl = r.ttl < 60 ? TTL_AUTOMATICO : r.ttl;
    let dados: string;
    if (r.tipo === "TXT") dados = escreverTxt(r.valor);
    else if (r.tipo === "MX") dados = `${r.prioridade ?? 10} ${alvoCompleto(r.valor, zona)}`;
    else if (r.tipo === "SRV") {
      const [peso = "0", porta = "0", ...alvo] = r.valor.split(/\s+/);
      dados = `${r.prioridade ?? 0} ${peso} ${porta} ${alvoCompleto(alvo.join(" "), zona)}`;
    } else if (COM_ALVO.includes(r.tipo)) dados = alvoCompleto(r.valor, zona);
    else dados = r.valor;
    linhas.push(`${r.nome || "@"}\t${ttl}\tIN\t${r.tipo}\t${dados}${r.comentario ? ` ; ${r.comentario.replace(/[\r\n]+/g, " ")}` : ""}`);
  }
  return `${linhas.join("\n")}\n`;
}

// ---------- ler ----------

/** Tira o comentário («; …») de uma linha, sem tocar no que está entre aspas; devolve o comentário à parte. */
function semComentario(linha: string): { texto: string; comentario: string } {
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === "\\") i++;
    else if (c === '"') aspas = !aspas;
    else if (c === ";" && !aspas) return { texto: linha.slice(0, i), comentario: linha.slice(i + 1).trim() };
  }
  return { texto: linha, comentario: "" };
}

/** Parte uma linha em palavras, juntando o que está entre aspas (e tirando-lhes as aspas). */
function palavras(linha: string): string[] {
  const out: string[] = [];
  let atual = "";
  let aspas = false;
  let temAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === "\\" && i + 1 < linha.length) {
      atual += linha[++i];
    } else if (c === '"') {
      aspas = !aspas;
      temAspas = true;
    } else if (/\s/.test(c) && !aspas) {
      if (atual || temAspas) out.push(temAspas ? `"${atual}"` : atual);
      atual = "";
      temAspas = false;
    } else atual += c;
  }
  if (atual || temAspas) out.push(temAspas ? `"${atual}"` : atual);
  return out;
}

const desaspar = (p: string) => (p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1) : p);

/** «300», «1h», «2d», «1w»: o tempo de vida em segundos; `null` se não for um tempo. */
export function ttlDe(p: string): number | null {
  const m = p.match(/^(\d+)([smhdw]?)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const un: Record<string, number> = { "": 1, s: 1, m: 60, h: 3600, d: 86_400, w: 604_800 };
  return n * un[m[2].toLowerCase()];
}

export interface ZonaLida {
  zona: string;
  registos: RegistoDns[];
  erros: string[];
}

/** Lê um ficheiro de zona BIND. `zonaPadrao` vale se o ficheiro não tem $ORIGIN. */
export function deBind(texto: string, zonaPadrao = "", novoId: (n: number) => string = (n) => `dns-${Date.now().toString(36)}-${n}`): ZonaLida {
  const erros: string[] = [];
  const registos: RegistoDns[] = [];
  let zona = zonaPadrao.replace(/\.$/, "");
  let ttlPadrao = TTL_AUTOMATICO;
  let ultimoNome = "@";

  // junta as linhas que continuam entre parênteses
  const logicas: { texto: string; comentario: string; numero: number; indentada: boolean }[] = [];
  let acumulado = "";
  let abertos = 0;
  let inicio = 0;
  let indentada = false;
  let comentarios: string[] = [];
  texto.split(/\r?\n/).forEach((bruta, i) => {
    const { texto: t, comentario } = semComentario(bruta);
    if (comentario) comentarios.push(comentario);
    if (abertos === 0) {
      acumulado = "";
      inicio = i + 1;
      indentada = /^\s/.test(t);
    }
    let sem = "";
    let aspas = false;
    for (let k = 0; k < t.length; k++) {
      const c = t[k];
      if (c === "\\") {
        sem += c + (t[++k] ?? "");
        continue;
      }
      if (c === '"') aspas = !aspas;
      if (!aspas && c === "(") abertos++;
      else if (!aspas && c === ")") abertos = Math.max(0, abertos - 1);
      else sem += c;
    }
    acumulado += `${acumulado ? " " : ""}${sem}`;
    if (abertos === 0) {
      if (acumulado.trim()) logicas.push({ texto: acumulado, comentario: comentarios.join(" "), numero: inicio, indentada });
      comentarios = [];
    }
  });

  let n = 0;
  for (const l of logicas) {
    const p = palavras(l.texto.trim());
    if (p.length === 0) continue;
    if (p[0].startsWith("$")) {
      const d = p[0].toUpperCase();
      if (d === "$ORIGIN" && p[1]) zona = desaspar(p[1]).replace(/\.$/, "");
      else if (d === "$TTL" && p[1]) ttlPadrao = ttlDe(p[1]) ?? ttlPadrao;
      else if (d !== "$ORIGIN" && d !== "$TTL") erros.push(`Linha ${l.numero}: a diretiva ${p[0]} não é suportada e ficou de fora.`);
      continue;
    }
    let i = 0;
    let nome = ultimoNome;
    if (!l.indentada) {
      nome = p[0];
      i = 1;
    }
    let ttl = ttlPadrao;
    let classe = false;
    while (i < p.length) {
      const t = ttlDe(p[i]);
      if (t !== null && !classe && !TIPOS_E_OUTROS.has(p[i].toUpperCase())) {
        ttl = t;
        i++;
      } else if (/^(IN|CH|HS)$/i.test(p[i])) {
        classe = true;
        i++;
      } else break;
    }
    const tipo = (p[i] ?? "").toUpperCase();
    const dados = p.slice(i + 1);
    if (!tipo) {
      erros.push(`Linha ${l.numero}: falta o tipo do registo.`);
      continue;
    }
    if (tipo === "SOA") continue; // o servidor de DNS escreve o seu
    if (!(TIPOS_DNS as string[]).includes(tipo)) {
      erros.push(`Linha ${l.numero}: o tipo ${tipo} não é suportado e ficou de fora.`);
      continue;
    }
    // o nome relativo à zona
    const relativo = (nm: string) => {
      if (nm === "@") return "@";
      if (nm.endsWith(".")) {
        const sem = nm.slice(0, -1);
        if (sem === zona) return "@";
        if (zona && sem.endsWith(`.${zona}`)) return sem.slice(0, -(zona.length + 1));
        return sem; // fora da zona: fica como está
      }
      return nm;
    };
    const alvo = (v: string) => (v === "@" ? zona : v.endsWith(".") ? v.slice(0, -1) : zona ? `${v}.${zona}` : v);
    ultimoNome = nome;
    n++;
    const base = { id: novoId(n), tipo: tipo as TipoDns, nome: relativo(nome), ttl, ...(l.comentario ? { comentario: l.comentario } : {}) };
    try {
      if (tipo === "A" || tipo === "AAAA") {
        if (!dados[0]) throw new Error("falta o endereço");
        registos.push({ ...base, valor: dados[0] });
      } else if (tipo === "TXT") {
        if (dados.length === 0) throw new Error("falta o texto");
        registos.push({ ...base, valor: dados.map(desaspar).join("") });
      } else if (tipo === "MX") {
        if (dados.length < 2 || !/^\d+$/.test(dados[0])) throw new Error("o MX precisa de prioridade e de servidor");
        registos.push({ ...base, prioridade: Number(dados[0]), valor: alvo(dados[1]) });
      } else if (tipo === "SRV") {
        if (dados.length < 4) throw new Error("o SRV precisa de prioridade, peso, porta e destino");
        registos.push({ ...base, prioridade: Number(dados[0]), valor: `${dados[1]} ${dados[2]} ${alvo(dados[3])}` });
      } else if (tipo === "CAA") {
        if (dados.length < 3) throw new Error("o CAA precisa de flags, etiqueta e valor");
        registos.push({ ...base, valor: `${dados[0]} ${dados[1]} "${desaspar(dados.slice(2).join(" "))}"` });
      } else {
        if (!dados[0]) throw new Error("falta o destino");
        registos.push({ ...base, valor: alvo(dados[0]) });
      }
    } catch (e) {
      erros.push(`Linha ${l.numero}: ${e instanceof Error ? e.message : "registo inválido"}.`);
    }
  }
  return { zona, registos, erros };
}

const TIPOS_E_OUTROS = new Set<string>([...TIPOS_DNS, "SOA"]);

/** Como o painel mostra o TTL: «Auto» abaixo de 60 s. */
export const textoDoTtl = (ttl: number): string => (ttl < 60 ? "Auto" : ttl % 86_400 === 0 ? `${ttl / 86_400} d` : ttl % 3600 === 0 ? `${ttl / 3600} h` : ttl % 60 === 0 ? `${ttl / 60} min` : `${ttl} s`);

const NOME_DNS = /^(@|[a-z0-9_*]([a-z0-9_*.-]*[a-z0-9_*])?)$/i;
const MAQUINA = /^([a-z0-9_]([a-z0-9_-]*[a-z0-9_])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?\.?$/i;
const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+(\.\d+\.\d+\.\d+)?$/i;

/** O que está mal num registo, em palavras; `null` se serve. */
export function erroDoRegistoDns(r: Pick<RegistoDns, "tipo" | "nome" | "valor" | "ttl" | "prioridade">): string | null {
  if (!NOME_DNS.test(r.nome.trim() || "@")) return "O nome só pode ter letras, números, «-», «_», «.» ou «@».";
  const v = r.valor.trim();
  if (!v) return "Falta o conteúdo do registo.";
  if (!Number.isFinite(r.ttl) || (r.ttl !== 1 && (r.ttl < 60 || r.ttl > 86_400))) return "O TTL é «Auto» ou fica entre 1 minuto e 1 dia.";
  switch (r.tipo) {
    case "A":
      return IPV4.test(v) ? null : "Escreva um endereço IPv4, por exemplo 203.0.113.10.";
    case "AAAA":
      return v.includes(":") && IPV6.test(v) ? null : "Escreva um endereço IPv6, por exemplo 2001:db8::1.";
    case "CNAME":
    case "NS":
    case "PTR":
      return MAQUINA.test(v) ? null : "Escreva um nome de máquina, por exemplo servidor.exemplo.com.";
    case "MX":
      if (!MAQUINA.test(v)) return "Escreva o servidor de correio, por exemplo mail.exemplo.com.";
      return r.prioridade !== undefined && Number.isInteger(r.prioridade) && r.prioridade >= 0 && r.prioridade <= 65_535 ? null : "A prioridade é um número entre 0 e 65535.";
    case "SRV": {
      const [peso, porta, alvo] = v.split(/\s+/);
      if (!/^\d+$/.test(peso ?? "") || !/^\d+$/.test(porta ?? "") || !MAQUINA.test(alvo ?? "")) return "No SRV o conteúdo é «peso porta destino», por exemplo «5 5060 sip.exemplo.com».";
      return r.prioridade !== undefined && Number.isInteger(r.prioridade) && r.prioridade >= 0 && r.prioridade <= 65_535 ? null : "A prioridade é um número entre 0 e 65535.";
    }
    case "CAA":
      return /^\d+\s+(issue|issuewild|iodef)\s+"[^"]*"$/.test(v) ? null : 'No CAA o conteúdo é «0 issue "letsencrypt.org"».';
    case "TXT":
      return v.length <= 2048 ? null : "O texto tem no máximo 2048 caracteres.";
    default:
      return null;
  }
}
