// Os seletores de hora e de data do painel, todos desenhados por nós (nunca os do navegador, que mudam de aspeto de sistema para sistema): a hora em duas colunas (horas e minutos), a data no calendário do Kumo e a data com a hora juntas. Trabalham com texto: «HH:mm», «AAAA-MM-DD» e «AAAA-MM-DDTHH:mm».
"use client";

import { DatePicker, Popover } from "@cloudflare/kumo";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { pt } from "react-day-picker/locale";
import { PopupCartao } from "./Flutuantes";
import { Ic } from "./Icones";

const p2 = (n: number) => String(n).padStart(2, "0");

const CLASSE_CAMPO = "flex h-9 w-full items-center justify-between gap-2 rounded-lg bg-kumo-base px-3 text-sm text-kumo-default ring ring-kumo-line transition-colors hover:ring-kumo-interact disabled:cursor-not-allowed disabled:opacity-50";

/** O rótulo de um campo, como o dos campos do Kumo. */
function Campo({ label, children, className = "" }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      {label && <span className="text-sm font-medium text-kumo-default">{label}</span>}
      {children}
    </div>
  );
}

function Coluna({ rotulo, itens, atual, aoEscolher }: { rotulo: string; itens: number[]; atual: number; aoEscolher: (n: number) => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // ao abrir, a opção escolhida fica a meio da coluna (sem mexer na página)
    const el = caixa.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (el && caixa.current) caixa.current.scrollTop = el.offsetTop - caixa.current.clientHeight / 2 + el.clientHeight / 2;
  }, []);
  return (
    <div ref={caixa} role="listbox" data-incorporado aria-label={rotulo} className="sem-barra flex max-h-56 w-14 flex-col gap-0.5 overflow-y-auto">
      {itens.map((n) => (
        <button key={n} type="button" role="option" aria-selected={n === atual} onClick={() => aoEscolher(n)} className={`h-8 shrink-0 rounded-md text-center text-sm tabular-nums text-kumo-default transition-colors hover:bg-kumo-tint ${n === atual ? "bg-kumo-tint font-semibold" : ""}`}>
          {p2(n)}
        </button>
      ))}
    </div>
  );
}

/** A hora, «HH:mm»: um botão que abre as colunas das horas e dos minutos. */
export function SeletorDeHora({ valor, aoMudar, label, rotulo, disabled, className }: { valor: string; aoMudar: (v: string) => void; label?: string; rotulo?: string; disabled?: boolean; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const [h, m] = /^\d{2}:\d{2}$/.test(valor) ? valor.split(":").map(Number) : [0, 0];
  const nome = label ?? rotulo ?? "Hora";
  return (
    <Campo label={label} className={className}>
      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Popover.Trigger
          disabled={disabled}
          render={
            <button type="button" aria-label={`${nome}: ${p2(h)}:${p2(m)}. Mudar`} className={`${CLASSE_CAMPO} tabular-nums`}>
              {p2(h)}:{p2(m)}
              <Ic nome="relogio" tamanho={16} className="text-kumo-subtle" />
            </button>
          }
        />
        <PopupCartao alinhar="start" className="p-1.5">
          <div className="flex gap-1">
            <Coluna rotulo="Horas" itens={Array.from({ length: 24 }, (_, i) => i)} atual={h} aoEscolher={(n) => aoMudar(`${p2(n)}:${p2(m)}`)} />
            <Coluna
              rotulo="Minutos"
              itens={Array.from({ length: 60 }, (_, i) => i)}
              atual={m}
              aoEscolher={(n) => {
                aoMudar(`${p2(h)}:${p2(n)}`);
                setAberto(false);
              }}
            />
          </div>
        </PopupCartao>
      </Popover.Root>
    </Campo>
  );
}

const paraData = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) : undefined);
const paraIso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** A data, «AAAA-MM-DD»: um botão que abre o calendário. */
export function SeletorDeData({ valor, aoMudar, label, rotulo, disabled, className, minimo }: { valor: string; aoMudar: (v: string) => void; label?: string; rotulo?: string; disabled?: boolean; className?: string; minimo?: Date }) {
  const [aberto, setAberto] = useState(false);
  const data = paraData(valor);
  const nome = label ?? rotulo ?? "Data";
  const texto = data ? data.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "Escolher a data";
  return (
    <Campo label={label} className={className}>
      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Popover.Trigger
          disabled={disabled}
          render={
            <button type="button" aria-label={`${nome}: ${texto}. Mudar`} className={CLASSE_CAMPO}>
              <span className={data ? "" : "text-kumo-subtle"}>{texto}</span>
              <Ic nome="calendario" tamanho={16} className="text-kumo-subtle" />
            </button>
          }
        />
        <PopupCartao alinhar="start" className="p-2">
          <DatePicker
            mode="single"
            locale={pt}
            weekStartsOn={1}
            defaultMonth={data}
            selected={data}
            disabled={minimo ? { before: minimo } : undefined}
            onChange={(d) => {
              if (!d) return;
              aoMudar(paraIso(d));
              setAberto(false);
            }}
          />
        </PopupCartao>
      </Popover.Root>
    </Campo>
  );
}

/** A data com a hora, «AAAA-MM-DDTHH:mm»: o seletor de data e o de hora lado a lado. */
export function SeletorDeDataHora({ valor, aoMudar, label, erro, minimo }: { valor: string; aoMudar: (v: string) => void; label?: string; erro?: string; minimo?: Date }) {
  const [dia = "", hora = "09:00"] = valor.split("T");
  const hoje = paraIso(new Date());
  return (
    <Campo label={label}>
      <div className="flex gap-2">
        <SeletorDeData rotulo="Dia" valor={dia} aoMudar={(d) => aoMudar(`${d}T${hora}`)} className="min-w-0 flex-1" minimo={minimo} />
        <SeletorDeHora rotulo="Hora" valor={hora} aoMudar={(h) => aoMudar(`${dia || hoje}T${h}`)} className="w-28 shrink-0" />
      </div>
      {erro && <span className="text-xs text-kumo-danger">{erro}</span>}
    </Campo>
  );
}
