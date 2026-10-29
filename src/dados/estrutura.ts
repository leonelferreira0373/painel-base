// Estrutura de navegação: áreas (barra lateral), módulos (submenu) e o que cada módulo é.
// Para acrescentar uma página ao painel basta um novo módulo aqui (ver docs/ADICIONAR-MODULO.md).
import type { Icone } from "@/components/Icones";
import { PROJETO } from "./projeto";

/** Como se desenha o módulo: `analise` e `visao` são ecrãs próprios; `registos` usa a tabela genérica; `painel` é um componente à medida (ver `PAINEIS` em components/Paineis.tsx). */
/** «pagina» é um ecrã próprio, escolhido em components/Modulo.tsx (o conteúdo, a IA e o resto do super painel). */
export type TipoModulo = "analise" | "visao" | "registos" | "painel" | "pagina";

export interface Modulo {
  id: string;
  rotulo: string;
  icone: Icone;
  tipo: TipoModulo;
  /** Submenu dentro da área, como os grupos aninhados do menu da Cloudflare. */
  grupo?: string;
  /** O que se faz neste módulo; aparece como dica no menu. */
  descricao?: string;
}

export interface Area {
  id: string;
  rotulo: string;
  icone: Icone;
  /** Título do grupo da barra lateral onde a área aparece («Dados», «Operação»…); as áreas com o mesmo valor ficam juntas, pela ordem de `AREAS`. */
  secao: string;
  modulos: Modulo[];
}

export const AREAS: Area[] = [
  {
    id: "inicio",
    secao: "Início",
    rotulo: "Início",
    icone: "casa",
    modulos: [{ id: "visao-geral", descricao: "Os números do dia e os gráficos dos últimos dias.", rotulo: "Visão geral", icone: "grafico", tipo: "visao" }],
  },
  {
    id: "analise",
    secao: "Dados",
    rotulo: "Análise de dados",
    icone: "grafico",
    modulos: [
      { id: "ficheiros", descricao: "Carregar ficheiros de qualquer formato e ver os dados extraídos.", rotulo: "Ficheiros e dados", icone: "ficheiro", tipo: "analise" },
      { id: "perfil", descricao: "Tipos, qualidade e anomalias de cada coluna.", rotulo: "Perfil e qualidade", icone: "escudo", tipo: "analise" },
      { id: "graficos", descricao: "Gráficos sugeridos e um construtor para escolher colunas e período.", rotulo: "Gráficos", icone: "grafico", tipo: "analise" },
      { id: "exportar", descricao: "Descarregar os dados em CSV, Excel ou um relatório em PDF.", rotulo: "Exportar", icone: "transferir", tipo: "analise" },
    ],
  },
  {
    id: "vendas",
    secao: "Operação",
    rotulo: "Vendas",
    icone: "moeda",
    modulos: [
      { id: "encomendas", descricao: "Receber, preparar, enviar e entregar as encomendas dos clientes.", grupo: "Pedidos", rotulo: "Encomendas", icone: "camiao", tipo: "registos" },
      { id: "devolucoes", descricao: "Pedidos de devolução e a decisão sobre cada um.", grupo: "Pedidos", rotulo: "Devoluções", icone: "atualizar", tipo: "registos" },
      { id: "produtos", descricao: "Produtos, preços e stock disponível.", grupo: "Catálogo", rotulo: "Catálogo de produtos", icone: "livro", tipo: "registos" },
    ],
  },
  {
    id: "clientes",
    secao: "Operação",
    rotulo: "Clientes",
    icone: "predio",
    modulos: [
      { id: "carteira", descricao: "Clientes, contactos e encomendas por cliente.", rotulo: "Carteira de clientes", icone: "predio", tipo: "registos" },
      { id: "notificacoes", descricao: "E-mails enviados aos clientes e o estado de cada envio.", rotulo: "Notificações por e-mail", icone: "correio", tipo: "registos" },
    ],
  },
  {
    id: "hotel",
    secao: "Operação",
    rotulo: "Hotel",
    icone: "casa",
    modulos: [
      { id: "reservas", descricao: "Receber, confirmar e acompanhar as reservas, do check-in ao check-out.", rotulo: "Reservas", icone: "calendario", tipo: "registos" },
      { id: "quartos", descricao: "O estado de cada quarto: livre, ocupado, limpeza ou manutenção.", rotulo: "Quartos", icone: "casa", tipo: "registos" },
      { id: "financeiro-hotel", descricao: "Receita, ocupação, diária média e receita por quarto disponível.", rotulo: "Financeiro", icone: "moeda", tipo: "pagina" },
    ],
  },
  {
    id: "taxi",
    secao: "Operação",
    rotulo: "Táxi",
    icone: "carro",
    modulos: [
      { id: "corridas", descricao: "Pedir, atribuir um motorista e acompanhar cada corrida.", rotulo: "Corridas", icone: "carro", tipo: "registos" },
      { id: "motoristas", descricao: "Os motoristas, a zona onde estão e se podem receber corridas.", rotulo: "Motoristas", icone: "pessoas", tipo: "registos" },
      { id: "mapa-taxi", descricao: "A frota e os pedidos num mapa por zonas, em direto.", rotulo: "Mapa em direto", icone: "pino", tipo: "pagina" },
    ],
  },
  {
    id: "loja",
    secao: "Operação",
    rotulo: "Loja",
    icone: "produto",
    modulos: [
      { id: "encomendas-loja", descricao: "Preparar, enviar e entregar as encomendas dos clientes.", rotulo: "Encomendas", icone: "lista", tipo: "registos" },
      { id: "stock", descricao: "A quantidade de cada produto e o que convém repor.", rotulo: "Stock", icone: "produto", tipo: "registos" },
    ],
  },
  {
    id: "pagamentos",
    secao: "Negócio",
    rotulo: "Pagamentos",
    icone: "moeda",
    modulos: [
      { id: "metricas", descricao: "Volume, número de pagamentos, ticket médio e taxa de sucesso do período.", rotulo: "Visão geral", icone: "grafico", tipo: "pagina" },
      { id: "pagamentos", descricao: "Todos os pagamentos: confirmar, recusar e reembolsar.", rotulo: "Pagamentos", icone: "moeda", tipo: "registos" },
      { id: "comprovativos", descricao: "Os comprovativos recebidos, com a imagem, para validar ou rejeitar.", rotulo: "Comprovativos", icone: "ficheiro", tipo: "pagina" },
      { id: "contas", descricao: "As contas e os IBANs que os clientes veem, configuráveis e validados.", rotulo: "Contas e IBANs", icone: "banco", tipo: "pagina" },
    ],
  },
  {
    id: "marketing",
    secao: "Negócio",
    rotulo: "Marketing",
    icone: "megafone",
    modulos: [
      { id: "visao-marketing", descricao: "Visitas, de onde vieram, páginas quentes e botões mais clicados.", rotulo: "Visão geral", icone: "grafico", tipo: "pagina" },
      { id: "origens", descricao: "De onde vêm os visitantes: fonte, meio e campanha.", grupo: "Audiência", rotulo: "Origem dos visitantes", icone: "globo", tipo: "registos" },
      { id: "quentes", descricao: "As páginas mais vistas, com tempo médio e rejeição.", grupo: "Audiência", rotulo: "Páginas quentes", icone: "fogo", tipo: "registos" },
      { id: "cliques", descricao: "Os botões e ligações mais clicados.", grupo: "Audiência", rotulo: "Botões mais clicados", icone: "clique", tipo: "registos" },
      { id: "campanhas", descricao: "Montar ligações com UTM para saber que campanha trouxe cada visitante.", grupo: "Campanhas", rotulo: "Campanhas e UTM", icone: "link", tipo: "pagina" },
      { id: "rastreio", descricao: "O script para pôr no site, os eventos que recebe e um teste.", grupo: "Campanhas", rotulo: "Rastreio no site", icone: "codigo", tipo: "pagina" },
      { id: "campanhas-email", descricao: "Escrever uma campanha, escolher a audiência e enviar já ou agendar, com os resultados de cada uma.", grupo: "E-mail", rotulo: "Campanhas de e-mail", icone: "correio", tipo: "pagina" },
      { id: "agendados-email", descricao: "O que vai sair: campanhas e mensagens por dia, com enviar já, mudar a hora e cancelar.", grupo: "E-mail", rotulo: "Agendados", icone: "relogio", tipo: "pagina" },
      { id: "recebidos", descricao: "As mensagens que chegaram: ler, responder, reencaminhar e marcar com estrela.", grupo: "E-mail", rotulo: "Recebidos", icone: "transferir", tipo: "pagina" },
      { id: "enviados", descricao: "As mensagens enviadas e se chegaram, foram abertas ou falharam.", grupo: "E-mail", rotulo: "Enviados", icone: "enviar", tipo: "pagina" },
    ],
  },
  {
    id: "conteudo",
    secao: "Plataforma",
    rotulo: "Conteúdo",
    icone: "pasta",
    modulos: [
      { id: "biblioteca", descricao: "Pastas e ficheiros guardados neste navegador: carregar, pré-visualizar, renomear, mover e remover.", rotulo: "Gestor de ficheiros", icone: "pasta", tipo: "pagina" },
      { id: "galeria", descricao: "Carregar imagens e vê-las em grelha, com texto alternativo.", rotulo: "Galeria de imagens", icone: "galeria", tipo: "pagina" },
      { id: "blog", descricao: "Escrever, publicar e exportar artigos.", rotulo: "Editor de blog", icone: "artigo", tipo: "pagina" },
      { id: "editor-produtos", descricao: "Criar e editar produtos, com as imagens da galeria.", rotulo: "Editor de produtos", icone: "produto", tipo: "pagina" },
      { id: "faq", descricao: "Escrever as perguntas frequentes e as respostas: valem para o site e para o assistente de IA.", rotulo: "Editor de FAQ", icone: "ajuda", tipo: "pagina" },
    ],
  },
  {
    id: "ia",
    secao: "Inteligência artificial",
    rotulo: "Assistente de IA",
    icone: "ia",
    modulos: [
      { id: "comportamento", descricao: "Nome, tom, tamanho das respostas, instruções e limites do assistente.", rotulo: "Comportamento", icone: "engrenagem", tipo: "pagina" },
      { id: "memoria", descricao: "Os PDF e as notas que o assistente tem na memória.", rotulo: "Memória", icone: "pdf", tipo: "pagina" },
      { id: "testar", descricao: "Ver o que o assistente encontraria na memória e as instruções que recebe.", rotulo: "Testar", icone: "lupa", tipo: "pagina" },
    ],
  },
  {
    id: "dev",
    secao: "Plataforma",
    rotulo: "Developer tools",
    icone: "terminal",
    modulos: [
      { id: "saude", descricao: "CPU, memória, disco, rede e serviços do servidor, em tempo real.", grupo: "Servidor", rotulo: "Saúde do servidor", icone: "servidor", tipo: "pagina" },
      { id: "pedidos-web", descricao: "Os pedidos web a chegar agora, com estado, tempo e origem.", grupo: "Servidor", rotulo: "Pedidos em tempo real", icone: "pulso", tipo: "pagina" },
      { id: "erros", descricao: "Os erros agrupados, com o número de ocorrências e o estado.", grupo: "Servidor", rotulo: "Registo de erros", icone: "aviso", tipo: "registos" },
      { id: "implementacoes", descricao: "As versões publicadas, o teste A/B entre duas e o rollback para uma anterior.", grupo: "Versões", rotulo: "Implementações", icone: "atualizar", tipo: "pagina" },
      { id: "github", descricao: "O repositório do GitHub, os commits, lançar uma versão e os conectores.", grupo: "Versões", rotulo: "GitHub e conectores", icone: "codigo", tipo: "pagina" },
      { id: "bd", descricao: "Tabelas, segurança por linha, consola de leitura e apagar linhas.", grupo: "Dados", rotulo: "Base de dados", icone: "base", tipo: "pagina" },
      { id: "backups", descricao: "Cópias de segurança: destino, agenda, criar, restaurar e apagar.", grupo: "Dados", rotulo: "Cópias de segurança", icone: "guardar", tipo: "pagina" },
      { id: "limpeza", descricao: "Apagar cache, registos antigos, temporários e dados de teste.", grupo: "Dados", rotulo: "Limpeza", icone: "lixo", tipo: "pagina" },
      { id: "firewall", descricao: "Ligar ou desligar o firewall, o limite de pedidos e as regras de IP.", grupo: "Proteção", rotulo: "Firewall", icone: "escudo", tipo: "pagina" },
      { id: "paginas", descricao: "Ativar, pôr em manutenção ou desativar páginas do site.", grupo: "Proteção", rotulo: "Páginas do site", icone: "globo", tipo: "pagina" },
      { id: "envios", descricao: "Se os e-mails estão mesmo a ser enviados, o servidor de envio e o DNS.", grupo: "Ligações", rotulo: "Envio de e-mails", icone: "correio", tipo: "pagina" },
      { id: "api", descricao: "Ligar este painel a um servidor e ver o contrato das APIs.", grupo: "Ligações", rotulo: "API e ligações", icone: "ligacao", tipo: "pagina" },
    ],
  },
  {
    id: "admin",
    secao: "Plataforma",
    rotulo: "Administração",
    icone: "engrenagem",
    modulos: [
      { id: "utilizadores", descricao: "Quem tem acesso ao painel e com que função.", rotulo: "Utilizadores e funções", icone: "escudo", tipo: "registos" },
      { id: "equipas", descricao: "Equipas, responsáveis e encomendas em curso.", rotulo: "Equipas", icone: "pessoas", tipo: "registos" },
      { id: "erp", descricao: "Ligação ao sistema de gestão: clientes, artigos e stock.", grupo: "Ligações", rotulo: "Ligação ao ERP", icone: "ligacao", tipo: "painel" },
      { id: "faturacao", descricao: "Ligação à faturação: documentos de venda e contas correntes.", grupo: "Ligações", rotulo: "Ligação à faturação", icone: "ligacao", tipo: "painel" },
      { id: "atividade", descricao: "Registo de tudo o que os utilizadores fazem no painel.", rotulo: "Registo de atividade", icone: "relogio", tipo: "registos" },
    ],
  },
  {
    id: "painel",
    secao: "Plataforma",
    rotulo: "Painel",
    icone: "paleta",
    modulos: [
      { id: "modulos", descricao: "Escolher o pacote do negócio e ligar ou desligar cada área e módulo.", rotulo: "Módulos e pacotes", icone: "campos", tipo: "pagina" },
      { id: "predefinicoes", descricao: "Mudar de uma vez o aspeto do painel e as áreas ligadas.", rotulo: "Predefinições", icone: "paleta", tipo: "pagina" },
    ],
  },
];

export function areaPorId(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}

export function moduloPorIds(areaId: string, moduloId: string): { area: Area; modulo: Modulo } | undefined {
  const area = areaPorId(areaId);
  const modulo = area?.modulos.find((m) => m.id === moduloId);
  return area && modulo ? { area, modulo } : undefined;
}

export const caminho = (areaId: string, moduloId: string) => (areaId === "inicio" ? "/" : `/${PROJETO.contaId}/${areaId}/${moduloId}/`);
