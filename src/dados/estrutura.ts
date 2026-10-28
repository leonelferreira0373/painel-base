// Estrutura de navegação: áreas (barra lateral), módulos (submenu) e o que cada módulo é.
// Para acrescentar uma página ao painel basta um novo módulo aqui (ver docs/ADICIONAR-MODULO.md).
import type { Icone } from "@/components/Icones";

/** Como se desenha o módulo: `analise` e `visao` são ecrãs próprios; `registos` usa a tabela genérica; `painel` é um componente à medida (ver `PAINEIS` em components/Paineis.tsx). */
export type TipoModulo = "analise" | "visao" | "registos" | "painel";

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
];

export function areaPorId(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}

export function moduloPorIds(areaId: string, moduloId: string): { area: Area; modulo: Modulo } | undefined {
  const area = areaPorId(areaId);
  const modulo = area?.modulos.find((m) => m.id === moduloId);
  return area && modulo ? { area, modulo } : undefined;
}

export const caminho = (areaId: string, moduloId: string) => (areaId === "inicio" ? "/" : `/${areaId}/${moduloId}/`);
