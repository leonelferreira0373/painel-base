// Peças comuns das definições da conta: cartão com linhas, linha com título e controlo, interruptor, janela de confirmação e formatos de data.
"use client";

import { Button, Dialog, Surface, Switch } from "@cloudflare/kumo";
import { useState, type ReactNode } from "react";
import { DicaInfo } from "../Dica";
import { ICONES } from "../Icones";

export function Cartao({ titulo, dica, acoes, children, perigo = false }: { titulo: string; dica?: string; acoes?: ReactNode; children: ReactNode; perigo?: boolean }) {
  return (
    <Surface className={`pleno flex min-w-0 flex-col rounded-xl ${perigo ? "ring-kumo-danger/40" : ""}`}>
      <div className="flex min-h-11 items-center justify-between gap-3 px-4 pt-3 pb-1">
        <h3 className={`inline-flex items-center gap-1.5 text-sm font-semibold ${perigo ? "text-kumo-danger" : "text-kumo-default"}`}>
          {titulo}
          {dica && <DicaInfo titulo={titulo} texto={dica} />}
        </h3>
        {acoes}
      </div>
      <div className="flex flex-col pb-1">{children}</div>
    </Surface>
  );
}

/** Uma linha do cartão: o título (com «i» opcional) e o estado à esquerda, o controlo à direita. */
export function Linha({ titulo, dica, estado, children }: { titulo: ReactNode; dica?: string; estado?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-kumo-hairline px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-kumo-default">
          {titulo}
          {dica && <DicaInfo texto={dica} />}
        </div>
        {estado && <div className="mt-0.5 text-[13px] text-kumo-subtle">{estado}</div>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{children}</div>}
    </div>
  );
}

/** Linha em que o controlo ocupa a largura toda (campos de texto). */
export function LinhaCampo({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-t border-kumo-hairline px-4 py-3 first:border-t-0">{children}</div>;
}

export function Interruptor({ marcado, aoMudar, rotulo, desativado }: { marcado: boolean; aoMudar: (v: boolean) => void; rotulo: string; desativado?: boolean }) {
  return <Switch checked={marcado} onCheckedChange={aoMudar} aria-label={rotulo} disabled={desativado} />;
}

/** Janela de confirmação para ações que mudam ou apagam algo. */
export function Confirmar({
  aberto,
  aoMudar,
  titulo,
  texto,
  rotuloAcao,
  perigo = false,
  aoConfirmar,
  escrever,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  titulo: string;
  texto: ReactNode;
  rotuloAcao: string;
  perigo?: boolean;
  aoConfirmar: () => void;
  /** Palavra que a pessoa tem de escrever para confirmar. */
  escrever?: string;
}) {
  const [digitado, setDigitado] = useState("");
  const pode = !escrever || digitado.trim().toUpperCase() === escrever.toUpperCase();
  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(v) => {
        if (!v) setDigitado("");
        aoMudar(v);
      }}
    >
      <Dialog size="base" className="p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <Dialog.Title className="text-lg font-semibold">{titulo}</Dialog.Title>
          <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
        </div>
        <div className="text-sm text-kumo-default">{texto}</div>
        {escrever && (
          <label className="mt-4 flex flex-col gap-1.5 text-xs text-kumo-subtle">
            Escreva {escrever} para confirmar
            <input value={digitado} onChange={(e) => setDigitado(e.target.value)} className="h-9 rounded-lg bg-kumo-base px-3 text-sm text-kumo-default ring ring-kumo-line outline-none focus:ring-kumo-brand" autoComplete="off" />
          </label>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
          <Button
            variant={perigo ? "destructive" : "primary"}
            disabled={!pode}
            onClick={() => {
              aoConfirmar();
              setDigitado("");
              aoMudar(false);
            }}
          >
            {rotuloAcao}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

const relativo = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });

/** «há 2 horas», «ontem», «há 3 dias»… */
export function haTempo(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  if (abs < 60_000) return "agora mesmo";
  if (abs < 3_600_000) return relativo.format(Math.round(ms / 60_000), "minute");
  if (abs < 86_400_000) return relativo.format(Math.round(ms / 3_600_000), "hour");
  if (abs < 86_400_000 * 45) return relativo.format(Math.round(ms / 86_400_000), "day");
  return relativo.format(Math.round(ms / (86_400_000 * 30)), "month");
}

export const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const soData = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

export const emailValido = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.trim());

/** Máscara do e-mail: «m*****@empresa.exemplo». */
export function mascarar(email: string): string {
  const [a, b] = email.split("@");
  return b ? `${a[0]}${"•".repeat(Math.max(2, a.length - 1))}@${b}` : email;
}

/** Código de seis dígitos para a simulação (em produção iria por e-mail ou por SMS). */
export const codigoSimulado = () => String(Math.floor(100000 + Math.random() * 900000));

/** Copia para a área de transferência, se o navegador deixar. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export function descarregar(nome: string, conteudo: string, tipo = "text/plain") {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
