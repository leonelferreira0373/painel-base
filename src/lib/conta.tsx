// A conta da pessoa que está no painel: dados pessoais, segurança, notificações, lembretes e preferências. Tudo fica guardado neste navegador, por conta, e nada disto sai daqui.
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Aparencia } from "@/dados/aparencia";
import { EVENTOS } from "@/dados/conta";
import { emailDe, FUNCOES, funcaoPorId, type Funcao } from "@/dados/rbac";
import { auth } from "@/lib/auth";
import { useApp } from "@/lib/estado";
import { toasts } from "@/lib/toasts";

/** «cada-N» é uma repetição personalizada, de N em N dias. */
export type Repeticao = "nao" | "diario" | "semanal" | "mensal" | `cada-${number}`;

export interface Sessao {
  id: string;
  dispositivo: string;
  local: string;
  ultimoAcesso: string;
  atual?: boolean;
}
export interface Lembrete {
  id: string;
  titulo: string;
  /** Data e hora locais, «AAAA-MM-DDTHH:mm». */
  quando: string;
  repetir: Repeticao;
  canal: "painel" | "email";
  ativo: boolean;
  disparado?: boolean;
}
export interface ChaveAcessoPessoal {
  id: string;
  nome: string;
  prefixo: string;
  fim: string;
  criada: string;
  expira: string | null;
  ambitos: string[];
  ultimoUso: string | null;
}
export interface EventoConta {
  id: string;
  quando: string;
  texto: string;
}
export interface Canais {
  email: boolean;
  painel: boolean;
  telefone: boolean;
}

export interface Conta {
  nome: string;
  foto?: string;
  assinatura: string;
  fuso: string;
  /** As cores e as letras que o utilizador escolheu (Definições da conta → Aparência). */
  aparencia?: Aparencia;
  /** A ordem dos cartões que o utilizador arrastou, por ecrã. */
  ordens?: Record<string, string[]>;
  /** Idioma da interface («pt-PT»). */
  idioma?: string;
  /** Atalhos de teclado que o utilizador mudou: identificador → combinação («Ctrl+K»). */
  atalhos?: Record<string, string>;
  formatoData: string;
  semana: "segunda" | "domingo";

  email: string;
  emailPendente?: string;
  emailVerificado: boolean;
  emailRecuperacao: string;
  telefone: string;
  telefoneVerificado: boolean;

  senhaAlteradaEm: string;
  doisFatores: boolean;
  codigosRecuperacao: number;
  chavesAcesso: { id: string; nome: string; criada: string }[];
  alertaInicio: boolean;
  /** «nunca» ou os minutos de inatividade (as opções fixas ou um valor personalizado). */
  tempoLimite: string;
  senhaParaSensiveis: boolean;
  sessoes: Sessao[];

  receberEmails: boolean;
  /** «nunca», «diario», «semanal» ou «cada-N» (de N em N dias). */
  resumo: string;
  horaResumo: string;
  notif: Record<string, Canais>;
  silencio: { ativo: boolean; de: string; ate: string };
  ausencia: { ativa: boolean; ate: string; delegar: string; mensagem: string };

  lembretes: Lembrete[];

  dicas: boolean;
  movimentoReduzido: boolean;
  barraAberta: boolean;

  tokens: ChaveAcessoPessoal[];
  atividade: EventoConta[];
  eliminacao?: string;
}

const CHAVE = (id: string) => `painel.conta.${id}`;
const mais = (ms: number) => new Date(Date.now() + ms).toISOString();
export const identificador = () => Math.random().toString(36).slice(2, 10);

export function contaInicial(f: Funcao): Conta {
  const outra = FUNCOES.find((x) => x.id !== f.id)!;
  return {
    nome: f.pessoa,
    assinatura: `${f.pessoa}\n${f.rotulo}`,
    fuso: "Europe/Lisbon",
    formatoData: "curta",
    semana: "segunda",
    email: emailDe(f),
    emailVerificado: true,
    emailRecuperacao: "",
    telefone: "+244 923 000 000",
    telefoneVerificado: true,
    senhaAlteradaEm: mais(-86_400_000 * 47),
    doisFatores: false,
    codigosRecuperacao: 0,
    chavesAcesso: [],
    alertaInicio: true,
    tempoLimite: "60",
    senhaParaSensiveis: true,
    sessoes: [
      { id: "atual", dispositivo: "Este navegador", local: "Lisboa, Portugal", ultimoAcesso: mais(0), atual: true },
      { id: "s2", dispositivo: "Telemóvel Android · Chrome", local: "Lisboa, Portugal", ultimoAcesso: mais(-3_600_000 * 2) },
      { id: "s3", dispositivo: "Portátil Windows · Edge", local: "Porto, Portugal", ultimoAcesso: mais(-86_400_000 * 3) },
    ],
    receberEmails: true,
    resumo: "diario",
    horaResumo: "08:00",
    notif: Object.fromEntries(EVENTOS.map((e) => [e.id, { email: e.id !== "novidades" && e.id !== "mencao", painel: true, telefone: e.id === "seguranca" || e.id === "aprovacao" }])),
    silencio: { ativo: false, de: "22:00", ate: "07:00" },
    ausencia: { ativa: false, ate: "", delegar: outra.id, mensagem: "Estou ausente. Responderei quando regressar." },
    lembretes: [],
    dicas: true,
    movimentoReduzido: false,
    barraAberta: false,
    tokens: [],
    atividade: [{ id: "i0", quando: mais(-86_400_000 * 2), texto: "Início de sessão a partir de Lisboa, Portugal" }],
  };
}

function juntar(base: Conta, guardada: Partial<Conta>): Conta {
  return { ...base, ...guardada, notif: { ...base.notif, ...(guardada.notif ?? {}) }, silencio: { ...base.silencio, ...(guardada.silencio ?? {}) }, ausencia: { ...base.ausencia, ...(guardada.ausencia ?? {}) } };
}

interface Api {
  conta: Conta;
  /** Altera a conta; o texto, se houver, fica no registo de atividade. */
  mudar: (alteracao: Partial<Conta> | ((c: Conta) => Partial<Conta>), evento?: string) => void;
  registar: (texto: string) => void;
  /** Volta às definições de origem desta conta. */
  repor: () => void;
  terminarSessao: () => void;
  /** Passa para outra das contas de demonstração. */
  trocarConta: (funcaoId: string) => void;
}

const Ctx = createContext<Api | null>(null);

export function useConta(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("useConta fora do ContaProvider");
  return v;
}

const proxima = (quando: string, repetir: Repeticao): string => {
  const d = new Date(quando);
  const agora = Date.now();
  while (d.getTime() <= agora) {
    if (repetir === "diario") d.setDate(d.getDate() + 1);
    else if (repetir === "semanal") d.setDate(d.getDate() + 7);
    else if (repetir.startsWith("cada-")) d.setDate(d.getDate() + Math.max(1, Number(repetir.slice(5))));
    else d.setMonth(d.getMonth() + 1);
  }
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function ContaProvider({ children }: { children: ReactNode }) {
  const { funcao, mudarFuncao } = useApp();
  const [estado, setEstado] = useState<{ id: string | null; conta: Conta }>(() => ({ id: null, conta: contaInicial(funcaoPorId(FUNCOES[0].id)) }));
  const contaRef = useRef(estado.conta);
  contaRef.current = estado.conta;

  // Ao mudar de conta, carrega as definições guardadas dessa conta (ou as de origem).
  useEffect(() => {
    const base = contaInicial(funcao);
    let guardada: Partial<Conta> = {};
    try {
      const t = window.localStorage.getItem(CHAVE(funcao.id));
      if (t) guardada = JSON.parse(t);
    } catch {
      /* dados ilegíveis: usa as de origem */
    }
    setEstado({ id: funcao.id, conta: juntar(base, guardada) });
  }, [funcao]);

  useEffect(() => {
    if (estado.id !== funcao.id) return;
    try {
      window.localStorage.setItem(CHAVE(funcao.id), JSON.stringify(estado.conta));
    } catch {
      /* sem armazenamento */
    }
  }, [estado, funcao.id]);

  const mudar = useCallback<Api["mudar"]>((alteracao, evento) => {
    setEstado((e) => {
      const parcial = typeof alteracao === "function" ? alteracao(e.conta) : alteracao;
      const atividade = evento ? [{ id: identificador(), quando: new Date().toISOString(), texto: evento }, ...e.conta.atividade].slice(0, 60) : e.conta.atividade;
      return { ...e, conta: { ...e.conta, ...parcial, atividade: parcial.atividade ?? atividade } };
    });
  }, []);
  const registar = useCallback((texto: string) => mudar({}, texto), [mudar]);
  const repor = useCallback(() => {
    setEstado((e) => ({ ...e, conta: { ...contaInicial(funcao), atividade: [{ id: identificador(), quando: new Date().toISOString(), texto: "Definições da conta repostas" }] } }));
  }, [funcao]);

  const terminarSessao = useCallback(() => auth.terminar(), []);
  const trocarConta = useCallback(
    (id: string) => {
      auth.trocar(id);
      mudarFuncao(id);
    },
    [mudarFuncao],
  );

  // Preferências que mudam a página inteira.
  useEffect(() => {
    document.documentElement.dataset.movimento = estado.conta.movimentoReduzido ? "reduzido" : "normal";
    document.documentElement.dataset.dicas = estado.conta.dicas ? "on" : "off";
  }, [estado.conta.movimentoReduzido, estado.conta.dicas]);

  // Lembretes: a página verifica de vinte em vinte segundos e avisa quando chega a hora.
  useEffect(() => {
    if (estado.id !== funcao.id) return;
    const ver = () => {
      const agora = Date.now();
      const devidos = contaRef.current.lembretes.filter((l) => l.ativo && !l.disparado && new Date(l.quando).getTime() <= agora);
      if (devidos.length === 0) return;
      for (const l of devidos) toasts.add({ title: `Lembrete: ${l.titulo}`, description: l.canal === "email" ? "Também enviado para o seu e-mail." : undefined, timeout: 15_000 });
      mudar((c) => ({
        lembretes: c.lembretes.map((l) => {
          if (!devidos.some((d) => d.id === l.id)) return l;
          return l.repetir === "nao" ? { ...l, disparado: true } : { ...l, quando: proxima(l.quando, l.repetir), disparado: false };
        }),
      }));
    };
    ver();
    const id = window.setInterval(ver, 20_000);
    return () => window.clearInterval(id);
  }, [estado.id, funcao.id, mudar]);

  const api = useMemo<Api>(() => ({ conta: estado.conta, mudar, registar, repor, terminarSessao, trocarConta }), [estado.conta, mudar, registar, repor, terminarSessao, trocarConta]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
