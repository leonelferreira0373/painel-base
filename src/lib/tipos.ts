// Tipos partilhados pelo motor de extração, pela análise e pela exportação.

export type Celula = string | number | boolean | null;

export interface Tabela {
  id: string;
  ficheiroId: string;
  nome: string;
  origem: string;
  colunas: string[];
  linhas: Celula[][];
  /** 0 a 1; só existe quando a leitura é incerta (OCR e PDF). */
  confianca?: number;
}

export interface Extraido {
  id: string;
  nome: string;
  tamanho: number;
  tipoMime: string;
  formato: string;
  tabelas: Tabela[];
  texto: string;
  avisos: string[];
  duracaoMs: number;
  /** Nome do ficheiro de origem quando este veio de dentro de outro (ZIP ou anexo de e-mail). */
  dentroDe?: string;
}

export type TipoColuna = "inteiro" | "numero" | "data" | "booleano" | "categoria" | "identificador" | "texto" | "vazio";

export interface Estatistica {
  min: number;
  max: number;
  soma: number;
  media: number;
  mediana: number;
  desvio: number;
  q1: number;
  q3: number;
}

export interface Coluna {
  nome: string;
  tipo: TipoColuna;
  n: number;
  nulos: number;
  unicos: number;
  exemplos: string[];
  estat?: Estatistica;
  topo?: { valor: string; contagem: number }[];
  histograma?: { de: number; ate: number; n: number }[];
  outliers?: number;
  primeiraData?: string;
  ultimaData?: string;
}

export type Gravidade = "alta" | "media" | "baixa";

export interface Anomalia {
  gravidade: Gravidade;
  tipo: string;
  coluna?: string;
  contagem: number;
  mensagem: string;
}

export interface Correlacao {
  a: string;
  b: string;
  r: number;
}

export interface Perfil {
  tabelaId: string;
  linhas: number;
  colunas: Coluna[];
  duplicadas: number;
  completude: number;
  pontuacao: number;
  anomalias: Anomalia[];
  correlacoes: Correlacao[];
}
