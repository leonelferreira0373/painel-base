// Textos das dicas (tooltips) do painel: o que cada estado significa em cada módulo, o que cada campo pede, o que cada tipo e estatística quer dizer.
// Ficam aqui, arrumados por assunto, para que nenhum componente tenha português escrito no código.
import { SIGNIFICADO_SUPER } from "./modulos-super";

/** Significado de cada estado, por módulo; «*» serve a todos os módulos que não o definem. */
const SIGNIFICADO_PROPRIO: Record<string, Record<string, string>> = {
  encomendas: {
    Recebida: "O cliente fez a encomenda e ainda ninguém a tratou.",
    "Em preparação": "A equipa aceitou a encomenda e está a preparar os artigos.",
    Enviada: "Entregue à transportadora; falta confirmar a entrega ao cliente.",
    Entregue: "O cliente recebeu a encomenda e foi notificado por e-mail.",
    Cancelada: "A encomenda foi cancelada e não tem mais passos.",
  },
  devolucoes: {
    Pedida: "O cliente pediu a devolução e aguarda decisão.",
    Aprovada: "Devolução aprovada; o cliente foi notificado e falta receber o artigo.",
    "Concluída": "Artigo recebido de volta; não tem mais passos.",
    Recusada: "Devolução recusada; o cliente é informado.",
  },
  produtos: {
    "Em stock": "Há unidades suficientes para vender.",
    "Stock baixo": "Restam poucas unidades; convém repor.",
    Esgotado: "Sem unidades; as novas encomendas ficam à espera de reposição.",
  },
  carteira: {
    Ativo: "Cliente com contrato em vigor; pode fazer encomendas.",
    "Em negociação": "Contrato ainda em negociação; ainda não pode fazer encomendas.",
    Suspenso: "Cliente suspenso; as novas encomendas ficam bloqueadas.",
  },
  notificacoes: {
    Enviado: "Entregue ao servidor de e-mail do destinatário.",
    "Em fila": "Na fila de envio; sai nos próximos minutos.",
    Falhou: "Não foi possível entregar; pode reenviar.",
  },
  utilizadores: {
    Ativo: "Pode iniciar sessão com as permissões da sua função.",
    Bloqueado: "Acesso bloqueado; não consegue iniciar sessão.",
  },
  "*": {
    Pendente: "Aguarda uma decisão.",
    Aprovada: "Aprovada.",
    "Concluída": "Concluída; não tem mais passos.",
  },
};

/** O significado de cada estado: o dos módulos do projeto e o do super painel (pagamentos, comprovativos, erros e os estados que se repetem nos ecrãs). */
export const SIGNIFICADO_ESTADO: Record<string, Record<string, string>> = {
  ...SIGNIFICADO_PROPRIO,
  ...SIGNIFICADO_SUPER,
  "*": { ...SIGNIFICADO_PROPRIO["*"], ...SIGNIFICADO_SUPER["*"] },
};

export function significadoDoEstado(modulo: string, estado: string): string | null {
  return SIGNIFICADO_ESTADO[modulo]?.[estado] ?? SIGNIFICADO_ESTADO["*"][estado] ?? null;
}

/** O que cada campo dos formulários pede (a chave é a `chave` do campo em `modulos.ts`). */
export const DICA_CAMPO: Record<string, string> = {
  cliente: "Empresa que faz a encomenda; recebe a confirmação por e-mail.",
  produto: "Artigo do catálogo.",
  quantidade: "Número de unidades.",
  data: "Dia da encomenda.",
  motivo: "Porque o cliente quer devolver o artigo.",
  categoria: "Grupo do catálogo a que o produto pertence.",
  preco: "Preço de venda, com IVA, em euros.",
  stock: "Unidades disponíveis em armazém.",
  contacto: "Pessoa que o painel contacta nesse cliente.",
  setor: "Setor de atividade do cliente.",
  nome: "Nome da pessoa que vai usar o painel.",
  funcao: "A função define o que a pessoa vê e o que pode alterar.",
};

/** O que cada tipo de coluna quer dizer na análise de dados. */
export const DICA_TIPO: Record<string, string> = {
  inteiro: "Números inteiros; permite soma, média, histograma e correlações.",
  numero: "Números com casas decimais; permite soma, média, histograma e correlações.",
  data: "Datas reais; permite séries no tempo por dia, semana, mês ou ano.",
  booleano: "Duas respostas possíveis, como sim e não.",
  categoria: "Poucos valores que se repetem; permite contagens por grupo.",
  identificador: "Quase todos os valores são únicos, como um código de processo; não entra nas estatísticas.",
  texto: "Texto livre; só se pesquisa e se conta.",
  vazio: "Coluna sem nenhum valor.",
};

export const DICA_GRAVIDADE: Record<string, string> = {
  alta: "Compromete a análise: corrija antes de tirar conclusões.",
  media: "Pode distorcer resultados; convém corrigir.",
  baixa: "Convém ter em conta, mas não impede a análise.",
};

/** O que cada estatística do perfil de uma coluna quer dizer. */
export const DICA_ESTATISTICA: Record<string, string> = {
  tipo: "Tipo que o painel reconheceu a partir dos valores.",
  emFalta: "Células vazias nesta coluna.",
  unicos: "Quantos valores diferentes aparecem.",
  minimo: "O menor valor da coluna.",
  maximo: "O maior valor da coluna.",
  media: "Soma de todos os valores a dividir pelo número deles; sensível a valores extremos.",
  mediana: "Valor do meio quando se ordenam todos; metade fica abaixo e metade acima.",
  desvio: "Quanto os valores se afastam, em média, da média; quanto maior, mais dispersos.",
  atipicos: "Valores muito longe do grupo (mais de 1,5 intervalos interquartis fora da caixa).",
  primeira: "Data mais antiga da coluna.",
  ultima: "Data mais recente da coluna.",
  linhas: "Registos da tabela.",
  colunas: "Campos de cada registo.",
  completude: "Percentagem de células preenchidas em toda a tabela.",
  duplicadas: "Linhas repetidas por completo; costumam vir de importações em duplicado.",
  pontuacao: "De 0 a 100. Desce com células vazias, linhas duplicadas e anomalias, conforme a gravidade.",
};

/** Cartões da página inicial: o que mede cada um (a chave é o `id` do cartão em `visao.ts`). */
export const DICA_CARTAO: Record<string, string> = {
  encomendas: "Encomendas com data dentro do período escolhido.",
  devolucoes: "Devoluções pedidas dentro do período escolhido.",
  notificacoes: "E-mails enviados aos clientes (confirmações e avisos) no período.",
  atividade: "Ações feitas por todos os utilizadores no painel, no período.",
  acessos: "Utilizadores cujo último acesso cai dentro do período.",
  taxa: "Encomendas entregues a dividir pelas que já foram decididas (entregues mais canceladas).",
};

/** Controlos do construtor de gráficos. */
export const DICA_GRAFICO: Record<string, string> = {
  tipo: "Forma do gráfico: linha no tempo, barras ou rosca por categoria, histograma ou dispersão.",
  eixoX: "Coluna que define o eixo horizontal: datas numa linha, categorias em barras.",
  eixoY: "Valor que se calcula para cada ponto; «contagem» conta apenas os registos.",
  agregacao: "Como juntar os valores de cada ponto: soma, média, mediana, mínimo ou máximo.",
  granularidade: "Agrupa as datas por dia, semana, mês ou ano.",
  guardar: "Inclui este gráfico no relatório em PDF da página Exportar.",
};

/** Formatos de exportação. */
export const DICA_EXPORTAR: Record<string, string> = {
  csv: "Texto separado por ponto e vírgula, com vírgula decimal e acentos corretos: abre direto no Excel em português.",
  excel: "Uma folha por tabela, com números e datas nos tipos certos, mais folhas com o perfil das colunas, as anomalias e as correlações.",
  pdf: "Relatório A4 com o resumo, as anomalias, os gráficos escolhidos ao lado, o perfil das colunas e uma amostra dos dados.",
};

/** Controlos da análise de ficheiros. */
export const DICA_FICHEIROS: Record<string, string> = {
  escolher: "Escolha um ou vários ficheiros de qualquer formato: Excel, CSV, PDF, Word, imagem, e-mail, ZIP e outros.",
  endereco: "Importa um ficheiro a partir de um endereço. O servidor de origem tem de permitir a leitura a partir do navegador.",
  importar: "Importar o ficheiro deste endereço.",
  limpar: "Remove todos os ficheiros e tabelas desta sessão; não apaga nada fora do painel.",
  texto: "Texto corrido que o leitor encontrou no ficheiro, fora das tabelas.",
  remover: "Tira este ficheiro da análise.",
};
