// Dados fixos das definições da conta: secções, eventos de notificação, fusos horários e âmbitos das chaves de acesso.
import type { Icone } from "@/components/Icones";

export interface SecaoConta {
  id: string;
  rotulo: string;
  icone: Icone;
  /** O que se faz nesta secção; aparece como dica no menu. */
  descricao: string;
}

export const SECOES_CONTA: SecaoConta[] = [
  { id: "perfil", rotulo: "Perfil", icone: "pessoa", descricao: "O seu nome, a fotografia, a assinatura e os formatos de data e hora." },
  { id: "seguranca", rotulo: "Segurança", icone: "escudo", descricao: "Palavra-passe, verificação em dois passos, chaves de acesso e sessões abertas." },
  { id: "contactos", rotulo: "E-mail e telefone", icone: "correio", descricao: "Mudar o e-mail da conta sem perder o histórico, e os contactos de recuperação." },
  { id: "notificacoes", rotulo: "Notificações", icone: "campainha", descricao: "O que recebe, por onde, a que horas e quem decide por si quando está ausente." },
  { id: "lembretes", rotulo: "Lembretes", icone: "lembrete", descricao: "Avisos seus, com data, hora e repetição." },
  { id: "aparencia", rotulo: "Aparência", icone: "paleta", descricao: "Tema claro ou escuro, movimento, dicas e a barra lateral." },
  { id: "atalhos", rotulo: "Atalhos", icone: "teclado", descricao: "As combinações de teclas para abrir a pesquisa, a barra lateral e outras ações." },
  { id: "tokens", rotulo: "Chaves de acesso pessoais", icone: "chave", descricao: "Chaves para ligar outras aplicações à sua conta, com validade e permissões." },
  { id: "dados", rotulo: "Dados e privacidade", icone: "cadeado", descricao: "Descarregar os seus dados, ver a atividade da conta e pedir a eliminação." },
];

export const caminhoConta = (secao: string) => `/conta/${secao}/`;

export interface EventoNotificacao {
  id: string;
  rotulo: string;
  dica: string;
  /** Avisos de segurança chegam sempre por e-mail. */
  obrigatorioEmail?: boolean;
}

export const EVENTOS: EventoNotificacao[] = [
  { id: "atribuido", rotulo: "Um pedido é atribuído a mim", dica: "Quando alguém lhe entrega uma encomenda ou outro pedido para tratar." },
  { id: "estado", rotulo: "Um pedido meu muda de estado", dica: "Por exemplo, de «Em preparação» para «Enviada» ou «Cancelada»." },
  { id: "aprovacao", rotulo: "Tenho uma aprovação pendente", dica: "Devoluções e outros pedidos que esperam pela sua decisão." },
  { id: "documento", rotulo: "Um produto está esgotado", dica: "Quando um produto do catálogo fica sem stock." },
  { id: "mencao", rotulo: "Alguém me menciona", dica: "Quando uma colega ou um colega escreve o seu nome numa nota." },
  { id: "seguranca", rotulo: "Avisos de segurança da conta", dica: "Novos inícios de sessão, mudança de palavra-passe ou de e-mail. Chegam sempre por e-mail.", obrigatorioEmail: true },
  { id: "novidades", rotulo: "Novidades e melhorias do painel", dica: "Mensagens ocasionais sobre funcionalidades novas." },
];

export const FUSOS = [
  { id: "Africa/Luanda", rotulo: "Luanda (GMT+1)" },
  { id: "Europe/Lisbon", rotulo: "Lisboa (GMT+0/+1)" },
  { id: "Africa/Maputo", rotulo: "Maputo (GMT+2)" },
  { id: "UTC", rotulo: "Tempo Universal Coordenado (GMT+0)" },
];

export const FORMATOS_DATA = [
  { id: "curta", rotulo: "28/10/2026" },
  { id: "iso", rotulo: "2026-10-28" },
  { id: "extensa", rotulo: "28 de outubro de 2026" },
];

export const AMBITOS = [
  { id: "ler", rotulo: "Ler", dica: "Consultar pedidos, clientes e documentos." },
  { id: "escrever", rotulo: "Escrever", dica: "Criar e alterar registos em seu nome." },
  { id: "exportar", rotulo: "Exportar", dica: "Descarregar dados em CSV, Excel ou PDF." },
];
