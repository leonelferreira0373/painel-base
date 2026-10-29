// Copiar dados a sério: o que se copia de um cartão, de uma lista ou de uma linha não é só o valor que se vê, é a informação toda (o título, de onde vem, quando se copiou e cada campo com o seu nome). Vai para a área de transferência em duas formas: texto que uma pessoa lê sem esforço (rótulos em português, listas com marcadores e numeradas, datas e números como se escrevem cá; nada de JSON) e tabela HTML (para colar no Word, no Excel ou no Google Docs). Funções puras e a escrita na área de transferência.
import { SECOES_CONTA } from "@/dados/conta";
import { escreverNaPrancheta } from "./prancheta";
import { moduloPorIds } from "@/dados/estrutura";
import type { DadosExportaveis } from "./exportar-dados";

export interface PayloadEstruturado {
  /** O que é: «cartao», «lista», «registo»… */
  tipo: string;
  titulo: string;
  /** A página de onde vem. */
  origem?: string;
  geradoEm: string;
  dados: unknown;
}

const dataDe = (agora: Date) => agora.toISOString();

/** Uma tabela como estrutura: as colunas e cada linha como objeto com o nome das colunas. */
export function estruturaDeTabela(d: DadosExportaveis, origem?: string, agora = new Date()): PayloadEstruturado {
  return { tipo: "lista", titulo: d.titulo, ...(origem ? { origem } : {}), geradoEm: dataDe(agora), dados: { colunas: d.colunas, linhas: d.linhas.map((l) => Object.fromEntries(d.colunas.map((c, i) => [c, l[i] ?? null]))) } };
}

/** Um registo (uma linha, uma conta, um commit…) com todos os campos e os nomes que lhes damos. */
export function estruturaDeRegisto(titulo: string, campos: Record<string, unknown>, origem?: string, agora = new Date()): PayloadEstruturado {
  return { tipo: "registo", titulo, ...(origem ? { origem } : {}), geradoEm: dataDe(agora), dados: campos };
}

// ---------- os nomes dos campos ----------

/** Os campos que o painel usa com mais frequência, com o nome como se diz. */
const ROTULOS: Record<string, string> = {
  id: "Identificador",
  nome: "Nome",
  titulo: "Título",
  tipo: "Tipo",
  estado: "Estado",
  fornecedor: "Fornecedor",
  janela: "Janela de contexto",
  precoEntrada: "Preço de entrada",
  precoSaida: "Preço de saída",
  ferramentas: "Usa ferramentas",
  indicador: "Indicador",
  valor: "Valor",
  variacao: "Variação",
  serie: "Série",
  quando: "Quando",
  criado: "Criado",
  modificado: "Modificado",
  ultimoUso: "Último uso",
  usos: "Utilizações",
  comeca: "Começa",
  expira: "Expira",
  permissoes: "Permissões",
  filtroDeIp: "Filtro de IP",
  pedidosPermitidos: "Pedidos permitidos",
  linhasVisiveis: "Linhas visíveis",
  porNivel: "Por nível",
  ultimas: "Últimas linhas",
  pagina: "Página",
  explicacao: "Explicação",
  explicacaoDoPainel: "Explicação do painel",
  campo: "Campo",
  termo: "Termo",
  onde: "Onde",
  fonte: "Fonte",
  pesquisa: "Pesquisa",
  iban: "IBAN",
  sha: "Commit",
  ip: "Endereço IP",
  url: "Endereço",
  email: "E-mail",
  telefone: "Telefone",
  tabela: "Tabela",
};

/** As palavras sem acento que se escrevem com acento. */
const PALAVRAS: Record<string, string> = { preco: "preço", saida: "saída", entrada: "entrada", variacao: "variação", descricao: "descrição", permissoes: "permissões", serie: "série", ultimo: "último", ultima: "última", pagina: "página", codigo: "código", nivel: "nível", duracao: "duração", responsavel: "responsável", numero: "número", dispositivo: "dispositivo", sessao: "sessão", sessoes: "sessões", acao: "ação", acoes: "ações", comecar: "começar", ligacao: "ligação", configuracao: "configuração", autenticacao: "autenticação", notificacao: "notificação", operacao: "operação", versao: "versão", conteudo: "conteúdo", mensagem: "mensagem", funcao: "função", util: "útil", unico: "único", media: "média", memoria: "memória", area: "área", modulo: "módulo", titulo: "título", pais: "país", saude: "saúde", historico: "histórico", horario: "horário", servico: "serviço", ferramenta: "ferramenta", ferramentas: "ferramentas", reserva: "reserva", ip: "IP", iban: "IBAN", sha: "commit", url: "endereço", id: "identificador", sim: "sim" };

const maiuscula = (t: string) => (t ? t[0].toLocaleUpperCase("pt-PT") + t.slice(1) : t);

/** O nome de um campo como se lê: «precoEntrada» é «Preço de entrada»; um nome que já é um rótulo («Data de início») fica como está. */
export function rotuloDaChave(chave: string): string {
  if (ROTULOS[chave]) return ROTULOS[chave];
  if (/[\s()%/:]/.test(chave) || /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(chave)) return maiuscula(chave);
  const palavras = chave
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((p) => PALAVRAS[p] ?? p);
  return maiuscula(palavras.join(" "));
}

/** A unidade de alguns campos, para o número não ficar solto. */
const UNIDADES: Record<string, string> = { janela: "tokens", precoEntrada: "USD por milhão de tokens", precoSaida: "USD por milhão de tokens", pedidosPermitidos: "pedidos", usos: "vezes", variacao: "%" };

// ---------- os valores ----------

const p2 = (n: number) => String(n).padStart(2, "0");
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** «2026-10-29» é «29/10/2026»; com hora, «29/10/2026 às 16:25» (na hora de quem copia). */
export function dataLegivel(texto: string): string | null {
  const m = ISO.exec(texto);
  if (!m) return null;
  if (m[4] === undefined) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = m[6] ? new Date(texto) : new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  if (Number.isNaN(d.getTime())) return null;
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} às ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

const numeroLegivel = (n: number) => n.toLocaleString("pt-PT", { maximumFractionDigits: 3 });
const primitivo = (v: unknown): v is string | number | boolean | null | undefined => v === null || v === undefined || typeof v !== "object";

/** Um valor simples, como se escreve: sim ou não, números com os milhares separados, datas como cá, «—» quando está vazio. */
export function valorLegivel(v: unknown, chave?: string): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "—";
    const unidade = chave ? UNIDADES[chave] : undefined;
    const texto = chave === "variacao" && v > 0 ? `+${numeroLegivel(v)}` : numeroLegivel(v);
    return unidade ? (unidade === "%" ? `${texto} %` : `${texto} ${unidade}`) : texto;
  }
  if (typeof v === "string") return dataLegivel(v) ?? v;
  return String(v);
}

interface Tabela {
  colunas: string[];
  linhas: unknown[];
}
const eTabela = (v: unknown): v is Tabela => !!v && typeof v === "object" && Array.isArray((v as Tabela).colunas) && Array.isArray((v as Tabela).linhas) && Object.keys(v as object).length === 2;

const MARCAS = ["•", "–"];

/** Um item de uma lista numerada: um valor simples, ou um título com os campos por baixo. */
function itemNumerado(v: unknown, n: number, recuo: string, nivel: number): string[] {
  if (primitivo(v)) return [`${recuo}${n}. ${valorLegivel(v)}`];
  if (Array.isArray(v)) return [`${recuo}${n}. ${v.map((x) => valorLegivel(x)).join("; ")}`];
  const campos = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== null && x !== undefined && x !== "");
  if (campos.length === 0) return [`${recuo}${n}.`];
  const [[, primeiro], ...resto] = campos;
  const titulo = primitivo(primeiro) ? valorLegivel(primeiro) : "";
  const subir = primitivo(primeiro) ? resto : campos;
  return [`${recuo}${n}. ${titulo}`.trimEnd(), ...subir.flatMap(([k, x]) => bloco(rotuloDaChave(k), x, nivel, k, recuo + "   "))];
}

/** Um campo: «• Rótulo: valor», ou o rótulo e, por baixo e mais para dentro, o que ele contém. */
function bloco(rotulo: string, v: unknown, nivel: number, chave?: string, recuoBase = ""): string[] {
  const recuo = recuoBase + (recuoBase ? "" : "  ".repeat(nivel));
  const marca = MARCAS[Math.min(nivel, MARCAS.length - 1)];
  const cab = `${recuo}${marca} ${rotulo}`;
  if (eTabela(v)) return [`${cab}:`, ...v.linhas.flatMap((l, i) => itemNumerado(l, i + 1, recuo + "  ", nivel + 1))];
  if (Array.isArray(v)) {
    if (v.length === 0) return [`${cab}: —`];
    if (v.every(primitivo)) {
      const junto = v.map((x) => valorLegivel(x, chave)).join("; ");
      return junto.length <= 100 && !junto.includes("\n") ? [`${cab}: ${junto}`] : [`${cab}:`, ...v.map((x, i) => `${recuo}  ${i + 1}. ${valorLegivel(x, chave)}`)];
    }
    return [`${cab}:`, ...v.flatMap((x, i) => itemNumerado(x, i + 1, recuo + "  ", nivel + 1))];
  }
  if (!primitivo(v)) {
    const campos = Object.entries(v as Record<string, unknown>);
    return campos.length === 0 ? [`${cab}: —`] : [`${cab}:`, ...campos.flatMap(([k, x]) => bloco(rotuloDaChave(k), x, nivel + 1, k))];
  }
  const texto = valorLegivel(v, chave);
  // um texto de várias linhas continua alinhado por baixo da primeira
  return [`${cab}: ${texto.replace(/\r?\n/g, `\n${recuo}  `)}`];
}

/** O nome da página de onde se copiou, como se lê no menu («Ferramentas de programador: Registos do servidor»). */
export function nomeDaPagina(origem?: string): string | null {
  if (!origem) return null;
  const partes = origem.split("/").filter(Boolean);
  if (partes.length === 0) return "Página inicial";
  if (partes[0] === "conta") {
    const s = SECOES_CONTA.find((x) => x.id === partes[1]);
    return s ? `Definições da conta: ${s.rotulo}` : "Definições da conta";
  }
  const [area, modulo] = partes.length >= 3 ? [partes[1], partes[2]] : [partes[0], partes[1]];
  const m = area && modulo ? moduloPorIds(area, modulo) : undefined;
  return m ? `${m.area.rotulo}: ${m.modulo.rotulo}` : origem;
}

/** A informação como texto que uma pessoa lê: o título, os campos em lista (ou as linhas numeradas) e de onde vem e quando se copiou. */
export function textoDe(p: PayloadEstruturado): string {
  const d = p.dados;
  let titulo = p.titulo;
  let corpo: string[];
  if (eTabela(d)) {
    titulo = `${p.titulo} (${d.linhas.length === 1 ? "1 linha" : `${d.linhas.length} linhas`})`;
    corpo = d.linhas.length === 0 ? ["Sem linhas."] : d.linhas.flatMap((l, i) => itemNumerado(l, i + 1, "", 0));
  } else if (Array.isArray(d)) corpo = d.flatMap((l, i) => itemNumerado(l, i + 1, "", 0));
  else if (d && typeof d === "object") corpo = Object.entries(d as Record<string, unknown>).flatMap(([k, v]) => bloco(rotuloDaChave(k), v, 0, k));
  else corpo = [`• Valor: ${valorLegivel(d)}`];
  const pagina = nomeDaPagina(p.origem);
  const quando = dataLegivel(p.geradoEm.replace(/\.\d+Z$/, "Z"));
  const rodape = `Copiado${pagina ? ` de ${pagina}` : ""}${quando ? ` em ${quando.replace(" às ", ", às ")}` : ""}`;
  return [titulo, "", ...corpo, "", rodape].join("\n");
}

// ---------- a tabela HTML ----------

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** O que vai numa célula: o valor legível; um objeto ou uma lista escrevem-se «campo: valor; campo: valor». */
function celula(v: unknown, chave?: string): string {
  if (primitivo(v)) return valorLegivel(v, chave) === "—" ? "" : valorLegivel(v, chave);
  if (Array.isArray(v)) return v.map((x) => celula(x)).join("; ");
  return Object.entries(v as Record<string, unknown>)
    .map(([k, x]) => `${rotuloDaChave(k)}: ${celula(x, k)}`)
    .join("; ");
}

/** A mesma informação como tabela HTML: uma tabela de linhas e colunas, ou de «campo» e «valor» num registo. */
export function htmlDe(p: PayloadEstruturado): string {
  const d = p.dados as { colunas?: string[]; linhas?: Record<string, unknown>[] } | Record<string, unknown>;
  const titulo = `<p><strong>${escapar(p.titulo)}</strong></p>`;
  if (d && typeof d === "object" && Array.isArray((d as { colunas?: string[] }).colunas) && Array.isArray((d as { linhas?: unknown[] }).linhas)) {
    const { colunas, linhas } = d as { colunas: string[]; linhas: Record<string, unknown>[] };
    return `${titulo}<table border="1" cellspacing="0" cellpadding="4"><thead><tr>${colunas.map((c) => `<th>${escapar(c)}</th>`).join("")}</tr></thead><tbody>${linhas.map((l) => `<tr>${colunas.map((c) => `<td>${escapar(celula(l[c], c))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  const campos = d && typeof d === "object" ? Object.entries(d as Record<string, unknown>) : [["valor", d]];
  return `${titulo}<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${campos.map(([k, v]) => `<tr><td>${escapar(rotuloDaChave(k))}</td><td>${escapar(celula(v, k))}</td></tr>`).join("")}</tbody></table>`;
}

/** Copia a estrutura para a área de transferência (texto e tabela); `false` se nenhum método deixar. */
export async function copiarEstruturado(p: PayloadEstruturado): Promise<boolean> {
  return escreverNaPrancheta(textoDe(p), htmlDe(p));
}
