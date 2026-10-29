// Seletor de período no formato do painel da Cloudflare: intervalo escrito à mão, calendário, períodos habituais, início e fim, fuso horário e «Aplicar».
"use client";

import { Button, DatePicker, Input, Popover, Select } from "@cloudflare/kumo";
import { PopupCartao } from "./Flutuantes";
import { pt } from "react-day-picker/locale";
import { useEffect, useState } from "react";
import { Dica } from "./Dica";
import { Esbatido } from "./Estados";
import { Ic, ICONES } from "./Icones";

export interface Periodo {
  /** Número de dias, a contar do último dia. */
  dias: number;
  /** Último dia, em formato AAAA-MM-DD. */
  fim: string;
  rotulo: string;
  /** Quando o período é de um dia ou menos: o número de horas (a série passa a ser por hora). */
  horas?: number;
}

export const HOJE = "2026-10-28";
export const AGORA = "19:06";

export const PERIODOS: Periodo[] = [
  { dias: 1, horas: 0.5, fim: HOJE, rotulo: "Últimos 30 minutos" },
  { dias: 1, horas: 1, fim: HOJE, rotulo: "Última hora" },
  { dias: 1, horas: 6, fim: HOJE, rotulo: "Últimas 6 horas" },
  { dias: 1, horas: 12, fim: HOJE, rotulo: "Últimas 12 horas" },
  { dias: 1, horas: 24, fim: HOJE, rotulo: "Últimas 24 horas" },
  { dias: 7, fim: HOJE, rotulo: "Últimos 7 dias" },
  { dias: 30, fim: HOJE, rotulo: "Últimos 30 dias" },
];
export const PERIODO_PREDEFINIDO = PERIODOS[6];

const ZONAS = {
  wat: { rotulo: "Hora da África Ocidental (GMT+1)", horas: 0 },
  cat: { rotulo: "Hora da África Central (GMT+2)", horas: 1 },
  utc: { rotulo: "Tempo Universal Coordenado (GMT+0)", horas: -1 },
} as const;
type Zona = keyof typeof ZONAS;

const DIA_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const texto = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const lerTexto = (t: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(t.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)));
  return Number.isNaN(d.getTime()) ? null : d;
};
const AGORA_DATA = lerTexto(`${HOJE} ${AGORA}`)!;

/** Início e fim de um período, como datas «de parede» (sem fuso). */
export function intervaloDe(p: Periodo): { ini: Date; fim: Date } {
  const fim = p.fim === HOJE ? AGORA_DATA : lerTexto(`${p.fim} 23:59`)!;
  return { ini: new Date(fim.getTime() - (p.horas ? p.horas * 3_600_000 : p.dias * DIA_MS)), fim };
}

const curto = (d: Date, comHora: boolean) => {
  const dia = d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", timeZone: "UTC" });
  return comHora ? `${dia} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : dia;
};

function periodoDe(ini: Date, fim: Date): Periodo {
  const ms = Math.max(60_000, fim.getTime() - ini.getTime());
  const dia = texto(fim).slice(0, 10);
  if (ms <= DIA_MS) return { dias: 1, horas: ms / 3_600_000, fim: dia, rotulo: `${curto(ini, true)} – ${curto(fim, true)}` };
  return { dias: Math.min(90, Math.max(1, Math.round(ms / DIA_MS))), fim: dia, rotulo: `${curto(ini, false)} – ${curto(fim, false)}` };
}

/** «3h», «3 horas», «45 min», «2 dias», «últimos 2 dias»… */
export function lerIntervalo(entrada: string): Periodo | null {
  const m = /^(?:[úu]ltim[oa]s?\s+)?(\d+(?:[.,]\d+)?)\s*(m|min|minutos?|h|horas?|d|dias?|sem|semanas?)$/i.exec(entrada.trim());
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  const u = m[2].toLowerCase();
  const horas = u.startsWith("m") && !u.startsWith("me") ? n / 60 : u.startsWith("h") ? n : u.startsWith("s") ? n * 168 : n * 24;
  if (!(horas > 0) || horas > 24 * 90) return null;
  const fmt = (v: number) => v.toLocaleString("pt-PT", { maximumFractionDigits: 1 });
  if (horas <= 24) {
    const rotulo = horas === 1 ? "Última hora" : horas < 1 ? `Últimos ${fmt(horas * 60)} minutos` : `Últimas ${fmt(horas)} horas`;
    return { dias: 1, horas, fim: HOJE, rotulo };
  }
  const dias = Math.round(horas / 24);
  return { dias, fim: HOJE, rotulo: `Últimos ${dias} dias` };
}

export function mesmoPeriodo(a: Periodo, b: Periodo) {
  return a.dias === b.dias && a.fim === b.fim && a.horas === b.horas && a.rotulo === b.rotulo;
}

/** Lista de períodos habituais, reutilizada pelo seletor e pelo menu de cada cartão. */
export function ListaPeriodos({ periodo, aoEscolher, className = "" }: { periodo: Periodo; aoEscolher: (p: Periodo) => void; className?: string }) {
  return (
    <div role="listbox" aria-label="Períodos" className={`flex ${className}`}>
      {PERIODOS.map((p) => {
        const ativo = mesmoPeriodo(p, periodo);
        return (
          <button
            key={p.rotulo}
            role="option"
            aria-selected={ativo}
            onClick={() => aoEscolher(p)}
            className={`flex h-[33px] shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 text-left text-sm transition-colors hover:bg-kumo-tint ${ativo ? "bg-kumo-tint font-medium" : ""}`}
          >
            {p.rotulo}
            {ativo && <Ic nome="certo" tamanho={14} className="text-kumo-subtle" />}
          </button>
        );
      })}
    </div>
  );
}

function Campo({ rotulo, valor, aoMudar }: { rotulo: string; valor: string; aoMudar: (t: string) => boolean }) {
  const [edicao, setEdicao] = useState<string | null>(null);
  const [invalido, setInvalido] = useState(false);
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs text-kumo-subtle">
      {rotulo}
      <span className="relative block">
        <Ic nome="calendario" tamanho={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-kumo-subtle" />
        <Input
          value={edicao ?? valor}
          aria-invalid={invalido}
          className="w-full pl-9 tabular-nums"
          onChange={(e) => setEdicao(e.target.value)}
          onBlur={() => {
            if (edicao !== null) setInvalido(!aoMudar(edicao));
            setEdicao(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </span>
    </label>
  );
}

export function SeletorPeriodo({ periodo, aoMudar }: { periodo: Periodo; aoMudar: (p: Periodo) => void }) {
  const [aberto, setAberto] = useState(false);
  const [zona, setZona] = useState<Zona>("wat");
  const [rasc, setRasc] = useState(() => intervaloDe(periodo));
  const [escrito, setEscrito] = useState("");
  const [erro, setErro] = useState(false);
  useEffect(() => {
    if (aberto) {
      setRasc(intervaloDe(periodo));
      setEscrito("");
      setErro(false);
    }
  }, [aberto, periodo]);

  const desloc = ZONAS[zona].horas * 3_600_000;
  const mostrar = (d: Date) => texto(new Date(d.getTime() + desloc));
  const escolher = (p: Periodo) => {
    aoMudar(p);
    setAberto(false);
  };
  const aplicarEscrito = () => {
    const p = lerIntervalo(escrito);
    if (!p) {
      setErro(true);
      return;
    }
    escolher(p);
  };
  const dataLocal = (d: Date) => new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Dica conteudo="Mudar o período das análises: escreva um intervalo, escolha um dos habituais ou marque dias no calendário.">
        <Popover.Trigger
          render={
            <Button variant="secondary" icon={ICONES.calendario} aria-label="Período">
              {periodo.rotulo}
            </Button>
          }
        />
      </Dica>
      <PopupCartao alinhar="end" className="w-[min(580px,calc(100vw-16px))]">
            <div className="border-b border-kumo-hairline p-2">
              <Input
                value={escrito}
                onChange={(e) => {
                  setEscrito(e.target.value);
                  setErro(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && aplicarEscrito()}
                aria-label="Intervalo personalizado"
                aria-invalid={erro}
                placeholder="Intervalo personalizado: 3h, 3 horas, 3 dias…"
                className="w-full border-0 shadow-none ring-0"
              />
              {erro && <div className="px-3 pb-1 pt-1 text-xs text-kumo-danger">Não percebi esse intervalo. Experimente 3h, 45 minutos ou 2 dias.</div>}
            </div>
            <div className="flex flex-col sm:flex-row">
              <Esbatido className="sem-barra order-first overflow-x-auto border-b border-kumo-hairline p-2 sm:hidden">
                <ListaPeriodos periodo={periodo} aoEscolher={escolher} className="flex-row gap-1" />
              </Esbatido>
              <div className="flex flex-1 justify-center p-3">
                <DatePicker
                  mode="range"
                  locale={pt}
                  weekStartsOn={1}
                  defaultMonth={dataLocal(rasc.fim)}
                  disabled={{ after: dataLocal(AGORA_DATA) }}
                  selected={{ from: dataLocal(rasc.ini), to: dataLocal(rasc.fim) }}
                  onChange={(r) => {
                    if (!r?.from) return;
                    const ate = r.to ?? r.from;
                    const fim = texto(new Date(Date.UTC(ate.getFullYear(), ate.getMonth(), ate.getDate()))).slice(0, 10) === HOJE ? AGORA_DATA : new Date(Date.UTC(ate.getFullYear(), ate.getMonth(), ate.getDate(), 23, 59));
                    setRasc({ ini: new Date(Date.UTC(r.from.getFullYear(), r.from.getMonth(), r.from.getDate())), fim });
                  }}
                />
              </div>
              <div className="hidden border-l border-kumo-hairline p-2 sm:block sm:min-w-[188px]">
                <ListaPeriodos periodo={periodo} aoEscolher={escolher} className="flex-col gap-0.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-kumo-hairline p-3">
              <Campo
                rotulo="Início"
                valor={mostrar(rasc.ini)}
                aoMudar={(t) => {
                  const d = lerTexto(t);
                  if (!d) return false;
                  setRasc((r) => ({ ...r, ini: new Date(d.getTime() - desloc) }));
                  return true;
                }}
              />
              <Campo
                rotulo="Fim"
                valor={mostrar(rasc.fim)}
                aoMudar={(t) => {
                  const d = lerTexto(t);
                  if (!d) return false;
                  setRasc((r) => ({ ...r, fim: new Date(d.getTime() - desloc) }));
                  return true;
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-kumo-hairline bg-kumo-tint/50 p-3">
              <Select value={zona} onValueChange={(v) => setZona(v as Zona)} aria-label="Fuso horário" className="min-w-0 flex-1 sm:max-w-[300px]" items={Object.fromEntries(Object.entries(ZONAS).map(([k, z]) => [k, z.rotulo]))} />
              <Button variant="primary" disabled={rasc.fim.getTime() <= rasc.ini.getTime()} onClick={() => escolher(periodoDe(rasc.ini, rasc.fim))}>
                Aplicar
              </Button>
            </div>
          </PopupCartao>
    </Popover.Root>
  );
}
