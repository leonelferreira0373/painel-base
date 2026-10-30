// Os estilos da tabela do blog: a tabela inteira tem um (grelha, linhas, listrada, cabeçalho escuro ou limpa) e quem escreve passa de um ao seguinte com um toque. O estilo vai no HTML («data-estilo») e a folha de estilo do artigo desenha-o, no editor e no ficheiro exportado.

export const ESTILOS_DE_TABELA = [
  { id: "grelha", rotulo: "Grelha" },
  { id: "linhas", rotulo: "Linhas" },
  { id: "listrada", rotulo: "Listrada" },
  { id: "destaque", rotulo: "Cabeçalho escuro" },
  { id: "limpa", rotulo: "Limpa" },
] as const;

export type EstiloDeTabela = (typeof ESTILOS_DE_TABELA)[number]["id"];

export const ESTILO_DE_TABELA_POR_OMISSAO: EstiloDeTabela = "grelha";

/** O estilo, ou o de partida se o valor não for um que exista (um HTML antigo ou escrito à mão). */
export const estiloDeTabela = (valor: unknown): EstiloDeTabela => ESTILOS_DE_TABELA.find((e) => e.id === valor)?.id ?? ESTILO_DE_TABELA_POR_OMISSAO;

/** O estilo a seguir ao atual (e do último volta ao primeiro). */
export const proximoEstiloDeTabela = (atual: unknown): EstiloDeTabela => {
  const i = ESTILOS_DE_TABELA.findIndex((e) => e.id === estiloDeTabela(atual));
  return ESTILOS_DE_TABELA[(i + 1) % ESTILOS_DE_TABELA.length].id;
};

export const rotuloDoEstiloDeTabela = (valor: unknown): string => ESTILOS_DE_TABELA.find((e) => e.id === estiloDeTabela(valor))?.rotulo ?? "";

// ---------- as opções da tabela (como em «Opções da tabela» do Google Docs): cor, espessura e traço da borda e as cores do cabeçalho ----------

export const TRACOS_DA_TABELA = [
  { id: "solid", rotulo: "Contínuo" },
  { id: "dashed", rotulo: "Tracejado" },
  { id: "dotted", rotulo: "Pontilhado" },
] as const;

export type TracoDaTabela = (typeof TRACOS_DA_TABELA)[number]["id"];

export const LARGURA_MAXIMA_DA_BORDA = 8;

export interface OpcoesDaTabela {
  /** A cor da borda (seis dígitos). */
  corBorda?: string;
  /** A espessura da borda em píxeis; 0 tira as linhas. */
  larguraBorda?: number;
  traco?: TracoDaTabela;
  /** O fundo e a cor do texto do cabeçalho. */
  fundoCabecalho?: string;
  corCabecalho?: string;
}

const corDe = (v: string | null | undefined): string | undefined => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : undefined);

/** As opções guardadas num atributo («corBorda:%23dc2626;larguraBorda:2»); o que não serve fica de fora. */
export function lerOpcoesDaTabela(texto: string | null | undefined): OpcoesDaTabela {
  const o: OpcoesDaTabela = {};
  for (const par of (texto ?? "").split(";")) {
    const i = par.indexOf(":");
    if (i < 0) continue;
    const chave = par.slice(0, i).trim();
    let valor: string;
    try {
      valor = decodeURIComponent(par.slice(i + 1).trim());
    } catch {
      continue;
    }
    if (chave === "corBorda" && corDe(valor)) o.corBorda = corDe(valor);
    else if (chave === "fundoCabecalho" && corDe(valor)) o.fundoCabecalho = corDe(valor);
    else if (chave === "corCabecalho" && corDe(valor)) o.corCabecalho = corDe(valor);
    else if (chave === "larguraBorda" && Number.isFinite(Number(valor)) && Number(valor) >= 0 && Number(valor) <= LARGURA_MAXIMA_DA_BORDA) o.larguraBorda = Math.round(Number(valor) * 2) / 2;
    else if (chave === "traco" && TRACOS_DA_TABELA.some((t) => t.id === valor)) o.traco = valor as TracoDaTabela;
  }
  return o;
}

/** As opções como se guardam no atributo (vazio se não houver nenhuma). */
export function escreverOpcoesDaTabela(o: OpcoesDaTabela): string {
  const partes: string[] = [];
  if (corDe(o.corBorda)) partes.push(`corBorda:${encodeURIComponent(corDe(o.corBorda)!)}`);
  if (o.larguraBorda !== undefined) partes.push(`larguraBorda:${Math.min(LARGURA_MAXIMA_DA_BORDA, Math.max(0, o.larguraBorda))}`);
  if (o.traco) partes.push(`traco:${o.traco}`);
  if (corDe(o.fundoCabecalho)) partes.push(`fundoCabecalho:${encodeURIComponent(corDe(o.fundoCabecalho)!)}`);
  if (corDe(o.corCabecalho)) partes.push(`corCabecalho:${encodeURIComponent(corDe(o.corCabecalho)!)}`);
  return partes.join(";");
}

/** As variáveis de CSS que a folha de estilo do artigo lê para desenhar a tabela (vazio se não houver opções). */
export function estiloDasOpcoesDaTabela(o: OpcoesDaTabela): string {
  return [
    corDe(o.corBorda) ? `--t-linha:${corDe(o.corBorda)}` : "",
    o.larguraBorda !== undefined ? `--t-larg:${Math.min(LARGURA_MAXIMA_DA_BORDA, Math.max(0, o.larguraBorda))}px` : "",
    o.traco ? `--t-traco:${o.traco}` : "",
    corDe(o.fundoCabecalho) ? `--t-cab-fundo:${corDe(o.fundoCabecalho)}` : "",
    corDe(o.corCabecalho) ? `--t-cab-cor:${corDe(o.corCabecalho)}` : "",
  ]
    .filter(Boolean)
    .join(";");
}

export type AlinhamentoVerticalDaCelula = "top" | "middle" | "bottom";

export const ALINHAMENTOS_VERTICAIS: { id: AlinhamentoVerticalDaCelula; rotulo: string }[] = [
  { id: "top", rotulo: "Em cima" },
  { id: "middle", rotulo: "Ao meio" },
  { id: "bottom", rotulo: "Em baixo" },
];

export const alinhamentoVerticalValido = (v: unknown): AlinhamentoVerticalDaCelula | null => ALINHAMENTOS_VERTICAIS.find((a) => a.id === v)?.id ?? null;
