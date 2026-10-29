// Ferramentas de programador: as funções puras dos ecrãs (alvo de uma regra do firewall, destino das cópias de segurança, consulta SQL só de leitura com dados de demonstração e e-mail de teste). Os ecrãs só as chamam.
import { Sorteio } from "@/dados/semente";

/** Mensagem de erro para o alvo de uma regra de firewall (um IPv4, uma gama CIDR ou um país de duas letras), ou null se serve. */
export function erroDoAlvo(alvo: string): string | null {
  const a = alvo.trim();
  if (!a) return "Escreva um IP, uma gama (203.0.113.0/24) ou um país (RU).";
  if (/^[A-Za-z]{2}$/.test(a)) return null;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(a);
  if (!m) return "Use um IPv4 (203.0.113.7), uma gama CIDR (203.0.113.0/24) ou um país de duas letras (RU).";
  if ([m[1], m[2], m[3], m[4]].some((o) => Number(o) > 255)) return "Cada número do IP vai de 0 a 255.";
  if (m[5] !== undefined && Number(m[5]) > 32) return "A máscara vai de 0 a 32.";
  return null;
}

export type TipoDeDestino = "local" | "s3" | "sftp" | "drive" | "endpoint" | "offline";

export const DESTINOS: Record<TipoDeDestino, string> = {
  local: "Neste servidor",
  s3: "Armazenamento S3",
  sftp: "Servidor SFTP",
  drive: "Google Drive",
  endpoint: "Endpoint à medida (HTTP)",
  offline: "Offline (disco, NAS ou rede local)",
};

/** Mensagem de erro para o endereço de destino das cópias de segurança, ou null se serve. Nada aqui precisa de internet: um destino offline guarda-se mesmo sem ligação. */
export function erroDoDestino(tipo: TipoDeDestino, endereco: string, pastaDoNavegador = false): string | null {
  const e = endereco.trim();
  if (!e) return pastaDoNavegador ? "Escolha a pasta." : "Escreva o endereço do destino.";
  // uma pasta escolhida na janela do sistema só tem o nome (o navegador não dá o caminho): serve como está
  if (tipo === "offline" && pastaDoNavegador) return null;
  if (tipo === "local") return e.startsWith("/") ? null : "Um caminho do servidor começa por / (por exemplo /var/copias).";
  if (tipo === "s3") return /^s3:\/\/[a-z0-9][a-z0-9.-]{2,62}(\/.*)?$/.test(e) ? null : "Use s3://nome-do-balde/pasta.";
  if (tipo === "sftp") return /^sftp:\/\/[^/\s]+(:\d+)?\/.+/.test(e) ? null : "Use sftp://servidor/pasta (a porta é opcional).";
  if (tipo === "endpoint") return /^https?:\/\/[^\s/:]+(:\d{1,5})?(\/\S*)?$/.test(e) ? null : "Use http://servidor:porta/caminho ou https://servidor/caminho (serve um endereço da rede local, como http://192.168.0.50:9000/copias).";
  if (tipo === "offline") return /^([A-Za-z]:[\\/].*|\\\\[^\\\s]+\\.+|\/\S.*|file:\/\/\/.+|smb:\/\/[^/\s]+\/.+)$/.test(e) ? null : "Escreva o caminho no aparelho ou na rede local: D:\\copias, \\\\NAS\\copias, /mnt/disco/copias, file:///mnt/disco ou smb://nas/copias.";
  return /^[A-Za-z0-9_-]{10,}$/.test(e) ? null : "Escreva o identificador da pasta do Google Drive.";
}

/** Um destino das cópias de segurança. Pode haver vários ao mesmo tempo: cada cópia vai para todos os que estão ligados. */
export interface DestinoDeCopia {
  id: string;
  /** O nome que a pessoa lhe dá («Disco do escritório»); sem nome, vale o endereço. */
  nome: string;
  tipo: TipoDeDestino;
  endereco: string;
  ativo: boolean;
  /** O destino é uma pasta escolhida no navegador (o `endereco` é só o nome dela); o acesso fica neste navegador. */
  pasta?: boolean;
}

export const rotuloDoDestino = (d: Pick<DestinoDeCopia, "nome" | "endereco">): string => d.nome.trim() || d.endereco;

/** Os destinos para onde a próxima cópia vai. */
export const destinosAtivos = (ds: DestinoDeCopia[]): DestinoDeCopia[] => ds.filter((d) => d.ativo);

/** O que está mal num destino novo ou mudado (o endereço, ou um igual que já existe), ou null. `idAtual` é o destino que se está a mudar. */
export function erroDoNovoDestino(d: Pick<DestinoDeCopia, "tipo" | "endereco" | "pasta">, existentes: DestinoDeCopia[], idAtual?: string): string | null {
  const erro = erroDoDestino(d.tipo, d.endereco, !!d.pasta);
  if (erro) return erro;
  const igual = existentes.find((x) => x.id !== idAtual && x.tipo === d.tipo && x.endereco.trim().toLowerCase() === d.endereco.trim().toLowerCase());
  return igual ? `Este destino já existe (${rotuloDoDestino(igual)}).` : null;
}

/** A lista de destinos de uma configuração guardada: as antigas, de um só destino (`tipo` e `endereco`), passam a ter um. */
export function destinosDaConfig(c: { destinos?: DestinoDeCopia[]; tipo?: TipoDeDestino; endereco?: string }): DestinoDeCopia[] {
  if (Array.isArray(c.destinos)) return c.destinos;
  if (c.tipo && c.endereco) return [{ id: "dest-1", nome: "", tipo: c.tipo, endereco: c.endereco, ativo: true }];
  return [];
}

export interface ResultadoSql {
  erro?: string;
  tabela?: string;
  colunas: string[];
  linhas: (string | number)[][];
}

const COLUNAS: Record<string, string[]> = {
  utilizadores: ["id", "nome", "email", "criado_em"],
  pedidos: ["id", "cliente", "estado", "valor", "criado_em"],
  pagamentos: ["id", "referencia", "metodo", "valor", "estado"],
  comprovativos: ["id", "pagamento", "estado", "recebido_em"],
  eventos: ["id", "tipo", "pagina", "visitante", "quando"],
  sessoes: ["id", "utilizador_id", "expira_em"],
  logs: ["id", "nivel", "mensagem", "quando"],
};

/** Uma amostra de linhas de uma tabela de demonstração (sempre as mesmas). */
export function amostraDe(tabela: string, n: number): ResultadoSql {
  const colunas = COLUNAS[tabela];
  if (!colunas) return { erro: `A tabela «${tabela}» não existe.`, colunas: [], linhas: [] };
  const s = new Sorteio(500 + tabela.length);
  const linhas = Array.from({ length: n }, (_, i) =>
    colunas.map((c) => {
      if (c === "id") return i + 1;
      if (c.includes("email")) return `${s.de(["ana", "bruno", "carla"])}${i}@exemplo.pt`;
      if (c === "nome" || c === "cliente") return s.nome();
      if (c === "valor") return s.entre(8, 240) * 1000;
      if (c === "estado") return s.de(["Confirmado", "Pendente", "Recusado"]);
      if (c === "metodo") return s.de(["Transferência", "Cartão", "Referência"]);
      if (c === "referencia") return `PG-${2600 + i}`;
      if (c === "tipo") return s.de(["visita", "clique"]);
      if (c === "pagina") return s.de(["/", "/precos", "/contactos"]);
      if (c === "nivel") return s.de(["info", "aviso", "erro"]);
      if (c === "mensagem") return s.de(["Pedido processado", "Token expirado", "Tempo esgotado"]);
      if (c.endsWith("_em") || c === "quando") return s.dia(-i);
      return `${c}-${s.entre(100, 999)}`;
    }),
  );
  return { tabela, colunas, linhas };
}

/** Corre uma consulta de leitura: só aceita «SELECT … FROM tabela [LIMIT n]» (as colunas pedidas filtram o resultado). Nada se altera. */
export function correrConsulta(sql: string): ResultadoSql {
  const t = sql.trim().replace(/;+$/, "");
  if (!/^select\s/i.test(t)) return { erro: "Só são aceites consultas de leitura (SELECT).", colunas: [], linhas: [] };
  if (/\b(insert|update|delete|drop|alter|truncate|create|grant)\b/i.test(t)) return { erro: "Esta consola é só de leitura: não aceita comandos que alterem dados.", colunas: [], linhas: [] };
  const m = /^select\s+(.+?)\s+from\s+([a-z_][a-z0-9_]*)(?:\s+limit\s+(\d+))?$/i.exec(t);
  if (!m) return { erro: "Use o formato SELECT colunas FROM tabela LIMIT 10.", colunas: [], linhas: [] };
  const limite = Math.min(50, Number(m[3] ?? 10));
  const cheia = amostraDe(m[2].toLowerCase(), limite);
  if (cheia.erro) return cheia;
  if (m[1].trim() === "*") return cheia;
  const pedidas = m[1].split(",").map((c) => c.trim().toLowerCase());
  const falta = pedidas.find((c) => !cheia.colunas.includes(c));
  if (falta) return { erro: `A coluna «${falta}» não existe em ${m[2]}.`, colunas: [], linhas: [] };
  const idx = pedidas.map((c) => cheia.colunas.indexOf(c));
  return { tabela: cheia.tabela, colunas: pedidas, linhas: cheia.linhas.map((l) => idx.map((i) => l[i])) };
}

/** Quantas linhas um «apagar o que tem mais de N dias» apaga de uma tabela de `linhas` (em demonstração: quanto menos dias, mais se apaga). */
export function linhasApagadas(linhas: number, dias: number): number {
  return Math.floor(linhas * Math.min(0.9, 30 / (dias + 30)));
}

/** Um endereço de e-mail minimamente válido. */
export const emailValido = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.trim());
 
// ---------- bloquear e desbloquear um IP ----------

export interface RegraDeAcesso {
  id: string;
  acao: "permitir" | "bloquear";
  alvo: string;
  nota: string;
  ativa: boolean;
}

/** Um IPv4 como número de 32 bits, ou null se não for um IPv4. */
function numeroDoIp(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim());
  if (!m || [m[1], m[2], m[3], m[4]].some((o) => Number(o) > 255)) return null;
  return ((Number(m[1]) << 24) | (Number(m[2]) << 16) | (Number(m[3]) << 8) | Number(m[4])) >>> 0;
}

/** Quão específico é o alvo de uma regra: um país vale 0, uma gama vale a sua máscara + 1, um IP sozinho vale 33. Ganha a regra mais específica. */
function especificidade(alvo: string): number {
  if (/^[A-Za-z]{2}$/.test(alvo.trim())) return 0;
  const m = /\/(\d{1,2})$/.exec(alvo.trim());
  return m ? Number(m[1]) + 1 : 33;
}

/** Se o alvo de uma regra (um IP, uma gama CIDR ou um país) apanha este IP; `pais` é o país do pedido, se se souber. */
export function alvoApanhaIp(alvo: string, ip: string, pais?: string): boolean {
  const a = alvo.trim();
  if (/^[A-Za-z]{2}$/.test(a)) return !!pais && pais.toUpperCase() === a.toUpperCase();
  const m = /^([\d.]+)(?:\/(\d{1,2}))?$/.exec(a);
  const base = m ? numeroDoIp(m[1]) : null;
  const alvoIp = numeroDoIp(ip);
  if (base === null || alvoIp === null) return false;
  const bits = m![2] === undefined ? 32 : Number(m![2]);
  if (bits === 0) return true;
  const mascara = (0xffffffff << (32 - bits)) >>> 0;
  return ((base & mascara) >>> 0) === ((alvoIp & mascara) >>> 0);
}

/** A regra ativa que decide o que acontece a este IP: a mais específica que o apanha (num empate, a que bloqueia). Null se nenhuma o apanha. */
export function regraQueApanha<T extends RegraDeAcesso>(ip: string, regras: T[], pais?: string): T | null {
  let melhor: T | null = null;
  for (const r of regras) {
    if (!r.ativa || !alvoApanhaIp(r.alvo, ip, pais)) continue;
    if (!melhor) melhor = r;
    else {
      const a = especificidade(r.alvo);
      const b = especificidade(melhor.alvo);
      if (a > b || (a === b && r.acao === "bloquear" && melhor.acao !== "bloquear")) melhor = r;
    }
  }
  return melhor;
}

/** Se o firewall (com as regras dadas) bloqueia este IP. */
export const ipBloqueado = (ip: string, regras: RegraDeAcesso[], pais?: string) => regraQueApanha(ip, regras, pais)?.acao === "bloquear";

export interface PlanoDeAcesso {
  /** A regra a gravar (nova ou a mesma já com a ação mudada). */
  guardar: RegraDeAcesso | null;
  /** O identificador da regra a apagar. */
  remover: string | null;
}

/**
 * O que fazer às regras para bloquear (`quer = "bloquear"`) ou desbloquear (`"permitir"`) um IP. Bloquear grava (ou muda) a regra do IP sozinho; desbloquear apaga essa regra se mais nenhuma
 * regra o bloqueia, e senão grava uma regra que o permite (a mais específica ganha, por isso as outras regras continuam para os restantes IPs).
 */
export function planoDeAcesso(ip: string, pais: string | undefined, regras: RegraDeAcesso[], quer: "bloquear" | "permitir", novoId: string, nota = ""): PlanoDeAcesso {
  const exata = regras.find((r) => r.alvo.trim() === ip.trim());
  if (quer === "bloquear") {
    return { guardar: exata ? { ...exata, acao: "bloquear", ativa: true, nota: nota || exata.nota } : { id: novoId, acao: "bloquear", alvo: ip.trim(), nota, ativa: true }, remover: null };
  }
  const restantes = regras.filter((r) => r.id !== exata?.id);
  if (exata && !ipBloqueado(ip, restantes, pais)) return { guardar: null, remover: exata.id };
  return { guardar: exata ? { ...exata, acao: "permitir", ativa: true } : { id: novoId, acao: "permitir", alvo: ip.trim(), nota: nota || "Desbloqueado à mão", ativa: true }, remover: null };
}

/** Mensagem de erro para o repositório do GitHub («dono/nome»), ou null se serve. */
export function erroDoRepositorio(texto: string): string | null {
  const t = texto.trim();
  if (!t) return "Escreva o repositório, no formato dono/nome.";
  if (/^https?:\/\//i.test(t) || t.includes("github.com")) return "Escreva só dono/nome, sem o endereço do site.";
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/.test(t) ? null : "Use o formato dono/nome (letras, números, hífen, ponto e sublinhado).";
}
