// Os módulos de registos do super painel (pagamentos, erros do servidor e as listas de marketing): colunas, fluxo de estados, gráficos e os dados de demonstração. Juntam-se aos de modulos.ts em REGISTOS.
import { gerarCliques, gerarErros, gerarOrigens, gerarPaginas, gerarPagamentos, METODOS_DE_PAGAMENTO } from "./super-dados";
import { CLIENTES } from "./semente";
import type { DefRegistos } from "./tipos";

const FINANCAS = ["administrador"];

const pagamentos: DefRegistos = {
  id: "pagamentos",
  titulo: "Pagamentos",
  estadoChave: "estado",
  estadoInicial: "Pendente",
  api: { lista: "/v1/pagamentos", estado: "/v1/pagamentos/{id}", criar: "/v1/pagamentos", mapear: (p) => ({ ...p, data: String(p.data).slice(0, 10) }) },
  colunas: [
    { chave: "referencia", rotulo: "Referência" },
    { chave: "cliente", rotulo: "Cliente" },
    { chave: "metodo", rotulo: "Método" },
    { chave: "valor", rotulo: "Valor (AOA)", tipo: "numero" },
    { chave: "data", rotulo: "Data", tipo: "data" },
    { chave: "conta", rotulo: "Conta de destino" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Pendente"], para: "Confirmado", rotulo: "Confirmar o pagamento", icone: "certo", funcoes: FINANCAS, notifica: true },
    { de: ["Pendente"], para: "Recusado", rotulo: "Recusar o pagamento", icone: "fechar", funcoes: FINANCAS },
    { de: ["Confirmado"], para: "Reembolsado", rotulo: "Reembolsar", icone: "repor", funcoes: FINANCAS },
  ],
  campos: [
    { chave: "referencia", rotulo: "Referência", tipo: "texto", obrigatorio: true },
    { chave: "cliente", rotulo: "Cliente", tipo: "opcoes", opcoes: [...CLIENTES], obrigatorio: true },
    { chave: "metodo", rotulo: "Método", tipo: "opcoes", opcoes: [...METODOS_DE_PAGAMENTO], obrigatorio: true },
    { chave: "valor", rotulo: "Valor (AOA)", tipo: "numero", obrigatorio: true },
    { chave: "data", rotulo: "Data", tipo: "data", obrigatorio: true },
  ],
  graficos: [
    { tipo: "linha", data: "data", medida: "valor", titulo: "Volume por dia" },
    { tipo: "rosca", por: "metodo", medida: "valor", titulo: "Volume por método" },
    { tipo: "barras", por: "cliente", medida: "valor", titulo: "Volume por cliente" },
  ],
  semente: () => gerarPagamentos().map((p) => ({ ...p })),
};

const erros: DefRegistos = {
  id: "erros",
  titulo: "Registo de erros",
  estadoChave: "estado",
  estadoInicial: "Novo",
  api: { lista: "/v1/dev/erros", estado: "/v1/dev/erros/{id}", mapear: (e) => ({ ...e, ultimo: String(e.ultimo).slice(0, 10) }) },
  colunas: [
    { chave: "nivel", rotulo: "Nível" },
    { chave: "mensagem", rotulo: "Mensagem" },
    { chave: "origem", rotulo: "Origem" },
    { chave: "ocorrencias", rotulo: "Ocorrências", tipo: "numero" },
    { chave: "ultimo", rotulo: "Última vez", tipo: "data" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Novo"], para: "Visto", rotulo: "Marcar como visto", icone: "olho", funcoes: ["administrador"] },
    { de: ["Novo", "Visto"], para: "Resolvido", rotulo: "Marcar como resolvido", icone: "certo", funcoes: ["administrador"] },
  ],
  campos: [],
  graficos: [
    { tipo: "rosca", por: "nivel", medida: "ocorrencias", titulo: "Ocorrências por nível" },
    { tipo: "barras", por: "origem", medida: "ocorrencias", titulo: "Ocorrências por origem" },
  ],
  semente: () => gerarErros().map((e) => ({ ...e, ultimo: e.ultimo.slice(0, 10) })),
};

const origens: DefRegistos = {
  id: "origens",
  titulo: "De onde vêm os visitantes",
  api: { lista: "/v1/marketing/origens", mapear: (o) => ({ ...o, taxa: Math.round((Number(o.conversoes) / Math.max(1, Number(o.visitas))) * 1000) / 10 }) },
  colunas: [
    { chave: "fonte", rotulo: "Fonte" },
    { chave: "meio", rotulo: "Meio" },
    { chave: "campanha", rotulo: "Campanha" },
    { chave: "visitas", rotulo: "Visitas", tipo: "numero" },
    { chave: "visitantes", rotulo: "Visitantes", tipo: "numero" },
    { chave: "conversoes", rotulo: "Conversões", tipo: "numero" },
    { chave: "taxa", rotulo: "Conversão (%)", tipo: "numero" },
  ],
  campos: [],
  graficos: [
    { tipo: "barras", por: "fonte", medida: "visitas", titulo: "Visitas por fonte" },
    { tipo: "rosca", por: "meio", medida: "visitas", titulo: "Visitas por meio" },
  ],
  semente: () => gerarOrigens().map((o, i) => ({ id: `origens-${i + 1}`, ...o, taxa: Math.round((o.conversoes / Math.max(1, o.visitas)) * 1000) / 10 })),
};

const quentes: DefRegistos = {
  id: "quentes",
  titulo: "Páginas quentes",
  api: { lista: "/v1/marketing/paginas", mapear: (p) => ({ ...p, rejeicao: Math.round(Number(p.rejeicao) * 100) }) },
  colunas: [
    { chave: "pagina", rotulo: "Página", tipo: "rota" },
    { chave: "visitas", rotulo: "Visitas", tipo: "numero" },
    { chave: "tempoMedio", rotulo: "Tempo médio (s)", tipo: "numero" },
    { chave: "rejeicao", rotulo: "Rejeição (%)", tipo: "numero" },
    { chave: "conversoes", rotulo: "Conversões", tipo: "numero" },
  ],
  campos: [],
  graficos: [
    { tipo: "barras", por: "pagina", medida: "visitas", titulo: "Visitas por página" },
    { tipo: "barras", por: "pagina", medida: "conversoes", titulo: "Conversões por página" },
  ],
  semente: () => gerarPaginas().map((p, i) => ({ id: `quentes-${i + 1}`, ...p, rejeicao: Math.round(p.rejeicao * 100) })),
};

const cliques: DefRegistos = {
  id: "cliques",
  titulo: "Botões mais clicados",
  api: { lista: "/v1/marketing/cliques" },
  colunas: [
    { chave: "elemento", rotulo: "Botão ou ligação" },
    { chave: "pagina", rotulo: "Página", tipo: "rota" },
    { chave: "cliques", rotulo: "Cliques", tipo: "numero" },
    { chave: "visitantes", rotulo: "Visitantes", tipo: "numero" },
  ],
  campos: [],
  graficos: [
    { tipo: "barras", por: "elemento", medida: "cliques", titulo: "Cliques por botão" },
    { tipo: "rosca", por: "pagina", medida: "cliques", titulo: "Cliques por página" },
  ],
  semente: () => gerarCliques().map((c, i) => ({ id: `cliques-${i + 1}`, ...c })),
};

export const REGISTOS_SUPER: DefRegistos[] = [pagamentos, erros, origens, quentes, cliques];

/** O que cada estado significa, por módulo (junta-se a SIGNIFICADO_ESTADO). */
export const SIGNIFICADO_SUPER: Record<string, Record<string, string>> = {
  pagamentos: {
    Pendente: "Pagamento registado, à espera de confirmação (por exemplo, de o comprovativo ser validado).",
    Confirmado: "O dinheiro está confirmado; o cliente é notificado por e-mail.",
    Recusado: "O pagamento não foi aceite; o cliente é informado.",
    Reembolsado: "O valor foi devolvido ao cliente; não tem mais passos.",
  },
  comprovativos: {
    "Por validar": "Recebido e ainda ninguém conferiu o montante e a referência.",
    Validado: "O montante e a referência conferem; o pagamento fica confirmado.",
    Rejeitado: "O comprovativo não serve; o cliente é avisado para enviar outro.",
  },
  erros: {
    Novo: "Apareceu e ainda ninguém o viu.",
    Visto: "Alguém já o viu e está a tratar do assunto.",
    Resolvido: "Corrigido; se voltar a aparecer, volta a «Novo».",
  },
  "*": {
    Saudável: "A funcionar com normalidade.",
    "A arrancar": "A reiniciar; fica pronto dentro de alguns segundos.",
    Parado: "Não está a correr. Reinicie-o ou veja os erros.",
    "A decorrer": "Em curso; ainda não terminou.",
    Válido: "Está correto.",
    "A rever": "Funciona, mas convém melhorar.",
    "Em falta": "Não está configurado e pode causar problemas.",
    Ativa: "A página está visível para os visitantes.",
    "Em manutenção": "Os visitantes veem uma mensagem em vez da página.",
    Desativada: "A página não está disponível.",
    Entregue: "Chegou à caixa do destinatário.",
    Fila: "À espera de ser enviado.",
    Rejeitado: "O servidor do destinatário recusou o e-mail.",
    Permitido: "A regra deixa passar este alvo.",
  },
};
