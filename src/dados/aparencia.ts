// A aparência que cada utilizador pode personalizar: as cores (uma paleta para o tema claro e outra para o escuro) e as letras. As variáveis do Kumo que cada escolha altera estão em lib/aparencia.ts.

export type Modo = "claro" | "escuro";
export type CorId = "fundo" | "superficies" | "texto" | "textoSecundario" | "linhas" | "acento" | "sucesso" | "pendente" | "erro";
export type LetraId = "corpo" | "titulos" | "numeros";

export interface DefCor {
  id: CorId;
  rotulo: string;
  descricao: string;
  grupo: "Base" | "Destaque" | "Estados";
  /** A cor de origem em cada tema (valores aproximados dos do Kumo). */
  claro: string;
  escuro: string;
}

export const CORES: DefCor[] = [
  { id: "fundo", rotulo: "Fundo", descricao: "O fundo das páginas.", grupo: "Base", claro: "#fafafa", escuro: "#0a0a0a" },
  { id: "superficies", rotulo: "Superfícies", descricao: "O fundo dos cartões, dos menus e das janelas que ficam por cima do fundo.", grupo: "Base", claro: "#ffffff", escuro: "#171717" },
  { id: "texto", rotulo: "Texto", descricao: "O texto principal e os títulos. Tem de ler-se bem sobre o fundo.", grupo: "Base", claro: "#171717", escuro: "#f5f5f5" },
  { id: "textoSecundario", rotulo: "Texto secundário", descricao: "Legendas, rótulos e frases de apoio.", grupo: "Base", claro: "#737373", escuro: "#a3a3a3" },
  { id: "linhas", rotulo: "Linhas", descricao: "Os traços finos que separam as coisas.", grupo: "Base", claro: "#e5e5e5", escuro: "#303030" },
  { id: "acento", rotulo: "Acento", descricao: "A cor de destaque: o botão principal, as ligações, a seleção e os gráficos.", grupo: "Destaque", claro: "#155dfc", escuro: "#3b82f6" },
  { id: "sucesso", rotulo: "Sucesso", descricao: "Concluído, ativo, entregue.", grupo: "Estados", claro: "#16a34a", escuro: "#4ade80" },
  { id: "pendente", rotulo: "Pendente", descricao: "O que está à espera de uma decisão ou de uma resposta.", grupo: "Estados", claro: "#d97706", escuro: "#fbbf24" },
  { id: "erro", rotulo: "Erro", descricao: "Avisos de erro, recusado, bloqueado e ações perigosas.", grupo: "Estados", claro: "#dc2626", escuro: "#f87171" },
];

export interface DefLetra {
  id: LetraId;
  rotulo: string;
  descricao: string;
}

export const LETRAS: DefLetra[] = [
  { id: "corpo", rotulo: "Texto", descricao: "O texto corrente, os menus e os controlos." },
  { id: "titulos", rotulo: "Títulos", descricao: "Os títulos das páginas e dos cartões." },
  { id: "numeros", rotulo: "Números", descricao: "Os valores grandes e as colunas de números." },
];

export interface TipoDeLetra {
  id: string;
  rotulo: string;
  /** A lista de letras, da preferida para a de reserva (só letras que já estão no aparelho: nada se descarrega). */
  pilha: string;
}

export const TIPOS_DE_LETRA: TipoDeLetra[] = [
  { id: "inter", rotulo: "Inter (a do painel)", pilha: '"Inter Variable", ui-sans-serif, system-ui, sans-serif' },
  { id: "sistema", rotulo: "A do sistema", pilha: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { id: "arredondada", rotulo: "Arredondada", pilha: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", Quicksand, system-ui, sans-serif' },
  { id: "serifada", rotulo: "Serifada", pilha: 'ui-serif, Georgia, Cambria, "Times New Roman", serif' },
  { id: "mono", rotulo: "Monoespaçada", pilha: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
];

/** O que o utilizador mudou: só as cores e as letras que escolheu; o resto fica como está. */
export interface Aparencia {
  claro?: Partial<Record<CorId, string>>;
  escuro?: Partial<Record<CorId, string>>;
  letras?: Partial<Record<LetraId, string>>;
}
