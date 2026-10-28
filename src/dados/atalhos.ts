// Os atalhos de teclado que o utilizador pode mudar (em Definições da conta → Atalhos) e os que são fixos.

export interface DefAtalho {
  id: string;
  rotulo: string;
  /** O que acontece; aparece como dica. */
  descricao: string;
  /** A combinação de origem, como «Ctrl+K» (Ctrl vale também por Cmd no Mac). */
  padrao: string;
}

export const ATALHOS: DefAtalho[] = [
  { id: "pesquisa", rotulo: "Abrir a pesquisa rápida", descricao: "Abre ou fecha a pesquisa de páginas e ações.", padrao: "Ctrl+K" },
  { id: "barra", rotulo: "Recolher ou expandir a barra lateral", descricao: "Fixa a barra lateral aberta ou deixa-a só com ícones.", padrao: "Ctrl+B" },
  { id: "inicio", rotulo: "Ir para o início", descricao: "Abre a página inicial com as métricas.", padrao: "Alt+H" },
  { id: "conta", rotulo: "Abrir as definições da conta", descricao: "Abre o perfil e as preferências da sua conta.", padrao: "Alt+," },
  { id: "tema", rotulo: "Alternar o tema claro e escuro", descricao: "Troca entre o tema claro e o escuro.", padrao: "Alt+T" },
];

/** Os que não se mudam: fazem parte dos menus e das janelas. */
export const ATALHOS_FIXOS = [
  { teclas: "Esc", acao: "Fechar uma janela ou o menu aberto" },
  { teclas: "Enter", acao: "Escolher o resultado selecionado na pesquisa" },
  { teclas: "↑ ↓", acao: "Mover-se pelos resultados e pelos menus" },
  { teclas: "→", acao: "Abrir um submenu" },
];
