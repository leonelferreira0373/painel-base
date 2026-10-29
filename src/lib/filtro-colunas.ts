// O filtro das colunas das tabelas. A dupla seta de ordenar serve para números e datas (do maior para o menor); nas colunas de ações, estados, tipos, nomes e outras coisas específicas há um botão de filtro que abre uma janela com todas as opções que existem, cada uma com o seu interruptor para ver ou esconder, uma pesquisa para as encontrar quando são muitas e uma pergunta à IA («só o que tem a ver com e-mails»). Aqui estão as contas puras: as opções e quantas linhas tem cada uma, o que passa no filtro, a pesquisa, e o pedido à IA e a leitura da sua resposta.

export const VAZIO = "(vazio)";

export interface Opcao {
  valor: string;
  /** Quantas linhas têm este valor. */
  contagem: number;
}

const semAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** As opções diferentes de uma coluna, com quantas linhas tem cada uma: as mais frequentes primeiro, depois por ordem alfabética. */
export function opcoesDe(valores: string[]): Opcao[] {
  const m = new Map<string, number>();
  for (const v of valores) {
    const k = v.trim() === "" ? VAZIO : v;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].map(([valor, contagem]) => ({ valor, contagem })).sort((a, b) => b.contagem - a.contagem || a.valor.localeCompare(b.valor, "pt"));
}

/** Uma linha passa no filtro se o seu valor não está entre os escondidos. */
export const passaNoFiltro = (valor: string, escondidos: ReadonlySet<string> | undefined): boolean => !escondidos || escondidos.size === 0 || !escondidos.has(valor.trim() === "" ? VAZIO : valor);

/** As opções que têm este texto (sem ligar a maiúsculas nem a acentos). */
export function procurarOpcoes(opcoes: Opcao[], texto: string): Opcao[] {
  const q = semAcentos(texto.trim());
  return q ? opcoes.filter((o) => semAcentos(o.valor).includes(q)) : opcoes;
}

/** Os valores a esconder para ficar à vista só o que se escolheu. */
export const esconderTudoExcepto = (opcoes: Opcao[], mostrar: Iterable<string>): Set<string> => {
  const ver = new Set(mostrar);
  return new Set(opcoes.filter((o) => !ver.has(o.valor)).map((o) => o.valor));
};

export interface MensagemDoFiltro {
  role: "system" | "user";
  content: string;
}

const MAXIMO_DE_OPCOES = 300;

/** O pedido à IA: escolher, entre as opções da coluna, as que servem ao que a pessoa escreveu. */
export function mensagensDaEscolha(coluna: string, opcoes: Opcao[], pedido: string): MensagemDoFiltro[] {
  return [
    {
      role: "system",
      content: 'Ajudas a filtrar uma tabela. Recebes o nome de uma coluna, a lista das suas opções (com o número de linhas de cada uma) e um pedido em linguagem natural, em português. Escolhe as opções da lista que correspondem ao pedido, pelo sentido e não só pelas palavras (por exemplo «tudo o que tem a ver com e-mails» inclui «Enviou um e-mail» e «Abriu a caixa de entrada»). Usa EXATAMENTE os textos da lista, sem mudar nada. Responde só com JSON: {"opcoes": ["texto 1", "texto 2"]}. Se nenhuma serve, devolve {"opcoes": []}.',
    },
    { role: "user", content: `Coluna: ${coluna}\nOpções:\n${opcoes.slice(0, MAXIMO_DE_OPCOES).map((o) => `- ${o.valor} (${o.contagem})`).join("\n")}\n\nPedido: ${pedido.trim().slice(0, 300)}` },
  ];
}

/** As opções que a IA escolheu: só as que existem mesmo na lista, sem repetir. */
export function opcoesEscolhidas(resposta: string, opcoes: Opcao[]): string[] {
  const i = resposta.indexOf("{");
  if (i < 0) return [];
  let obj: unknown;
  try {
    obj = JSON.parse(resposta.slice(i, resposta.lastIndexOf("}") + 1));
  } catch {
    return [];
  }
  const lista = (obj as { opcoes?: unknown })?.opcoes;
  if (!Array.isArray(lista)) return [];
  const porTexto = new Map(opcoes.map((o) => [semAcentos(o.valor), o.valor]));
  const ok = new Set<string>();
  for (const x of lista) if (typeof x === "string" && porTexto.has(semAcentos(x))) ok.add(porTexto.get(semAcentos(x))!);
  return [...ok];
}

const palavrasDe = (t: string) => semAcentos(t).split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
const radical = (p: string) => p.slice(0, 4);
const IGNORADAS = new Set(["tudo", "todo", "toda", "todas", "todos", "quero", "mostra", "mostrar", "ver", "apenas", "somente", "que", "tem", "tenha", "com", "sobre", "relacionado", "relacionados", "das", "dos", "uma", "para", "por", "como"]);

/** Sem IA: as opções que têm alguma das palavras do pedido (comparadas pelas quatro primeiras letras, para «sessões» achar «sessão»). */
export function escolhaLocal(opcoes: Opcao[], pedido: string): string[] {
  const pedidas = new Set(palavrasDe(pedido).filter((p) => !IGNORADAS.has(p)).map(radical));
  if (pedidas.size === 0) return [];
  return opcoes.filter((o) => palavrasDe(o.valor).some((p) => pedidas.has(radical(p)))).map((o) => o.valor);
}

/** Quantas opções estão à vista e quantas escondidas, em palavras («12 de 30»). */
export const resumoDoFiltro = (opcoes: Opcao[], escondidos: ReadonlySet<string>): string => `${opcoes.filter((o) => !escondidos.has(o.valor)).length} de ${opcoes.length}`;
