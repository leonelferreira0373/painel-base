// A análise de uma entidade (o cliente), como a página de análise de um domínio na Cloudflare: separadores, filtros, período, cartões de estatística com variação e gráfico, colunas empilhadas com legenda de valores, percentis e o mapa por país.
"use client";

import { Button, ChartPalette, Dialog, DropdownMenu, Popover, Select } from "@cloudflare/kumo";
import { GrelhaOrdenavel } from "../GrelhaOrdenavel";
import { PopupCartao } from "../Flutuantes";
import { MenuCartao } from "../Flutuantes";
import { useEffect, useMemo, useState } from "react";
import { ANALISE, NOMES_DE_PAISES, paisDe } from "@/dados/analise";
import { useApp } from "@/lib/estado";
import { camadasPorEstado, duracoesPorDia, janela, naJanela, percentisPorDia, porPais, somar, variacaoPct } from "@/lib/analise-contexto";
import type { Ponto } from "@/lib/analysis/series";
import { Dica } from "../Dica";
import { Estado } from "../Estado";
import { Esbatido } from "../Estados";
import { Grafico } from "../graficos/Graficos";
import { GraficoMapa } from "../graficos/GraficoMapa";
import { Ic, ICONES } from "../Icones";
import { PERIODO_PREDEFINIDO, PERIODOS, SeletorPeriodo, type Periodo } from "../Periodo";
import { CartaoEstatistica, LegendaValores, Pagina, Painel, Separadores, Titulo } from "../ui";
import { copiarCsv } from "./csv";
import { LinhaOrdenada } from "../LinhaOrdenada";
import { MenuDeDados } from "../MenuDeDados";

type Filtro = { chave: string; valor: string };

function contar(linhas: { [k: string]: string | number }[], chave: string): Ponto[] {
  const m = new Map<string, number>();
  for (const l of linhas) m.set(String(l[chave]), (m.get(String(l[chave])) ?? 0) + 1);
  return [...m].map(([nome, valor]) => ({ chave: nome, rotulo: nome, valor, n: valor })).sort((a, b) => b.valor - a.valor);
}

/** O botão «Adicionar filtro»: escolhe um campo e um valor; os filtros ativos aparecem em baixo da barra. */
function AdicionarFiltro({ linhas, aoAdicionar }: { linhas: { [k: string]: string | number }[]; aoAdicionar: (f: Filtro) => void }) {
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState<string>(ANALISE.filtros[0].chave);
  const [valor, setValor] = useState("");
  const valores = useMemo(() => [...new Set(linhas.map((l) => String(l[chave])).filter(Boolean))].sort(), [linhas, chave]);
  return (
    <Popover.Root open={aberto} onOpenChange={(v) => { setAberto(v); if (!v) setValor(""); }}>
      <Dica conteudo="Mostrar só os pedidos com um estado ou um local à escolha.">
        <Popover.Trigger render={<Button variant="secondary" icon={ICONES.filtrar}>Adicionar filtro</Button>} />
      </Dica>
      <PopupCartao alinhar="end" className="w-[min(320px,calc(100vw-24px))] p-3">
            <div className="flex flex-col gap-3">
              <Select label="Campo" value={chave} onValueChange={(v) => { setChave(String(v)); setValor(""); }} items={Object.fromEntries(ANALISE.filtros.map((f) => [f.chave, f.rotulo]))} />
              <Select label="Valor" value={valor} onValueChange={(v) => setValor(String(v))} items={Object.fromEntries(valores.map((v) => [v, v]))} />
              <Button
                variant="primary"
                disabled={!valor}
                onClick={() => {
                  aoAdicionar({ chave, valor });
                  setAberto(false);
                  setValor("");
                }}
              >
                Aplicar filtro
              </Button>
            </div>
          </PopupCartao>
    </Popover.Root>
  );
}

export function AnaliseCliente({ cliente }: { cliente: string }) {
  const { registos, pronto } = useApp();
  const [separador, setSeparador] = useState<string>(ANALISE.separadores[0].id);
  const [periodo, setPeriodo] = useState<Periodo>(PERIODOS.find((p) => p.dias === 7 && !p.horas) ?? PERIODO_PREDEFINIDO);
  const [filtros, setFiltros] = useState<Filtro[]>([]);
  const [versao, setVersao] = useState(0);
  const [paisEscolhido, setPaisEscolhido] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  useEffect(() => {
    setACarregar(true);
    const t = window.setTimeout(() => setACarregar(false), 500);
    return () => window.clearTimeout(t);
  }, [separador, periodo, filtros, versao, cliente]);

  const doCliente = useMemo(() => (registos[ANALISE.fonte] ?? []).filter((l) => String(l[ANALISE.campoEntidade]) === cliente), [registos, cliente]);
  const linhas = useMemo(() => doCliente.filter((l) => filtros.every((f) => String(l[f.chave]) === f.valor)), [doCliente, filtros]);
  const carregando = !pronto || aCarregar;

  const estatisticas = useMemo(
    () =>
      ANALISE.estatisticas.map((e) => {
        const sub = e.estados ? linhas.filter((l) => (e.estados as readonly string[]).includes(String(l[ANALISE.campoEstado]))) : linhas;
        const j = janela(sub, ANALISE.campoData, periodo);
        return { ...e, valor: j.total, variacao: variacaoPct(j.total, j.anterior), valores: j.pontos.map((p) => p.valor) };
      }),
    [linhas, periodo],
  );
  const camadas = useMemo(() => camadasPorEstado(linhas, ANALISE.campoData, ANALISE.campoEstado, ANALISE.estados, periodo), [linhas, periodo]);
  const duracoes = useMemo(() => duracoesPorDia(linhas, ANALISE.campoData, ANALISE.etapas, periodo), [linhas, periodo]);
  const percentis = useMemo(() => percentisPorDia(linhas, ANALISE.campoData, ANALISE.etapas, periodo), [linhas, periodo]);
  const doPeriodo = useMemo(() => naJanela(linhas, ANALISE.campoData, periodo), [linhas, periodo]);
  const paises = useMemo(() => porPais(doPeriodo, paisDe), [doPeriodo]);
  const paisAtivo = paisEscolhido && paises.some((p) => p.nome === paisEscolhido) ? paisEscolhido : (paises[0]?.nome ?? null);
  const doPais = (nome: string) => doPeriodo.filter((l) => paisDe(l) === nome);
  const porEstadoDe = (nome: string) => ANALISE.estados.map((e) => ({ estado: e, n: doPais(nome).filter((l) => String(l[ANALISE.campoEstado]) === e).length })).filter((x) => x.n > 0);

  const media = (valores: number[]) => {
    const com = valores.filter((v) => v > 0);
    return com.length === 0 ? 0 : somar(com) / com.length;
  };
  const horas = (v: number) => `${v.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} h`;
  const totalPaises = somar(paises.map((p) => p.valor));

  return (
    <Pagina largo>
      <Titulo titulo="Análise" />
      <div className="flex flex-wrap items-center gap-2">
        <Separadores itens={ANALISE.separadores} valor={separador} aoMudar={setSeparador} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AdicionarFiltro linhas={doCliente} aoAdicionar={(f) => setFiltros((x) => [...x.filter((y) => y.chave !== f.chave), f])} />
          <SeletorPeriodo periodo={periodo} aoMudar={setPeriodo} />
          <DropdownMenu>
            <Dica conteudo="Mais opções da análise">
              <DropdownMenu.Trigger render={<Button variant="secondary" shape="square" icon={ICONES.mais3} aria-label="Mais opções da análise" />} />
            </Dica>
            <MenuCartao className="w-[220px]">
              <DropdownMenu.Item icon={<Ic nome="atualizar" />} onClick={() => setVersao((v) => v + 1)}>
                Atualizar
              </DropdownMenu.Item>
              <DropdownMenu.Item icon={<Ic nome="transferir" />} onClick={() => copiarCsv(`analise-${cliente}.csv`, linhas)}>
                Descarregar os pedidos (CSV)
              </DropdownMenu.Item>
              <DropdownMenu.Item icon={<Ic nome="fechar" />} disabled={filtros.length === 0} onClick={() => setFiltros([])}>
                Repor os filtros
              </DropdownMenu.Item>
            </MenuCartao>
          </DropdownMenu>
        </div>
      </div>
      {filtros.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filtros.map((f) => (
            <span key={f.chave} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-kumo-base pl-3 pr-1.5 text-xs font-medium text-kumo-default shadow-xs ring-1 ring-black/10 dark:ring-white/20">
              {ANALISE.filtros.find((x) => x.chave === f.chave)?.rotulo}: {f.valor}
              <button type="button" aria-label={`Tirar o filtro ${f.valor}`} onClick={() => setFiltros((x) => x.filter((y) => y.chave !== f.chave))} className="flex size-5 items-center justify-center rounded-full text-kumo-subtle hover:bg-kumo-tint">
                <Ic nome="fechar" tamanho={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {separador === "pedidos" && (
        <>
          <GrelhaOrdenavel
            chave="analise"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
            itens={estatisticas.map((e) => ({ id: e.id, conteudo: <CartaoEstatistica titulo={e.titulo} dica={e.dica} valor={e.valor.toLocaleString("pt-PT")} variacao={e.variacao} pior={e.pior} valores={e.valores} carregando={carregando} /> }))}
          />
          <Painel titulo="Pedidos ao longo do tempo">
            <div className="flex flex-col gap-3">
              <LegendaValores itens={camadas.series.map((s, i) => ({ nome: s.nome, cor: ChartPalette.categorical(i), valor: somar(s.valores).toLocaleString("pt-PT") }))} />
              <Grafico spec={{ tipo: "empilhadas", rotulos: camadas.rotulos, series: camadas.series }} altura={250} />
            </div>
          </Painel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Painel titulo="Pedidos por local">
              <Grafico spec={{ tipo: "barras", pontos: contar(linhas, "local").slice(0, 8) }} altura={200} />
            </Painel>
            <Painel titulo="Pedidos por estado">
              <Grafico spec={{ tipo: "rosca", pontos: contar(linhas, ANALISE.campoEstado) }} altura={200} />
            </Painel>
          </div>
        </>
      )}

      {separador === "desempenho" && (
        <>
          <Painel titulo="Tempos de atendimento">
            <div className="flex flex-col gap-3">
              <LegendaValores itens={duracoes.series.map((s, i) => ({ nome: s.nome, cor: ChartPalette.categorical(i), valor: horas(media(s.valores)) }))} />
              <Grafico spec={{ tipo: "empilhadas", rotulos: duracoes.rotulos, series: duracoes.series, unidade: "h" }} altura={280} />
            </div>
          </Painel>
          <Painel titulo="Percentis do tempo até à confirmação">
            <div className="flex flex-col gap-3">
              <LegendaValores itens={percentis.series.map((s, i) => ({ nome: s.nome, cor: ChartPalette.categorical(i), valor: horas(media(s.valores)) }))} />
              <Grafico spec={{ tipo: "linhas", rotulos: percentis.rotulos, series: percentis.series, unidade: "h" }} altura={240} />
            </div>
          </Painel>
        </>
      )}

      {separador === "geografia" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Painel titulo={ANALISE.mapa.titulo}>
            <div className="relative">
              <GraficoMapa dados={paises} nomes={NOMES_DE_PAISES} unidade={ANALISE.mapa.unidade} altura={360} destacado={paisAtivo} aoPassar={setPaisEscolhido} aoEscolher={setDetalhe} />
              {paisAtivo && (
                <div className="absolute left-0 top-0 flex w-[min(230px,60%)] flex-col gap-2 rounded-lg bg-kumo-base p-3 shadow-(--elevacao-popup) ring ring-kumo-line">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-kumo-default">{NOMES_DE_PAISES[paisAtivo] ?? paisAtivo}</span>
                    <span className="text-xs tabular-nums text-kumo-subtle">{Math.round(((paises.find((p) => p.nome === paisAtivo)?.valor ?? 0) / Math.max(1, totalPaises)) * 100)} %</span>
                  </div>
                  <div className="text-2xl font-semibold leading-tight tabular-nums text-kumo-default">
                    {paises.find((p) => p.nome === paisAtivo)?.valor ?? 0} <span className="text-sm font-normal text-kumo-subtle">{ANALISE.mapa.unidade}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {porEstadoDe(paisAtivo).map((x) => (
                      <div key={x.estado} className="flex items-center justify-between text-xs text-kumo-subtle">
                        <span>{x.estado}</span>
                        <b className="font-semibold tabular-nums text-kumo-default">{x.n}</b>
                      </div>
                    ))}
                  </div>
                  <Button variant="secondary" size="sm" icon={ICONES.olho} onClick={() => setDetalhe(paisAtivo)}>
                    Ver especificações completas
                  </Button>
                </div>
              )}
            </div>
          </Painel>
          <Painel titulo="Países" acoes={<MenuDeDados dados={{ nome: "paises", titulo: "Países", colunas: ["País", ANALISE.mapa.unidade], linhas: paises.map((p) => [NOMES_DE_PAISES[p.nome] ?? p.nome, p.valor]) }} />}>
            <div className="flex flex-col">
              {paises.length === 0 && <span className="py-3 text-sm text-kumo-subtle">Sem dados</span>}
              {paises.map((p) => (
                <LinhaOrdenada
                  key={p.nome}
                  nome={NOMES_DE_PAISES[p.nome] ?? p.nome}
                  valor={p.valor}
                  proporcao={(p.valor / Math.max(1, totalPaises)) * 100}
                  ativa={p.nome === paisAtivo}
                  aoPassar={() => setPaisEscolhido(p.nome)}
                  aoAbrir={() => setDetalhe(p.nome)}
                  rotulo={`${NOMES_DE_PAISES[p.nome] ?? p.nome}: ${p.valor} ${ANALISE.mapa.unidade}. Ver especificações completas`}
                />
              ))}
            </div>
          </Painel>
        </div>
      )}

      <Dialog.Root open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <Dialog size="lg" className="p-6">
          {detalhe && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-4">
                <Dialog.Title className="text-xl font-semibold">{NOMES_DE_PAISES[detalhe] ?? detalhe}</Dialog.Title>
                <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { r: ANALISE.mapa.unidade, v: String(doPais(detalhe).length) },
                  { r: "Do total", v: `${Math.round((doPais(detalhe).length / Math.max(1, totalPaises)) * 100)} %` },
                  ...porEstadoDe(detalhe).slice(0, 2).map((x) => ({ r: x.estado, v: String(x.n) })),
                ].map((x) => (
                  <div key={x.r} className="rounded-lg bg-kumo-tint px-3 py-2">
                    <div className="truncate text-xs text-kumo-subtle">{x.r}</div>
                    <div className="text-lg font-semibold tabular-nums">{x.v}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-kumo-subtle">{ANALISE.detalhe.agrupar.rotulo}</div>
                {contar(doPais(detalhe), ANALISE.detalhe.agrupar.chave)
                  .slice(0, 4)
                  .map((g) => (
                    <div key={g.rotulo} className="flex h-9 items-center justify-between border-b border-kumo-hairline text-sm last:border-b-0">
                      <span className="truncate">{g.rotulo}</span>
                      <span className="tabular-nums text-kumo-subtle">{g.valor}</span>
                    </div>
                  ))}
              </div>
              <Esbatido className="sem-barra max-h-[220px] overflow-auto rounded-lg ring ring-kumo-line">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-kumo-hairline text-left text-xs text-kumo-subtle">
                      {ANALISE.detalhe.colunas.map((c) => (
                        <th key={c.chave} className="px-3 py-2 font-medium">
                          {c.rotulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {doPais(detalhe)
                      .slice(0, 12)
                      .map((l) => (
                        <tr key={l.id} className="border-b border-kumo-hairline last:border-b-0">
                          {ANALISE.detalhe.colunas.map((c) => (
                            <td key={c.chave} className="whitespace-nowrap px-3 py-2">
                              {"estado" in c && c.estado ? <Estado valor={String(l[c.chave])} modulo={ANALISE.fonte} /> : String(l[c.chave] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Esbatido>
            </div>
          )}
        </Dialog>
      </Dialog.Root>
    </Pagina>
  );
}
