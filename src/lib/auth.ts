// Autenticação do painel. O contrato é o do ponto de autenticação do servidor (ver «servidor-auth/»); aqui corre a implementação simulada, que serve o painel estático enquanto não há servidor:
// qualquer e-mail e palavra-passe com o formato certo entram. Quando o painel passar a usar o servidor, só este ficheiro muda.
"use client";

import { useSyncExternalStore } from "react";
import { emailDe, FUNCOES } from "@/dados/rbac";
import { assinarDesafio, chaveSeguraDisponivel, idsDasChavesNesteNavegador, impressaoDoNavegador, verificarAssinatura, type ChaveDoNavegador } from "./chave-do-navegador";
import { aleatorios } from "./cripto";
import { aoMudarAsRevogacoes, estaRevogado, MENSAGEM_DE_REVOGACAO } from "./acessos-revogados";
import { tentarCodigo } from "./limite-tentativas";
import { codigoTotp, destinosDoCodigo, gerarCodigoDeUso, VALIDADE_DO_CODIGO_MS, verificarTotp, type DestinoDoCodigo } from "./seguranca-conta";

/** A chave do limite de tentativas do código de dois passos ao entrar (o ecrã lê a mesma para mostrar a espera). */
export const CHAVE_DO_LIMITE_MFA = "mfa-entrada";

export interface Sessao {
  funcaoId: string;
  nome: string;
  email: string;
  desde: string;
}

export interface RespostaAuth {
  ok: boolean;
  erro?: string;
  /** Segundos até se poder tentar outra vez (o limite de tentativas do código fechou a entrada). */
  espera?: number;
  /** A conta tem verificação em dois passos: falta o código. */
  codigo?: boolean;
}

const CHAVE = "painel.sessao";
const PENDENTE = "painel.sessao.pendente";
const REGISTADOS = "painel.registados";
const EVENTO = "painel:sessao";

export const emailValido = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.trim());

/** As regras de palavra-passe do ecrã de registo: 8 caracteres, 1 número, 1 símbolo e nada de espaços nas pontas. */
export function regrasSenha(s: string): { oito: boolean; numero: boolean; simbolo: boolean; espacos: boolean } {
  return { oito: s.length >= 8, numero: /\d/.test(s), simbolo: /[^A-Za-z0-9\s]/.test(s), espacos: s.length > 0 && s === s.trim() };
}
export const senhaValida = (s: string) => Object.values(regrasSenha(s)).every(Boolean);

function lerBruto(): string {
  try {
    const bruto = window.localStorage.getItem(CHAVE) ?? window.sessionStorage.getItem(CHAVE) ?? "";
    // quem teve o acesso revogado não tem sessão, por mais aberta que estivesse: tudo o que depende dela fecha no mesmo instante
    if (bruto && estaRevogado((JSON.parse(bruto) as Sessao).email)) return "";
    return bruto;
  } catch {
    return "";
  }
}
function lerRegistados(): Sessao[] {
  try {
    return JSON.parse(window.localStorage.getItem(REGISTADOS) ?? "[]");
  } catch {
    return [];
  }
}
const avisarMudanca = () => window.dispatchEvent(new Event(EVENTO));

function guardar(s: Sessao, lembrar: boolean) {
  if (estaRevogado(s.email)) return;
  try {
    window.localStorage.removeItem(CHAVE);
    window.sessionStorage.removeItem(CHAVE);
    (lembrar ? window.localStorage : window.sessionStorage).setItem(CHAVE, JSON.stringify(s));
    window.sessionStorage.removeItem(PENDENTE);
  } catch {
    /* sem armazenamento */
  }
  avisarMudanca();
}

/** Quem corresponde a este e-mail: uma das contas de demonstração, um registo feito aqui, ou, na simulação, a conta de administrador. */
function sessaoPara(email: string, nomeRegisto?: string): Sessao {
  const e = email.trim().toLowerCase();
  const demo = FUNCOES.find((f) => emailDe(f) === e);
  const registado = lerRegistados().find((r) => r.email === e);
  const f = demo ?? (registado ? FUNCOES.find((x) => x.id === registado.funcaoId) : undefined) ?? FUNCOES[0];
  return { funcaoId: f.id, nome: registado?.nome ?? nomeRegisto ?? f.pessoa, email: e, desde: new Date().toISOString() };
}

/** O que a conta guardou neste navegador (os dois passos, o modo de entrada, os contactos, as chaves). Em modo ligado é o servidor que sabe isto. */
interface ContaGuardada {
  doisFatores?: boolean;
  segredoTotp?: string;
  modoDeEntrada?: "senha" | "so-codigo";
  chavesNavegador?: ChaveDoNavegador[];
  email?: string;
  emailRecuperacao?: string;
  telefone?: string;
  telefoneVerificado?: boolean;
  recuperacao?: { id: string; tipo: "email" | "telefone"; valor: string; verificado: boolean }[];
  codigosTambemParaRecuperacao?: boolean;
}
const lerContaGuardada = (funcaoId: string): ContaGuardada => {
  try {
    return JSON.parse(window.localStorage.getItem(`painel.conta.${funcaoId}`) ?? "{}") as ContaGuardada;
  } catch {
    return {};
  }
};
const doisFatoresAtivo = (funcaoId: string) => !!lerContaGuardada(funcaoId).doisFatores;

/** O código de seis dígitos da aplicação autenticadora (TOTP, RFC 6238): muda de 30 em 30 segundos. */
export const codigoTemporal = (segredo: string, agora = Date.now()): string => codigoTotp(segredo, agora);
/** O segredo da aplicação autenticadora desta conta: o que a pessoa configurou, ou (contas antigas) um segredo fixo da simulação. */
export const segredoDe = (funcaoId: string) => lerContaGuardada(funcaoId).segredoTotp || `seg-${funcaoId}`;

/** Uma entrada à espera do segundo passo: o código da aplicação («totp») ou um código de uso único enviado («otp»). */
interface Pendente {
  sessao: Sessao;
  lembrar: boolean;
  tipo?: "totp" | "otp";
  codigo?: string;
  expira?: number;
}
const lerPendente = (): Pendente | null => {
  try {
    return JSON.parse(window.sessionStorage.getItem(PENDENTE) ?? "null") as Pendente | null;
  } catch {
    return null;
  }
};

export const auth = {
  /** POST /api/auth/login */
  entrar({ email, senha, lembrar }: { email: string; senha: string; lembrar: boolean }): RespostaAuth {
    if (!emailValido(email)) return { ok: false, erro: "Introduza um e-mail válido." };
    if (!senha) return { ok: false, erro: "Introduza a palavra-passe." };
    const s = sessaoPara(email);
    if (estaRevogado(s.email)) return { ok: false, erro: MENSAGEM_DE_REVOGACAO };
    // as contas que entram só com um código não têm palavra-passe que valha
    if (lerContaGuardada(s.funcaoId).modoDeEntrada === "so-codigo") return { ok: false, erro: "Esta conta entra só com um código de uso único. Use «Entrar com um código»." };
    if (doisFatoresAtivo(s.funcaoId)) {
      try {
        window.sessionStorage.setItem(PENDENTE, JSON.stringify({ sessao: s, lembrar, tipo: "totp" } satisfies Pendente));
      } catch {
        /* sem armazenamento */
      }
      return { ok: true, codigo: true };
    }
    guardar(s, lembrar);
    return { ok: true };
  },
  /** POST /api/auth/otp: manda um código de uso único para o e-mail da conta (e, se a pessoa deixou, para os contactos de recuperação). */
  pedirCodigoDeEntrada(email: string): RespostaAuth & { destinos?: DestinoDoCodigo[] } {
    if (!emailValido(email)) return { ok: false, erro: "Introduza um e-mail válido." };
    const s = sessaoPara(email);
    if (estaRevogado(s.email)) return { ok: false, erro: MENSAGEM_DE_REVOGACAO };
    const c = lerContaGuardada(s.funcaoId);
    const destinos = destinosDoCodigo({ ...c, email: c.email ?? s.email });
    try {
      window.sessionStorage.setItem(PENDENTE, JSON.stringify({ sessao: s, lembrar: true, tipo: "otp", codigo: gerarCodigoDeUso(), expira: Date.now() + VALIDADE_DO_CODIGO_MS } satisfies Pendente));
    } catch {
      return { ok: false, erro: "Não foi possível guardar a entrada neste navegador." };
    }
    return { ok: true, codigo: true, destinos };
  },
  /** POST /api/auth/mfa */
  confirmarCodigo(codigo: string): RespostaAuth {
    try {
      const p = lerPendente();
      if (!p) return { ok: false, erro: "A entrada expirou. Comece outra vez." };
      if (estaRevogado(p.sessao.email)) return { ok: false, erro: MENSAGEM_DE_REVOGACAO };
      if (p.tipo === "otp" && p.expira && p.expira < Date.now()) return { ok: false, erro: "O código expirou. Peça outro." };
      const escrito = codigo.replace(/\s/g, "");
      // cinco códigos errados fecham a entrada por um tempo que cresce de cada vez; durante o fecho, nem o código certo serve
      const certo = p.tipo === "otp" ? escrito === p.codigo : verificarTotp(segredoDe(p.sessao.funcaoId), escrito);
      const r = tentarCodigo(CHAVE_DO_LIMITE_MFA, certo);
      if (!r.ok) return { ok: false, erro: r.erro, espera: r.espera };
      guardar(p.sessao, p.lembrar);
      return { ok: true };
    } catch {
      return { ok: false, erro: "A entrada expirou. Comece outra vez." };
    }
  },
  /** O código certo neste momento para a entrada pendente (só existe na simulação). */
  codigoPendente(): string | null {
    const p = lerPendente();
    if (!p) return null;
    return p.tipo === "otp" ? (p.codigo ?? null) : codigoTemporal(segredoDe(p.sessao.funcaoId));
  },
  /** Que código falta: o da aplicação autenticadora ou um enviado. */
  tipoDaEntradaPendente(): "totp" | "otp" | null {
    const p = lerPendente();
    return p ? (p.tipo ?? "totp") : null;
  },
  /** Para onde foi o código de uso único da entrada pendente (os endereços já escondidos). */
  destinosDaEntradaPendente(): DestinoDoCodigo[] {
    const p = lerPendente();
    if (!p) return [];
    const c = lerContaGuardada(p.sessao.funcaoId);
    return destinosDoCodigo({ ...c, email: c.email ?? p.sessao.email });
  },
  /** Entra com a chave segura deste navegador: assina um desafio aleatório e confere com a parte pública que a conta guardou. */
  async entrarComChaveDoNavegador(email: string, lembrar = true): Promise<RespostaAuth> {
    if (!emailValido(email)) return { ok: false, erro: "Introduza um e-mail válido." };
    if (!chaveSeguraDisponivel()) return { ok: false, erro: "As chaves do navegador só funcionam numa ligação segura (https)." };
    const s = sessaoPara(email);
    if (estaRevogado(s.email)) return { ok: false, erro: MENSAGEM_DE_REVOGACAO };
    const conta = lerContaGuardada(s.funcaoId);
    const aqui = await idsDasChavesNesteNavegador();
    const chave = (conta.chavesNavegador ?? []).find((k) => aqui.includes(k.id));
    if (!chave) return { ok: false, erro: "Este navegador não tem uma chave desta conta." };
    if ((await impressaoDoNavegador()) !== chave.impressao) return { ok: false, erro: "Este navegador mudou desde que a chave foi criada. Entre de outra forma e crie a chave outra vez." };
    const desafio = aleatorios(32);
    try {
      if (!(await verificarAssinatura(chave.publica, desafio, await assinarDesafio(chave.id, desafio)))) return { ok: false, erro: "A assinatura da chave não confere." };
    } catch {
      return { ok: false, erro: "Não foi possível usar a chave deste navegador." };
    }
    try {
      const k = `painel.conta.${s.funcaoId}`;
      const guardada = JSON.parse(window.localStorage.getItem(k) ?? "{}") as ContaGuardada;
      window.localStorage.setItem(k, JSON.stringify({ ...guardada, chavesNavegador: (guardada.chavesNavegador ?? []).map((x) => (x.id === chave.id ? { ...x, ultimoUso: new Date().toISOString() } : x)) }));
    } catch {
      /* sem armazenamento */
    }
    guardar(s, lembrar);
    return { ok: true };
  },
  temEntradaPendente(): boolean {
    try {
      return !!window.sessionStorage.getItem(PENDENTE);
    } catch {
      return false;
    }
  },
  /** POST /api/auth/register */
  registar({ nome, email, senha }: { nome: string; email: string; senha: string }): RespostaAuth {
    if (!emailValido(email)) return { ok: false, erro: "Introduza um e-mail válido." };
    if (!senhaValida(senha)) return { ok: false, erro: "A palavra-passe não cumpre os requisitos." };
    const e = email.trim().toLowerCase();
    const registados = lerRegistados().filter((r) => r.email !== e);
    // Uma conta nova começa com a função de menos acesso, a de cliente.
    const novo: Sessao = { funcaoId: "cliente", nome: nome.trim() || e.split("@")[0], email: e, desde: new Date().toISOString() };
    try {
      window.localStorage.setItem(REGISTADOS, JSON.stringify([...registados, novo]));
    } catch {
      /* sem armazenamento */
    }
    guardar(novo, true);
    return { ok: true };
  },
  /** POST /api/auth/forgot: responde sempre o mesmo, exista a conta ou não. */
  recuperar(email: string): RespostaAuth {
    return emailValido(email) ? { ok: true } : { ok: false, erro: "Introduza um e-mail válido." };
  },
  /** POST /api/auth/reset */
  repor(senha: string): RespostaAuth {
    return senhaValida(senha) ? { ok: true } : { ok: false, erro: "A palavra-passe não cumpre os requisitos." };
  },
  /** POST /api/auth/forgot-email: dá uma pista do e-mail, sem o mostrar inteiro. */
  pistaDeEmail(nome: string): string | null {
    const alvo = nome.trim().toLowerCase();
    const f = FUNCOES.find((x) => x.pessoa.toLowerCase() === alvo);
    if (!f) return null;
    const [a, b] = emailDe(f).split("@");
    return `${a[0]}${"•".repeat(Math.max(2, a.length - 2))}${a.slice(-1)}@${b}`;
  },
  /** POST /api/auth/logout */
  terminar() {
    try {
      window.localStorage.removeItem(CHAVE);
      window.sessionStorage.removeItem(CHAVE);
      window.sessionStorage.removeItem(PENDENTE);
    } catch {
      /* sem armazenamento */
    }
    avisarMudanca();
  },
  /** Passa a sessão para outra conta de demonstração (usado em «Trocar de conta»). */
  trocar(funcaoId: string) {
    const f = FUNCOES.find((x) => x.id === funcaoId);
    if (!f) return;
    guardar({ funcaoId: f.id, nome: f.pessoa, email: emailDe(f), desde: new Date().toISOString() }, true);
  },
};

function subscrever(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  const deixarDeOuvir = aoMudarAsRevogacoes(aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
    deixarDeOuvir();
  };
}

/** A sessão atual. «verificada» só é verdadeira depois de a página ler o armazenamento do navegador. */
export function useSessao(): { sessao: Sessao | null; verificada: boolean } {
  const bruto = useSyncExternalStore(subscrever, lerBruto, () => "?");
  if (bruto === "?") return { sessao: null, verificada: false };
  try {
    return { sessao: bruto ? (JSON.parse(bruto) as Sessao) : null, verificada: true };
  } catch {
    return { sessao: null, verificada: true };
  }
}

/** Rotas abertas, que se mostram sem o painel e sem sessão. */
export const ROTAS_PUBLICAS = ["/entrar", "/registar", "/recuperar-palavra-passe", "/recuperar-email", "/repor-palavra-passe", "/verificar", "/receber", "/privacidade", "/termos", "/cookies"];
export const ehPublica = (caminho: string) => ROTAS_PUBLICAS.some((r) => caminho === r || caminho.startsWith(`${r}/`));
