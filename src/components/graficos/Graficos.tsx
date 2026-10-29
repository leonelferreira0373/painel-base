// Gráficos do painel: o mesmo motor que a Cloudflare usa no Kumo (Apache ECharts). Uma especificação simples por gráfico e uma só função que a converte em opções do ECharts, partilhada pelo ecrã e pela exportação para PDF.
"use client";

import { Chart, ChartPalette, type KumoChartOption } from "@cloudflare/kumo";
import type { TimeseriesData } from "@cloudflare/kumo/components/chart";
import { useMemo } from "react";
import type { Ponto } from "@/lib/analysis/series";
import { echarts } from "@/lib/echarts";
import { useTema } from "@/lib/tema";
import { SEPARADOR_DE_ROTA } from "@/lib/rotas";
import { SemDadosGrafico } from "../Estados";
import { Pilula, SetaDeCaminho } from "../Frase";

export type GraficoSpec =
  | { tipo: "linha"; pontos: Ponto[]; nome?: string }
  | { tipo: "barras"; pontos: Ponto[] }
  | { tipo: "colunas"; pontos: Ponto[] }
  | { tipo: "histograma"; classes: { de: number; ate: number; n: number }[] }
  | { tipo: "dispersao"; pontos: { x: number; y: number }[]; rx: string; ry: string }
  /** `rotas`: os nomes são páginas do site, e a legenda mostra um pill por pedaço com chevron entre eles. */
  | { tipo: "rosca"; pontos: Ponto[]; rotas?: boolean }
  | { tipo: "matriz"; nomes: string[]; valores: number[][] }
  /** Colunas empilhadas: uma camada por série (por exemplo, os pedidos por estado, dia a dia). */
  | { tipo: "empilhadas"; rotulos: string[]; series: { nome: string; valores: number[] }[]; unidade?: string }
  /** Várias linhas no mesmo eixo (por exemplo, os percentis do tempo de resposta). */
  | { tipo: "linhas"; rotulos: string[]; series: { nome: string; valores: number[] }[]; unidade?: string };

const pt = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 });
const compacto = new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 });
export const formatar = (v: number) => pt.format(v);
const curto = (v: number) => (Math.abs(v) >= 10_000 ? compacto.format(v) : pt.format(v));

const TEXTO = "#737373";
const GRELHA = "#e5e5e5";

/** Marca temporal em milissegundos a partir da chave de um ponto (dia, mês ou ano). */
export function marcaTempo(chave: string): number | null {
  const completa = chave.length === 4 ? `${chave}-01-01` : chave.length === 7 ? `${chave}-01` : chave;
  const t = Date.parse(completa);
  return Number.isFinite(t) ? t : null;
}

export function ehSerieTemporal(pontos: Ponto[]): boolean {
  return pontos.length > 1 && pontos.every((p) => marcaTempo(p.chave) !== null && /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2})?)?)?$/.test(p.chave));
}

export function seriesDe(pontos: Ponto[], nome: string, cor = ChartPalette.categorical(0)): TimeseriesData[] {
  return [{ name: nome, color: cor, data: pontos.map((p) => [marcaTempo(p.chave) as number, p.valor] as [number, number]) }];
}

/** Contagens: o eixo não deve ter marcas com casas decimais. */
const inteiros = (pontos: Ponto[]) => (pontos.every((p) => Number.isInteger(p.valor)) ? 1 : undefined);
const eixoTexto = { color: TEXTO, fontSize: 11, fontFamily: "Inter Variable, Inter, system-ui, sans-serif" };
const AREA = { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(21,93,252,0.26)" }, { offset: 1, color: "rgba(21,93,252,0.02)" }] };
const grelhaBase = { left: 8, right: 12, top: 16, bottom: 4, containLabel: true };
const dica = { trigger: "item" as const, backgroundColor: "#fff", borderColor: GRELHA, textStyle: { color: "#171717", fontSize: 12 } };

/** Opções de ECharts para tudo o que não é uma série temporal. */
export function opcoesDe(spec: GraficoSpec): KumoChartOption {
  if (spec.tipo === "empilhadas" || spec.tipo === "linhas") {
    const cores = spec.series.map((_, i) => ChartPalette.categorical(i));
    return {
      color: cores,
      grid: { left: 8, right: 12, top: 12, bottom: 4, containLabel: true },
      tooltip: { ...dica, trigger: "axis", axisPointer: { type: spec.tipo === "empilhadas" ? "shadow" : "line" } },
      xAxis: { type: "category", data: spec.rotulos, axisTick: { show: false }, axisLine: { lineStyle: { color: GRELHA } }, axisLabel: { ...eixoTexto, hideOverlap: true } },
      yAxis: { type: "value", axisLabel: { ...eixoTexto, formatter: (v: number) => `${curto(v)}${spec.unidade ? ` ${spec.unidade}` : ""}` }, splitLine: { lineStyle: { color: GRELHA, type: "dashed" } } },
      series: spec.series.map((s, i) =>
        spec.tipo === "empilhadas"
          ? { type: "bar", name: s.nome, stack: "total", data: s.valores, barMaxWidth: 22, itemStyle: { color: cores[i] }, emphasis: { focus: "series" } }
          : { type: "line", name: s.nome, data: s.valores, showSymbol: false, smooth: 0.2, lineStyle: { width: 2.5, color: cores[i] }, itemStyle: { color: cores[i] } },
      ),
    } as KumoChartOption;
  }
  if (spec.tipo === "barras") {
    const dados = [...spec.pontos].reverse();
    return {
      grid: { ...grelhaBase, left: 8, right: 56 },
      tooltip: { ...dica, trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "value", axisLabel: { ...eixoTexto, formatter: (v: number) => curto(v) }, splitLine: { lineStyle: { color: GRELHA } } },
      yAxis: { type: "category", data: dados.map((p) => p.rotulo), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { ...eixoTexto, color: "#171717", width: 130, overflow: "truncate" } },
      series: [{ type: "bar", data: dados.map((p, i) => ({ value: p.valor, itemStyle: { color: i === dados.length - 1 ? ChartPalette.categorical(0) : "#8fb0ff", borderRadius: [0, 7, 7, 0] } })), barMaxWidth: 26, label: { show: true, position: "right", color: "#171717", fontSize: 11, formatter: (p: { value: number }) => formatar(p.value) } }],
    } as KumoChartOption;
  }
  if (spec.tipo === "colunas") {
    const horario = spec.pontos[0]?.chave.includes("T");
    const rotulo = (p: Ponto) => {
      const t = marcaTempo(p.chave);
      if (t === null) return p.rotulo;
      const d = new Date(t);
      return horario ? d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
    };
    return {
      grid: grelhaBase,
      tooltip: { ...dica, trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "category", data: spec.pontos.map(rotulo), axisLabel: { ...eixoTexto, hideOverlap: true }, axisTick: { show: false }, axisLine: { lineStyle: { color: GRELHA, width: 1.5 } } },
      yAxis: { type: "value", minInterval: inteiros(spec.pontos), axisLabel: { ...eixoTexto, formatter: (v: number) => curto(v) }, splitLine: { lineStyle: { color: GRELHA } } },
      series: [{ type: "bar", data: spec.pontos.map((p) => p.valor), barMaxWidth: 18, itemStyle: { color: ChartPalette.categorical(0), borderRadius: [6, 6, 0, 0] } }],
    } as KumoChartOption;
  }
  if (spec.tipo === "histograma") {
    return {
      grid: grelhaBase,
      tooltip: { ...dica, trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: { type: "category", data: spec.classes.map((c) => `${curto(c.de)} – ${curto(c.ate)}`), axisLabel: { ...eixoTexto, hideOverlap: true }, axisTick: { show: false }, axisLine: { lineStyle: { color: GRELHA } } },
      yAxis: { type: "value", axisLabel: { ...eixoTexto, formatter: (v: number) => curto(v) }, splitLine: { lineStyle: { color: GRELHA } } },
      series: [{ type: "bar", data: spec.classes.map((c) => c.n), barCategoryGap: "6%", itemStyle: { color: ChartPalette.categorical(0), borderRadius: [6, 6, 0, 0] } }],
    } as KumoChartOption;
  }
  if (spec.tipo === "dispersao") {
    return {
      grid: { ...grelhaBase, left: 12, bottom: 22 },
      tooltip: { ...dica, formatter: (p: { value: number[] }) => `${spec.rx}: ${formatar(p.value[0])}<br/>${spec.ry}: ${formatar(p.value[1])}` },
      xAxis: { type: "value", name: spec.rx, nameLocation: "middle", nameGap: 26, nameTextStyle: eixoTexto, scale: true, axisLabel: { ...eixoTexto, formatter: (v: number) => curto(v) }, splitLine: { lineStyle: { color: GRELHA } } },
      yAxis: { type: "value", name: spec.ry, nameTextStyle: { ...eixoTexto, align: "left" }, scale: true, axisLabel: { ...eixoTexto, formatter: (v: number) => curto(v) }, splitLine: { lineStyle: { color: GRELHA } } },
      series: [{ type: "scatter", symbolSize: 11, data: spec.pontos.map((p) => [p.x, p.y]), itemStyle: { color: ChartPalette.categorical(0), opacity: 0.62, borderColor: "#fff", borderWidth: 1.5 } }],
    } as KumoChartOption;
  }
  if (spec.tipo === "rosca") {
    return {
      tooltip: { ...dica, formatter: "{b}: {c} ({d} %)" },
      legend: { orient: "vertical", right: 8, top: "middle", icon: "circle", itemWidth: 8, itemHeight: 8, textStyle: { color: "#171717", fontSize: 12, width: 130, overflow: "truncate" }, formatter: (n: string) => n },
      color: [0, 1, 2, 3, 4, 5].map((i) => ChartPalette.categorical(i)),
      series: [{ type: "pie", radius: ["46%", "84%"], center: ["32%", "50%"], avoidLabelOverlap: true, label: { show: false }, itemStyle: { borderColor: "#fff", borderWidth: 4, borderRadius: 6 }, data: spec.pontos.map((p) => ({ name: p.rotulo, value: p.valor })) }],
    } as KumoChartOption;
  }
  if (spec.tipo === "matriz") {
    const dados: [number, number, number][] = [];
    spec.valores.forEach((linha, i) => linha.forEach((v, j) => dados.push([j, i, Number(v.toFixed(2))])));
    return {
      grid: { left: 8, right: 12, top: 8, bottom: 56, containLabel: true },
      tooltip: { ...dica, formatter: (p: { value: number[] }) => `${spec.nomes[p.value[1]]} × ${spec.nomes[p.value[0]]}: ${pt.format(p.value[2])}` },
      xAxis: { type: "category", data: spec.nomes, axisLabel: { ...eixoTexto, rotate: 35, width: 90, overflow: "truncate" }, splitArea: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: "category", data: spec.nomes, inverse: true, axisLabel: { ...eixoTexto, color: "#171717", width: 100, overflow: "truncate" }, axisLine: { show: false }, axisTick: { show: false } },
      visualMap: { min: -1, max: 1, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemWidth: 12, itemHeight: 90, text: ["1", "-1"], textStyle: eixoTexto, inRange: { color: ["#1d1d1f", "#e5e5e5", "#155dfc"] } },
      series: [{ type: "heatmap", data: dados, label: { show: spec.nomes.length <= 8, fontSize: 10, color: "#171717", formatter: (p: { value: number[] }) => pt.format(p.value[2]) }, itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 3 } }],
    } as KumoChartOption;
  }
  // linha sem datas: categorias no eixo X
  const pontos = (spec as Extract<GraficoSpec, { tipo: "linha" }>).pontos;
  return {
    grid: grelhaBase,
    tooltip: { ...dica, trigger: "axis" },
    xAxis: { type: "category", data: pontos.map((p) => p.rotulo), boundaryGap: false, axisLabel: { ...eixoTexto, hideOverlap: true }, axisLine: { lineStyle: { color: GRELHA } }, axisTick: { show: false } },
    yAxis: { type: "value", minInterval: inteiros(pontos), axisLabel: { ...eixoTexto, formatter: (v: number) => curto(v) }, splitLine: { lineStyle: { color: GRELHA } } },
    series: [{ type: "line", data: pontos.map((p) => p.valor), showSymbol: false, smooth: 0.15, lineStyle: { width: 3.5, color: ChartPalette.categorical(0), cap: "round", join: "round" }, itemStyle: { color: ChartPalette.categorical(0) }, areaStyle: { color: AREA } }],
  } as KumoChartOption;
}

export function alturaDe(spec: GraficoSpec, base: number): number {
  if (spec.tipo === "barras") return Math.max(120, 36 + spec.pontos.length * 28);
  if (spec.tipo === "matriz") return Math.min(520, 120 + spec.nomes.length * 40);
  return base;
}

/** Opções completas (incluindo séries temporais) para desenhar fora do ecrã na exportação para PDF. */
export function opcoesExportacao(spec: GraficoSpec): KumoChartOption {
  if (spec.tipo === "linha" && ehSerieTemporal(spec.pontos)) {
    const horario = spec.pontos[0]?.chave.includes("T");
    const dia = (t: number) => (horario ? new Date(t).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : new Date(t).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }));
    return {
      grid: grelhaBase,
      tooltip: {
        ...dica,
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: "#171717", width: 1.5, opacity: 0.35 } },
        formatter: (p: { value: [number, number] }[]) => `<div style="font-size:12px;opacity:.7">${horario ? new Date(p[0].value[0]).toLocaleString("pt-PT", { weekday: "short", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }) : new Date(p[0].value[0]).toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })}</div><b style="font-size:14px">${formatar(p[0].value[1])}</b>`,
      },
      xAxis: { type: "time", axisLabel: { ...eixoTexto, hideOverlap: true, formatter: (v: number) => dia(v) }, axisLine: { lineStyle: { color: GRELHA, width: 1.5 } }, axisTick: { show: false }, splitLine: { show: false } },
      yAxis: { type: "value", minInterval: inteiros(spec.pontos), axisLabel: { ...eixoTexto, formatter: (v: number) => curto(v) }, splitLine: { lineStyle: { color: GRELHA } } },
      series: [{ type: "line", showSymbol: false, symbol: "circle", symbolSize: 11, smooth: 0.15, data: spec.pontos.map((p) => [marcaTempo(p.chave) as number, p.valor]), lineStyle: { width: 3.5, color: ChartPalette.categorical(0), cap: "round", join: "round" }, itemStyle: { color: ChartPalette.categorical(0), borderColor: "#fff", borderWidth: 2.5 }, emphasis: { focus: "series" }, areaStyle: { color: AREA } }],
    } as KumoChartOption;
  }
  return opcoesDe(spec);
}

/** No tema escuro, troca as cores fixas do gráfico (texto, linhas, fundo das dicas) pelas suas versões escuras; o PDF continua a usar as claras. */
const ESCURO: Record<string, string> = { "#eef0f4": "#2a2a2a", "#c9d6f2": "#2b3a5e", "#737373": "#a3a3a3", "#e5e5e5": "#303030", "#171717": "#f2f2f2", "#fff": "#1c1c1c", "#ffffff": "#1c1c1c", "#8fb0ff": "#4f7ee8" };
export function paraEscuro<T>(v: T): T {
  if (typeof v === "string") return (ESCURO[v.toLowerCase()] ?? v) as T;
  if (Array.isArray(v)) return v.map(paraEscuro) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, paraEscuro(x)])) as T;
  return v;
}

/** Sem nada para desenhar: sem pontos, ou todos a zero. */
export function semDados(spec: GraficoSpec): boolean {
  if (spec.tipo === "histograma") return spec.classes.length === 0 || spec.classes.every((c) => c.n === 0);
  if (spec.tipo === "matriz") return spec.nomes.length === 0;
  if (spec.tipo === "dispersao") return spec.pontos.length === 0;
  if (spec.tipo === "empilhadas" || spec.tipo === "linhas") return spec.series.every((s) => s.valores.every((v) => v === 0));
  return spec.pontos.length === 0 || spec.pontos.every((p) => p.valor === 0);
}

/** Gráfico com a aparência do painel da Cloudflare; sem dados, mostra a onda esmaecida com a etiqueta «Sem dados». */
export function Grafico({ spec, altura = 240 }: { spec: GraficoSpec; altura?: number; nome?: string }) {
  const vazio = semDados(spec);
  const { efetivo } = useTema();
  const opcoes = useMemo(() => (vazio ? null : efetivo === "escuro" ? paraEscuro(opcoesExportacao(spec)) : opcoesExportacao(spec)), [spec, vazio, efetivo]);
  if (!opcoes) return <SemDadosGrafico altura={altura} />;
  if (spec.tipo === "rosca" && spec.rotas) {
    // as páginas leem-se em pills: a legenda é do painel (não do canvas) e o anel fica ao centro do seu espaço
    const sem = { ...opcoes, legend: { show: false }, series: (opcoes.series as { center?: string[] }[]).map((s) => ({ ...s, center: ["50%", "50%"] })) } as KumoChartOption;
    return (
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <Chart echarts={echarts} options={sem} height={alturaDe(spec, altura)} />
        </div>
        <ul className="flex w-[46%] shrink-0 flex-col gap-1.5">
          {spec.pontos.map((p, i) => (
            <li key={p.rotulo} className="flex min-w-0 items-center gap-2 text-xs text-kumo-default">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: ChartPalette.categorical(i % 6) }} />
              <span className="min-w-0 flex-1 truncate">
                {p.rotulo.split(SEPARADOR_DE_ROTA).map((parte, j) => (
                  <span key={j}>
                    {j > 0 && <SetaDeCaminho />}
                    <Pilula>{parte}</Pilula>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <Chart echarts={echarts} options={opcoes} height={alturaDe(spec, altura)} />;
}
