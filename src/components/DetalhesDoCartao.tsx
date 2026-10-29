// «Ver detalhes» e «Ver o mapa» de um cartão, como na Cloudflare: uma janela com o gráfico em grande, a legenda com os totais e os principais contribuintes, e (quando os elementos são países) o mapa-múndi. O gráfico regista a sua especificação quando se desenha (lib/elementos-do-grafico.ts) e a janela lê-a daí, por isso funciona em qualquer cartão com um gráfico.
"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { useMemo, useState, type ReactNode } from "react";
import { NOMES_DE_PAISES } from "@/dados/paises";
import { useCoresDosElementos, useCorDoGrafico } from "@/lib/cores-graficos";
import { dadosDoMapa, detalhesDe } from "@/lib/detalhes-do-grafico";
import { useEspecDoGrafico } from "@/lib/elementos-do-grafico";
import { elementosCompletos, Grafico, type GraficoSpec } from "./graficos/Graficos";
import { GraficoMapa } from "./graficos/GraficoMapa";
import { IdDoGraficoProvider } from "./graficos/CorDoGrafico";
import { ICONES } from "./Icones";
import { TabelaSimples, type ColunaSimples } from "./super/SuperPecas";
import type { LinhaDeContribuinte } from "@/lib/detalhes-do-grafico";

const percentagem = (f: number) => `${(f * 100).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} %`;

function Cabecalho({ titulo }: { titulo: string }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
      <Dialog.Title className="min-w-0 truncate text-lg font-semibold">{titulo}</Dialog.Title>
      <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
    </div>
  );
}

/** A janela «Ver detalhes»: o gráfico em grande, a legenda com os valores e os principais contribuintes. */
function JanelaDeDetalhes({ aberto, aoMudar, titulo, idDaCor, spec }: { aberto: boolean; aoMudar: (v: boolean) => void; titulo: string; idDaCor: string; spec: GraficoSpec | null }) {
  const [cor] = useCorDoGrafico(idDaCor);
  const [itens] = useCoresDosElementos(idDaCor);
  const detalhes = useMemo(() => (spec ? detalhesDe(spec) : null), [spec]);
  const elementos = useMemo(() => (spec ? elementosCompletos(spec, cor) : []), [spec, cor]);
  const corDe = (chave: string, nome: string) => {
    const e = elementos.find((x) => x.chave === chave) ?? elementos.find((x) => x.rotulo === nome);
    return e ? (itens[e.chave] ?? e.padrao) : undefined;
  };
  const colunas: ColunaSimples<LinhaDeContribuinte>[] = [
    {
      rotulo: "Nome",
      render: (l) => (
        <span className="inline-flex min-w-0 items-center gap-2">
          {corDe(l.chave, l.nome) && <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: corDe(l.chave, l.nome) }} />}
          <span className="truncate font-medium">{l.nome}</span>
        </span>
      ),
    },
    { rotulo: detalhes?.medida ?? "Valor", direita: true, render: (l) => <span className="tabular-nums">{l.valor.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}</span> },
    { rotulo: "Parte", direita: true, render: (l) => <span className="tabular-nums">{percentagem(l.parte)}</span> },
  ];
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="lg" className="flex max-h-[88dvh] flex-col overflow-hidden p-0">
        <Cabecalho titulo={titulo} />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          {spec && (
            <div className="flex flex-col gap-3 rounded-xl p-4 ring ring-kumo-line">
              {detalhes && (
                <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm" aria-label="Legenda">
                  {detalhes.legenda.map((l) => (
                    <li key={l.nome} className="inline-flex items-center gap-1.5">
                      {corDe(l.nome, l.nome) && <span aria-hidden className="size-2.5 rounded-full" style={{ background: corDe(l.nome, l.nome) }} />}
                      <span className="text-kumo-subtle">{l.nome}</span>
                      <span className="font-medium tabular-nums text-kumo-default">{l.valor}</span>
                    </li>
                  ))}
                </ul>
              )}
              <IdDoGraficoProvider titulo={titulo}>
                <Grafico spec={spec} altura={340} semRegisto />
              </IdDoGraficoProvider>
            </div>
          )}
          {detalhes && detalhes.contribuintes.length > 0 && (
            <div className="overflow-hidden rounded-xl ring ring-kumo-line">
              <div className="border-b border-kumo-hairline px-4 py-2.5 text-sm font-medium">Principais contribuintes</div>
              <TabelaSimples colunas={colunas} linhas={detalhes.contribuintes.slice(0, 10)} chave={(l) => l.chave} vazio="Sem dados." tabela={`detalhes:${idDaCor}`} />
            </div>
          )}
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

/** A janela «Ver o mapa»: os países coloridos pelo valor e os que mais pesam ao lado. */
function JanelaDoMapa({ aberto, aoMudar, titulo, dados }: { aberto: boolean; aoMudar: (v: boolean) => void; titulo: string; dados: { nome: string; valor: number }[] }) {
  const total = dados.reduce((s, d) => s + d.valor, 0);
  const ordenados = [...dados].sort((a, b) => b.valor - a.valor);
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="lg" className="flex max-h-[88dvh] flex-col overflow-hidden p-0">
        <Cabecalho titulo={titulo} />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="rounded-xl p-2 ring ring-kumo-line">{aberto && <GraficoMapa dados={dados} nomes={NOMES_DE_PAISES} unidade="" altura={300} />}</div>
          <ul className="m-0 flex list-none flex-col p-0">
            {ordenados.map((d) => (
              <li key={d.nome} className="flex items-center justify-between gap-3 border-t border-kumo-hairline py-2 text-sm first:border-t-0">
                <span className="font-medium">{NOMES_DE_PAISES[d.nome] ?? d.nome}</span>
                <span className="tabular-nums text-kumo-subtle">
                  {d.valor.toLocaleString("pt-PT")} · {percentagem(total > 0 ? d.valor / total : 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

/**
 * Os itens «Ver detalhes» e «Ver o mapa» de um cartão e as janelas que abrem. Só há itens quando o cartão tem um gráfico que se pode detalhar (e, no mapa, cujos elementos são países).
 * `janelas` põe-se ao lado do menu.
 */
export function useJanelasDoCartao(idDaCor: string | undefined, titulo: string): { aoVerDetalhes?: () => void; aoVerMapa?: () => void; janelas: ReactNode } {
  const spec = useEspecDoGrafico(idDaCor) as GraficoSpec | undefined;
  const [aberta, setAberta] = useState<"detalhes" | "mapa" | null>(null);
  const detalhes = useMemo(() => (spec ? detalhesDe(spec) : null), [spec]);
  const mapa = useMemo(() => (spec ? dadosDoMapa(spec) : null), [spec]);
  return {
    aoVerDetalhes: detalhes && idDaCor ? () => setAberta("detalhes") : undefined,
    aoVerMapa: mapa ? () => setAberta("mapa") : undefined,
    janelas: (
      <>
        {idDaCor && aberta === "detalhes" && <JanelaDeDetalhes aberto aoMudar={(v) => !v && setAberta(null)} titulo={titulo} idDaCor={idDaCor} spec={spec ?? null} />}
        {aberta === "mapa" && mapa && <JanelaDoMapa aberto aoMudar={(v) => !v && setAberta(null)} titulo={titulo} dados={mapa} />}
      </>
    ),
  };
}
