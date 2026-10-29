// Limite de tentativas dos códigos de uma só vez (OTP): cada código errado gasta uma tentativa; ao fim de cinco o campo fecha durante um tempo que cresce de cada vez (30 s, 1 min, 5 min, 15 min, 1 h) e só se esquece tudo com um código certo ou depois de uma hora sem erros. O estado fica no navegador (um recarregar a página não o repõe). Em modo ligado é o servidor que aplica a mesma regra; aqui estão as contas puras e o gancho que mostra a contagem decrescente.
"use client";

import { useCallback, useEffect, useState } from "react";

export interface ConfigDeTentativas {
  /** Quantos códigos errados se aceitam antes de fechar o campo. */
  max: number;
  /** Quanto tempo (em segundos) o campo fica fechado, a cada fecho seguido. O último repete-se. */
  bloqueios: number[];
  /** Sem erros durante este tempo (em segundos), o estado esquece-se. */
  esquecerApos: number;
}

export const CONFIG_OTP: ConfigDeTentativas = { max: 5, bloqueios: [30, 60, 300, 900, 3600], esquecerApos: 3600 };

export interface EstadoDeTentativas {
  /** Os códigos errados desde o último fecho. */
  falhas: number;
  /** Quantas vezes o campo já fechou (decide quanto dura o próximo fecho). */
  nivel: number;
  /** Até quando o campo está fechado (milissegundos desde 1970); 0 se está aberto. */
  bloqueadoAte: number;
  /** Quando foi o último erro. */
  ultima: number;
}

export const SEM_TENTATIVAS: EstadoDeTentativas = { falhas: 0, nivel: 0, bloqueadoAte: 0, ultima: 0 };

/** Os segundos que faltam para o campo abrir (0 se está aberto). */
export const segundosDeEspera = (e: EstadoDeTentativas, agora: number): number => Math.max(0, Math.ceil((e.bloqueadoAte - agora) / 1000));

/** Quantos códigos errados ainda se aceitam antes de fechar. */
export const tentativasRestantes = (e: EstadoDeTentativas, cfg: ConfigDeTentativas = CONFIG_OTP): number => Math.max(0, cfg.max - e.falhas);

/** O estado de agora: esquece-se o que passou há muito tempo (e o fecho que já acabou deixa de contar as falhas). */
export function estadoAtual(e: EstadoDeTentativas, agora: number, cfg: ConfigDeTentativas = CONFIG_OTP): EstadoDeTentativas {
  // o tempo sem erros conta desde o último erro ou, se o campo fechou, desde que voltou a abrir
  if (e.ultima && agora - Math.max(e.ultima, e.bloqueadoAte) > cfg.esquecerApos * 1000) return SEM_TENTATIVAS;
  return e;
}

/** O estado depois de um código errado: gasta uma tentativa e, à última, fecha o campo (por mais tempo de cada vez). */
export function aposFalha(e: EstadoDeTentativas, agora: number, cfg: ConfigDeTentativas = CONFIG_OTP): EstadoDeTentativas {
  const base = estadoAtual(e, agora, cfg);
  if (segundosDeEspera(base, agora) > 0) return base;
  const falhas = base.falhas + 1;
  if (falhas < cfg.max) return { ...base, falhas, ultima: agora };
  const segundos = cfg.bloqueios[Math.min(base.nivel, cfg.bloqueios.length - 1)];
  return { falhas: 0, nivel: base.nivel + 1, bloqueadoAte: agora + segundos * 1000, ultima: agora };
}

/** «0:30», «5:00», «1:00:00». */
export function formatarEspera(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const dois = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${m}:${dois(s)}`;
}

/** A frase para o que acabou de acontecer: as tentativas que restam, ou quanto falta para o campo abrir. */
export function mensagemDeFalha(e: EstadoDeTentativas, agora: number, cfg: ConfigDeTentativas = CONFIG_OTP): string {
  const espera = segundosDeEspera(e, agora);
  if (espera > 0) return `Demasiadas tentativas. Tente de novo dentro de ${formatarEspera(espera)}.`;
  const r = tentativasRestantes(e, cfg);
  return r === 1 ? "Esse código não está certo. Resta uma tentativa." : `Esse código não está certo. Restam ${r} tentativas.`;
}

// ---------- guardar no navegador ----------

const chaveDe = (chave: string) => `bridge.tentativas.${chave}`;

export function lerLimite(chave: string): EstadoDeTentativas {
  try {
    const v = JSON.parse(window.localStorage.getItem(chaveDe(chave)) ?? "null") as Partial<EstadoDeTentativas> | null;
    if (!v) return SEM_TENTATIVAS;
    return { falhas: Number(v.falhas) || 0, nivel: Number(v.nivel) || 0, bloqueadoAte: Number(v.bloqueadoAte) || 0, ultima: Number(v.ultima) || 0 };
  } catch {
    return SEM_TENTATIVAS;
  }
}

export function guardarLimite(chave: string, e: EstadoDeTentativas): void {
  try {
    window.localStorage.setItem(chaveDe(chave), JSON.stringify(e));
  } catch {
    /* sem armazenamento */
  }
}

export function limparLimite(chave: string): void {
  try {
    window.localStorage.removeItem(chaveDe(chave));
  } catch {
    /* sem armazenamento */
  }
}

/**
 * Verifica um código com limite: devolve se serve e, se não, a frase para mostrar. Quem verifica (o ecrã ou o servidor simulado) chama isto uma vez por código completo.
 * `certo` diz se o código bate com o verdadeiro.
 */
export function tentarCodigo(chave: string, certo: boolean, agora = Date.now(), cfg: ConfigDeTentativas = CONFIG_OTP): { ok: boolean; erro?: string; espera: number } {
  const atual = estadoAtual(lerLimite(chave), agora, cfg);
  const espera = segundosDeEspera(atual, agora);
  if (espera > 0) return { ok: false, erro: mensagemDeFalha(atual, agora, cfg), espera };
  if (certo) {
    limparLimite(chave);
    return { ok: true, espera: 0 };
  }
  const depois = aposFalha(atual, agora, cfg);
  guardarLimite(chave, depois);
  return { ok: false, erro: mensagemDeFalha(depois, agora, cfg), espera: segundosDeEspera(depois, agora) };
}

// ---------- o gancho do ecrã ----------

/** O estado do limite de uma chave, a contar os segundos enquanto o campo está fechado. `reler` lê de novo o que o servidor simulado guardou. */
export function useLimiteDeTentativas(chave: string, cfg: ConfigDeTentativas = CONFIG_OTP) {
  const [estado, setEstado] = useState<EstadoDeTentativas>(SEM_TENTATIVAS);
  const [agora, setAgora] = useState(() => Date.now());
  const reler = useCallback(() => {
    const t = Date.now();
    setEstado(estadoAtual(lerLimite(chave), t, cfg));
    setAgora(t);
  }, [chave, cfg]);
  useEffect(reler, [reler]);
  const espera = segundosDeEspera(estado, agora);
  useEffect(() => {
    if (espera <= 0) return;
    const id = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [espera]);
  return {
    espera,
    bloqueado: espera > 0,
    restantes: tentativasRestantes(estado, cfg),
    reler,
    /** Gasta uma tentativa e devolve a frase para mostrar. */
    falhar: () => {
      const r = tentarCodigo(chave, false, Date.now(), cfg);
      reler();
      return r.erro ?? "";
    },
    acertar: () => {
      limparLimite(chave);
      reler();
    },
  };
}

/** Um tempo de espera entre dois envios do mesmo código («Enviar outro código»): conta os segundos e guarda-os no navegador. */
export function useEsperaDeReenvio(chave: string, segundos = 30) {
  const guardada = `bridge.reenvio.${chave}`;
  const [ate, setAte] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    try {
      setAte(Number(window.localStorage.getItem(guardada)) || 0);
    } catch {
      /* sem armazenamento */
    }
  }, [guardada]);
  const espera = Math.max(0, Math.ceil((ate - agora) / 1000));
  useEffect(() => {
    if (espera <= 0) return;
    const id = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [espera]);
  return {
    espera,
    iniciar: () => {
      const fim = Date.now() + segundos * 1000;
      setAte(fim);
      setAgora(Date.now());
      try {
        window.localStorage.setItem(guardada, String(fim));
      } catch {
        /* sem armazenamento */
      }
    },
  };
}
