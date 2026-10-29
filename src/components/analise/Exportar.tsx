// Exportação: CSV da tabela escolhida, Excel com todas as tabelas e o perfil, e um relatório em PDF com os gráficos selecionados.
"use client";

import { Checkbox, Loader, Surface } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { T } from "@/dados/textos";
import { sugerir, type Sugestao } from "@/lib/analysis/sugestoes";
import { useApp } from "@/lib/estado";
import { exportarCsv, exportarExcel } from "@/lib/export/ficheiros";
import { DICA_EXPORTAR } from "@/dados/dicas";
import { Dica } from "../Dica";
import { Grafico } from "../graficos/Graficos";
import { Ic, type Icone } from "../Icones";
import { Esbatido } from "../Estados";
import { Pagina, Painel, Titulo } from "../ui";
import { AbasAnalise, SemDados, SeletorTabela } from "./Comum";

function Formato({ chave, icone, nome, descricao, aoClicar, desativado }: { chave: string; icone: Icone; nome: string; descricao: string; aoClicar: () => void; desativado?: boolean }) {
  return (
    <Dica linha lado="bottom" conteudo={DICA_EXPORTAR[chave]}>
      <button onClick={aoClicar} disabled={desativado} className="w-full cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50">
        <Surface className="pleno grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl p-4 transition-colors hover:bg-kumo-tint">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-kumo-info-tint text-kumo-brand sm:row-span-2">
            <Ic nome={icone} tamanho={22} />
          </span>
          <b className="text-sm font-semibold">{nome}</b>
          <Ic nome="transferir" tamanho={20} className="shrink-0 text-kumo-brand sm:row-span-2" />
          <span className="col-span-3 text-sm text-kumo-subtle sm:col-span-1 sm:col-start-2">{descricao}</span>
        </Surface>
      </button>
    </Dica>
  );
}

export function Exportar() {
  const { ficheiros, tabelas, tabelaAtiva, perfil, perfilDe, guardados, removerGuardado, avisar } = useApp();
  const E = T.analise.exportar;
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const sugestoes = useMemo(() => (tabelaAtiva && perfil ? sugerir(tabelaAtiva, perfil) : []), [tabelaAtiva, perfil]);
  const todos: Sugestao[] = useMemo(() => [...guardados.filter((g) => g.id.includes(tabelaAtiva?.id ?? "-")), ...sugestoes], [guardados, sugestoes, tabelaAtiva]);

  if (!tabelaAtiva || !perfil) {
    return (
      <Pagina>
        <AbasAnalise />
        <Titulo titulo={E.titulo} />
        <SemDados />
      </Pagina>
    );
  }
  const incluidos = todos.filter((s) => !excluidos.has(s.id));
  const nomeBase = ficheiros[0]?.nome ?? tabelaAtiva.nome;

  const correr = async (chave: string, fn: () => Promise<void> | void) => {
    setOcupado(chave);
    try {
      await fn();
      avisar(E.pronto);
    } catch (e) {
      avisar(`Não foi possível exportar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Pagina>
      <AbasAnalise />
      <Titulo titulo={E.titulo}>
        {ocupado && (
          <span className="inline-flex items-center gap-2 text-sm text-kumo-subtle" role="status">
            <Loader size={16} />
            {E.aGerar}
          </span>
        )}
        <SeletorTabela />
      </Titulo>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-3">
          <Formato chave="csv" icone="tabela" nome={E.csv} descricao={`${E.csvDescricao} · ${tabelaAtiva.linhas.length.toLocaleString("pt-PT")} ${T.geral.linhas}`} desativado={!!ocupado} aoClicar={() => correr("csv", () => exportarCsv(tabelaAtiva, nomeBase))} />
          <Formato
            chave="excel"
            icone="excel"
            nome={E.excel}
            descricao={`${E.excelDescricao} · ${tabelas.length} ${tabelas.length === 1 ? "tabela" : "tabelas"}`}
            desativado={!!ocupado}
            aoClicar={() => correr("xlsx", () => exportarExcel({ nomeFicheiro: nomeBase, tabelas: tabelas.map((t) => ({ tabela: t, perfil: perfilDe(t) })) }))}
          />
          <Formato
            chave="pdf"
            icone="ficheiro"
            nome={E.pdf}
            descricao={`${E.pdfDescricao} · ${incluidos.length} ${incluidos.length === 1 ? "gráfico" : "gráficos"}`}
            desativado={!!ocupado}
            aoClicar={() =>
              correr("pdf", async () => {
                const { exportarPdf } = await import("@/lib/export/pdf");
                await exportarPdf({ ficheiros, tabela: tabelaAtiva, perfil, graficos: incluidos });
              })
            }
          />
        </div>
        <Painel titulo={E.conteudo}>
          <Esbatido className="sem-barra flex max-h-[560px] flex-col gap-5 overflow-y-auto">
            {todos.map((s) => {
              const ligado = !excluidos.has(s.id);
              const guardado = guardados.some((g) => g.id === s.id);
              return (
                <article key={s.id} className={`flex flex-col gap-1 transition-opacity ${ligado ? "" : "opacity-50"}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      label={s.titulo}
                      checked={ligado}
                      onCheckedChange={(v: boolean) =>
                        setExcluidos((x) => {
                          const n = new Set(x);
                          if (v) n.delete(s.id);
                          else n.add(s.id);
                          return n;
                        })
                      }
                    />
                    {guardado && (
                      <button className="ml-auto text-kumo-subtle hover:text-kumo-default" aria-label={T.geral.remover} onClick={() => removerGuardado(s.id)}>
                        <Ic nome="lixo" tamanho={14} />
                      </button>
                    )}
                  </div>
                  <Grafico spec={s.spec} altura={150} nome={s.titulo} />
                </article>
              );
            })}
          </Esbatido>
        </Painel>
      </div>
    </Pagina>
  );
}
