// As perguntas frequentes de partida: o que o painel mostra antes de a equipa escrever as suas. Valem para o site e para o assistente de IA.
import type { Faq } from "@/lib/faq";

const AGORA = "2026-10-01T09:00:00.000Z";
const faq = (id: string, pergunta: string, resposta: string): Faq => ({ id, pergunta, resposta, ativa: true, sugerida: true, criado: AGORA, atualizado: AGORA });

export const FAQ_DE_ORIGEM: Faq[] = [
  faq("faq-1", "Qual é o horário de atendimento?", "Atendemos de segunda a sexta, das 9h às 18h. Fora desse horário, deixe uma mensagem e respondemos no dia útil seguinte."),
  faq("faq-2", "Como posso acompanhar o meu pedido?", "Abra o pedido na lista e veja o estado e o passo seguinte. Sempre que o estado muda, a pessoa responsável recebe um aviso por e-mail."),
  faq("faq-3", "Como falo com a equipa?", "Use o botão «Falar com a equipa» no assistente ou escreva-nos por e-mail. Indique o número do pedido para a resposta ser mais rápida."),
  faq("faq-4", "Quais são as formas de pagamento?", "Aceitamos transferência bancária, referência e cartão. Depois de pagar, envie o comprovativo: validamo-lo em um dia útil."),
  faq("faq-5", "Como crio um novo registo?", "Abra o módulo pretendido no menu, por exemplo Pedidos de transporte, e use o botão «Novo registo» no topo da tabela. Preencha os campos obrigatórios e guarde: o registo aparece logo na lista. Em que módulo quer criar?"),
  faq("faq-6", "O que significa cada estado?", "Passe o rato sobre a etiqueta do estado: a dica explica o que significa e qual é o passo seguinte, e quem o pode executar. Quer que lhe explique o fluxo de um módulo em concreto?"),
  faq("faq-7", "Como mudo o tema, o idioma ou o fuso horário?", "Abra o menu da conta, no canto superior direito do cabeçalho, e escolha Aparência, Idioma ou Fuso horário. Os submenus abrem para o lado onde houver espaço."),
  faq("faq-8", "Como altero os atalhos de teclado?", "Em Definições da conta, na secção Atalhos, carregue em «Alterar» ao lado da ação e prima as teclas que quer usar. Pode repor a combinação de origem a qualquer momento."),
  faq("faq-9", "Como exporto os dados?", "Na análise de dados, a página Exportar descarrega a tabela em CSV, Excel ou um relatório em PDF com gráficos. Já carregou um ficheiro?"),
  faq("faq-10", "Quero falar com a equipa", "Com todo o gosto. Deixe o seu nome e o melhor contacto e a equipa responde-lhe. Qual é o melhor e-mail ou número?"),
];
