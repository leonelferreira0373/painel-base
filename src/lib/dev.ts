// Developer tools: as funções puras dos ecrãs (alvo de uma regra do firewall, destino das cópias de segurança, consulta SQL só de leitura com dados de demonstração e e-mail de teste). Os ecrãs só as chamam.
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

export type TipoDeDestino = "local" | "s3" | "sftp" | "drive";

export const DESTINOS: Record<TipoDeDestino, string> = { local: "Neste servidor", s3: "Armazenamento S3", sftp: "Servidor SFTP", drive: "Google Drive" };

/** Mensagem de erro para o endereço de destino das cópias de segurança, ou null se serve. */
export function erroDoDestino(tipo: TipoDeDestino, endereco: string): string | null {
  const e = endereco.trim();
  if (!e) return "Escreva o endereço do destino.";
  if (tipo === "local") return e.startsWith("/") ? null : "Um caminho do servidor começa por / (por exemplo /var/copias).";
  if (tipo === "s3") return /^s3:\/\/[a-z0-9][a-z0-9.-]{2,62}(\/.*)?$/.test(e) ? null : "Use s3://nome-do-balde/pasta.";
  if (tipo === "sftp") return /^sftp:\/\/[^/\s]+(:\d+)?\/.+/.test(e) ? null : "Use sftp://servidor/pasta (a porta é opcional).";
  return /^[A-Za-z0-9_-]{10,}$/.test(e) ? null : "Escreva o identificador da pasta do Google Drive.";
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
 