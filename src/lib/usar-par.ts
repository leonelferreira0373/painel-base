// O gancho da partilha de ficheiros por WebRTC (o `usePeer` do SnapShare, em português e dentro do painel): abre um «par» com um código curto, liga-se a outros aparelhos (por código, ligação ou QR) e envia e recebe ficheiros em blocos de 16 KB, direitos de um navegador para o outro (o servidor da PeerJS só faz o aperto de mão inicial). Os ficheiros recebidos descarregam-se sozinhos (os de texto ficam para ler e copiar), com cancelar, reenviar, voltar a ligar e a memória dos últimos aparelhos.
"use client";

import type { DataConnection } from "peerjs";
import type Peer from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { eTexto, gerarCodigoCurto, LIMITE_DO_TEXTO, lembrarPar, PREFIXO_DO_PAR, plataformaDe, type ParLembrado } from "./partilha";

export type EstadoDoPar = "a-ligar" | "pronto" | "erro";
export type SentidoDaTransferencia = "recebido" | "enviado";
export type EstadoDaTransferencia = "a-decorrer" | "concluido" | "falhou";

export interface Transferencia {
  id: string;
  peerId: string;
  sentido: SentidoDaTransferencia;
  nome: string;
  tamanho: number;
  mime: string;
  bytes: number;
  estado: EstadoDaTransferencia;
  erro?: string;
  /** O endereço do ficheiro recebido (para o voltar a guardar). */
  ligacao?: string;
  /** O conteúdo, se é texto até 1 MB: fica para ler e copiar. */
  texto?: string;
  /** O ficheiro recebido, tal como chegou (só chega a quem pede `aoConcluir`, para o guardar). */
  blob?: Blob;
  inicio: number;
  fim?: number;
}

export interface AparelhoLigado {
  peerId: string;
  plataforma?: string;
  estado: "a-ligar" | "aberto" | "a-religar";
}

export interface ConfiguracaoDaPartilha {
  /** O servidor PeerJS próprio (vazio: o público, 0.peerjs.com). Só faz o aperto de mão: os ficheiros nunca passam por ele. */
  servidor?: { host: string; porta?: number; caminho?: string; seguro?: boolean };
  /** Um servidor TURN próprio, para redes onde a ligação direta não passa (o público partilhado serve de reserva). */
  turn?: { urls: string; utilizador?: string; credencial?: string };
}

const CHAVE_DO_ID = "bridge.partilha.id";
const CHAVE_DOS_PARES = "bridge.partilha.pares";
const CHAVE_DA_CONFIG = "bridge.partilha.config";
const TENTATIVAS_DE_ID = 4;
const BLOCO = 16 * 1024;
const ALTA = 16 * 1024 * 1024;
const BAIXA = 1 * 1024 * 1024;

export function lerConfiguracaoDaPartilha(): ConfiguracaoDaPartilha {
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE_DA_CONFIG) ?? "{}") as ConfiguracaoDaPartilha;
  } catch {
    return {};
  }
}
export function guardarConfiguracaoDaPartilha(c: ConfiguracaoDaPartilha): void {
  try {
    window.localStorage.setItem(CHAVE_DA_CONFIG, JSON.stringify(c));
  } catch {
    /* sem armazenamento */
  }
}

/** Os servidores que ajudam a atravessar as redes: vários STUN e, de reserva, TURN públicos (limitados e partilhados). */
export function servidoresIce(c: ConfiguracaoDaPartilha): RTCIceServer[] {
  const publicos: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ];
  return c.turn?.urls ? [{ urls: c.turn.urls, username: c.turn.utilizador, credential: c.turn.credencial }, ...publicos] : publicos;
}

export function lerPares(): ParLembrado[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE_DOS_PARES) ?? "[]");
    return Array.isArray(v) ? v.filter((p): p is ParLembrado => p && typeof p.peerId === "string") : [];
  } catch {
    return [];
  }
}
const guardarPares = (l: ParLembrado[]) => {
  try {
    window.localStorage.setItem(CHAVE_DOS_PARES, JSON.stringify(l));
  } catch {
    /* sem armazenamento */
  }
};

interface MsgMeta { type: "meta"; id: string; name: string; size: number; mime: string }
interface MsgFim { type: "eof"; id: string }
interface MsgOla { type: "hello"; platform: string }
interface MsgCancelar { type: "cancel"; id: string }
type Mensagem = MsgMeta | MsgFim | MsgOla | MsgCancelar;

class Cancelada extends Error {
  constructor() {
    super("cancelada");
  }
}

interface Entrada {
  meta: MsgMeta;
  blocos: Uint8Array[];
  recebidos: number;
}

export interface OpcoesDoPar {
  /** Os ficheiros que chegam descarregam-se logo (os de texto não). */
  descarregar?: boolean;
  /** Chamado quando uma transferência acaba (para registar na atividade e guardar o que chegou). */
  aoConcluir?: (t: Transferencia) => void;
  /** Chamado quando um ficheiro começa a chegar: devolve a razão para o recusar, ou nada para o aceitar. Um ficheiro recusado não se recebe e quem o envia é avisado. */
  aoChegar?: (ficheiro: { nome: string; tamanho: number; mime: string; peerId: string }) => string | null | undefined;
  /** O código fica sempre o mesmo neste navegador (o do painel). Quem só abre a página de receber não o guarda, para não tomar o código de outro separador. */
  guardarCodigo?: boolean;
}

export interface ResultadoDoPar {
  meuId: string | null;
  estado: EstadoDoPar;
  aparelhos: AparelhoLigado[];
  transferencias: Transferencia[];
  pares: ParLembrado[];
  erro: string | null;
  enviar: (ficheiros: FileList | File[]) => Promise<void>;
  reenviar: (t: Transferencia) => Promise<void>;
  cancelar: (t: Transferencia) => void;
  ligar: (id: string) => void;
  religar: (id: string) => void;
  desligar: (id: string) => void;
  desligarTodos: () => void;
  esquecer: (id: string) => void;
}

export function usarPar({ descarregar = true, aoConcluir, aoChegar, guardarCodigo = true }: OpcoesDoPar = {}): ResultadoDoPar {
  const parRef = useRef<Peer | null>(null);
  const abertasRef = useRef<Map<string, DataConnection>>(new Map());
  const pendentesRef = useRef<Map<string, DataConnection>>(new Map());
  const entradasRef = useRef<Map<string, Entrada>>(new Map());
  const correnteRef = useRef<Map<string, string>>(new Map());
  const origemRef = useRef<Map<string, File>>(new Map());
  const canceladasRef = useRef<Set<string>>(new Set());
  const descarregarRef = useRef(descarregar);
  descarregarRef.current = descarregar;
  const concluirRef = useRef(aoConcluir);
  concluirRef.current = aoConcluir;
  const chegarRef = useRef(aoChegar);
  chegarRef.current = aoChegar;

  const [meuId, setMeuId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoDoPar>("a-ligar");
  const [aparelhos, setAparelhos] = useState<AparelhoLigado[]>([]);
  const aparelhosRef = useRef<AparelhoLigado[]>([]);
  aparelhosRef.current = aparelhos;
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pares, setPares] = useState<ParLembrado[]>([]);
  useEffect(() => setPares(lerPares()), []);

  const mudarAparelho = useCallback((peerId: string, parte: Partial<AparelhoLigado>) => {
    setAparelhos((prev) => {
      const i = prev.findIndex((a) => a.peerId === peerId);
      if (i === -1) return [...prev, { peerId, estado: "a-ligar", ...parte }];
      const novo = [...prev];
      novo[i] = { ...novo[i], ...parte };
      return novo;
    });
  }, []);

  const mudarTransferencia = useCallback((id: string, parte: Partial<Transferencia>) => {
    setTransferencias((prev) => {
      const i = prev.findIndex((t) => t.id === id);
      if (i === -1) return prev;
      const novo = [...prev];
      novo[i] = { ...novo[i], ...parte };
      return novo;
    });
  }, []);

  /** Marca uma transferência como acabada e avisa quem quer saber. */
  const concluir = useCallback((t: Transferencia) => concluirRef.current?.(t), []);

  const aoReceber = useCallback(
    (peerId: string, dados: unknown) => {
      if (typeof dados === "string") {
        let msg: Mensagem;
        try {
          msg = JSON.parse(dados) as Mensagem;
        } catch {
          return;
        }
        if (msg.type === "hello") {
          mudarAparelho(peerId, { plataforma: msg.platform });
          const lista = lembrarPar(lerPares(), { peerId, platform: msg.platform, at: Date.now() });
          guardarPares(lista);
          setPares(lista);
          return;
        }
        if (msg.type === "meta") {
          const motivo = chegarRef.current?.({ nome: msg.name, tamanho: msg.size, mime: msg.mime, peerId });
          if (motivo) {
            // recusado: aparece na lista como falhado, e o outro lado é avisado para parar
            const agora = Date.now();
            setTransferencias((prev) => [...prev, { id: msg.id, peerId, sentido: "recebido", nome: msg.name, tamanho: msg.size, mime: msg.mime, bytes: 0, estado: "falhou", erro: motivo, inicio: agora, fim: agora }]);
            try {
              abertasRef.current.get(peerId)?.send(JSON.stringify({ type: "cancel", id: msg.id } satisfies MsgCancelar));
            } catch {
              /* a ligação fechou entretanto */
            }
            return;
          }
          entradasRef.current.set(`${peerId}:${msg.id}`, { meta: msg, blocos: [], recebidos: 0 });
          correnteRef.current.set(peerId, msg.id);
          setTransferencias((prev) => [...prev, { id: msg.id, peerId, sentido: "recebido", nome: msg.name, tamanho: msg.size, mime: msg.mime, bytes: 0, estado: "a-decorrer", inicio: Date.now() }]);
          return;
        }
        if (msg.type === "cancel") {
          canceladasRef.current.add(msg.id);
          entradasRef.current.delete(`${peerId}:${msg.id}`);
          if (correnteRef.current.get(peerId) === msg.id) correnteRef.current.delete(peerId);
          mudarTransferencia(msg.id, { estado: "falhou", erro: "cancelada", fim: Date.now() });
          return;
        }
        if (msg.type === "eof") {
          const chave = `${peerId}:${msg.id}`;
          const e = entradasRef.current.get(chave);
          if (!e) return;
          const blob = new Blob(e.blocos as BlobPart[], { type: e.meta.mime || "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          const texto = eTexto(e.meta.name, e.meta.mime ?? "");
          // os ficheiros descarregam-se sozinhos; o texto fica para ler e copiar
          if (!texto && descarregarRef.current) {
            const a = document.createElement("a");
            a.href = url;
            a.download = e.meta.name;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            a.remove();
          }
          const fim = Date.now();
          const feito = (extra: Partial<Transferencia>) => {
            mudarTransferencia(msg.id, { estado: "concluido", bytes: e.meta.size, ligacao: url, fim, ...extra });
            concluir({ id: msg.id, peerId, sentido: "recebido", nome: e.meta.name, tamanho: e.meta.size, mime: e.meta.mime, bytes: e.meta.size, estado: "concluido", ligacao: url, blob, inicio: fim, fim, ...extra });
          };
          if (texto && e.meta.size <= LIMITE_DO_TEXTO) blob.text().then((t) => feito({ texto: t }), () => feito({}));
          else feito({});
          entradasRef.current.delete(chave);
          if (correnteRef.current.get(peerId) === msg.id) correnteRef.current.delete(peerId);
        }
        return;
      }
      // um bloco de bytes: pertence à transferência que está a chegar deste aparelho
      const id = correnteRef.current.get(peerId);
      if (!id) return;
      const e = entradasRef.current.get(`${peerId}:${id}`);
      if (!e) return;
      const bloco = dados instanceof ArrayBuffer ? new Uint8Array(dados) : new Uint8Array((dados as ArrayBufferView).buffer);
      e.blocos.push(bloco);
      e.recebidos += bloco.byteLength;
      mudarTransferencia(id, { bytes: e.recebidos });
    },
    [mudarAparelho, mudarTransferencia, concluir],
  );

  const prender = useCallback(
    (ligacao: DataConnection) => {
      const peerId = ligacao.peer;
      pendentesRef.current.set(peerId, ligacao);
      mudarAparelho(peerId, { estado: "a-ligar" });
      ligacao.on("data", (d) => aoReceber(peerId, d));
      ligacao.on("open", () => {
        const existente = abertasRef.current.get(peerId);
        if (existente && existente.open && existente !== ligacao) {
          try {
            ligacao.close();
          } catch {
            /* já fechada */
          }
          return;
        }
        abertasRef.current.set(peerId, ligacao);
        pendentesRef.current.delete(peerId);
        mudarAparelho(peerId, { estado: "aberto" });
        setErro(null);
        try {
          ligacao.send(JSON.stringify({ type: "hello", platform: plataformaDe(navigator.userAgent) } satisfies MsgOla));
        } catch {
          /* a ligação fechou entretanto */
        }
      });
      ligacao.on("close", () => {
        if (pendentesRef.current.get(peerId) === ligacao) pendentesRef.current.delete(peerId);
        if (abertasRef.current.get(peerId) === ligacao) {
          abertasRef.current.delete(peerId);
          mudarAparelho(peerId, { estado: "a-religar" });
        }
      });
      ligacao.on("error", () => undefined);
    },
    [aoReceber, mudarAparelho],
  );

  useEffect(() => {
    let cancelado = false;
    let tentativas = 0;
    let par: Peer | null = null;

    async function arrancar(novo = false) {
      if (cancelado) return;
      const { default: Peer } = await import("peerjs");
      if (cancelado) return;
      const config = lerConfiguracaoDaPartilha();
      let guardado: string | null = null;
      try {
        guardado = novo || !guardarCodigo ? null : window.localStorage.getItem(CHAVE_DO_ID);
      } catch {
        /* sem armazenamento */
      }
      const candidato = guardado || `${PREFIXO_DO_PAR}${gerarCodigoCurto()}`;
      par = new Peer(candidato, { debug: 1, config: { iceServers: servidoresIce(config) }, ...(config.servidor?.host ? { host: config.servidor.host, port: config.servidor.porta ?? 443, path: config.servidor.caminho ?? "/", secure: config.servidor.seguro ?? true } : {}) });
      parRef.current = par;
      par.on("open", (id) => {
        if (cancelado) return;
        setMeuId(id);
        if (guardarCodigo) {
          try {
            window.localStorage.setItem(CHAVE_DO_ID, id);
          } catch {
            /* sem armazenamento */
          }
        }
        setEstado("pronto");
      });
      par.on("connection", (ligacao) => {
        const existente = abertasRef.current.get(ligacao.peer);
        if (existente && existente.open && existente !== ligacao) {
          try {
            existente.close();
          } catch {
            /* já fechada */
          }
        }
        prender(ligacao);
      });
      par.on("disconnected", () => {
        if (cancelado) return;
        try {
          par?.reconnect();
        } catch {
          /* tenta-se na próxima */
        }
      });
      par.on("error", (e) => {
        if (cancelado) return;
        if (e.type === "unavailable-id" && tentativas < TENTATIVAS_DE_ID) {
          tentativas++;
          par?.destroy();
          void arrancar(true);
          return;
        }
        if (e.type === "peer-unavailable") return setErro("Esse código não foi encontrado. Confira-o e tente de novo.");
        if ((e.type === "network" || e.type === "server-error" || e.type === "disconnected") && abertasRef.current.size > 0) return;
        setEstado("erro");
        setErro(e.type === "network" || e.type === "server-error" ? "Não foi possível falar com o servidor de ligação. Verifique a rede e tente de novo." : e.message || String(e));
      });
    }
    void arrancar();

    // ao voltar ao separador, volta-se a ligar o que caiu
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      const atual = parRef.current;
      if (!atual) return;
      if (atual.disconnected && !atual.destroyed) {
        try {
          atual.reconnect();
        } catch {
          /* tenta-se na próxima */
        }
      }
      for (const a of aparelhosRef.current) {
        if (a.estado === "a-religar" && !abertasRef.current.get(a.peerId) && !pendentesRef.current.get(a.peerId)) prender(atual.connect(a.peerId, { reliable: true }));
      }
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoVoltar);
      parRef.current?.destroy();
    };
  }, [prender, guardarCodigo]);

  const enviarParaLigacao = useCallback(
    async (ligacao: DataConnection, ficheiro: File, id: string) => {
      const meta: MsgMeta = { type: "meta", id, name: ficheiro.name, size: ficheiro.size, mime: ficheiro.type || "application/octet-stream" };
      ligacao.send(JSON.stringify(meta));
      const canal = (ligacao as unknown as { dataChannel?: RTCDataChannel }).dataChannel;
      if (canal) canal.bufferedAmountLowThreshold = BAIXA;
      // o progresso mostra-se a cada 1 % (ou 64 KB) para não pesar nos ficheiros grandes
      const cada = Math.max(64 * 1024, Math.floor(ficheiro.size / 100) || BLOCO);
      let deslocamento = 0;
      let ultimo = 0;
      while (deslocamento < ficheiro.size) {
        if (canceladasRef.current.has(id)) {
          try {
            ligacao.send(JSON.stringify({ type: "cancel", id } satisfies MsgCancelar));
          } catch {
            /* já fechada */
          }
          throw new Cancelada();
        }
        const buf = await ficheiro.slice(deslocamento, deslocamento + BLOCO).arrayBuffer();
        if (canal && canal.bufferedAmount > ALTA) {
          await new Promise<void>((ok) => {
            const f = () => {
              canal.removeEventListener("bufferedamountlow", f);
              ok();
            };
            canal.addEventListener("bufferedamountlow", f);
          });
        }
        ligacao.send(buf);
        deslocamento += buf.byteLength;
        if (deslocamento - ultimo >= cada || deslocamento >= ficheiro.size) {
          mudarTransferencia(id, { bytes: deslocamento });
          ultimo = deslocamento;
        }
      }
      ligacao.send(JSON.stringify({ type: "eof", id } satisfies MsgFim));
    },
    [mudarTransferencia],
  );

  // um ficheiro vai para todos os aparelhos ligados; os de cada ligação saem um a um, as ligações em paralelo
  const enviar = useCallback(
    async (ficheiros: FileList | File[]) => {
      const lista = Array.from(ficheiros);
      const ligacoes = Array.from(abertasRef.current.values()).filter((l) => l.open);
      if (lista.length === 0 || ligacoes.length === 0) return;
      const trabalhos: { ficheiro: File; ligacao: DataConnection; id: string }[] = [];
      const linhas: Transferencia[] = [];
      const inicio = Date.now();
      for (const ficheiro of lista)
        for (const ligacao of ligacoes) {
          const id = crypto.randomUUID();
          trabalhos.push({ ficheiro, ligacao, id });
          origemRef.current.set(id, ficheiro);
          linhas.push({ id, peerId: ligacao.peer, sentido: "enviado", nome: ficheiro.name, tamanho: ficheiro.size, mime: ficheiro.type || "application/octet-stream", bytes: 0, estado: "a-decorrer", inicio });
        }
      setTransferencias((prev) => [...prev, ...linhas]);
      const porLigacao = new Map<DataConnection, typeof trabalhos>();
      for (const t of trabalhos) porLigacao.set(t.ligacao, [...(porLigacao.get(t.ligacao) ?? []), t]);
      await Promise.all(
        Array.from(porLigacao.values()).map(async (fila) => {
          for (const t of fila) {
            const base = linhas.find((l) => l.id === t.id)!;
            try {
              await enviarParaLigacao(t.ligacao, t.ficheiro, t.id);
              const fim = Date.now();
              mudarTransferencia(t.id, { bytes: t.ficheiro.size, estado: "concluido", fim });
              concluir({ ...base, bytes: t.ficheiro.size, estado: "concluido", fim });
            } catch (e) {
              mudarTransferencia(t.id, { estado: "falhou", erro: e instanceof Cancelada ? "cancelada" : String(e), fim: Date.now() });
            }
          }
        }),
      );
    },
    [enviarParaLigacao, mudarTransferencia, concluir],
  );

  const cancelar = useCallback(
    (t: Transferencia) => {
      canceladasRef.current.add(t.id);
      if (t.sentido === "recebido") {
        const ligacao = abertasRef.current.get(t.peerId);
        if (ligacao?.open) {
          try {
            ligacao.send(JSON.stringify({ type: "cancel", id: t.id } satisfies MsgCancelar));
          } catch {
            /* já fechada */
          }
        }
        entradasRef.current.delete(`${t.peerId}:${t.id}`);
        if (correnteRef.current.get(t.peerId) === t.id) correnteRef.current.delete(t.peerId);
        mudarTransferencia(t.id, { estado: "falhou", erro: "cancelada" });
      }
      // no envio, o ciclo vê o aviso no bloco seguinte, diz ao outro lado e pára
    },
    [mudarTransferencia],
  );

  const reenviar = useCallback(
    async (t: Transferencia) => {
      let ficheiro: File | null = null;
      if (t.sentido === "enviado") ficheiro = origemRef.current.get(t.id) ?? null;
      else if (t.ligacao) {
        try {
          const blob = await (await fetch(t.ligacao)).blob();
          ficheiro = new File([blob], t.nome, { type: t.mime || blob.type || "application/octet-stream", lastModified: Date.now() });
        } catch {
          /* o ficheiro já não está na memória */
        }
      }
      if (ficheiro) await enviar([ficheiro]);
    },
    [enviar],
  );

  const ligar = useCallback(
    (id: string) => {
      const atual = parRef.current;
      if (!atual || !id) return;
      if (abertasRef.current.get(id)?.open || pendentesRef.current.get(id)) return;
      if (id === atual.id) return setErro("Não pode ligar-se a si mesmo.");
      setErro(null);
      prender(atual.connect(id, { reliable: true }));
    },
    [prender],
  );

  const religar = useCallback(
    (id: string) => {
      const atual = parRef.current;
      if (!atual || !id) return;
      for (const m of [abertasRef.current, pendentesRef.current]) {
        try {
          m.get(id)?.close();
        } catch {
          /* já fechada */
        }
        m.delete(id);
      }
      setErro(null);
      mudarAparelho(id, { estado: "a-ligar" });
      prender(atual.connect(id, { reliable: true }));
    },
    [mudarAparelho, prender],
  );

  const desligar = useCallback((id: string) => {
    abertasRef.current.get(id)?.close();
    pendentesRef.current.get(id)?.close();
    abertasRef.current.delete(id);
    pendentesRef.current.delete(id);
    setAparelhos((prev) => prev.filter((a) => a.peerId !== id));
  }, []);

  const desligarTodos = useCallback(() => {
    for (const m of [abertasRef.current, pendentesRef.current]) {
      for (const l of m.values()) {
        try {
          l.close();
        } catch {
          /* já fechada */
        }
      }
      m.clear();
    }
    setAparelhos([]);
  }, []);

  const esquecer = useCallback((id: string) => {
    const lista = lerPares().filter((p) => p.peerId !== id);
    guardarPares(lista);
    setPares(lista);
  }, []);

  return { meuId, estado, aparelhos, transferencias, pares, erro, enviar, reenviar, cancelar, ligar, religar, desligar, desligarTodos, esquecer };
}
