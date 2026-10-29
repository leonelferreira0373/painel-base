// O mapa em direto do táxi: as seis zonas, os motoristas (a cor diz se estão disponíveis, em corrida, em pausa ou offline) e os pedidos por atender. Desenha-se com SVG a partir dos motoristas e das corridas do próprio painel: mudar o estado de um motorista ou de uma corrida muda o mapa. Em modo simulado os motoristas mexem-se um pouco a cada dois segundos.
"use client";

import { useMemo, useState } from "react";
import { ZONAS_DO_TAXI } from "@/dados/modulos-negocios";
import { useApp } from "@/lib/estado";
import { Cartao, Linha } from "../conta/Pecas";
import { Estado } from "../Estado";
import { Pagina, Titulo } from "../ui";
import { inteiro, TabelaSimples, useTick } from "../super/SuperPecas";

const LARGURA = 120;
const ALTURA = 80;
const LADO = 40;

/** A cor de cada estado de motorista (as cores do tema). */
const COR: Record<string, string> = { Disponível: "var(--color-kumo-success)", "Em corrida": "var(--color-kumo-brand)", Pausa: "var(--color-kumo-warning)", Offline: "var(--color-kumo-subtle)" };

/** Um número fixo a partir de um texto, para cada motorista e cada pedido ter sempre o seu sítio. */
const marca = (texto: string) => [...texto].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const canto = (zona: string) => {
  const i = Math.max(0, ZONAS_DO_TAXI.indexOf(zona as (typeof ZONAS_DO_TAXI)[number]));
  return { x: (i % 3) * LADO, y: Math.floor(i / 3) * LADO };
};

/** O sítio de uma coisa dentro da sua zona (de 6 a 34 em cada eixo). */
function posicao(zona: string, id: string, deriva = 0, t = 0) {
  const h = marca(id);
  const c = canto(zona);
  const mover = (base: number, fase: number) => Math.min(LADO - 5, Math.max(5, base + Math.sin((t + fase) / 2.2) * deriva));
  return { x: c.x + mover(6 + (h % 28), h % 7), y: c.y + mover(6 + ((h >> 5) % 28), (h >> 3) % 5) };
}

export function MapaDoTaxi() {
  const { registos } = useApp();
  const t = useTick(2000);
  const motoristas = registos.motoristas ?? [];
  const pedidos = useMemo(() => (registos.corridas ?? []).filter((c) => c.estado === "Pedida"), [registos.corridas]);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const atual = motoristas.find((m) => m.id === escolhido);
  const contar = (zona: string, estado: string) => motoristas.filter((m) => m.zona === zona && m.estado === estado).length;
  const linhas = ZONAS_DO_TAXI.map((zona) => ({ zona, disponiveis: contar(zona, "Disponível"), emCorrida: contar(zona, "Em corrida"), pedidos: pedidos.filter((p) => p.origem === zona).length }));

  return (
    <Pagina>
      <Titulo titulo="Mapa em direto" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Cartao titulo={`Frota (${motoristas.length} motoristas, ${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"} por atender)`}>
          <div className="p-3">
            <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="block w-full rounded-lg bg-kumo-recessed" role="img" aria-label="Mapa das zonas com os motoristas e os pedidos">
              {ZONAS_DO_TAXI.map((zona) => {
                const c = canto(zona);
                return (
                  <g key={zona}>
                    <rect x={c.x + 1} y={c.y + 1} width={LADO - 2} height={LADO - 2} rx={3} fill="var(--color-kumo-base)" stroke="var(--color-kumo-line)" strokeWidth={0.4} />
                    {[10, 20, 30].map((d) => (
                      <g key={d} stroke="var(--color-kumo-hairline)" strokeWidth={0.35}>
                        <line x1={c.x + 2} x2={c.x + LADO - 2} y1={c.y + d} y2={c.y + d} />
                        <line y1={c.y + 2} y2={c.y + LADO - 2} x1={c.x + d} x2={c.x + d} />
                      </g>
                    ))}
                    <text x={c.x + 3.5} y={c.y + 6} fontSize={3.2} fill="var(--color-kumo-subtle)">
                      {zona}
                    </text>
                  </g>
                );
              })}
              {pedidos.map((p) => {
                const { x, y } = posicao(String(p.origem), String(p.id));
                return (
                  <g key={String(p.id)} transform={`translate(${x} ${y})`}>
                    <rect x={-1.6} y={-1.6} width={3.2} height={3.2} transform="rotate(45)" fill="var(--color-kumo-danger)" className="animate-pulse">
                      <title>{`Pedido ${p.referencia}: ${p.passageiro}, de ${p.origem} para ${p.destino}`}</title>
                    </rect>
                  </g>
                );
              })}
              {motoristas.map((m) => {
                const { x, y } = posicao(String(m.zona), String(m.id), m.estado === "Em corrida" ? 5 : m.estado === "Disponível" ? 2 : 0, t);
                const ativo = m.id === escolhido;
                return (
                  <g key={m.id} style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform 1.9s linear" }} onClick={() => setEscolhido(ativo ? null : m.id)} className="cursor-pointer" role="button" aria-label={`${m.nome}, ${m.estado}, ${m.zona}`} tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setEscolhido(ativo ? null : m.id)}>
                    {ativo && <circle r={3.4} fill="none" stroke="var(--color-kumo-default)" strokeWidth={0.5} />}
                    <circle r={1.9} fill={COR[String(m.estado)] ?? COR.Offline} stroke="var(--color-kumo-base)" strokeWidth={0.5} />
                    <title>{`${m.nome} · ${m.estado}`}</title>
                  </g>
                );
              })}
            </svg>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-kumo-subtle" aria-label="Legenda">
              {Object.entries(COR).map(([estado, cor]) => (
                <li key={estado} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: cor }} />
                  {estado} ({inteiro(motoristas.filter((m) => m.estado === estado).length)})
                </li>
              ))}
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rotate-45 bg-kumo-danger" />
                Pedido por atender
              </li>
            </ul>
          </div>
        </Cartao>
        <div className="flex min-w-0 flex-col gap-4">
          <Cartao titulo="Motorista">
            {atual ? (
              <>
                <Linha titulo={String(atual.nome)} estado={`${atual.viatura} · ${atual.zona}`}>
                  <Estado valor={String(atual.estado)} modulo="motoristas" />
                </Linha>
                <Linha titulo="Corridas feitas">
                  <span className="tabular-nums">{inteiro(Number(atual.corridas))}</span>
                </Linha>
                <Linha titulo="Avaliação">
                  <span className="tabular-nums">{Number(atual.avaliacao).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}</span>
                </Linha>
              </>
            ) : (
              <div className="p-4 text-sm text-kumo-subtle">Toque num motorista do mapa.</div>
            )}
          </Cartao>
        </div>
      </div>
      <Cartao titulo="Zonas">
        <TabelaSimples
          colunas={[
            { rotulo: "Zona", render: (l: (typeof linhas)[number]) => <span className="font-medium">{l.zona}</span> },
            { rotulo: "Disponíveis", direita: true, render: (l: (typeof linhas)[number]) => l.disponiveis },
            { rotulo: "Em corrida", direita: true, render: (l: (typeof linhas)[number]) => l.emCorrida },
            { rotulo: "Pedidos por atender", direita: true, render: (l: (typeof linhas)[number]) => l.pedidos },
          ]}
          linhas={linhas}
          chave={(l) => l.zona}
        />
      </Cartao>
    </Pagina>
  );
}
