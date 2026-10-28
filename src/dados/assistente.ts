// O assistente de IA do painel (módulo ai-chat, github.com/ferreirakorp/ai-chat): o conteúdo do projeto (nome, convites, perguntas e respostas prontas) e onde fica o servidor da IA.
import { exemploDeConteudo } from "ai-chat";
import type { ConteudoDoAssistente } from "ai-chat/nucleo/conteudo";

const conteudo: ConteudoDoAssistente = {
  ...exemploDeConteudo,
  nome: "Assistente do painel",
  papel: "Assistente virtual com inteligência artificial",
  estado: "Responde em segundos",
  abrir: "Perguntar à IA",
  avatar: { chave: "", alt: "Assistente do painel" },
  chamada: { rotulo: "Falar com a equipa", href: "/" },
  aviso: "Assistente com inteligência artificial: pode errar e não substitui a equipa. Só guardamos a conversa se autorizar, e pode parar e apagar quando quiser.",
  convites: [
    "Olá! Sou o assistente do painel. Posso ajudar a encontrar uma página, explicar um estado ou mostrar como se faz uma tarefa.",
    "Precisa de ajuda com uma encomenda, uma exportação ou as definições da conta? Pergunte-me.",
  ],
  abertura: ["Em que posso ajudar? Escolha uma pergunta ou escreva a sua."],
  perguntas: [
    {
      pergunta: "Como crio um novo registo?",
      resposta: "Abra o módulo pretendido no menu, por exemplo Encomendas, e use o botão «Novo registo» no topo da tabela. Preencha os campos obrigatórios e guarde: o registo aparece logo na lista. Em que módulo quer criar?",
    },
    {
      pergunta: "O que significa cada estado?",
      resposta: "Passe o rato sobre a etiqueta do estado: a dica explica o que significa, qual é o passo seguinte e quem o pode executar. Quer que lhe explique o fluxo de um módulo em concreto?",
    },
    {
      pergunta: "Como mudo o tema, o idioma ou o fuso horário?",
      resposta: "Abra o menu da conta, no canto superior direito do cabeçalho, e escolha Aparência, Idioma ou Fuso horário. Os submenus abrem para o lado onde houver espaço.",
    },
    {
      pergunta: "Como altero os atalhos de teclado?",
      resposta: "Em Definições da conta, na secção Atalhos, carregue em «Alterar» ao lado da ação e prima as teclas que quer usar. Pode repor a combinação de origem a qualquer momento.",
    },
    {
      pergunta: "Como exporto os dados?",
      resposta: "Na análise de dados, a página Exportar descarrega a tabela em CSV, Excel ou um relatório em PDF com gráficos. Já carregou um ficheiro?",
    },
    {
      pergunta: "Quero falar com a equipa",
      resposta: "Com todo o gosto. Deixe o seu nome e o melhor contacto e a equipa responde-lhe. Qual é o melhor e-mail ou número?",
    },
  ],
  instrucoes:
    "És o assistente de um painel de administração. Ajuda a encontrar páginas, a perceber estados e a fazer tarefas. Responde em português, de forma curta e clara, e não inventes dados: se não souberes, diz que a equipa responde.",
};

export const ASSISTENTE = {
  /** Onde o módulo fala com a IA (no mesmo domínio). Sem servidor ali, o assistente responde com as perguntas e respostas prontas acima. */
  endpoint: "/api/assistente",
  /** A chave com que a conversa fica guardada neste navegador. */
  chaveDeSessao: "painel.assistente",
  conteudo,
} as const;
