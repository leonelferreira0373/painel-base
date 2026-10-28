// O que a página inicial mostra: cartões com série no tempo, o cartão do anel, a faixa de aviso e as listas curtas.
// Todos os números saem dos registos dos módulos (`REGISTOS`); para mudar a página inicial mexe-se só aqui.
import type { Icone } from "@/components/Icones";
import { caminho } from "./estrutura";
import type { Linha } from "./tipos";

/** Cartão com um gráfico: conta, por dia ou por hora, as linhas de um módulo de registos. */
export interface CartaoSerie {
  id: string;
  titulo: string;
  /** Módulo de registos de onde saem as linhas. */
  registos: string;
  /** Coluna com a data de cada linha. */
  campo: string;
  /** Para onde vai o cartão ao clicar no título. */
  href: string;
  /** Altura do gráfico, em píxeis. */
  altura: number;
  /** 1 = linha larga de dois cartões; 2 = linha de quatro cartões pequenos. */
  linha: 1 | 2;
}

export const CARTOES_SERIE: CartaoSerie[] = [
  { id: "encomendas", titulo: "Encomendas", registos: "encomendas", campo: "data", href: caminho("vendas", "encomendas"), altura: 150, linha: 1 },
  { id: "devolucoes", titulo: "Devoluções", registos: "devolucoes", campo: "data", href: caminho("vendas", "devolucoes"), altura: 150, linha: 1 },
  { id: "notificacoes", titulo: "E-mails enviados", registos: "notificacoes", campo: "data", href: caminho("clientes", "notificacoes"), altura: 110, linha: 2 },
  { id: "atividade", titulo: "Ações no painel", registos: "atividade", campo: "data", href: caminho("admin", "atividade"), altura: 110, linha: 2 },
  { id: "acessos", titulo: "Acessos", registos: "utilizadores", campo: "data", href: caminho("admin", "utilizadores"), altura: 110, linha: 2 },
];

/** Cartão do anel: uma percentagem (bons a dividir pelos decididos) e dois indicadores por baixo. */
export const CARTAO_ANEL = {
  id: "taxa",
  titulo: "Taxa de entrega",
  registos: "encomendas",
  campo: "estado",
  bons: ["Entregue"],
  maus: ["Cancelada"],
  rotuloMedidor: "Entregues",
  href: caminho("vendas", "encomendas"),
  indicadores: [
    { rotulo: "Por tratar", registos: "encomendas", campo: "estado", estados: ["Recebida", "Em preparação"] },
    { rotulo: "Produtos esgotados", registos: "produtos", campo: "estado", estados: ["Esgotado"] },
  ],
} as const;

/** Faixa de aviso por cima das análises; só aparece quando há linhas nos estados indicados e a função vê o módulo. */
export const AVISO_VISAO = {
  registos: "produtos",
  campo: "estado",
  estados: ["Esgotado", "Stock baixo"],
  area: "vendas",
  modulo: "produtos",
  href: caminho("vendas", "produtos"),
  botao: "Ver produtos",
  mensagem: (n: number) => (n === 1 ? "1 produto esgotado ou com stock baixo" : `${n} produtos esgotados ou com stock baixo`),
} as const;

/** Listas curtas da página inicial (a de «Recentes» é automática). */
export interface ListaVisao {
  id: string;
  titulo: string;
  registos: string;
  href: string;
  icone: Icone;
  texto: (linha: Linha) => string;
}

export const LISTAS_VISAO: ListaVisao[] = [
  { id: "lista-encomendas", titulo: "Encomendas", registos: "encomendas", href: caminho("vendas", "encomendas"), icone: "camiao", texto: (l) => `${String(l.processo)} · ${String(l.cliente)}` },
  { id: "lista-clientes", titulo: "Clientes", registos: "carteira", href: caminho("clientes", "carteira"), icone: "predio", texto: (l) => String(l.cliente) },
];

export const LISTA_RECENTES = { id: "lista-recentes", titulo: "Recentes" } as const;
