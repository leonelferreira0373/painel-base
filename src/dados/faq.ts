// As perguntas frequentes de partida: o que o painel mostra antes de a equipa escrever as suas. Valem para o site e para o assistente de IA.
import type { Faq } from "@/lib/faq";

const AGORA = "2026-10-01T09:00:00.000Z";
const faq = (id: string, pergunta: string, resposta: string): Faq => ({ id, pergunta, resposta, ativa: true, criado: AGORA, atualizado: AGORA });

export const FAQ_DE_ORIGEM: Faq[] = [
  faq("faq-1", "Qual é o horário de atendimento?", "Atendemos de segunda a sexta, das 9h às 18h. Fora desse horário, deixe uma mensagem e respondemos no dia útil seguinte."),
  faq("faq-2", "Como posso acompanhar o meu pedido?", "Abra o pedido na lista e veja o estado e o passo seguinte. Sempre que o estado muda, a pessoa responsável recebe um aviso por e-mail."),
  faq("faq-3", "Como falo com a equipa?", "Use o botão «Falar com a equipa» no assistente ou escreva-nos por e-mail. Indique o número do pedido para a resposta ser mais rápida."),
  faq("faq-4", "Quais são as formas de pagamento?", "Aceitamos transferência bancária, referência e cartão. Depois de pagar, envie o comprovativo: validamo-lo em um dia útil."),
];
