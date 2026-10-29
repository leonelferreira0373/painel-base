// Um número que muda como uma roda de odómetro: cada algarismo rola na vertical até ao novo valor (para cima quando o número cresce, para baixo quando diminui), nunca salta. Ao aparecer, os algarismos sobem desde o zero. Quem tem o movimento reduzido vê o número parado. As contas estão em lib/roda.ts.
"use client";

import { useEffect, useRef, useState } from "react";
import { algarismoEm, caracteresDe, proximaPosicao, repousoDe, rodaParaCima, TAMANHO_DA_TIRA } from "@/lib/roda";

const TIRA = Array.from({ length: TAMANHO_DA_TIRA }, (_, i) => i % 10);
const DURACAO = 900;

function movimentoReduzido(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Um algarismo na sua roda. `inicial` é o algarismo de onde parte ao aparecer. */
function Roda({ algarismo, paraCima, inicial }: { algarismo: number; paraCima: boolean; inicial: number }) {
  // `posicao` é o sítio na tira de trinta; em repouso fica na volta do meio (10–19)
  const [posicao, setPosicao] = useState(repousoDe(inicial));
  const [animar, setAnimar] = useState(false);
  const ultimo = useRef<number>(inicial);
  useEffect(() => {
    if (algarismo === ultimo.current) return;
    ultimo.current = algarismo;
    if (movimentoReduzido()) {
      setAnimar(false);
      setPosicao(repousoDe(algarismo));
      return;
    }
    setPosicao((p) => {
      const destino = proximaPosicao(p, algarismo, paraCima);
      setAnimar(destino !== null);
      return destino ?? repousoDe(algarismo);
    });
  }, [algarismo, paraCima]);
  // acabada a rolagem, volta em silêncio à volta do meio, para a próxima ter sempre tira à frente e atrás
  const aoAcabar = () => {
    setAnimar(false);
    setPosicao((p) => repousoDe(algarismoEm(p)));
  };
  return (
    <span className="relative inline-block h-[1.2em] overflow-hidden align-bottom leading-[1.2]" aria-hidden>
      <span className="block" onTransitionEnd={aoAcabar} style={{ transform: `translateY(${-posicao * 1.2}em)`, transition: animar ? `transform ${DURACAO}ms cubic-bezier(0.22, 1, 0.36, 1)` : "none" }}>
        {TIRA.map((d, i) => (
          <span key={i} className="block h-[1.2em]">
            {d}
          </span>
        ))}
      </span>
      {/* a largura de um algarismo, para a roda não colapsar */}
      <span className="invisible block h-0">{algarismo}</span>
    </span>
  );
}

export function NumeroEmRoda({ valor, className = "", aoAparecer = true }: { valor: string; className?: string; /** Os algarismos sobem desde o zero quando o número aparece. */ aoAparecer?: boolean }) {
  const anterior = useRef<string | null>(null);
  const paraCima = rodaParaCima(anterior.current, valor);
  useEffect(() => {
    anterior.current = valor;
  }, [valor]);
  return (
    <span className={`inline-flex whitespace-pre tabular-nums ${className}`} role="text" aria-label={valor}>
      {caracteresDe(valor).map((x) =>
        x.algarismo ? <Roda key={x.posicao} algarismo={Number(x.c)} paraCima={paraCima} inicial={aoAparecer ? 0 : Number(x.c)} /> : <span key={x.posicao} aria-hidden>{x.c}</span>,
      )}
    </span>
  );
}
