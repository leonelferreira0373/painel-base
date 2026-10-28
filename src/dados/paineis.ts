// Dados fictícios dos painéis à medida (módulos do tipo «painel»): aqui, as ligações a sistemas externos.

export interface Entidade {
  nome: string;
  registos: number;
  sentido: string;
}

export interface DadosIntegracao {
  sistema: string;
  ambiente: string;
  versao: string;
  /** O que a sincronização troca; aparece na dica do botão. */
  troca: string;
  entidades: Entidade[];
}

export const INTEGRACOES: Record<string, DadosIntegracao> = {
  erp: {
    sistema: "ERP",
    ambiente: "Produção",
    versao: "2026.2",
    troca: "clientes, artigos e níveis de stock",
    entidades: [
      { nome: "Clientes", registos: 6, sentido: "Painel para ERP" },
      { nome: "Artigos", registos: 8, sentido: "ERP para o painel" },
      { nome: "Níveis de stock", registos: 8, sentido: "ERP para o painel" },
      { nome: "Encomendas", registos: 46, sentido: "Painel para ERP" },
    ],
  },
  faturacao: {
    sistema: "Faturação",
    ambiente: "Produção",
    versao: "V10",
    troca: "documentos de venda e contas correntes",
    entidades: [
      { nome: "Documentos de venda", registos: 187, sentido: "Painel para Faturação" },
      { nome: "Contas correntes", registos: 6, sentido: "Faturação para o painel" },
      { nome: "Notas de crédito", registos: 12, sentido: "Painel para Faturação" },
    ],
  },
};
