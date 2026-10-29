// O seletor de cor desenhado por nós (nunca o do navegador, que muda de sistema para sistema): uma área de saturação e luminosidade e uma barra de matiz, com rato, toque e teclado. Quem o usa mostra também o campo do código da cor.
"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { hexParaHsv, hsvParaHex } from "@/lib/cor";

const limitar = (n: number) => Math.min(1, Math.max(0, n));

export function EscolhaDeCor({ valor, aoMudar }: { valor: string; aoMudar: (hex: string) => void }) {
  const [h, s, v] = hexParaHsv(valor);
  // Os cinzentos não têm matiz: guarda-se o último, para a barra não saltar para o vermelho.
  const [matizGuardado, setMatizGuardado] = useState(h);
  const matiz = s > 0.01 && v > 0.01 ? h : matizGuardado;
  const area = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);

  const mudarArea = (sat: number, val: number) => aoMudar(hsvParaHex(matiz, limitar(sat), limitar(val)));
  const mudarMatiz = (m: number) => {
    const novo = ((m % 360) + 360) % 360;
    setMatizGuardado(novo);
    aoMudar(hsvParaHex(novo, s, v));
  };
  const naArea = (e: PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    mudarArea((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
  };
  const naBarra = (e: PointerEvent) => {
    const r = barra.current!.getBoundingClientRect();
    mudarMatiz(limitar((e.clientX - r.left) / r.width) * 360);
  };
  const aoTeclarArea = (e: KeyboardEvent) => {
    const passo = e.shiftKey ? 0.1 : 0.02;
    const mapa: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] };
    const d = mapa[e.key];
    if (!d) return;
    e.preventDefault();
    mudarArea(s + d[0], v + d[1]);
  };
  const aoTeclarBarra = (e: KeyboardEvent) => {
    const passo = e.shiftKey ? 15 : 3;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") (e.preventDefault(), mudarMatiz(matiz - passo));
    if (e.key === "ArrowRight" || e.key === "ArrowUp") (e.preventDefault(), mudarMatiz(matiz + passo));
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={area}
        role="slider"
        tabIndex={0}
        aria-label="Saturação e luminosidade"
        aria-valuetext={`Saturação ${Math.round(s * 100)} %, luminosidade ${Math.round(v * 100)} %`}
        aria-valuenow={Math.round(s * 100)}
        onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), naArea(e))}
        onPointerMove={(e) => e.buttons === 1 && naArea(e)}
        onKeyDown={aoTeclarArea}
        className="relative h-28 w-full cursor-crosshair touch-none rounded-lg ring-1 ring-black/10 focus-visible:ring-2 focus-visible:ring-kumo-brand dark:ring-white/20"
        style={{ background: `linear-gradient(to top, rgb(0 0 0), rgb(0 0 0 / 0)), linear-gradient(to right, rgb(255 255 255), hsl(${matiz} 100% 50%))` }}
      >
        <span aria-hidden className="pointer-events-none absolute size-4 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: `${s * 100}%`, bottom: `${v * 100}%`, background: valor, boxShadow: "0 0 0 1px rgb(0 0 0 / 0.35)" }} />
      </div>
      <div
        ref={barra}
        role="slider"
        tabIndex={0}
        aria-label="Matiz"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(matiz)}
        onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), naBarra(e))}
        onPointerMove={(e) => e.buttons === 1 && naBarra(e)}
        onKeyDown={aoTeclarBarra}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full ring-1 ring-black/10 focus-visible:ring-2 focus-visible:ring-kumo-brand dark:ring-white/20"
        style={{ background: "linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))" }}
      >
        <span aria-hidden className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: `${(matiz / 360) * 100}%`, background: `hsl(${matiz} 100% 50%)`, boxShadow: "0 0 0 1px rgb(0 0 0 / 0.35)" }} />
      </div>
    </div>
  );
}
