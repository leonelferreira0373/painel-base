// O documento da pesquisa a fundo, com os seus objetos inteligentes: texto com termos em pill e citações [n] que levam à fonte, listas, tabelas, métricas, avisos, gráficos (os mesmos do painel, com cor própria), passos, pares de dados e a lista de fontes. É o que se vê no ecrã; a exportação do mesmo documento (PDF, Word, Markdown…) usa os mesmos blocos.
"use client";

import type { ReactNode } from "react";
import type { Bloco, DocumentoRico } from "@/lib/pesquisa-documento";
import { Grafico, type GraficoSpec } from "../graficos/Graficos";
import { Frase } from "../Frase";
import { Ic, type Icone } from "../Icones";
import { TabelaSimples, type ColunaSimples } from "../super/SuperPecas";

/** Um texto da IA: **negrito**, [n] a citar uma fonte e «termos» em pill. */
export function TextoRico({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\*\*[^*]+\*\*|\[\d{1,2}\])/g).map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
        const c = /^\[(\d{1,2})\]$/.exec(p);
        if (c)
          return (
            <sup key={i} className="mx-px">
              <a href={`#fonte-${c[1]}`} onClick={(e) => (e.preventDefault(), document.getElementById(`fonte-${c[1]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }))} className="font-medium text-kumo-default no-underline hover:underline" aria-label={`Fonte ${c[1]}`}>
                [{c[1]}]
              </a>
            </sup>
          );
        return <Frase key={i}>{p}</Frase>;
      })}
    </>
  );
}

const ICONE_DO_DESTAQUE: Record<"info" | "aviso" | "sucesso" | "erro", { icone: Icone; classe: string }> = {
  info: { icone: "info", classe: "bg-kumo-tint ring-kumo-line" },
  aviso: { icone: "aviso", classe: "bg-kumo-warning-tint ring-kumo-warning/40" },
  sucesso: { icone: "certo", classe: "bg-kumo-success-tint ring-kumo-success/40" },
  erro: { icone: "fechar", classe: "bg-kumo-danger-tint ring-kumo-danger/40" },
};

function especificacao(b: Extract<Bloco, { tipo: "grafico" }>): GraficoSpec {
  const unica = b.series.length === 1;
  if (b.grafico === "rosca") return { tipo: "rosca", pontos: b.categorias.map((c, i) => ({ chave: c, rotulo: c, valor: b.series[0]?.valores[i] ?? 0, n: 1 })) };
  if (b.grafico === "barras" && unica) return { tipo: "colunas", pontos: b.categorias.map((c, i) => ({ chave: c, rotulo: c, valor: b.series[0].valores[i] ?? 0, n: 1 })) };
  if (b.grafico === "barras") return { tipo: "empilhadas", rotulos: b.categorias, series: b.series, unidade: b.unidade };
  return { tipo: "linhas", rotulos: b.categorias, series: b.series, unidade: b.unidade };
}

function BlocoNaTela({ b }: { b: Bloco }): ReactNode {
  switch (b.tipo) {
    case "titulo":
      return b.nivel === 3 ? <h4 className="mt-2 text-sm font-semibold">{b.texto}</h4> : <h3 className="mt-3 text-base font-semibold">{b.texto}</h3>;
    case "paragrafo":
      return (
        <p className="text-sm leading-6">
          <TextoRico texto={b.texto} />
        </p>
      );
    case "lista": {
      const Etiqueta = b.ordenada ? "ol" : "ul";
      return (
        <Etiqueta className={`ml-5 flex flex-col gap-1 text-sm leading-6 ${b.ordenada ? "list-decimal" : "list-disc"}`}>
          {b.itens.map((x, i) => (
            <li key={i}>
              <TextoRico texto={x} />
            </li>
          ))}
        </Etiqueta>
      );
    }
    case "tabela": {
      const colunas: ColunaSimples<(string | number)[]>[] = b.colunas.map((c, i) => ({ rotulo: c, direita: b.linhas.length > 0 && b.linhas.every((l) => typeof l[i] === "number"), render: (l) => (typeof l[i] === "number" ? (l[i] as number).toLocaleString("pt-PT") : <TextoRico texto={String(l[i] ?? "")} />) }));
      return (
        <figure className="flex flex-col gap-1.5">
          <div className="overflow-hidden rounded-xl ring ring-kumo-line">
            <TabelaSimples colunas={colunas} linhas={b.linhas} chave={(l) => l.join("|")} />
          </div>
          {b.legenda && <figcaption className="text-xs text-kumo-subtle">{b.legenda}</figcaption>}
        </figure>
      );
    }
    case "metricas":
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {b.itens.map((m, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-0.5 rounded-xl p-3 ring ring-kumo-line">
              <span className="break-words text-xs font-medium text-kumo-subtle">{m.rotulo}</span>
              <span className="break-words text-lg font-semibold leading-snug tabular-nums">{typeof m.valor === "number" ? m.valor.toLocaleString("pt-PT") : m.valor}</span>
              {m.nota && <span className="text-xs text-kumo-subtle">{m.nota}</span>}
            </div>
          ))}
        </div>
      );
    case "destaque": {
      const d = ICONE_DO_DESTAQUE[b.variante];
      return (
        <div className={`flex items-start gap-3 rounded-xl p-3 text-sm ring ${d.classe}`} role="note">
          <Ic nome={d.icone} tamanho={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 leading-6">
            {b.titulo && <strong className="mr-1.5">{b.titulo}</strong>}
            <TextoRico texto={b.texto} />
          </div>
        </div>
      );
    }
    case "grafico":
      return (
        <figure className="flex flex-col gap-1.5">
          <figcaption className="text-sm font-medium">{b.titulo}</figcaption>
          <div className="rounded-xl p-2 ring ring-kumo-line">
            <Grafico spec={especificacao(b)} altura={200} nome={b.titulo} />
          </div>
        </figure>
      );
    case "citacao":
      return (
        <blockquote className="border-l-2 border-kumo-line pl-3 text-sm italic leading-6 text-kumo-subtle">
          <TextoRico texto={b.texto} />
          {b.fonte ? <TextoRico texto={` [${b.fonte}]`} /> : null}
        </blockquote>
      );
    case "passos":
      return (
        <ol className="flex flex-col gap-2">
          {b.itens.map((p, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-6">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-kumo-tint text-xs font-semibold ring ring-kumo-line">{i + 1}</span>
              <div className="min-w-0">
                <strong>{p.titulo}</strong>
                <div>
                  <TextoRico texto={p.texto} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      );
    case "pares":
      return (
        <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          {b.itens.map((p, i) => (
            <div key={i} className="contents">
              <dt className="font-medium text-kumo-subtle">{p.chave}</dt>
              <dd className="min-w-0 break-words">{p.valor}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

const CONFIANCA = { alta: "Confiança alta", media: "Confiança média", baixa: "Confiança baixa" } as const;

export function DocumentoNaTela({ doc }: { doc: DocumentoRico }) {
  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{doc.titulo}</h2>
        {doc.resumo && (
          <p className="text-sm leading-6 text-kumo-subtle">
            <TextoRico texto={doc.resumo} />
          </p>
        )}
        {doc.confianca && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring ring-kumo-line">
            <span aria-hidden className={`size-1.5 rounded-full ${doc.confianca === "alta" ? "bg-kumo-success" : doc.confianca === "media" ? "bg-kumo-warning" : "bg-kumo-danger"}`} />
            {CONFIANCA[doc.confianca]}
          </span>
        )}
      </header>
      {doc.blocos.map((b, i) => (
        <BlocoNaTela key={i} b={b} />
      ))}
      {doc.limitacoes.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold">Limitações</h3>
          <ul className="ml-5 list-disc text-sm leading-6">
            {doc.limitacoes.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      )}
      {doc.fontes.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold">Fontes</h3>
          <ol className="flex flex-col gap-1 text-sm">
            {doc.fontes.map((f) => (
              <li key={f.n} id={`fonte-${f.n}`} className="flex gap-2 scroll-mt-4">
                <span className="w-6 shrink-0 text-right tabular-nums text-kumo-subtle">{f.n}.</span>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 break-words text-kumo-default underline-offset-2 hover:underline">
                  {f.titulo}
                  <span className="ml-1.5 text-xs text-kumo-subtle">{(() => { try { return new URL(f.url).hostname.replace(/^www\./, ""); } catch { return ""; } })()}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
