// Elementos gráficos pequenos: anel de percentagem, linha de tendência e número que conta até ao valor final.
"use client";

import { useEffect, useRef, useState } from "react";
import { COR, FONTE, formatar } from "./base";

export function Anel({ valor, tamanho = 96 }: { valor: number; tamanho?: number }) {
  const raio = tamanho / 2 - 9;
  const c = 2 * Math.PI * raio;
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setV(valor), 30);
    return () => window.clearTimeout(id);
  }, [valor]);
  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} role="img" aria-label={`${Math.round(valor)} %`}>
      <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" style={{ stroke: "var(--color-kumo-line)" }} strokeWidth={12} />
      <circle
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={raio}
        fill="none"
        stroke={COR.acento}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(100, v)) / 100)}
        transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)" }}
      />
      <text x="50%" y="50%" dy="0.35em" textAnchor="middle" style={{ fill: "var(--text-color-kumo-default)", fontFamily: FONTE }} fontSize={tamanho * 0.26} fontWeight={700}>
        {Math.round(valor)}
      </text>
    </svg>
  );
}

export function Tendencia({ valores, largura = 96, altura = 28 }: { valores: number[]; largura?: number; altura?: number }) {
  if (valores.length < 2) return <svg width={largura} height={altura} aria-hidden />;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const pontos = valores.map((v, i) => `${((i / (valores.length - 1)) * (largura - 4) + 2).toFixed(1)},${(altura - 3 - ((v - min) / (max - min || 1)) * (altura - 6)).toFixed(1)}`);
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} aria-hidden>
      <polyline points={pontos.join(" ")} fill="none" stroke={COR.acento} strokeWidth={3.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Número que sobe até ao valor final. A largura fica reservada com `tabular-nums` para não mexer no resto da página. */
export function Contador({ valor, decimais = 0 }: { valor: number; decimais?: number }) {
  const [v, setV] = useState(0);
  const inicio = useRef<number | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(valor);
      return;
    }
    let id = 0;
    inicio.current = null;
    const passo = (t: number) => {
      inicio.current ??= t;
      const p = Math.min(1, (t - inicio.current) / 900);
      setV(valor * (1 - (1 - p) ** 3));
      if (p < 1) id = window.requestAnimationFrame(passo);
    };
    id = window.requestAnimationFrame(passo);
    const fim = window.setTimeout(() => setV(valor), 1200);
    return () => {
      window.cancelAnimationFrame(id);
      window.clearTimeout(fim);
    };
  }, [valor]);
  const texto = decimais > 0 ? v.toLocaleString("pt-PT", { minimumFractionDigits: decimais, maximumFractionDigits: decimais }) : formatar(Math.round(v));
  return <span className="br-num">{texto}</span>;
}

/** Gráfico de área sem eixos, da largura toda do cartão (os das estatísticas da análise, como os da Cloudflare). */
export function AreaMini({ valores, altura = 60, cor }: { valores: number[]; altura?: number; cor?: string }) {
  const max = Math.max(1, ...valores);
  const n = Math.max(2, valores.length);
  const x = (i: number) => (i / (n - 1)) * 100;
  const y = (v: number) => 36 - (v / max) * 32;
  const linha = valores.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="block w-full" style={{ height: altura }} aria-hidden>
      <path d={`${linha} L100,40 L0,40 Z`} fill={cor ?? "var(--color-kumo-brand)"} opacity="0.14" />
      <path d={linha} fill="none" stroke={cor ?? "var(--color-kumo-brand)"} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
