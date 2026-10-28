// Gráficos: sugestões automáticas a partir do perfil e um construtor para o analista escolher colunas, agregação e período.
"use client";

import { Button, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { T } from "@/dados/textos";
import { dispersao, porCategoria, serieTemporal, type Agregacao, type Granularidade } from "@/lib/analysis/series";
import { granularidadeAuto, sugerir, type Sugestao } from "@/lib/analysis/sugestoes";
import { useApp } from "@/lib/estado";
import { lerPedido, limparPedido, type PedidoGrafico } from "@/lib/pedido-grafico";
import type { Perfil, Tabela } from "@/lib/tipos";
import { Grafico, type GraficoSpec } from "../graficos/Graficos";
import { DICA_GRAFICO } from "@/dados/dicas";
import { Dica } from "../Dica";
import { ICONES } from "../Icones";
import { CartaoMetrica, Pagina, Secao, Titulo } from "../ui";
import { AbasAnalise, SemDados, SeletorTabela } from "./Comum";

type TipoGrafico = "linha" | "barras" | "histograma" | "dispersao" | "rosca";

const TIPOS: { id: TipoGrafico; rotulo: string }[] = [
  { id: "linha", rotulo: "Linha no tempo" },
  { id: "barras", rotulo: "Barras por categoria" },
  { id: "rosca", rotulo: "Rosca por categoria" },
  { id: "histograma", rotulo: "Histograma" },
  { id: "dispersao", rotulo: "Dispersão" },
];
const AGREGACOES: { id: Agregacao; rotulo: string }[] = [
  { id: "contagem", rotulo: "Contagem" },
  { id: "soma", rotulo: "Soma" },
  { id: "media", rotulo: "Média" },
  { id: "mediana", rotulo: "Mediana" },
  { id: "min", rotulo: "Mínimo" },
  { id: "max", rotulo: "Máximo" },
];
const PERIODOS: { id: Granularidade; rotulo: string }[] = [
  { id: "dia", rotulo: "Dia" },
  { id: "semana", rotulo: "Semana" },
  { id: "mes", rotulo: "Mês" },
  { id: "ano", rotulo: "Ano" },
];

interface Config {
  tipo: TipoGrafico;
  x: number;
  y: number | null;
  agg: Agregacao;
  gran: Granularidade;
}

function construir(t: Tabela, p: Perfil, c: Config): { titulo: string; spec: GraficoSpec } | null {
  const nome = (i: number | null) => (i === null ? "" : t.colunas[i]);
  const medida = c.y !== null && c.agg !== "contagem" ? c.y : null;
  const agg = medida === null ? "contagem" : c.agg;
  const descricao = medida === null ? "Contagem" : `${AGREGACOES.find((a) => a.id === agg)?.rotulo} de ${nome(medida)}`;
  if (c.tipo === "linha") {
    const pontos = serieTemporal(t, c.x, medida, agg, c.gran);
    return pontos.length > 0 ? { titulo: `${descricao} por ${PERIODOS.find((g) => g.id === c.gran)?.rotulo.toLowerCase()} (${nome(c.x)})`, spec: { tipo: "linha", pontos } } : null;
  }
  if (c.tipo === "barras" || c.tipo === "rosca") {
    const pontos = porCategoria(t, c.x, medida, agg, c.tipo === "rosca" ? 8 : 12);
    return pontos.length > 0 ? { titulo: `${descricao} por ${nome(c.x)}`, spec: { tipo: c.tipo, pontos } } : null;
  }
  if (c.tipo === "histograma") {
    const h = p.colunas[c.x]?.histograma;
    return h && h.length > 0 ? { titulo: `Distribuição de ${nome(c.x)}`, spec: { tipo: "histograma", classes: h } } : null;
  }
  if (c.y === null) return null;
  const pontos = dispersao(t, c.x, c.y);
  return pontos.length > 3 ? { titulo: `${nome(c.y)} em função de ${nome(c.x)}`, spec: { tipo: "dispersao", pontos, rx: nome(c.x), ry: nome(c.y) } } : null;
}

/** Converte «visualizar esta coluna como…» numa configuração do construtor. */
function configDoPedido(p: Perfil, pedido: PedidoGrafico, base: Config | null): Config | null {
  const coluna = p.colunas[pedido.coluna];
  if (!coluna) return null;
  const numerica = coluna.tipo === "inteiro" || coluna.tipo === "numero";
  const padrao: Config = base ?? { tipo: "barras", x: pedido.coluna, y: null, agg: "contagem", gran: "mes" };
  if (pedido.tipo === "linha") {
    const data = coluna.tipo === "data" ? pedido.coluna : p.colunas.findIndex((c) => c.tipo === "data");
    if (data < 0) return null;
    const medida = numerica && data !== pedido.coluna ? pedido.coluna : null;
    return { ...padrao, tipo: "linha", x: data, y: medida, agg: medida === null ? "contagem" : "soma", gran: granularidadeAuto(p.colunas[data].primeiraData, p.colunas[data].ultimaData) };
  }
  if (pedido.tipo === "histograma") return numerica ? { ...padrao, tipo: "histograma", x: pedido.coluna, y: null, agg: "contagem" } : null;
  return { ...padrao, tipo: pedido.tipo, x: pedido.coluna, y: null, agg: "contagem" };
}

function Seletor({ rotulo, valor, aoMudar, opcoes, dica }: { rotulo: string; valor: string; aoMudar: (v: string) => void; opcoes: { id: string; rotulo: string }[]; dica?: string }) {
  return (
    <Dica linha conteudo={dica}>
    <Select value={valor} onValueChange={(v) => aoMudar(String(v))} aria-label={rotulo} className="w-full sm:w-52" items={Object.fromEntries(opcoes.map((o) => [o.id, o.rotulo]))} />
    </Dica>
  );
}

export function GraficosPagina() {
  const { tabelaAtiva, perfil, guardados, guardarGrafico } = useApp();
  const G = T.analise.graficos;
  const sugestoes = useMemo(() => (tabelaAtiva && perfil ? sugerir(tabelaAtiva, perfil) : []), [tabelaAtiva, perfil]);
  const [cfg, setCfg] = useState<Config>({ tipo: "linha", x: 0, y: null, agg: "soma", gran: "mes" });

  // Ao mudar de tabela, propõe uma configuração útil: a primeira data com a primeira medida, ou a primeira categoria.
  useEffect(() => {
    if (!tabelaAtiva || !perfil) return;
    const primeira = (tipos: string[]) => perfil.colunas.findIndex((c) => tipos.includes(c.tipo));
    const data = primeira(["data"]);
    const medida = primeira(["inteiro", "numero"]);
    const cat = primeira(["categoria", "booleano"]);
    let base: Config | null = null;
    if (data >= 0) base = { tipo: "linha", x: data, y: medida >= 0 ? medida : null, agg: medida >= 0 ? "soma" : "contagem", gran: granularidadeAuto(perfil.colunas[data].primeiraData, perfil.colunas[data].ultimaData) };
    else if (cat >= 0) base = { tipo: "barras", x: cat, y: medida >= 0 ? medida : null, agg: medida >= 0 ? "soma" : "contagem", gran: "mes" };
    else if (medida >= 0) base = { tipo: "histograma", x: medida, y: null, agg: "contagem", gran: "mes" };
    // Um pedido vindo do menu de uma coluna da tabela passa à frente da proposta automática.
    const pedido = lerPedido();
    const doPedido = pedido ? configDoPedido(perfil, pedido, base) : null;
    if (doPedido || base) setCfg((doPedido ?? base)!);
    if (pedido) window.setTimeout(limparPedido, 1000);
  }, [tabelaAtiva?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const resultado = useMemo(() => (tabelaAtiva && perfil ? construir(tabelaAtiva, perfil, cfg) : null), [tabelaAtiva, perfil, cfg]);
  if (!tabelaAtiva || !perfil) {
    return (
      <Pagina>
        <AbasAnalise />
        <Titulo titulo={G.titulo} />
        <SemDados />
      </Pagina>
    );
  }
  const colunas = perfil.colunas.map((c, i) => ({ id: String(i), rotulo: c.nome }));
  const medidas = [{ id: "-", rotulo: "Contagem de registos" }, ...perfil.colunas.map((c, i) => ({ c, i })).filter(({ c }) => c.tipo === "inteiro" || c.tipo === "numero").map(({ c, i }) => ({ id: String(i), rotulo: c.nome }))];
  const idPersonalizado = `p-${tabelaAtiva.id}-${cfg.tipo}-${cfg.x}-${cfg.y}-${cfg.agg}-${cfg.gran}`;
  const jaGuardado = guardados.some((g) => g.id === idPersonalizado);

  return (
    <Pagina>
      <AbasAnalise />
      <Titulo titulo={G.titulo}>
        <SeletorTabela />
      </Titulo>
      <Secao titulo={G.personalizado}>
        <div className="flex flex-wrap items-center gap-2">
          <Seletor rotulo={G.tipo} dica={DICA_GRAFICO.tipo} valor={cfg.tipo} aoMudar={(v) => setCfg({ ...cfg, tipo: v as TipoGrafico })} opcoes={TIPOS} />
          <Seletor rotulo={G.eixoX} dica={DICA_GRAFICO.eixoX} valor={String(cfg.x)} aoMudar={(v) => setCfg({ ...cfg, x: Number(v) })} opcoes={colunas} />
          {(cfg.tipo === "linha" || cfg.tipo === "barras" || cfg.tipo === "rosca" || cfg.tipo === "dispersao") && <Seletor rotulo={G.eixoY} dica={DICA_GRAFICO.eixoY} valor={cfg.y === null ? "-" : String(cfg.y)} aoMudar={(v) => setCfg({ ...cfg, y: v === "-" ? null : Number(v) })} opcoes={cfg.tipo === "dispersao" ? medidas.slice(1) : medidas} />}
          {(cfg.tipo === "linha" || cfg.tipo === "barras" || cfg.tipo === "rosca") && cfg.y !== null && <Seletor rotulo={G.agregacao} dica={DICA_GRAFICO.agregacao} valor={cfg.agg} aoMudar={(v) => setCfg({ ...cfg, agg: v as Agregacao })} opcoes={AGREGACOES} />}
          {cfg.tipo === "linha" && <Seletor rotulo={G.granularidade} dica={DICA_GRAFICO.granularidade} valor={cfg.gran} aoMudar={(v) => setCfg({ ...cfg, gran: v as Granularidade })} opcoes={PERIODOS} />}
        </div>
        {resultado ? (
          <CartaoMetrica titulo={resultado.titulo}>
            <Grafico spec={resultado.spec} altura={300} nome={resultado.titulo} />
            <div className="flex justify-end pt-1">
              <Dica conteudo={DICA_GRAFICO.guardar}><Button variant="secondary" icon={jaGuardado ? ICONES.certo : ICONES.mais} disabled={jaGuardado} onClick={() => guardarGrafico({ id: idPersonalizado, titulo: resultado.titulo, spec: resultado.spec })}>
                {jaGuardado ? G.guardado : G.guardar}
              </Button></Dica>
            </div>
          </CartaoMetrica>
        ) : (
          <span className="text-sm text-kumo-subtle">{G.semGrafico}</span>
        )}
      </Secao>
      <Secao titulo={G.sugestoes}>
        <div className="grid gap-4 lg:grid-cols-2">
          {sugestoes.map((s: Sugestao) => (
            <CartaoMetrica key={s.id} titulo={s.titulo}>
              <Grafico spec={s.spec} altura={210} nome={s.titulo} />
            </CartaoMetrica>
          ))}
        </div>
      </Secao>
    </Pagina>
  );
}
