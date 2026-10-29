// O diagrama de nós do painel da Cloudflare (o dos Workers): caixas em colunas, ligadas por linhas com seta. Cada caixa é um nó (`NoDoFluxo`) e as ligações dizem de que nó sai cada seta e para onde vai; o diagrama mede as caixas no ecrã e desenha as linhas, por isso os nós podem crescer, abrir e fechar. Serve para mudar as coisas à vista: as versões A e B, o repositório e o ramo do GitHub. No telemóvel o diagrama desliza na horizontal (com desvanecimento), nunca se corta nem se empilha.
"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Ic } from "./Icones";

export interface LigacaoDoFluxo {
  de: string;
  para: string;
}

interface Caixa {
  esquerda: number;
  direita: number;
  centro: number;
}

const RegistoContext = createContext<((id: string, el: HTMLElement | null) => void) | null>(null);

/** Uma caixa do diagrama. Ao `id` ligam-se as setas. */
export function NoDoFluxo({ id, titulo, icone, indicador, contagem, children, className = "" }: { id: string; titulo: ReactNode; icone?: ReactNode; /** A bolinha do canto (a cor diz o estado). */ indicador?: "azul" | "ambar" | "verde" | "cinza"; contagem?: number; children?: ReactNode; className?: string }) {
  const registar = useContext(RegistoContext);
  const cores = { azul: "bg-blue-500", ambar: "bg-amber-500", verde: "bg-emerald-500", cinza: "bg-neutral-400" } as const;
  return (
    <div ref={(el) => registar?.(id, el)} data-no-do-fluxo={id} className={`w-[260px] shrink-0 rounded-xl border border-black/15 bg-neutral-50 p-1 shadow-xs dark:border-neutral-800 dark:bg-kumo-base ${className}`}>
      <div className="flex items-center gap-2 rounded-lg bg-kumo-base px-3 py-2.5 shadow-md shadow-black/5 ring ring-black/10 dark:ring-neutral-800">
        {icone && <span className="shrink-0 text-kumo-subtle">{icone}</span>}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-kumo-default">{titulo}</span>
        {contagem !== undefined && <span className="flex size-[18px] shrink-0 items-center justify-center rounded bg-neutral-500 text-xs text-white">{contagem}</span>}
        {indicador && <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${cores[indicador]}`} />}
      </div>
      {children && <div className="flex flex-col gap-2 p-2">{children}</div>}
    </div>
  );
}

/** Uma coluna de nós (uns por baixo dos outros). */
export function ColunaDoFluxo({ children }: { children: ReactNode }) {
  return <div className="flex flex-col justify-center gap-4">{children}</div>;
}

/** Uma linha de rótulo e valor dentro de um nó (como «Workers Logs ... Disabled»). */
export function LinhaDoNo({ rotulo, children }: { rotulo: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-kumo-subtle">{rotulo}</span>
      <span aria-hidden className="h-px min-w-3 flex-1 bg-black/10 dark:bg-white/10" />
      <span className="min-w-0 max-w-full truncate text-right font-medium text-kumo-default">{children}</span>
    </div>
  );
}

const RAIO = 10;

/** O caminho de uma seta: sai da direita do nó de origem, desce ou sobe em ângulo reto e entra pela esquerda do destino. */
export function caminhoDaSeta(x1: number, y1: number, x2: number, y2: number): string {
  if (Math.abs(y1 - y2) < 1) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const meio = x1 + Math.max(16, (x2 - x1) / 2);
  const sentido = y2 > y1 ? 1 : -1;
  const r = Math.min(RAIO, Math.abs(y2 - y1) / 2, (x2 - x1) / 4);
  return `M ${x1} ${y1} L ${meio - r} ${y1} Q ${meio} ${y1} ${meio} ${y1 + sentido * r} L ${meio} ${y2 - sentido * r} Q ${meio} ${y2} ${meio + r} ${y2} L ${x2} ${y2}`;
}

export function Fluxo({ ligacoes, children, rotulo }: { ligacoes: LigacaoDoFluxo[]; children: ReactNode; rotulo: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const nos = useRef(new Map<string, HTMLElement>());
  const [medidas, setMedidas] = useState<Record<string, Caixa & { y: number }>>({});
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });

  const medir = useCallback(() => {
    const c = caixa.current;
    if (!c) return;
    const base = c.getBoundingClientRect();
    const m: Record<string, Caixa & { y: number }> = {};
    nos.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      // a seta liga ao meio do cabeçalho do nó (28 px do topo), como na Cloudflare; num nó baixo, ao meio
      const y = r.top - base.top + Math.min(r.height / 2, 28);
      m[id] = { esquerda: r.left - base.left, direita: r.right - base.left, centro: r.left - base.left + r.width / 2, y };
    });
    setMedidas(m);
    setTamanho({ largura: c.scrollWidth, altura: c.scrollHeight });
  }, []);

  const registar = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) nos.current.set(id, el);
      else nos.current.delete(id);
    },
    [],
  );

  // mede ao aparecer e sempre que algo muda de tamanho (um nó que abre, o ecrã que roda)
  useLayoutEffect(() => {
    medir();
    const c = caixa.current;
    if (!c || typeof ResizeObserver === "undefined") return;
    const o = new ResizeObserver(() => medir());
    o.observe(c);
    nos.current.forEach((el) => o.observe(el));
    window.addEventListener("resize", medir);
    return () => {
      o.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [medir, ligacoes.length, children]);

  return (
    <RegistoContext.Provider value={registar}>
      <div className="sem-barra overflow-x-auto rounded-xl bg-kumo-recessed/60 p-4 ring ring-kumo-line sm:p-6" role="group" aria-label={rotulo}>
        <div ref={caixa} className="relative flex min-w-max items-stretch gap-16">
          {children}
          <svg aria-hidden className="pointer-events-none absolute left-0 top-0 text-neutral-400 dark:text-neutral-500" width={tamanho.largura} height={tamanho.altura} style={{ overflow: "visible" }}>
            {ligacoes.map((l) => {
              const a = medidas[l.de];
              const b = medidas[l.para];
              if (!a || !b) return null;
              return (
                <g key={`${l.de}>${l.para}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d={caminhoDaSeta(a.direita + 2, a.y, b.esquerda - 8, b.y)} />
                  <path d={`M ${b.esquerda - 13} ${b.y - 4} L ${b.esquerda - 7} ${b.y} L ${b.esquerda - 13} ${b.y + 4}`} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </RegistoContext.Provider>
  );
}

/** O ícone que acompanha os nós de GitHub. */
export const IconeDoGitHub = () => <Ic nome="codigo" tamanho={16} />;
