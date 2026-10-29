// Autenticação do painel. O contrato é o do ponto de autenticação do servidor (ver «servidor-auth/»); aqui corre a implementação simulada, que serve o painel estático enquanto não há servidor:
// qualquer e-mail e palavra-passe com o formato certo entram. Quando o painel passar a usar o servidor, só este ficheiro muda.
"use client";

import { useSyncExternalStore } from "react";
import { emailDe, FUNCOES } from "@/dados/rbac";
import { tentarCodigo } from "./limite-tentativas";

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
    return window.localStorage.getItem(CHAVE) ?? window.sessionStorage.getItem(CHAVE) ?? "";
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

const doisFatoresAtivo = (funcaoId: string) => {
  try {
    return !!JSON.parse(window.localStorage.getItem(`painel.conta.${funcaoId}`) ?? "{}").doisFatores;
  } catch {
    return false;
  }
};

/** Código de seis dígitos que muda de 30 em 30 segundos, como o de uma aplicação autenticadora (na simulação, calculado aqui). */
export function codigoTemporal(segredo: string, agora = Date.now()): string {
  let h = 2166136261;
  const t = `${segredo}:${Math.floor(agora / 30_000)}`;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return String((h >>> 0) % 1_000_000).padStart(6, "0");
}
export const segredoDe = (funcaoId: string) => `seg-${funcaoId}`;

export const auth = {
  /** POST /api/auth/login */
  entrar({ email, senha, lembrar }: { email: string; senha: string; lembrar: boolean }): RespostaAuth {
    if (!emailValido(email)) return { ok: false, erro: "Introduza um e-mail válido." };
    if (!senha) return { ok: false, erro: "Introduza a palavra-passe." };
    const s = sessaoPara(email);
    if (doisFatoresAtivo(s.funcaoId)) {
      try {
        window.sessionStorage.setItem(PENDENTE, JSON.stringify({ sessao: s, lembrar }));
      } catch {
        /* sem armazenamento */
      }
      return { ok: true, codigo: true };
    }
    guardar(s, lembrar);
    return { ok: true };
  },
  /** POST /api/auth/mfa */
  confirmarCodigo(codigo: string): RespostaAuth {
    try {
      const p = JSON.parse(window.sessionStorage.getItem(PENDENTE) ?? "null") as { sessao: Sessao; lembrar: boolean } | null;
      if (!p) return { ok: false, erro: "A entrada expirou. Comece outra vez." };
      // cinco códigos errados fecham a entrada por um tempo que cresce de cada vez; durante o fecho, nem o código certo serve
      const r = tentarCodigo(CHAVE_DO_LIMITE_MFA, codigo.replace(/\s/g, "") === codigoTemporal(segredoDe(p.sessao.funcaoId)));
      if (!r.ok) return { ok: false, erro: r.erro, espera: r.espera };
      guardar(p.sessao, p.lembrar);
      return { ok: true };
    } catch {
      return { ok: false, erro: "A entrada expirou. Comece outra vez." };
    }
  },
  /** O código certo neste momento para a entrada pendente (só existe na simulação). */
  codigoPendente(): string | null {
    try {
      const p = JSON.parse(window.sessionStorage.getItem(PENDENTE) ?? "null") as { sessao: Sessao } | null;
      return p ? codigoTemporal(segredoDe(p.sessao.funcaoId)) : null;
    } catch {
      return null;
    }
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
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
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
