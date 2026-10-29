// A página de análise de cada entidade (dados/contexto.ts): de que módulo saem as linhas, que estatísticas, filtros, etapas e países mostra.
import { mistura } from "@/lib/serie-registos";
import type { Linha } from "./tipos";

export const ANALISE = {
  /** O módulo de registos de onde saem as linhas, a coluna de datas, a de estados e a que diz de que entidade é cada linha. */
  fonte: "encomendas",
  campoData: "data",
  campoEstado: "estado",
  campoEntidade: "cliente",
  separadores: [
    { id: "pedidos", rotulo: "Encomendas" },
    { id: "desempenho", rotulo: "Desempenho" },
    { id: "geografia", rotulo: "Geografia" },
  ],
  /** Os cartões de estatística do separador principal. `estados` conta só as linhas desses estados; `pior` marca as que, ao subir, são más. */
  estatisticas: [
    { id: "total", titulo: "Encomendas", dica: "Encomendas do cliente com data dentro do período.", estados: null, pior: false },
    { id: "entregues", titulo: "Entregues", dica: "Encomendas entregues e comunicadas ao cliente.", estados: ["Entregue"], pior: false },
    { id: "portratar", titulo: "Por tratar", dica: "Encomendas recebidas ou em preparação, ainda sem envio.", estados: ["Recebida", "Em preparação"], pior: true },
    { id: "expedidas", titulo: "Expedidas", dica: "Encomendas enviadas, entregues ou não.", estados: ["Enviada", "Entregue"], pior: false },
    { id: "canceladas", titulo: "Canceladas", dica: "Encomendas que foram canceladas.", estados: ["Cancelada"], pior: true },
  ],
  /** Os estados pela ordem do fluxo (a ordem das camadas do gráfico empilhado). */
  estados: ["Recebida", "Em preparação", "Enviada", "Entregue", "Cancelada"],
  /** Os campos por que se pode filtrar. */
  filtros: [
    { chave: "estado", rotulo: "Estado" },
    { chave: "produto", rotulo: "Produto" },
  ],
  /** As etapas de uma encomenda, com a duração típica em horas e quanto varia. As durações são fictícias (a mesma linha dá sempre a mesma). */
  etapas: [
    { nome: "Receção até à preparação", horas: 2, variacao: 1.2 },
    { nome: "Preparação até ao envio", horas: 6, variacao: 1.6 },
    { nome: "Envio até à entrega", horas: 20, variacao: 1.4 },
  ],
  /** O que o painel de um país mostra: as colunas da lista de encomendas e o campo cujos valores mais se repetem. */
  detalhe: {
    colunas: [
      { chave: "processo", rotulo: "Processo" },
      { chave: "produto", rotulo: "Produto" },
      { chave: "quantidade", rotulo: "Quantidade" },
      { chave: "data", rotulo: "Data" },
      { chave: "estado", rotulo: "Estado", estado: true },
    ],
    agrupar: { chave: "produto", rotulo: "Produtos mais pedidos" },
  },
  /** A página «Geografia»: título, unidade e os países (com os nomes em inglês do mapa) e o seu peso nas linhas. */
  mapa: {
    titulo: "Encomendas por país de destino",
    unidade: "encomendas",
    paises: [
      { nome: "Portugal", peso: 46 },
      { nome: "Spain", peso: 20 },
      { nome: "France", peso: 12 },
      { nome: "Brazil", peso: 8 },
      { nome: "Angola", peso: 6 },
      { nome: "Germany", peso: 5 },
      { nome: "United Kingdom", peso: 3 },
    ],
  },
} as const;

export { NOMES_DE_PAISES } from "./paises";

/** O país de uma linha: fictício mas estável (a mesma linha dá sempre o mesmo país). */
export function paisDe(linha: Linha): string {
  const total = ANALISE.mapa.paises.reduce((s, p) => s + p.peso, 0);
  let alvo = mistura(String(linha.id), 31) * total;
  for (const p of ANALISE.mapa.paises) {
    alvo -= p.peso;
    if (alvo < 0) return p.nome;
  }
  return ANALISE.mapa.paises[0].nome;
}
