// Tipos das definições de módulos de registos (colunas, campos, transições e gráficos).
import type { Icone } from "@/components/Icones";
import type { Granularidade } from "@/lib/analysis/series";

export type Linha = { id: string } & Record<string, string | number>;

export interface DefColuna {
  chave: string;
  rotulo: string;
  tipo?: "texto" | "data" | "numero" | "estado";
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

export interface DefRegistos {
  id: string;
  titulo: string;
  colunas: DefColuna[];
  estadoChave?: string;
  /** Estado de um registo novo; sem ele, usa o primeiro estado de partida das transições. */
  estadoInicial?: string;
  transicoes?: DefTransicao[];
  campos: DefCampo[];
  graficos: DefGrafico[];
  semente: () => Linha[];
}
