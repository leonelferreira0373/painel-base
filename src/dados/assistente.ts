// O assistente de IA do painel (módulo ai-chat, github.com/ferreirakorp/ai-chat): o conteúdo do projeto (nome, perguntas e respostas prontas; sem convites, porque o painel é para a equipa) e onde fica o servidor da IA.
import { exemploDeConteudo } from "ai-chat";
import type { ConteudoDoAssistente } from "ai-chat/nucleo/conteudo";

const conteudo: ConteudoDoAssistente = {
  ...exemploDeConteudo,
  nome: "Assistente do painel",
  papel: "Assistente virtual com inteligência artificial",
  estado: "Responde em segundos",
  abrir: "Perguntar à IA",
  avatar: { chave: "", alt: "Assistente do painel" },
  // o painel é para a equipa: sem convites a chamar a atenção, sem bolinha e sem botão de «falar com a equipa» (isso é conversa de loja, não de administração)
  chamada: { rotulo: "", href: "" },
  aviso: "Assistente com inteligência artificial: pode errar. Só guardamos a conversa se autorizar, e pode parar e apagar quando quiser.",
  convites: [],
  abertura: ["Em que posso ajudar? Escolha uma pergunta ou escreva a sua."],
  // as perguntas prontas (os pills do chat) vêm do painel: Conteúdo > Editor de FAQ (dados/faq.ts traz as de partida)
  perguntas: [],
  instrucoes:
    "És o assistente do painel de administração da empresa e falas com uma pessoa da equipa (não com um cliente): ajuda-a a encontrar páginas, a ler os dados, a perceber estados e a fazer tarefas no painel. Responde em português, de forma curta, clara e direta, sem vender nem convencer, e não inventes dados: se não souberes, diz que não sabes.",
};

export const ASSISTENTE = {
  /** Onde o módulo fala com a IA (no mesmo domínio). Sem servidor ali, o assistente responde com as perguntas e respostas prontas acima. */
  endpoint: "/api/assistente",
  /** A chave com que a conversa fica guardada neste navegador. */
  chaveDeSessao: "painel.assistente",
  conteudo,
} as const;
