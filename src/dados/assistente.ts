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
  // as perguntas prontas (os pills do chat) vêm do painel: Conteúdo > Editor de FAQ (dados/faq.ts traz as de partida)
  perguntas: [],
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
