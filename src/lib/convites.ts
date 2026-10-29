// Os convites para entrar no painel: quem convidou quem, com que função, e o que aconteceu (ainda pendente, aceite, recusado, expirado ou cancelado). Funções puras; o ecrã guarda a lista, escreve o e-mail do convite e regista cada passo na atividade. Em modo simulado a resposta da pessoa convidada simula-se com um botão; em modo ligado é a própria pessoa que responde, pela ligação do e-mail, e o servidor muda o estado.
import { emailValido } from "./dev";
import type { MatrizDePermissoes } from "./permissoes";

export type EstadoDoConvite = "Pendente" | "Aceite" | "Recusado" | "Expirado" | "Cancelado" | "Revogado";

export interface Convite {
  id: string;
  email: string;
  /** O identificador da função que a pessoa recebe ao aceitar. */
  funcao: string;
  convidadoPor: string;
  enviadoEm: string;
  expiraEm: string;
  estado: EstadoDoConvite;
  respondidoEm?: string;
  mensagem?: string;
  /** Quando o acesso é personalizado: o que a pessoa pode ver e editar, interruptor a interruptor (a `funcao` é então o identificador da função que se cria ao aceitar). */
  permissoes?: MatrizDePermissoes;
  /** O nome do cargo que se deu a um acesso personalizado («Gestor de frota»). */
  cargo?: string;
  /** Quando o acesso foi revogado (ISO). */
  revogadoEm?: string;
}

export const VALIDADE_DO_CONVITE_DIAS = 7;
const DIA = 86_400_000;

export function erroDoConvite(email: string, funcao: string, existentes: Convite[]): string | null {
  const e = email.trim().toLowerCase();
  if (!emailValido(e)) return "Escreva um e-mail válido.";
  if (!funcao) return "Escolha a função da pessoa.";
  if (existentes.some((c) => c.email.toLowerCase() === e && c.estado === "Pendente")) return "Esta pessoa já tem um convite por responder.";
  return null;
}

export function conviteNovo(id: string, p: { email: string; funcao: string; convidadoPor: string; mensagem?: string; permissoes?: MatrizDePermissoes; cargo?: string }, agora: Date): Convite {
  return { id, email: p.email.trim().toLowerCase(), funcao: p.funcao, convidadoPor: p.convidadoPor, enviadoEm: agora.toISOString(), expiraEm: new Date(agora.getTime() + VALIDADE_DO_CONVITE_DIAS * DIA).toISOString(), estado: "Pendente", ...(p.mensagem?.trim() ? { mensagem: p.mensagem.trim() } : {}), ...(p.permissoes ? { permissoes: p.permissoes } : {}), ...(p.cargo?.trim() ? { cargo: p.cargo.trim() } : {}) };
}

/** Os convites por responder cujo prazo já passou ficam expirados. */
export const expirarConvites = (lista: Convite[], agora: Date): Convite[] => lista.map((c) => (c.estado === "Pendente" && new Date(c.expiraEm).getTime() <= agora.getTime() ? { ...c, estado: "Expirado" as const } : c));

export const responderAoConvite = (c: Convite, aceite: boolean, agora: Date): Convite => (c.estado === "Pendente" ? { ...c, estado: aceite ? "Aceite" : "Recusado", respondidoEm: agora.toISOString() } : c);

/** Revoga o acesso de quem aceitou: o convite fica «Revogado» e a pessoa perde o acesso já (ver acessos-revogados.ts). */
export const revogarConvite = (c: Convite, agora: Date): Convite => (c.estado === "Aceite" ? { ...c, estado: "Revogado", revogadoEm: agora.toISOString() } : c);

export const cancelarConvite = (c: Convite, agora: Date): Convite => (c.estado === "Pendente" ? { ...c, estado: "Cancelado", respondidoEm: agora.toISOString() } : c);

/** Um convite novo com o prazo a contar de agora (para o que expirou, foi recusado ou cancelado). */
export const reenviarConvite = (c: Convite, agora: Date): Convite => ({ ...c, enviadoEm: agora.toISOString(), expiraEm: new Date(agora.getTime() + VALIDADE_DO_CONVITE_DIAS * DIA).toISOString(), estado: "Pendente", respondidoEm: undefined });

export function totaisDeConvites(lista: Convite[]): Record<EstadoDoConvite, number> {
  const t: Record<EstadoDoConvite, number> = { Pendente: 0, Aceite: 0, Recusado: 0, Expirado: 0, Cancelado: 0, Revogado: 0 };
  for (const c of lista) t[c.estado] += 1;
  return t;
}

/** A mensagem do convite, para o e-mail. */
export function corpoDoConvite(c: Convite, funcaoRotulo: string, painel: string): string {
  return `Olá,\n\n${c.convidadoPor} convidou-o para o painel «${painel}» com a função ${funcaoRotulo}.${c.mensagem ? `\n\n${c.mensagem}` : ""}\n\nO convite é válido até ${new Date(c.expiraEm).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}.`;
}
