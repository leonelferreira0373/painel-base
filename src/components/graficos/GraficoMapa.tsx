// Mapa-múndi com os países coloridos pelo valor (como os mapas da análise da Cloudflare), interativo: passar o rato destaca o país (e avisa quem o usa), clicar escolhe-o. Os contornos (world-atlas, domínio público) só se carregam quando o mapa aparece.
"use client";

import type { ECharts } from "echarts/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { echarts } from "@/lib/echarts";
import { useTema } from "@/lib/tema";
import { SemDadosGrafico } from "../Estados";
import { paraEscuro } from "./Graficos";

type Anel = number[][];

/** Os países que cruzam a linha do meridiano 180° (a Rússia, as Fiji) vêm com saltos de 360° na longitude e desenhavam uma risca por cima do mapa: continua-se a longitude para os anéis ficarem inteiros. */
function continuar(anel: Anel): Anel {
  let deslocamento = 0;
  let anterior = anel[0][0];
  return anel.map(([lon, lat], i) => {
    if (i === 0) return [lon, lat];
    let x = lon + deslocamento;
    while (x - anterior > 180) {
      x -= 360;
      deslocamento -= 360;
    }
    while (x - anterior < -180) {
      x += 360;
      deslocamento += 360;
    }
    anterior = x;
    return [x, lat];
  });
}

let registo: Promise<void> | null = null;
/** Regista o mapa «mundo» no ECharts, uma só vez, sem a Antártida (ocupava o fundo todo e não tem dados). */
function registarMapa(): Promise<void> {
  registo ??= import("world-atlas/countries-110m.json").then((modulo) => {
    const topologia = (modulo as unknown as { default: Topology }).default;
    const paises = feature(topologia, topologia.objects.countries as GeometryCollection);
    const features = paises.features
      .filter((f) => f.id !== "010")
      .map((f) => {
        const g = f.geometry as { type: string; coordinates: Anel[] | Anel[][] } | null;
        if (!g) return f;
        const coordinates = g.type === "Polygon" ? (g.coordinates as Anel[]).map(continuar) : g.type === "MultiPolygon" ? (g.coordinates as Anel[][]).map((p) => p.map(continuar)) : g.coordinates;
        return { ...f, geometry: { ...g, coordinates } };
      });
    echarts.registerMap("mundo", { ...paises, features } as never);
  });
  return registo;
}

export function GraficoMapa({ dados, nomes, unidade, altura = 340, destacado, aoPassar, aoEscolher }: { dados: { nome: string; valor: number }[]; nomes: Record<string, string>; unidade: string; altura?: number; destacado?: string | null; aoPassar?: (nome: string) => void; aoEscolher?: (nome: string) => void }) {
  const { efetivo } = useTema();
  const [pronto, setPronto] = useState(false);
  const div = useRef<HTMLDivElement>(null);
  const grafico = useRef<ECharts | null>(null);
  const aoPassarRef = useRef(aoPassar);
  const aoEscolherRef = useRef(aoEscolher);
  aoPassarRef.current = aoPassar;
  aoEscolherRef.current = aoEscolher;
  const comDados = useMemo(() => new Set(dados.map((d) => d.nome)), [dados]);
  const comDadosRef = useRef(comDados);
  comDadosRef.current = comDados;

  useEffect(() => {
    let vivo = true;
    registarMapa().then(() => vivo && setPronto(true));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!pronto || !div.current) return;
    const g = echarts.init(div.current);
    grafico.current = g;
    const medir = new ResizeObserver(() => g.resize());
    medir.observe(div.current);
    g.on("mouseover", (p) => {
      const nome = (p as { name?: string }).name;
      if (nome && comDadosRef.current.has(nome)) aoPassarRef.current?.(nome);
    });
    g.on("click", (p) => {
      const nome = (p as { name?: string }).name;
      if (nome && comDadosRef.current.has(nome)) aoEscolherRef.current?.(nome);
    });
    return () => {
      medir.disconnect();
      g.dispose();
      grafico.current = null;
    };
  }, [pronto]);

  const opcoes = useMemo(() => {
    const max = Math.max(1, ...dados.map((d) => d.valor));
    const base = {
      tooltip: { trigger: "item", backgroundColor: "#fff", borderColor: "#e5e5e5", textStyle: { color: "#171717", fontSize: 12 }, formatter: (p: { name: string; value?: number }) => (Number.isFinite(p.value) ? `${nomes[p.name] ?? p.name}: <b>${p.value}</b> ${unidade}<br/><span style="opacity:.65">Clique para ver os detalhes</span>` : `${nomes[p.name] ?? p.name}: sem ${unidade}`) },
      visualMap: { min: 0, max, orient: "horizontal", left: 8, bottom: 4, itemWidth: 10, itemHeight: 90, text: ["mais", "menos"], calculable: false, inRange: { color: ["#c9d6f2", "#155DFC"] }, textStyle: { color: "#737373", fontSize: 11 } },
      series: [
        {
          type: "map",
          map: "mundo",
          roam: false,
          selectedMode: false,
          cursor: "pointer",
          aspectScale: 0.9,
          boundingCoords: [
            [-170, 84],
            [190, -57],
          ],
          data: dados.map((d) => ({ name: d.nome, value: d.valor })),
          itemStyle: { areaColor: "#eef0f4", borderColor: "#ffffff", borderWidth: 0.6 },
          emphasis: { label: { show: false }, itemStyle: { areaColor: "#155DFC", borderColor: "#ffffff" } },
        },
      ],
    };
    return (efetivo === "escuro" ? paraEscuro(base) : base) as never;
  }, [dados, nomes, unidade, efetivo]);

  useEffect(() => {
    grafico.current?.setOption(opcoes, true);
  }, [opcoes, pronto]);

  // o país escolhido fora do mapa (a lista, o painel) fica destacado no mapa
  useEffect(() => {
    const g = grafico.current;
    if (!g) return;
    g.dispatchAction({ type: "downplay", seriesIndex: 0 });
    if (destacado) g.dispatchAction({ type: "highlight", seriesIndex: 0, name: destacado });
  }, [destacado, opcoes, pronto]);

  if (!pronto) return <SemDadosGrafico altura={altura} rotulo="A carregar o mapa" />;
  if (dados.length === 0) return <SemDadosGrafico altura={altura} />;
  return <div ref={div} style={{ height: altura }} className="w-full" role="img" aria-label="Mapa-múndi com os países coloridos pelo valor" />;
}
