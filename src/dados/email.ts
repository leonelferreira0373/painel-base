// Os e-mails de demonstração do Marketing: a caixa de recebidos, a de enviados, a fila dos agendados e as campanhas. As datas são relativas a «agora» para os agendados estarem sempre no futuro e os recebidos serem sempre de hoje e dos dias anteriores; o resto é fictício.
import { PROJETO } from "./projeto";
import { agendarCampanha, campanhaNova, enviarCampanha, type CampanhaDeEmail, type Email } from "@/lib/email";

const DOMINIO = (() => {
  try {
    return new URL(PROJETO.urlSite).hostname.replace(/^www\./, "");
  } catch {
    return "painel.exemplo.com";
  }
})();

/** Os endereços de que a equipa pode enviar (o valor é o que vai no «De»). */
export const REMETENTES: Record<string, string> = {
  [`Equipa <geral@${DOMINIO}>`]: `Equipa (geral@${DOMINIO})`,
  [`Novidades <novidades@${DOMINIO}>`]: `Novidades (novidades@${DOMINIO})`,
  [`Apoio ao cliente <apoio@${DOMINIO}>`]: `Apoio ao cliente (apoio@${DOMINIO})`,
};
export const REMETENTE_DE_ORIGEM = Object.keys(REMETENTES)[0];

const antes = (agora: Date, horas: number) => new Date(agora.getTime() - horas * 3_600_000).toISOString();
const depois = (agora: Date, horas: number) => new Date(agora.getTime() + horas * 3_600_000).toISOString();
/** O dia seguinte (ou o `dias` seguinte) às `h` horas. */
const diaAs = (agora: Date, dias: number, h: number) => {
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + dias, h, 0, 0, 0);
  return d.toISOString();
};

const recebido = (id: string, de: string, assunto: string, corpo: string, data: string, lido = true, estrela = false): Email => ({ id, pasta: "recebidos", de, para: REMETENTE_DE_ORIGEM, assunto, corpo, data, lido, estrela });
const enviado = (id: string, para: string, assunto: string, corpo: string, data: string, estado: Email["estado"] = "Entregue", extra: Partial<Email> = {}): Email => ({ id, pasta: "enviados", de: REMETENTE_DE_ORIGEM, para, assunto, corpo, data, lido: true, estrela: false, estado, ...extra });

export function gerarEmails(agora: Date = new Date()): Email[] {
  return [
    recebido("em-r1", "Marta Pinto <marta.pinto@atlascomercio.pt>", "Prazo de entrega da encomenda EN-02614", "Bom dia,\n\nFizemos a encomenda EN-02614 há uma semana e ainda não recebemos nenhuma informação sobre o envio. Conseguem dizer-nos quando chega?\n\nObrigada,\nMarta Pinto", antes(agora, 0.5), false),
    recebido("em-r2", "Rui Matos <rui.matos@boreal.pt>", "Pedido de orçamento: 200 cadeiras ergonómicas", "Olá,\n\nPrecisamos de 200 cadeiras ergonómicas para a nova sede, com entrega em Luanda até ao fim do mês. Podem enviar um orçamento com os prazos e as condições de pagamento?\n\nCumprimentos,\nRui Matos\nBoreal Retalho", antes(agora, 2), false, true),
    recebido("em-r3", "Faturação Delta <faturacao@delta-servicos.pt>", "Fatura FT 2026/418", "Boa tarde,\n\nSegue a fatura FT 2026/418, com vencimento a 30 dias. Se precisarem de uma segunda via, é só pedir.\n\nFaturação\nDelta Serviços", antes(agora, 5)),
    recebido("em-r4", "Mailer-Daemon <mailer-daemon@" + DOMINIO + ">", "Falha na entrega: ana.costa@dominio-inexistente.pt", "Não foi possível entregar a sua mensagem a ana.costa@dominio-inexistente.pt.\n\nMotivo: o domínio não existe.\n\nRemova este endereço da lista para não voltar a falhar.", antes(agora, 9), false),
    recebido("em-r5", "Inês Carvalho <ines.carvalho@cerne.pt>", "Cancelar a subscrição da newsletter", "Boa tarde,\n\nGostava de deixar de receber a newsletter. Podem retirar o meu endereço da lista?\n\nObrigada,\nInês", antes(agora, 26)),
    recebido("em-r6", "Luís Teixeira <luis.teixeira@estreladosul.pt>", "Proposta de parceria", "Olá,\n\nSomos a Estrela do Sul e gostávamos de falar sobre uma parceria na distribuição. Têm disponibilidade para uma conversa de 20 minutos esta semana?\n\nLuís Teixeira", antes(agora, 30), true, true),
    recebido("em-r7", "Paulo Mendes <paulo.mendes@fenix.pt>", "Re: Comprovativo de pagamento", "Boa tarde,\n\nO pagamento da encomenda EN-02598 foi feito hoje por transferência. O comprovativo segue em anexo.\n\nPaulo Mendes", antes(agora, 52)),
    recebido("em-r8", "Sara Lopes <sara.lopes@atlascomercio.pt>", "Dúvida sobre a devolução DV-0412", "Olá,\n\nA devolução DV-0412 já foi aprovada, mas ainda não recebemos o reembolso. Quanto tempo demora?\n\nSara Lopes", antes(agora, 74)),
    recebido("em-r9", "Tomás Ribeiro <tomas.ribeiro@boreal.pt>", "Obrigado pelo atendimento", "Só para agradecer a ajuda de ontem com a encomenda. Correu tudo bem e chegou antes do previsto.\n\nTomás", antes(agora, 98)),
    recebido("em-r10", "Vera Almeida <vera.almeida@cerne.pt>", "Pedido de catálogo atualizado", "Boa tarde,\n\nPodem enviar-nos o catálogo atualizado com os preços de outubro?\n\nVera Almeida", antes(agora, 122)),

    enviado("em-e1", "marta.pinto@atlascomercio.pt", "Re: Prazo de entrega da encomenda EN-02598", "Bom dia, Marta,\n\nA encomenda saiu do armazém ontem e chega até quinta-feira. Enviamos o número de seguimento por e-mail.\n\nEquipa", antes(agora, 3), "Aberto"),
    enviado("em-e2", "rui.matos@boreal.pt", "Re: Orçamento", "Olá, Rui,\n\nSegue o orçamento para as cadeiras: o prazo de entrega é de 15 dias e o pagamento é 50 % na encomenda e 50 % na entrega.\n\nCumprimentos,\nEquipa", antes(agora, 7), "Entregue"),
    enviado("em-e3", "paulo.mendes@fenix.pt", "Confirmação de pagamento", "Boa tarde, Paulo,\n\nRecebemos o comprovativo e o pagamento da encomenda EN-02598 está confirmado. Obrigado!\n\nEquipa", antes(agora, 30), "Aberto"),
    enviado("em-e4", "ana.costa@dominio-inexistente.pt", "A sua encomenda foi enviada", "Olá,\n\nA sua encomenda saiu do armazém e chega nos próximos dias.\n\nEquipa", antes(agora, 9.2), "Falhou", { erro: "O domínio do destinatário não existe." }),
    enviado("em-e5", "sara.lopes@atlascomercio.pt", "Re: Dúvida sobre a devolução DV-0412", "Olá, Sara,\n\nO reembolso é feito até 5 dias úteis depois de aprovada a devolução, para a conta original do pagamento.\n\nEquipa", antes(agora, 70), "Entregue"),
    enviado("em-e6", "vera.almeida@cerne.pt", "Catálogo de outubro", "Boa tarde, Vera,\n\nSegue o catálogo de outubro, com os preços atualizados.\n\nEquipa", antes(agora, 120), "Aberto"),
    enviado("em-e7", "geral@caixa-cheia.pt", "Confirmação de reserva", "Olá,\n\nConfirmamos a sua reserva para o dia 3 de novembro.\n\nEquipa", antes(agora, 150), "Devolvido", { erro: "A caixa do destinatário está cheia." }),

    { ...enviado("em-a1", "marta.pinto@atlascomercio.pt", "Número de seguimento da encomenda EN-02614", "Bom dia, Marta,\n\nA sua encomenda EN-02614 já tem número de seguimento. Pode acompanhá-la na página da transportadora.\n\nEquipa", depois(agora, 2.5), "Agendado"), pasta: "agendados" },
    { ...enviado("em-a2", "rui.matos@boreal.pt, vera.almeida@cerne.pt", "Lembrete: o orçamento termina sexta-feira", "Olá,\n\nUm lembrete de que o orçamento enviado esta semana é válido até sexta-feira.\n\nEquipa", diaAs(agora, 1, 9), "Agendado"), pasta: "agendados" },
    { ...enviado("em-a3", "luis.teixeira@estreladosul.pt", "Re: Proposta de parceria", "Olá, Luís,\n\nTemos todo o gosto em conversar. Podemos falar na terça-feira às 15:00?\n\nEquipa", diaAs(agora, 3, 10), "Agendado"), pasta: "agendados" },
  ];
}

export function gerarCampanhas(agora: Date = new Date()): CampanhaDeEmail[] {
  const base = (id: string, nome: string, assunto: string, audiencia: string, corpo: string, remetente = REMETENTE_DE_ORIGEM): CampanhaDeEmail => ({ ...campanhaNova(id, new Date(agora.getTime() - 45 * 86_400_000), remetente), nome, assunto, audiencia, corpo });
  const dias = (n: number, h = 9) => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - n, h, 0, 0, 0);
  return [
    enviarCampanha(base("ca-1", "Lançamento do novo catálogo", "O novo catálogo já está disponível", "todos", "Olá,\n\nO catálogo de outono já está disponível, com mais de 40 produtos novos e preços atualizados.\n\nVeja tudo no nosso site.\n\nEquipa"), dias(40)),
    enviarCampanha(base("ca-2", "Boas-vindas a novos clientes", "Bem-vindo! Estamos aqui para ajudar", "novos", "Olá,\n\nObrigado por escolher a nossa empresa. Se precisar de ajuda com a primeira encomenda, responda a este e-mail.\n\nEquipa", `Apoio ao cliente <apoio@${DOMINIO}>`), dias(20)),
    enviarCampanha(base("ca-3", "Newsletter de outubro", "As novidades de outubro", "newsletter", "Olá,\n\nEste mês: novas formas de pagamento, prazos de entrega mais curtos e um guia para acompanhar as encomendas.\n\nBoa leitura,\nEquipa", `Novidades <novidades@${DOMINIO}>`), dias(12)),
    agendarCampanha(base("ca-4", "Promoção de fim de ano", "Até 20 % de desconto em dezembro", "ativos", "Olá,\n\nPara agradecer a sua confiança, dezembro tem até 20 % de desconto em todo o catálogo.\n\nAproveite até dia 31.\n\nEquipa"), diaAs(agora, 2, 9), agora),
    base("ca-5", "Recuperar clientes inativos", "Sentimos a sua falta", "inativos", "Olá,\n\nJá passou algum tempo desde a sua última encomenda. Temos novidades que podem interessar-lhe.\n\nEquipa"),
    { ...base("ca-6", "Aviso de manutenção", "Manutenção programada no sábado", "todos", "Olá,\n\nNo sábado o site estará em manutenção entre as 02:00 e as 04:00.\n\nEquipa"), estado: "Cancelada" },
  ];
}
