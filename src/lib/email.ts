// Os e-mails do Marketing: as campanhas (uma mensagem para uma audiência, enviada já ou agendada), as caixas de recebidos e de enviados e a fila dos agendados. Funções puras para validar, agendar, enviar, responder, pesquisar e contar; o resto são os ecrãs. Em modo simulado nada sai do navegador (as estatísticas das campanhas enviadas são simuladas, sempre as mesmas para a mesma campanha); em modo ligado o servidor envia de verdade e devolve os números.
import { emailValido } from "./dev";

export type PastaDeEmail = "recebidos" | "enviados" | "agendados";
export type EstadoDeEmail = "Entregue" | "Aberto" | "Falhou" | "Devolvido" | "Agendado";

export interface Email {
  id: string;
  pasta: PastaDeEmail;
  /** Quem enviou: «Nome <endereço>» ou só o endereço. */
  de: string;
  /** Para quem vai, separados por vírgulas. */
  para: string;
  assunto: string;
  corpo: string;
  /** Quando chegou, quando foi enviado ou quando vai ser enviado (ISO). */
  data: string;
  lido: boolean;
  estrela: boolean;
  estado?: EstadoDeEmail;
  /** A campanha de onde saiu, se saiu de uma. */
  campanha?: string;
  /** Porque falhou ou foi devolvido. */
  erro?: string;
}

export type EstadoDeCampanha = "Rascunho" | "Agendada" | "A enviar" | "Enviada" | "Cancelada";

export interface CampanhaDeEmail {
  id: string;
  /** O nome interno, só a equipa o vê. */
  nome: string;
  assunto: string;
  remetente: string;
  /** A lista de destinatários (ver `AUDIENCIAS`). */
  audiencia: string;
  corpo: string;
  estado: EstadoDeCampanha;
  /** Quando sai, se está agendada (ISO). */
  agendadaPara?: string;
  enviadaEm?: string;
  destinatarios: number;
  entregues: number;
  abertos: number;
  cliques: number;
  falhas: number;
  criada: string;
  atualizada: string;
}

/** As listas a que uma campanha se pode dirigir, com o número de pessoas de cada uma. */
export const AUDIENCIAS: Record<string, { rotulo: string; pessoas: number }> = {
  todos: { rotulo: "Todos os clientes", pessoas: 1240 },
  ativos: { rotulo: "Clientes ativos", pessoas: 860 },
  novos: { rotulo: "Novos clientes (30 dias)", pessoas: 140 },
  inativos: { rotulo: "Sem compras há 90 dias", pessoas: 215 },
  newsletter: { rotulo: "Subscritores da newsletter", pessoas: 2310 },
};

export const pessoasDaAudiencia = (id: string) => AUDIENCIAS[id]?.pessoas ?? 0;
export const rotuloDaAudiencia = (id: string) => AUDIENCIAS[id]?.rotulo ?? id;

// ---------- endereços e validação ----------

/** «a@x.pt, Ana <b@x.pt>» → [«a@x.pt», «Ana <b@x.pt>»]. */
export const enderecosDe = (texto: string): string[] => texto.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);

/** O endereço sem o nome: «Ana <b@x.pt>» → «b@x.pt». */
export const soEndereco = (texto: string): string => texto.match(/<([^>]+)>/)?.[1]?.trim() ?? texto.trim();

/** O nome de quem escreveu, ou o endereço se não tiver nome. */
export function nomeDe(texto: string): string {
  const nome = texto.replace(/<[^>]*>/, "").replace(/^["'\s]+|["'\s]+$/g, "");
  return nome || soEndereco(texto);
}

export const MAXIMO_DE_DESTINATARIOS = 50;

export function erroDosDestinatarios(texto: string): string | null {
  const lista = enderecosDe(texto);
  if (lista.length === 0) return "Escreva para quem vai.";
  if (lista.length > MAXIMO_DE_DESTINATARIOS) return `No máximo ${MAXIMO_DE_DESTINATARIOS} destinatários por mensagem: para mais, use uma campanha.`;
  const mau = lista.find((e) => !emailValido(soEndereco(e)));
  return mau ? `${soEndereco(mau)} não é um endereço de e-mail.` : null;
}

export interface RascunhoDeEmail {
  para: string;
  assunto: string;
  corpo: string;
}

export function erroDoEmail(r: RascunhoDeEmail): string | null {
  const para = erroDosDestinatarios(r.para);
  if (para) return para;
  if (!r.assunto.trim()) return "Escreva o assunto.";
  if (!r.corpo.trim()) return "Escreva a mensagem.";
  return null;
}

export function erroDaCampanha(c: Pick<CampanhaDeEmail, "nome" | "assunto" | "remetente" | "audiencia" | "corpo">): string | null {
  if (!c.nome.trim()) return "Dê um nome à campanha.";
  if (!c.assunto.trim()) return "Escreva o assunto.";
  if (!emailValido(soEndereco(c.remetente))) return "Escolha o remetente.";
  if (!AUDIENCIAS[c.audiencia]) return "Escolha a audiência.";
  if (!c.corpo.trim()) return "Escreva a mensagem.";
  return null;
}

// ---------- datas ----------

const p2 = (n: number) => String(n).padStart(2, "0");

/** «AAAA-MM-DDTHH:mm» (hora local, como o seletor de data e hora) → ISO. */
export const localParaIso = (local: string): string => new Date(local).toISOString();

/** ISO → «AAAA-MM-DDTHH:mm» na hora local. */
export function isoParaLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** Amanhã às 09:00, a hora com que o seletor de agendamento abre. */
export function amanhaAsNove(agora: Date): string {
  const d = new Date(agora);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T09:00`;
}

/** Porque não serve uma hora de agendamento («AAAA-MM-DDTHH:mm»): vazia, estragada ou já passada. */
export function erroDoAgendamento(local: string, agora: Date): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || Number.isNaN(new Date(local).getTime())) return "Escolha o dia e a hora.";
  return new Date(local).getTime() <= agora.getTime() ? "Escolha uma hora no futuro." : null;
}

const MESES = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const mesmoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** «Hoje», «Amanhã» ou «sexta, 30 out.». */
export function rotuloDoDia(iso: string, agora: Date): string {
  const d = new Date(iso);
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  if (mesmoDia(d, agora)) return "Hoje";
  if (mesmoDia(d, amanha)) return "Amanhã";
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** A data de uma mensagem na lista: a hora se é de hoje, senão «28 out.» (e o ano, se não é este). */
export function dataNaLista(iso: string, agora: Date): string {
  const d = new Date(iso);
  if (mesmoDia(d, agora)) return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return `${d.getDate()} ${MESES[d.getMonth()]}${d.getFullYear() === agora.getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}

export const horaDe = (iso: string) => `${p2(new Date(iso).getHours())}:${p2(new Date(iso).getMinutes())}`;

/** Quanto falta: «agora», «em 12 min», «em 3 h», «em 2 dias». */
export function quandoFalta(iso: string, agora: Date): string {
  const min = Math.round((new Date(iso).getTime() - agora.getTime()) / 60_000);
  if (min <= 0) return "agora";
  if (min < 60) return `em ${min} min`;
  if (min < 24 * 60) return `em ${Math.round(min / 60)} h`;
  const dias = Math.round(min / (24 * 60));
  return `em ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

// ---------- mensagens ----------

export function emailNovo(id: string, parcial: Partial<Email> = {}, agora = new Date()): Email {
  return { id, pasta: "enviados", de: "", para: "", assunto: "", corpo: "", data: agora.toISOString(), lido: true, estrela: false, ...parcial };
}

/** A mensagem enviada agora: vai para «enviados» e fica entregue (a entrega real é do servidor). */
export const enviarEmail = (e: Email, agora: Date): Email => ({ ...e, pasta: "enviados", data: agora.toISOString(), estado: "Entregue", lido: true, erro: undefined });

/** A mensagem na fila, para sair em `quando` (ISO). */
export const agendarEmail = (e: Email, quando: string): Email => ({ ...e, pasta: "agendados", data: quando, estado: "Agendado", lido: true, erro: undefined });

/** As mensagens agendadas cuja hora já passou, já enviadas (só em modo simulado: em modo ligado a fila é do servidor). */
export const emailsDevidos = (lista: Email[], agora: Date): Email[] => lista.filter((e) => e.pasta === "agendados" && new Date(e.data).getTime() <= agora.getTime()).map((e) => enviarEmail({ ...e, data: e.data }, new Date(e.data)));

const REPETICAO = /^\s*(re|fwd|enc)\s*:\s*/i;
const citar = (e: Email) => `\n\n— ${nomeDe(e.de)} escreveu em ${new Date(e.data).toLocaleString("pt-PT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}:\n${e.corpo.split("\n").map((l) => `> ${l}`).join("\n")}`;

/** A resposta a uma mensagem: para quem a enviou, «Re: assunto» e o texto original citado. */
export function responderA(e: Email): RascunhoDeEmail {
  return { para: soEndereco(e.pasta === "recebidos" ? e.de : e.para), assunto: `Re: ${e.assunto.replace(REPETICAO, "")}`, corpo: citar(e) };
}

/** Encaminhar: sem destinatário, «Fwd: assunto» e o texto original citado. */
export function encaminhar(e: Email): RascunhoDeEmail {
  return { para: "", assunto: `Fwd: ${e.assunto.replace(REPETICAO, "")}`, corpo: citar(e) };
}

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** As mensagens que têm o texto no assunto, em quem escreveu, em quem recebeu ou na mensagem; mais recentes primeiro. */
export function pesquisarEmails(lista: Email[], texto: string): Email[] {
  const q = sem(texto.trim());
  return [...lista].filter((e) => !q || sem(`${e.assunto} ${e.de} ${e.para} ${e.corpo}`).includes(q)).sort((a, b) => b.data.localeCompare(a.data));
}

// ---------- campanhas ----------

const taxa = (a: number, b: number) => (b > 0 ? a / b : 0);
export const taxaDeAbertura = (c: Pick<CampanhaDeEmail, "abertos" | "entregues">) => taxa(c.abertos, c.entregues);
export const taxaDeCliques = (c: Pick<CampanhaDeEmail, "cliques" | "entregues">) => taxa(c.cliques, c.entregues);
export const taxaDeFalhas = (c: Pick<CampanhaDeEmail, "falhas" | "destinatarios">) => taxa(c.falhas, c.destinatarios);

/** Um número entre 0 e 1 que só depende do texto e do `n` (o mesmo para a mesma campanha, sempre). */
function pseudo(texto: string, n: number): number {
  let h = 2166136261 ^ n;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Os números de uma campanha enviada em modo simulado: entregues, abertos, cliques e falhas, sempre os mesmos para o mesmo `id`. */
export function estatisticasSimuladas(id: string, destinatarios: number): Pick<CampanhaDeEmail, "destinatarios" | "entregues" | "abertos" | "cliques" | "falhas"> {
  const entregues = Math.round(destinatarios * (0.965 + pseudo(id, 1) * 0.03));
  const abertos = Math.round(entregues * (0.3 + pseudo(id, 2) * 0.22));
  const cliques = Math.round(abertos * (0.1 + pseudo(id, 3) * 0.2));
  return { destinatarios, entregues, abertos, cliques, falhas: destinatarios - entregues };
}

/** A campanha enviada em `quando` (ISO), com os números simulados. */
export const enviarCampanha = (c: CampanhaDeEmail, quando: Date): CampanhaDeEmail => ({
  ...c,
  ...estatisticasSimuladas(c.id, pessoasDaAudiencia(c.audiencia)),
  estado: "Enviada",
  enviadaEm: quando.toISOString(),
  agendadaPara: undefined,
  atualizada: quando.toISOString(),
});

export const agendarCampanha = (c: CampanhaDeEmail, quando: string, agora: Date): CampanhaDeEmail => ({ ...c, estado: "Agendada", agendadaPara: quando, atualizada: agora.toISOString() });

export const cancelarCampanha = (c: CampanhaDeEmail, agora: Date): CampanhaDeEmail => ({ ...c, estado: "Cancelada", agendadaPara: undefined, atualizada: agora.toISOString() });

/** Volta a rascunho, sem a data de envio. */
export const voltarARascunho = (c: CampanhaDeEmail, agora: Date): CampanhaDeEmail => ({ ...c, estado: "Rascunho", agendadaPara: undefined, atualizada: agora.toISOString() });

/** As campanhas agendadas cuja hora já passou, já enviadas à hora marcada (só em modo simulado). */
export const campanhasDevidas = (lista: CampanhaDeEmail[], agora: Date): CampanhaDeEmail[] => lista.filter((c) => c.estado === "Agendada" && c.agendadaPara && new Date(c.agendadaPara).getTime() <= agora.getTime()).map((c) => enviarCampanha(c, new Date(c.agendadaPara!)));

/** Uma cópia como rascunho. */
export const duplicarCampanha = (c: CampanhaDeEmail, id: string, agora: Date): CampanhaDeEmail => ({
  ...c,
  id,
  nome: `${c.nome} (cópia)`,
  estado: "Rascunho",
  agendadaPara: undefined,
  enviadaEm: undefined,
  destinatarios: 0,
  entregues: 0,
  abertos: 0,
  cliques: 0,
  falhas: 0,
  criada: agora.toISOString(),
  atualizada: agora.toISOString(),
});

export function campanhaNova(id: string, agora = new Date(), remetente = ""): CampanhaDeEmail {
  const iso = agora.toISOString();
  return { id, nome: "", assunto: "", remetente, audiencia: "ativos", corpo: "", estado: "Rascunho", destinatarios: 0, entregues: 0, abertos: 0, cliques: 0, falhas: 0, criada: iso, atualizada: iso };
}

export interface TotaisDeCampanhas {
  enviadas: number;
  destinatarios: number;
  aberturas: number;
  cliques: number;
  falhas: number;
}

/** Os totais das campanhas enviadas; as taxas pesam cada campanha pelo seu tamanho. */
export function totaisDeCampanhas(lista: CampanhaDeEmail[]): TotaisDeCampanhas {
  const env = lista.filter((c) => c.estado === "Enviada");
  const soma = (f: (c: CampanhaDeEmail) => number) => env.reduce((s, c) => s + f(c), 0);
  const entregues = soma((c) => c.entregues);
  const destinatarios = soma((c) => c.destinatarios);
  return { enviadas: env.length, destinatarios, aberturas: taxa(soma((c) => c.abertos), entregues), cliques: taxa(soma((c) => c.cliques), entregues), falhas: taxa(soma((c) => c.falhas), destinatarios) };
}

/** Um número por campanha enviada, da mais antiga à mais recente: a série dos cartões. */
export function serieDeCampanhas(lista: CampanhaDeEmail[], f: (c: CampanhaDeEmail) => number): number[] {
  return lista
    .filter((c) => c.estado === "Enviada" && c.enviadaEm)
    .sort((a, b) => a.enviadaEm!.localeCompare(b.enviadaEm!))
    .map(f);
}

/** Quantos itens há em cada um dos próximos `dias` dias (a começar no dia de `inicio`), com um peso por item (1 por omissão). */
export function contagemPorDia<T>(itens: T[], quando: (i: T) => string, inicio: Date, dias: number, peso: (i: T) => number = () => 1): number[] {
  const base = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
  const out = new Array<number>(dias).fill(0);
  for (const i of itens) {
    const d = new Date(quando(i));
    const n = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - base) / 86_400_000);
    if (n >= 0 && n < dias) out[n] += peso(i);
  }
  return out;
}
