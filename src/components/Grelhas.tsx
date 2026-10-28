// Tabelas do painel com o aspeto da Cloudflare (Kumo): barra de pesquisa, cabeçalhos que ordenam, menu por coluna (visualizar, remover), estados de carregamento e vazio, e paginação verdadeira, nunca só as primeiras linhas.
"use client";

import { Button, DropdownMenu, Empty, Input, LayerCard, Pagination, Table, Tooltip } from "@cloudflare/kumo";
import { caminho } from "@/dados/estrutura";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { T } from "@/dados/textos";
import { formatar } from "@/components/graficos/Graficos";
import { lerData, lerNumero, paraTexto, vazio } from "@/lib/analysis/valores";
import { useApp } from "@/lib/estado";
import { guardarPedido, type TipoPedido } from "@/lib/pedido-grafico";
import type { Celula, TipoColuna } from "@/lib/tipos";
import { DICA_TIPO } from "@/dados/dicas";
import { CorpoDica, Dica } from "./Dica";
import { Esbatido, EsqueletoTabela } from "./Estados";
import { Ic, ICONES } from "./Icones";

const ROTULOS_PAGINACAO = { navigation: "Paginação", firstPage: "Primeira página", previousPage: "Página anterior", nextPage: "Página seguinte", lastPage: "Última página", pageNumber: "Número da página", pageSize: "Linhas por página" };

function Pesquisa({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  return (
    <Dica linha conteudo="Procura em todas as colunas desta tabela.">
      <div className="relative w-full sm:max-w-[300px]">
        <Ic nome="lupa" tamanho={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-kumo-subtle" />
        <Input value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={T.geral.pesquisar} aria-label={T.geral.pesquisar} className="w-full pl-9" />
      </div>
    </Dica>
  );
}

function Rodape({ pagina, porPagina, total, aoMudar }: { pagina: number; porPagina: number; total: number; aoMudar: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-kumo-hairline px-4 py-2.5">
      <Pagination page={pagina + 1} setPage={(p: number) => aoMudar(p - 1)} perPage={porPagina} totalCount={total} labels={ROTULOS_PAGINACAO}>
        <Pagination.Info>{({ pageShowingRange, totalCount }) => <span className="text-sm text-kumo-subtle">{`${pageShowingRange} de ${formatar(totalCount ?? total)}`}</span>}</Pagination.Info>
        <Pagination.Controls />
      </Pagination>
    </div>
  );
}

/** Tabela vazia: sem registos, ou sem resultados para a pesquisa (com o botão para a limpar). */
function SemLinhas({ pesquisa, aoLimpar }: { pesquisa: string; aoLimpar: () => void }) {
  return (
    <Empty
      size="sm"
      icon={<Ic nome="lupa" tamanho={32} />}
      title={pesquisa ? "Sem resultados" : T.geral.semDados}
      contents={
        pesquisa ? (
          <Button variant="secondary" size="sm" onClick={aoLimpar}>
            Limpar pesquisa
          </Button>
        ) : undefined
      }
    />
  );
}

/** O duplo «⌃⌄» das colunas ordenáveis: ao ordenar, o lado escolhido fica a negrito e o outro apagado. */
function IconeOrdem({ sentido }: { sentido: "asc" | "desc" | null }) {
  return (
    <span aria-hidden className="inline-flex flex-col items-center leading-none">
      <Ic nome="cima" tamanho={10} peso={sentido === "asc" ? "bold" : "regular"} className={`-mb-[3px] ${sentido === "asc" ? "text-kumo-default" : "text-kumo-inactive"}`} />
      <Ic nome="baixo" tamanho={10} peso={sentido === "desc" ? "bold" : "regular"} className={sentido === "desc" ? "text-kumo-default" : "text-kumo-inactive"} />
    </span>
  );
}

function Cabeca({ rotulo, ordenada, sentido, aoOrdenar, numerica, sub, dica, menu }: { rotulo: string; ordenada: boolean; sentido: "asc" | "desc" | null; aoOrdenar: () => void; numerica?: boolean; sub?: string; dica?: ReactNode; menu?: ReactNode }) {
  return (
    <Table.Head className={`group/cab ${numerica ? "text-right" : ""}`}>
      <div className={`flex items-center gap-1 ${numerica ? "justify-end" : ""}`}>
        <Dica conteudo={dica ?? `Ordenar por ${rotulo}. Clique outra vez para inverter e mais uma para limpar.`}>
          <button onClick={aoOrdenar} className={`inline-flex items-center gap-1.5 font-medium hover:text-kumo-default ${numerica ? "flex-row-reverse" : ""}`} aria-label={`${T.geral.ordenar}: ${rotulo}`}>
            {rotulo}
            <IconeOrdem sentido={ordenada ? sentido : null} />
          </button>
        </Dica>
        {menu}
      </div>
      {sub && <div className="text-[11px] font-normal text-kumo-inactive">{sub}</div>}
    </Table.Head>
  );
}

// ---------- registos (poucos dados, células com componentes) ----------

export interface ColunaGrelha {
  rotulo: string;
  numerica?: boolean;
}

export interface LinhaGrelha {
  chave: string;
  celulas: ReactNode[];
  /** Valores usados para ordenar, uma por coluna. */
  ordem: (string | number)[];
  texto: string;
  acoes?: ReactNode;
  pendente?: boolean;
}

export function GrelhaRegistos({ colunas, linhas, porPagina = 10, filtros }: { colunas: ColunaGrelha[]; linhas: LinhaGrelha[]; porPagina?: number; filtros?: ReactNode }) {
  const { pronto } = useApp();
  const [q, setQ] = useState("");
  const [ord, setOrd] = useState<{ col: number; desc: boolean } | null>(null);
  const [pagina, setPagina] = useState(0);
  const filtradas = useMemo(() => {
    const termo = q.trim().toLowerCase();
    const base = termo ? linhas.filter((l) => l.texto.includes(termo)) : linhas;
    if (!ord) return base;
    return [...base].sort((a, b) => {
      const x = a.ordem[ord.col];
      const y = b.ordem[ord.col];
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt");
      return ord.desc ? -c : c;
    });
  }, [linhas, q, ord]);
  useEffect(() => setPagina(0), [q, ord]);
  const visiveis = filtradas.slice(pagina * porPagina, (pagina + 1) * porPagina);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pesquisa valor={q} aoMudar={setQ} />
        {filtros}
      </div>
      <LayerCard className="pleno overflow-hidden p-0">
        <Esbatido className="sem-barra overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                {colunas.map((c, i) => (
                  <Cabeca key={c.rotulo} rotulo={c.rotulo} numerica={c.numerica} ordenada={ord?.col === i} sentido={ord?.col === i ? (ord.desc ? "desc" : "asc") : null} aoOrdenar={() => setOrd((o) => (o?.col === i ? (o.desc ? null : { col: i, desc: true }) : { col: i, desc: false }))} />
                ))}
                <Table.Head />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {pronto &&
                visiveis.map((l) => (
                  <Table.Row key={l.chave} className={l.pendente ? "opacity-60 transition-opacity" : "transition-opacity"}>
                    {l.celulas.map((c, i) => (
                      <Table.Cell key={i} className={colunas[i].numerica ? "text-right tabular-nums" : undefined}>
                        {c}
                      </Table.Cell>
                    ))}
                    <Table.Cell className="text-right">
                      <div className="flex justify-end gap-1">{l.acoes}</div>
                    </Table.Cell>
                  </Table.Row>
                ))}
            </Table.Body>
          </Table>
        </Esbatido>
        {!pronto && <EsqueletoTabela colunas={Math.min(colunas.length, 5)} linhas={Math.min(porPagina, 5)} />}
        {pronto && visiveis.length === 0 && <SemLinhas pesquisa={q.trim()} aoLimpar={() => setQ("")} />}
        <Rodape pagina={pagina} porPagina={porPagina} total={pronto ? filtradas.length : 0} aoMudar={setPagina} />
      </LayerCard>
    </div>
  );
}

// ---------- dados extraídos (podem ser centenas de milhares de linhas) ----------

function chaveOrdem(v: Celula, tipo: TipoColuna): number | string {
  if (vazio(v)) return "";
  if (tipo === "inteiro" || tipo === "numero") return lerNumero(v) ?? "";
  if (tipo === "data") return lerData(v)?.getTime() ?? "";
  return paraTexto(v).toLowerCase();
}

/** Menu de uma coluna: escolher como a visualizar (abre a página de gráficos já configurada) ou removê-la da tabela. */
function MenuColuna({ nome, tipo, temData, aoVisualizar, aoRemover }: { nome: string; tipo: TipoColuna; temData: boolean; aoVisualizar: (t: TipoPedido) => void; aoRemover: () => void }) {
  const numerica = tipo === "inteiro" || tipo === "numero";
  return (
    <DropdownMenu>
      <Tooltip
        content={`Opções da coluna ${nome}`}
        render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="xs" icon={ICONES.mais3} aria-label={`Opções da coluna ${nome}`} className="rotate-90 text-kumo-subtle opacity-0 transition-opacity focus-visible:opacity-100 group-hover/cab:opacity-100 data-[popup-open]:opacity-100 [@media(hover:none)]:opacity-100" />} />}
      />
      <DropdownMenu.Content collisionPadding={12}>
        <DropdownMenu.Group>
        <DropdownMenu.Label>Visualizar</DropdownMenu.Label>
        <DropdownMenu.Item icon={<Ic nome="serie" />} disabled={!temData} onClick={() => aoVisualizar("linha")}>
          Série temporal
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="lista" />} onClick={() => aoVisualizar("barras")}>
          Lista de topo
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="grafico" />} disabled={!numerica} onClick={() => aoVisualizar("histograma")}>
          Histograma
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="rosca" />} onClick={() => aoVisualizar("rosca")}>
          Rosca
        </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Item icon={<Ic nome="fechar" />} onClick={aoRemover}>
          Remover coluna
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

/** Botão «Campos»: mostra ou esconde colunas, como o da tabela de registos da Cloudflare. */
function Campos({ colunas, ocultas, aoAlternar, aoMostrarTodas }: { colunas: string[]; ocultas: Set<number>; aoAlternar: (i: number) => void; aoMostrarTodas: () => void }) {
  return (
    <DropdownMenu>
      <Dica conteudo="Escolher que colunas aparecem na tabela.">
        <DropdownMenu.Trigger
          render={
            <Button variant="secondary" icon={ICONES.campos}>
              Campos{ocultas.size > 0 ? ` (${colunas.length - ocultas.size}/${colunas.length})` : ""}
            </Button>
          }
        />
      </Dica>
      <DropdownMenu.Content collisionPadding={12} className="max-h-[340px] overflow-y-auto">
        {ocultas.size > 0 && (
          <>
            <DropdownMenu.Item icon={<Ic nome="olho" />} onClick={aoMostrarTodas}>
              Mostrar todas
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
          </>
        )}
        {colunas.map((c, i) => (
          <DropdownMenu.Item key={`${c}-${i}`} closeOnClick={false} selected={!ocultas.has(i)} onClick={() => aoAlternar(i)}>
            {c}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

export function GrelhaDados({ colunas, linhas, tipos, porPagina = 25 }: { colunas: string[]; linhas: Celula[][]; tipos: TipoColuna[]; porPagina?: number }) {
  const { pronto } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const consulta = useDeferredValue(q);
  const [ord, setOrd] = useState<{ col: number; desc: boolean } | null>(null);
  const [pagina, setPagina] = useState(0);
  const [ocultas, setOcultas] = useState<Set<number>>(new Set());
  useEffect(() => setPagina(0), [consulta, ord, linhas]);
  useEffect(() => setOcultas(new Set()), [colunas]);

  const indices = useMemo(() => {
    const termo = consulta.trim().toLowerCase();
    let idx: number[] = [];
    if (termo === "") idx = Array.from({ length: linhas.length }, (_, i) => i);
    else for (let i = 0; i < linhas.length; i++) if (linhas[i].some((c) => c !== null && String(c).toLowerCase().includes(termo))) idx.push(i);
    if (ord) {
      const t = tipos[ord.col] ?? "texto";
      const chaves = new Map<number, number | string>();
      for (const i of idx) chaves.set(i, chaveOrdem(linhas[i][ord.col] ?? null, t));
      idx = idx.sort((a, b) => {
        const x = chaves.get(a)!;
        const y = chaves.get(b)!;
        if (x === "" && y !== "") return 1;
        if (y === "" && x !== "") return -1;
        const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt");
        return ord.desc ? -c : c;
      });
    }
    return idx;
  }, [linhas, consulta, ord, tipos]);

  const cols = colunas.map((_, i) => i).filter((i) => !ocultas.has(i));
  const temData = tipos.includes("data");
  /** Esconde ou mostra uma coluna; a última visível não se pode esconder. */
  const alternar = (i: number) =>
    setOcultas((o) => {
      const novo = new Set(o);
      if (novo.has(i)) novo.delete(i);
      else if (novo.size < colunas.length - 1) novo.add(i);
      return novo;
    });
  const visualizar = (coluna: number, tipo: TipoPedido) => {
    guardarPedido({ coluna, tipo });
    router.push(caminho("analise", "graficos"));
  };

  const visiveis = indices.slice(pagina * porPagina, (pagina + 1) * porPagina);
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pesquisa valor={q} aoMudar={setQ} />
        <Campos colunas={colunas} ocultas={ocultas} aoAlternar={alternar} aoMostrarTodas={() => setOcultas(new Set())} />
      </div>
      <LayerCard className="pleno overflow-hidden p-0">
        <Esbatido className="sem-barra max-h-[520px] overflow-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head className="w-12 text-right text-kumo-inactive">#</Table.Head>
                {cols.map((i) => (
                  <Cabeca
                    key={`${colunas[i]}-${i}`}
                    rotulo={colunas[i]}
                    sub={tipos[i]}
                    dica={<CorpoDica titulo={colunas[i]} texto={DICA_TIPO[tipos[i]]} linhas={[{ rotulo: "Tipo", valor: tipos[i] }, { rotulo: "Ordenar", valor: "Clique para ordenar, outra vez para inverter e mais uma para limpar." }]} />}
                    numerica={tipos[i] === "inteiro" || tipos[i] === "numero"}
                    ordenada={ord?.col === i} sentido={ord?.col === i ? (ord.desc ? "desc" : "asc") : null}
                    aoOrdenar={() => setOrd((o) => (o?.col === i ? (o.desc ? null : { col: i, desc: true }) : { col: i, desc: false }))}
                    menu={<MenuColuna nome={colunas[i]} tipo={tipos[i]} temData={temData} aoVisualizar={(t) => visualizar(i, t)} aoRemover={() => alternar(i)} />}
                  />
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {pronto &&
                visiveis.map((i) => (
                  <Table.Row key={i}>
                    <Table.Cell className="text-right tabular-nums text-kumo-inactive">{i + 1}</Table.Cell>
                    {cols.map((c) => {
                      const v = linhas[i][c] ?? null;
                      const numerica = tipos[c] === "inteiro" || tipos[c] === "numero";
                      return (
                        <Table.Cell key={c} className={`max-w-[280px] truncate ${numerica ? "text-right tabular-nums" : ""}`} title={v === null ? undefined : String(v)}>
                          {v === null ? "" : typeof v === "number" ? formatar(v) : String(v)}
                        </Table.Cell>
                      );
                    })}
                  </Table.Row>
                ))}
            </Table.Body>
          </Table>
        </Esbatido>
        {!pronto && <EsqueletoTabela colunas={Math.min(cols.length, 5)} linhas={5} />}
        {pronto && visiveis.length === 0 && <SemLinhas pesquisa={consulta.trim()} aoLimpar={() => setQ("")} />}
        <Rodape pagina={pagina} porPagina={porPagina} total={pronto ? indices.length : 0} aoMudar={setPagina} />
      </LayerCard>
    </div>
  );
}
