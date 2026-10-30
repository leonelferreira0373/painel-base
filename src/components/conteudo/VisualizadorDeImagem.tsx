// A imagem quase em ecrã cheio, na moldura em que vai aparecer, para ver como fica e ajustar: no telemóvel afasta-se e aproxima-se com dois dedos e arrasta-se com um; no PC há menos, mais e repor, a roda do rato e arrastar. O ajuste guarda-se como zoom e ponto (ver lib/enquadramento.ts) e vale em qualquer moldura.
"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { useEffect, useRef, useState } from "react";
import { ampliar, arrastar, ENQUADRAMENTO_INICIAL, eInicial, estiloDoEnquadramento, lerEnquadramento, ZOOM_MAXIMO, type Enquadramento, type Medidas } from "@/lib/enquadramento";
import { BotaoIcone } from "../ui";
import { ICONES } from "../Icones";

const PASSO = 1.25;

interface Tamanho {
  largura: number;
  altura: number;
}

const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

function Quadro({ src, alt, proporcao, inicial, aoMudar }: { src: string; alt: string; proporcao: number; inicial: Enquadramento; aoMudar: (e: Enquadramento) => void }) {
  const [e, setE] = useState(inicial);
  const [natural, setNatural] = useState<Tamanho | null>(null);
  const [palco, setPalco] = useState<Tamanho | null>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const [quadro, setQuadro] = useState<HTMLDivElement | null>(null);
  const vivo = useRef(e);
  vivo.current = e;
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const distanciaAnterior = useRef(0);

  const mudar = (novo: Enquadramento) => {
    vivo.current = novo;
    setE(novo);
    aoMudar(novo);
  };

  // a moldura é a maior que cabe no palco com a proporção do sítio onde a imagem vai aparecer
  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;
    const medir = () => setPalco({ largura: el.clientWidth, altura: el.clientHeight });
    medir();
    const o = new ResizeObserver(medir);
    o.observe(el);
    return () => o.disconnect();
  }, []);
  const moldura: Tamanho | null = palco ? (() => { const largura = Math.min(palco.largura, palco.altura * proporcao); return { largura, altura: largura / proporcao }; })() : null;
  const medidas = (): Medidas | null => (moldura && natural && moldura.largura > 0 ? { moldura, imagem: natural } : null);

  // a roda do rato aproxima e afasta, a partir de onde está o rato (só com um ouvinte nativo se pode impedir o scroll da página)
  useEffect(() => {
    if (!quadro) return;
    const aRoda = (ev: WheelEvent) => {
      const m = medidas();
      if (!m) return;
      ev.preventDefault();
      const r = quadro.getBoundingClientRect();
      mudar(ampliar(vivo.current, vivo.current.zoom * Math.exp(-ev.deltaY * 0.002), { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }, m));
    };
    quadro.addEventListener("wheel", aRoda, { passive: false });
    return () => quadro.removeEventListener("wheel", aRoda);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const aoPremir = (ev: React.PointerEvent<HTMLDivElement>) => {
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ponteiros.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      distanciaAnterior.current = distancia(a, b);
    }
  };
  const aoMover = (ev: React.PointerEvent<HTMLDivElement>) => {
    const antes = ponteiros.current.get(ev.pointerId);
    const m = medidas();
    if (!antes || !m) return;
    const agora = { x: ev.clientX, y: ev.clientY };
    const r = ev.currentTarget.getBoundingClientRect();
    if (ponteiros.current.size === 1) {
      ponteiros.current.set(ev.pointerId, agora);
      mudar(arrastar(vivo.current, (agora.x - antes.x) / r.width, (agora.y - antes.y) / r.height, m));
      return;
    }
    // dois dedos: a distância entre eles muda o zoom e o ponto médio arrasta
    const outro = [...ponteiros.current.entries()].find(([id]) => id !== ev.pointerId)?.[1];
    ponteiros.current.set(ev.pointerId, agora);
    if (!outro) return;
    const dist = distancia(agora, outro);
    const medioAntes = { x: (antes.x + outro.x) / 2, y: (antes.y + outro.y) / 2 };
    const medio = { x: (agora.x + outro.x) / 2, y: (agora.y + outro.y) / 2 };
    const fator = distanciaAnterior.current > 0 ? dist / distanciaAnterior.current : 1;
    distanciaAnterior.current = dist;
    const ampliada = ampliar(vivo.current, vivo.current.zoom * fator, { x: (medio.x - r.left) / r.width, y: (medio.y - r.top) / r.height }, m);
    mudar(arrastar(ampliada, (medio.x - medioAntes.x) / r.width, (medio.y - medioAntes.y) / r.height, m));
  };
  const aoSoltar = (ev: React.PointerEvent<HTMLDivElement>) => {
    ponteiros.current.delete(ev.pointerId);
    distanciaAnterior.current = 0;
  };
  const aoDuploToque = (ev: React.MouseEvent<HTMLDivElement>) => {
    const m = medidas();
    if (!m) return;
    const r = ev.currentTarget.getBoundingClientRect();
    mudar(vivo.current.zoom > 1 ? ENQUADRAMENTO_INICIAL : ampliar(vivo.current, 2.5, { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }, m));
  };
  const botao = (zoom: number) => {
    const m = medidas();
    if (m) mudar(ampliar(vivo.current, zoom, { x: 0.5, y: 0.5 }, m));
    else mudar({ ...vivo.current, zoom: Math.min(ZOOM_MAXIMO, Math.max(1, zoom)) });
  };

  return (
    <>
      <div ref={palcoRef} className="grid min-h-0 flex-1 place-items-center bg-kumo-tint p-3 sm:p-6">
        {moldura && (
          <div
            ref={setQuadro}
            style={{ width: moldura.largura, height: moldura.altura }}
            onPointerDown={aoPremir}
            onPointerMove={aoMover}
            onPointerUp={aoSoltar}
            onPointerCancel={aoSoltar}
            onDoubleClick={aoDuploToque}
            className="relative cursor-grab touch-none select-none overflow-hidden rounded-xl bg-kumo-base ring ring-kumo-line active:cursor-grabbing"
          >
            <img src={src} alt={alt} draggable={false} onLoad={(ev) => setNatural({ largura: ev.currentTarget.naturalWidth, altura: ev.currentTarget.naturalHeight })} className="pointer-events-none size-full" style={estiloDoEnquadramento(e)} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-kumo-hairline px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1">
          <BotaoIcone dica="Afastar" icone="menos" desativado={e.zoom <= 1} aoClicar={() => botao(vivo.current.zoom / PASSO)} />
          <span className="w-12 text-center text-sm tabular-nums text-kumo-default">{Math.round(e.zoom * 100)}%</span>
          <BotaoIcone dica="Aproximar" icone="mais" desativado={e.zoom >= ZOOM_MAXIMO} aoClicar={() => botao(vivo.current.zoom * PASSO)} />
          <BotaoIcone dica="Repor o enquadramento" icone="repor" desativado={eInicial(e)} aoClicar={() => mudar(ENQUADRAMENTO_INICIAL)} />
        </div>
      </div>
    </>
  );
}

/** `proporcao` é largura / altura da moldura onde a imagem vai aparecer; `aoGuardar` recebe o enquadramento escolhido. */
export function VisualizadorDeImagem({ aberto, aoMudar, src, alt = "", proporcao, valor, aoGuardar }: { aberto: boolean; aoMudar: (v: boolean) => void; src: string | undefined; alt?: string; proporcao: number; valor?: Enquadramento; aoGuardar: (e: Enquadramento) => void }) {
  const escolhido = useRef<Enquadramento>(lerEnquadramento(valor));
  useEffect(() => {
    if (aberto) escolhido.current = lerEnquadramento(valor);
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="xl" className="flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-kumo-hairline px-4 py-3 sm:px-5">
          <Dialog.Title className="text-lg font-semibold">Enquadramento</Dialog.Title>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => {
                aoGuardar(escolhido.current);
                aoMudar(false);
              }}
            >
              Guardar
            </Button>
            <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
        </div>
        {aberto && src && <Quadro src={src} alt={alt} proporcao={proporcao} inicial={lerEnquadramento(valor)} aoMudar={(novo) => (escolhido.current = novo)} />}
      </Dialog>
    </Dialog.Root>
  );
}
