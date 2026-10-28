// Perfil e qualidade: pontuação, anomalias, lista de colunas e o detalhe estatístico da coluna escolhida.
"use client";

import { Badge, Meter } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { T } from "@/dados/textos";
import { serieTemporal } from "@/lib/analysis/series";
import { granularidadeAuto } from "@/lib/analysis/sugestoes";
import { useApp } from "@/lib/estado";
import { DICA_ESTATISTICA, DICA_GRAVIDADE, DICA_TIPO } from "@/dados/dicas";
import { CorpoDica, Dica } from "../Dica";
import { formatar, Grafico } from "../graficos/Graficos";
import { Esbatido } from "../Estados";
import { Anel } from "../graficos/Pequenos";
import { Pagina, Painel, Titulo } from "../ui";
import { AbasAnalise, SemDados, SeletorTabela } from "./Comum";

const num = (v: number | undefined) => (v === undefined ? "" : formatar(v));

function Dado({ chave, rotulo, valor }: { chave: string; rotulo: string; valor: string }) {
  return (
    <Dica linha conteudo={DICA_ESTATISTICA[chave] ? <CorpoDica titulo={rotulo} texto={DICA_ESTATISTICA[chave]} /> : null}>
      <div className="flex flex-col">
        <span className="text-xs text-kumo-subtle">{rotulo}</span>
        <b className="text-sm font-medium tabular-nums">{valor}</b>
      </div>
    </Dica>
  );
}

export function Perfil() {
  const { perfil, tabelaAtiva } = useApp();
  const [escolhida, setEscolhida] = useState(0);
  useEffect(() => setEscolhida(0), [tabelaAtiva?.id]);
  const coluna = perfil?.colunas[escolhida];
  const P = T.analise.perfil;

  const detalhe = useMemo(() => {
    if (!coluna || !tabelaAtiva) return null;
    if (coluna.histograma && coluna.histograma.length > 0) return { tipo: "histograma" as const, classes: coluna.histograma };
    if (coluna.tipo === "data") {
      const pontos = serieTemporal(tabelaAtiva, escolhida, null, "contagem", granularidadeAuto(coluna.primeiraData, coluna.ultimaData));
      return pontos.length > 1 ? { tipo: "linha" as const, pontos } : null;
    }
    if ((coluna.tipo === "categoria" || coluna.tipo === "booleano") && coluna.topo && coluna.topo.length > 0) return { tipo: "barras" as const, pontos: coluna.topo.map((t) => ({ chave: t.valor, rotulo: t.valor || "(vazio)", valor: t.contagem, n: t.contagem })) };
    return null;
  }, [coluna, tabelaAtiva, escolhida]);

  if (!perfil || !tabelaAtiva) {
    return (
      <Pagina>
        <AbasAnalise />
        <Titulo titulo={P.titulo} />
        <SemDados />
      </Pagina>
    );
  }
  const fortes = perfil.correlacoes.filter((c) => Math.abs(c.r) >= 0.5).slice(0, 6);

  return (
    <Pagina>
      <AbasAnalise />
      <Titulo titulo={P.titulo}>
        <SeletorTabela />
      </Titulo>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Painel titulo={P.qualidade}>
            <div className="flex items-center gap-5">
              <Dica conteudo={<CorpoDica titulo="Pontuação de qualidade" texto={DICA_ESTATISTICA.pontuacao} />}>
                <Anel valor={perfil.pontuacao} tamanho={104} />
              </Dica>
              <div className="grid flex-1 grid-cols-2 gap-3">
                <Dado chave="linhas" rotulo={T.geral.linhas} valor={formatar(perfil.linhas)} />
                <Dado chave="colunas" rotulo={T.geral.colunas} valor={String(perfil.colunas.length)} />
                <Dado chave="completude" rotulo={P.completude} valor={`${perfil.completude.toFixed(1).replace(".", ",")} %`} />
                <Dado chave="duplicadas" rotulo={P.duplicadas} valor={formatar(perfil.duplicadas)} />
              </div>
            </div>
          </Painel>
          <Painel titulo={P.anomalias}>
            <Esbatido className="sem-barra flex max-h-[380px] flex-col overflow-y-auto">
              {perfil.anomalias.length === 0 && <span className="text-sm text-kumo-subtle">{P.semAnomalias}</span>}
              {perfil.anomalias.map((a, i) => (
                <div key={i} className="flex flex-col gap-1 border-b border-kumo-hairline py-2.5 first:pt-0 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Dica conteudo={DICA_GRAVIDADE[a.gravidade]}><Badge variant={a.gravidade === "alta" ? "error" : a.gravidade === "media" ? "warning" : "secondary"}>{a.gravidade}</Badge></Dica>
                    <b className="text-sm font-medium">{a.tipo}</b>
                    {a.coluna && <span className="truncate text-sm text-kumo-subtle">{a.coluna}</span>}
                  </div>
                  <span className="text-sm text-kumo-subtle">{a.mensagem}</span>
                </div>
              ))}
            </Esbatido>
          </Painel>
        </div>
        <Painel titulo={P.colunas}>
          <Esbatido className="sem-barra flex max-h-[640px] flex-col gap-1 overflow-y-auto">
            {perfil.colunas.map((c, i) => (
              <button key={`${c.nome}-${i}`} aria-current={i === escolhida} onClick={() => setEscolhida(i)} className={`flex flex-col gap-1.5 rounded-lg px-3 py-2 text-left transition-colors ${i === escolhida ? "bg-kumo-tint" : "hover:bg-kumo-tint"}`}>
                <div className="flex items-center justify-between gap-2">
                  <b className="min-w-0 truncate text-sm font-medium">{c.nome}</b>
                  <Dica conteudo={DICA_TIPO[c.tipo]}><Badge variant="outline">{c.tipo}</Badge></Dica>
                </div>
                <Meter trackClassName="h-2.5" label="" value={c.n === 0 ? 0 : ((c.n - c.nulos) / c.n) * 100} max={100} showValue={false} />
                <span className="text-xs text-kumo-subtle">
                  {formatar(c.unicos)} {P.unicos.toLowerCase()} · {c.n === 0 ? 0 : Math.round(((c.n - c.nulos) / c.n) * 100)} % preenchida
                </span>
              </button>
            ))}
          </Esbatido>
        </Painel>
        <Painel titulo={coluna ? `${P.detalhe}: ${coluna.nome}` : P.detalhe}>
          {coluna && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Dado chave="tipo" rotulo={P.tipo} valor={coluna.tipo} />
                <Dado chave="emFalta" rotulo={P.emFalta} valor={formatar(coluna.nulos)} />
                <Dado chave="unicos" rotulo={P.unicos} valor={formatar(coluna.unicos)} />
                {coluna.estat && (
                  <>
                    <Dado chave="minimo" rotulo={P.minimo} valor={num(coluna.estat.min)} />
                    <Dado chave="maximo" rotulo={P.maximo} valor={num(coluna.estat.max)} />
                    <Dado chave="media" rotulo={P.media} valor={num(coluna.estat.media)} />
                    <Dado chave="mediana" rotulo={P.mediana} valor={num(coluna.estat.mediana)} />
                    <Dado chave="desvio" rotulo={P.desvio} valor={num(coluna.estat.desvio)} />
                    <Dado chave="atipicos" rotulo={P.atipicos} valor={formatar(coluna.outliers ?? 0)} />
                  </>
                )}
                {coluna.primeiraData && (
                  <>
                    <Dado chave="primeira" rotulo={P.primeira} valor={coluna.primeiraData} />
                    <Dado chave="ultima" rotulo={P.ultima} valor={coluna.ultimaData ?? ""} />
                  </>
                )}
              </div>
              {detalhe && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-kumo-subtle">{detalhe.tipo === "barras" ? P.maisFrequentes : coluna.nome}</span>
                  <Grafico spec={detalhe} altura={190} nome={coluna.nome} />
                </div>
              )}
              {fortes.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-kumo-subtle">{P.correlacoes}</span>
                  {fortes.map((c) => (
                    <div key={`${c.a}-${c.b}`} className="flex justify-between border-b border-kumo-hairline py-1.5 text-sm last:border-b-0">
                      <span className="truncate">
                        {c.a} · {c.b}
                      </span>
                      <b className="tabular-nums">{c.r.toFixed(2).replace(".", ",")}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Painel>
      </div>
    </Pagina>
  );
}
