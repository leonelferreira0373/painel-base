// Tipos das definições de módulos de registos (colunas, campos, transições e gráficos).
import type { Icone } from "@/components/Icones";
import type { Granularidade } from "@/lib/analysis/series";

export type Linha = { id: string } & Record<string, string | number>;

export interface DefColuna {
  chave: string;
  rotulo: string;
  /** «rota» é o endereço de uma página do site: mostra-se o nome da página, nunca o endereço. */
  tipo?: "texto" | "data" | "numero" | "estado" | "rota";
}

export interface DefTransicao {
  de: string[];
  para: string;
  rotulo: string;
  icone: Icone;
  /** Funções que podem executar a transição. */
  funcoes: string[];
  /** Cria uma linha no módulo de notificações (ver `dados/notificacoes.ts`). */
  notifica?: boolean;
  /** Campos preenchidos pela própria transição (por exemplo, a transportadora atribuída). */
  aplicar?: (linha: Linha, n: number) => Partial<Linha>;
}

export interface DefGrafico {
  tipo: "rosca" | "barras" | "linha";
  /** Coluna que agrupa (rosca, barras). */
  por?: string;
  /** Coluna de datas (linha). */
  data?: string;
  /** Coluna numérica a somar; sem ela, conta linhas. */
  medida?: string;
  gran?: Granularidade;
  titulo: string;
}

export interface DefCampo {
  chave: string;
  rotulo: string;
  tipo: "texto" | "data" | "hora" | "numero" | "opcoes";
  opcoes?: string[];
  obrigatorio?: boolean;
}

/** Onde um módulo de registos lê e escreve quando o painel está ligado a um servidor (contrato em lib/api/contrato.ts). */
export interface DefApi {
  /** O endereço da lista (GET devolve `{ itens }`). */
  lista: string;
  /** O endereço que muda o estado de uma linha (PATCH com `{ estado }`; leva `{id}`). */
  estado?: string;
  /** O endereço que cria uma linha (POST com os valores do formulário). */
  criar?: string;
  /** Completa uma linha que veio do servidor (por exemplo, com uma coluna calculada). */
  mapear?: (item: Record<string, string | number>) => Record<string, string | number>;
}

export interface DefRegistos {
  id: string;
  titulo: string;
  colunas: DefColuna[];
  estadoChave?: string;
  /** Estado de um registo novo; sem ele, usa o primeiro estado de partida das transições. */
  estadoInicial?: string;
  /** Se existe, o módulo lê e escreve no servidor quando o painel está ligado a um. */
  api?: DefApi;
  transicoes?: DefTransicao[];
  campos: DefCampo[];
  graficos: DefGrafico[];
  semente: () => Linha[];
}
