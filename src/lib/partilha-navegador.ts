// As ajudas do navegador da partilha de ficheiros (as do SnapShare): manter o ecrã ligado enquanto há aparelhos ligados, enviar o que se copia para a área de transferência e apanhar os ficheiros que se colam (Ctrl+V) ou se largam em qualquer sítio da página.
"use client";

import { useEffect, useRef, useState } from "react";
import { nomeDoColado } from "./partilha";

const preferencia = (chave: string, porOmissao: boolean): boolean => {
  try {
    const v = window.localStorage.getItem(`bridge.partilha.${chave}`);
    return v === null ? porOmissao : v === "1";
  } catch {
    return porOmissao;
  }
};
const guardar = (chave: string, ligado: boolean) => {
  try {
    window.localStorage.setItem(`bridge.partilha.${chave}`, ligado ? "1" : "0");
  } catch {
    /* sem armazenamento */
  }
};

/** Uma opção ligada ou desligada que se lembra neste navegador. */
export function usePreferenciaDaPartilha(chave: string, porOmissao = false): [boolean, (v: boolean) => void] {
  const [valor, setValor] = useState(porOmissao);
  useEffect(() => setValor(preferencia(chave, porOmissao)), [chave, porOmissao]);
  return [
    valor,
    (v) => {
      setValor(v);
      guardar(chave, v);
    },
  ];
}

// ---------- o ecrã ligado ----------

interface Sentinela extends EventTarget {
  release: () => Promise<void>;
}

export const ecraPodeFicarLigado = (): boolean => typeof navigator !== "undefined" && "wakeLock" in navigator;

/** Mantém o ecrã ligado enquanto `ativo`; o sistema larga-o quando o separador fica escondido e aqui volta a pedir-se. */
export function useEcraLigado(ativo: boolean): void {
  const sentinela = useRef<Sentinela | null>(null);
  useEffect(() => {
    if (!ecraPodeFicarLigado()) return;
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinela> } }).wakeLock;
    if (!ativo || !wl) {
      sentinela.current?.release().catch(() => undefined);
      sentinela.current = null;
      return;
    }
    let cancelado = false;
    const pedir = async () => {
      try {
        const s = await wl.request("screen");
        if (cancelado) return void s.release().catch(() => undefined);
        sentinela.current = s;
        s.addEventListener("release", () => (sentinela.current = null));
      } catch {
        /* o sistema recusou (bateria fraca, por exemplo) */
      }
    };
    void pedir();
    const aoVoltar = () => document.visibilityState === "visible" && !sentinela.current && void pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoVoltar);
      sentinela.current?.release().catch(() => undefined);
      sentinela.current = null;
    };
  }, [ativo]);
}

// ---------- a área de transferência ----------

interface ItemDaPrancheta {
  readonly types: readonly string[];
  getType: (t: string) => Promise<Blob>;
}

async function impressao(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.slice(0, 256).arrayBuffer());
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return `${blob.type}:${blob.size}:${hex}`;
}

/**
 * Vigia a área de transferência quando o separador volta a ter o foco e envia o que lá estiver de novo (texto, imagens…). A primeira leitura depois de ligar só regista o que já lá estava,
 * para não enviar de repente o que se copiou antes.
 */
export function useCapturaDaPrancheta(ativo: boolean, aoCapturar: (f: File) => void, aoErro: (mensagem: string) => void): void {
  const ultimo = useRef("");
  const semeado = useRef(false);
  const capturar = useRef(aoCapturar);
  capturar.current = aoCapturar;
  const falhar = useRef(aoErro);
  falhar.current = aoErro;
  useEffect(() => {
    if (!ativo) {
      semeado.current = false;
      return;
    }
    if (!navigator.clipboard) {
      falhar.current("O navegador não deixa ler a área de transferência.");
      return;
    }
    let cancelado = false;
    const prancheta = navigator.clipboard as unknown as { read?: () => Promise<ItemDaPrancheta[]>; readText?: () => Promise<string> };
    const entregar = (blob: Blob, imp: string, nome?: string) => {
      if (cancelado) return;
      ultimo.current = imp;
      capturar.current(new File([blob], nome ?? nomeDoColado(blob.type), { type: blob.type || "application/octet-stream", lastModified: Date.now() }));
    };
    const ver = async () => {
      try {
        if (typeof prancheta.read === "function") {
          for (const item of await prancheta.read()) {
            if (cancelado) return;
            const tipos = [...item.types];
            const ordem = [...tipos.filter((t) => t.startsWith("image/")), ...tipos.filter((t) => t === "text/plain"), ...tipos.filter((t) => !t.startsWith("image/") && t !== "text/plain")];
            for (const tipo of ordem) {
              try {
                const blob = await item.getType(tipo);
                const imp = await impressao(blob);
                if (imp === ultimo.current) return;
                if (!semeado.current) {
                  semeado.current = true;
                  ultimo.current = imp;
                  return;
                }
                return entregar(blob, imp);
              } catch {
                /* tenta o tipo seguinte */
              }
            }
          }
          return;
        }
        if (typeof prancheta.readText === "function") {
          const texto = await prancheta.readText();
          if (cancelado) return;
          const imp = `texto:${texto.length}:${texto.slice(0, 64)}`;
          if (imp === ultimo.current) return;
          if (!semeado.current) {
            semeado.current = true;
            ultimo.current = imp;
            return;
          }
          if (texto) entregar(new Blob([texto], { type: "text/plain" }), imp);
        }
      } catch (e) {
        if (semeado.current) return;
        semeado.current = true;
        falhar.current((e as Error)?.message || "O navegador não deixou ler a área de transferência.");
      }
    };
    void ver();
    const aoFoco = () => void ver();
    const aoVoltar = () => document.visibilityState === "visible" && void ver();
    window.addEventListener("focus", aoFoco);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      cancelado = true;
      window.removeEventListener("focus", aoFoco);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [ativo]);
}

// ---------- colar e largar ficheiros ----------

/** Ctrl+V em qualquer sítio da página (fora dos campos de texto) apanha os ficheiros que estiverem na área de transferência. */
export function useColarFicheiros(aoColar: (f: File[]) => void): void {
  const ref = useRef(aoColar);
  ref.current = aoColar;
  useEffect(() => {
    const colar = (e: ClipboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable)) return;
      const ficheiros: File[] = [];
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.kind !== "file") continue;
        const f = item.getAsFile();
        if (!f) continue;
        ficheiros.push(new File([f], f.name && f.name !== "image.png" ? f.name : nomeDoColado(f.type), { type: f.type || "application/octet-stream", lastModified: f.lastModified || Date.now() }));
      }
      if (ficheiros.length === 0) return;
      e.preventDefault();
      ref.current(ficheiros);
    };
    document.addEventListener("paste", colar);
    return () => document.removeEventListener("paste", colar);
  }, []);
}

/** Largar ficheiros em qualquer sítio da página: `aArrastar` é verdadeiro enquanto se arrasta ficheiros por cima dela. */
export function useLargarFicheiros(aoLargar: (f: File[]) => void): boolean {
  const [aArrastar, setAArrastar] = useState(false);
  const ref = useRef(aoLargar);
  ref.current = aoLargar;
  useEffect(() => {
    let n = 0;
    const temFicheiros = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const entrar = (e: DragEvent) => {
      if (!temFicheiros(e)) return;
      n++;
      setAArrastar(true);
    };
    const sair = (e: DragEvent) => {
      if (!temFicheiros(e)) return;
      n = Math.max(0, n - 1);
      if (n === 0) setAArrastar(false);
    };
    const sobre = (e: DragEvent) => temFicheiros(e) && e.preventDefault();
    const largar = (e: DragEvent) => {
      if (!temFicheiros(e)) return;
      e.preventDefault();
      n = 0;
      setAArrastar(false);
      const f = Array.from(e.dataTransfer?.files ?? []);
      if (f.length) ref.current(f);
    };
    window.addEventListener("dragenter", entrar);
    window.addEventListener("dragleave", sair);
    window.addEventListener("dragover", sobre);
    window.addEventListener("drop", largar);
    return () => {
      window.removeEventListener("dragenter", entrar);
      window.removeEventListener("dragleave", sair);
      window.removeEventListener("dragover", sobre);
      window.removeEventListener("drop", largar);
    };
  }, []);
  return aArrastar;
}
