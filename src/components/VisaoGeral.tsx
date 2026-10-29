// Início: o mesmo desenho da página inicial da Cloudflare (saudação, pesquisa, três listas, aviso e métricas com gráficos), calculado a partir dos registos que os módulos alteram.
"use client";

import { Banner, Button, DropdownMenu, Meter, Tooltip } from "@cloudflare/kumo";
import { GrelhaOrdenavel } from "./GrelhaOrdenavel";
import { MenuCartao } from "./Flutuantes";
import { DICA_CARTAO } from "@/dados/dicas";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AREAS, caminho } from "@/dados/estrutura";
import { localizar } from "./Shell";
import { podeVer } from "@/dados/rbac";
import type { Linha } from "@/dados/tipos";
import { T } from "@/dados/textos";
import { AVISO_VISAO, CARTAO_ANEL, CARTOES_SERIE, LISTA_RECENTES, LISTAS_VISAO } from "@/dados/visao";
import type { Ponto } from "@/lib/analysis/series";
import { useApp } from "@/lib/estado";
import { serie, serieHoras } from "@/lib/serie-registos";
import { lerRecentes } from "@/lib/recentes";
import { Dica } from "./Dica";
import { Grafico, type GraficoSpec } from "./graficos/Graficos";
import { Ic, ICONES, type Icone } from "./Icones";
import { HOJE, intervaloDe, PERIODO_PREDEFINIDO, SeletorPeriodo, type Periodo } from "./Periodo";
import { BotaoIcone, CartaoMetrica, Pagina, Secao, type TipoCartao } from "./ui";

const SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ORDEM_GRUPOS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo", "Madrugada", "Manhã", "Tarde", "Noite"];
/** Para a rosca: soma por dia da semana, ou por parte do dia quando o período é de horas. */
function agrupar(pontos: Ponto[]): Ponto[] {
  const grupos = new Map<string, number>();
  for (const p of pontos) {
    const nome = p.chave.includes("T") ? ((h) => (h < 6 ? "Madrugada" : h < 12 ? "Manhã" : h < 18 ? "Tarde" : "Noite"))(Number(p.chave.slice(11, 13))) : SEMANA[new Date(p.chave).getUTCDay()];
    grupos.set(nome, (grupos.get(nome) ?? 0) + p.valor);
  }
  return [...grupos].sort((a, b) => ORDEM_GRUPOS.indexOf(a[0]) - ORDEM_GRUPOS.indexOf(b[0])).map(([nome, valor]) => ({ chave: nome, rotulo: nome, valor, n: valor }));
}

function especificacao(g: { pontos: Ponto[] }, tipo: TipoCartao, nome: string): GraficoSpec {
  if (tipo === "colunas") return { tipo: "colunas", pontos: g.pontos };
  if (tipo === "rosca") return { tipo: "rosca", pontos: agrupar(g.pontos) };
  return { tipo: "linha", pontos: g.pontos, nome };
}

/** Quantas linhas de um módulo estão num dos estados indicados. */
const contar = (registos: Record<string, Linha[]>, modulo: string, campo: string, estados: readonly string[]) => (registos[modulo] ?? []).filter((l) => estados.includes(String(l[campo]))).length;

const variacao = (atual: number, anterior: number) => (anterior === 0 ? null : ((atual - anterior) / anterior) * 100);

const CHAVE_OCULTOS = "painel.inicio.ocultos";
const CARTOES = [...CARTOES_SERIE.map((c) => ({ id: c.id, titulo: c.titulo })), { id: CARTAO_ANEL.id, titulo: CARTAO_ANEL.titulo }];
const LISTAS = [...LISTAS_VISAO.map((l) => ({ id: l.id, titulo: `Lista: ${l.titulo}` })), { id: LISTA_RECENTES.id, titulo: `Lista: ${LISTA_RECENTES.titulo}` }];

function Lista({ titulo, href, itens, aoOcultar }: { titulo: string; href?: string; itens: { chave: string; icone: Icone; texto: string; href: string }[]; aoOcultar: () => void }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex h-9 items-center justify-between text-xs font-medium text-kumo-subtle">
        {href ? (
          <Link href={href} className="inline-flex items-center gap-1 transition-colors hover:text-kumo-default">
            {titulo} <Ic nome="seta" tamanho={12} />
          </Link>
        ) : (
          <span>{titulo}</span>
        )}
        <DropdownMenu>
          <Tooltip content={`Opções: ${titulo}`} render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="xs" icon={ICONES.mais3} aria-label={`Opções: ${titulo}`} className="text-kumo-subtle" />} />} />
          <MenuCartao>
            {href && (
              <DropdownMenu.LinkItem href={href} icon={<Ic nome="olho" />} render={<Link href={href} />}>
                Ver tudo
              </DropdownMenu.LinkItem>
            )}
            <DropdownMenu.Item icon={<Ic nome="fechar" />} onClick={aoOcultar}>
              Ocultar
            </DropdownMenu.Item>
          </MenuCartao>
        </DropdownMenu>
      </div>
      {itens.length === 0 && <span className="py-3 text-sm text-kumo-subtle">{T.geral.semDados}</span>}
      {itens.map((i) => (
        <Link key={i.chave} href={i.href} className="group flex h-11 items-center gap-2.5 border-b border-kumo-hairline text-sm text-kumo-default transition-colors last:border-b-0 hover:bg-kumo-tint/60">
          <Ic nome={i.icone} tamanho={16} className="shrink-0 text-kumo-subtle" />
          <span className="min-w-0 flex-1 truncate">{i.texto}</span>
          <Ic nome="seta" tamanho={14} className="shrink-0 text-kumo-subtle transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}

export function VisaoGeral() {
  const { registos, funcao, avisar, pronto } = useApp();
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_PREDEFINIDO);
  const [periodos, setPeriodos] = useState<Record<string, Periodo>>({});
  const [tipos, setTipos] = useState<Record<string, TipoCartao>>({});
  const [aCarregar, setACarregar] = useState<Record<string, boolean>>({});
  const [recentes, setRecentes] = useState<string[]>([]);
  const [ocultos, setOcultos] = useState<string[]>([]);
  const [versoes, setVersoes] = useState<Record<string, number>>({});
  useEffect(() => {
    setRecentes(lerRecentes());
    try {
      setOcultos(JSON.parse(window.localStorage.getItem(CHAVE_OCULTOS) ?? "[]"));
    } catch {
      /* sem armazenamento */
    }
  }, []);
  const guardarOcultos = (novos: string[]) => {
    setOcultos(novos);
    try {
      window.localStorage.setItem(CHAVE_OCULTOS, JSON.stringify(novos));
    } catch {
      /* sem armazenamento */
    }
  };
  const ocultar = (id: string) => guardarOcultos([...new Set([...ocultos, id])]);
  const mostrar = (id: string) => guardarOcultos(ocultos.filter((o) => o !== id));
  /** Mostra o esqueleto do cartão um instante, como o painel faz enquanto vai buscar os dados. */
  const carregar = (ids: string[], ms = 650) => {
    setACarregar((c) => ({ ...c, ...Object.fromEntries(ids.map((i) => [i, true])) }));
    window.setTimeout(() => setACarregar((c) => ({ ...c, ...Object.fromEntries(ids.map((i) => [i, false])) })), ms);
  };
  const atualizar = (id?: string) => {
    setVersoes((v) => (id ? { ...v, [id]: (v[id] ?? 0) + 1 } : Object.fromEntries([...CARTOES.map((c) => c.id)].map((k) => [k, (v[k] ?? 0) + 1]))));
    carregar(id ? [id] : CARTOES.map((c) => c.id));
    avisar(id ? "Cartão atualizado" : "Cartões atualizados");
  };
  const mudarPeriodo = (p: Periodo) => {
    setPeriodo(p);
    setPeriodos({});
    carregar(CARTOES.map((c) => c.id), 600);
  };
  const mudarPeriodoCartao = (id: string, p: Periodo) => {
    setPeriodos((o) => ({ ...o, [id]: p }));
    carregar([id], 500);
  };
  const visivel = (id: string) => !ocultos.includes(id);
  const periodoDe = (id: string) => periodos[id] ?? periodo;

  const series = useMemo(
    () =>
      Object.fromEntries(
        CARTOES_SERIE.map((c) => {
          const linhas = registos[c.registos] ?? [];
          const p = periodos[c.id] ?? periodo;
          return [c.id, p.horas ? serieHoras(linhas, c.campo, p.horas, p.fim) : serie(linhas, c.campo, p.dias, p.fim)];
        }),
      ) as Record<string, ReturnType<typeof serie>>,
    [registos, periodo, periodos],
  );

  const dados = useMemo(() => {
    const bons = contar(registos, CARTAO_ANEL.registos, CARTAO_ANEL.campo, CARTAO_ANEL.bons);
    const maus = contar(registos, CARTAO_ANEL.registos, CARTAO_ANEL.campo, CARTAO_ANEL.maus);
    return {
      taxa: bons + maus === 0 ? 0 : Math.round((bons / (bons + maus)) * 100),
      indicadores: CARTAO_ANEL.indicadores.map((i) => ({ rotulo: i.rotulo, valor: contar(registos, i.registos, i.campo, i.estados) })),
      aviso: contar(registos, AVISO_VISAO.registos, AVISO_VISAO.campo, AVISO_VISAO.estados),
    };
  }, [registos]);

  const nomeProprio = funcao.pessoa.split(" ")[0];
  const data = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${HOJE}T12:00:00`));
  const pesquisar = () => window.dispatchEvent(new CustomEvent("painel:pesquisa"));

  const listas = LISTAS_VISAO.map((l) => ({ ...l, itens: (registos[l.registos] ?? []).slice(0, 5).map((r) => ({ chave: r.id, icone: l.icone, texto: l.texto(r), href: l.href })) }));
  const recentesItens = recentes
    .map((c) => {
      const { areaId: a, moduloId: m } = localizar(c);
      const area = AREAS.find((x) => x.id === a);
      const mod = area?.modulos.find((x) => x.id === m);
      return area && mod && podeVer(funcao, area.id, mod.id) ? { chave: c, icone: mod.icone, texto: `${area.rotulo} / ${mod.rotulo}`, href: caminho(area.id, mod.id) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 5);

  const listasVisiveis = LISTAS.filter((l) => visivel(l.id)).length;
  const escondidos = [...LISTAS, ...CARTOES].filter((x) => ocultos.includes(x.id));
  const cartao = (id: string, titulo: string, href: string, altura: number) => {
    const g = series[id];
    const p = periodoDe(id);
    const tipo = tipos[id] ?? "serie";
    return (
      visivel(id) && (
        <CartaoMetrica
          key={`${id}-${versoes[id] ?? 0}`}
          titulo={titulo}
          valor={g.total.toLocaleString("pt-PT")}
          variacao={variacao(g.total, g.anterior)}
          dica={DICA_CARTAO[id]}
          variacaoDica={`Face ao período anterior com a mesma duração: ${g.anterior.toLocaleString("pt-PT")} contra ${g.total.toLocaleString("pt-PT")} neste período (${p.rotulo.toLowerCase()}).`}
          href={href}
          aoAtualizar={() => atualizar(id)}
          aoRemover={() => ocultar(id)}
          periodo={p}
          aoMudarPeriodo={(novo) => mudarPeriodoCartao(id, novo)}
          tipo={tipo}
          aoMudarTipo={(t) => setTipos((o) => ({ ...o, [id]: t }))}
          exportar={{ nome: titulo.toLowerCase().replace(/\s+/g, "-"), titulo, colunas: ["Data", "Valor"], linhas: g.pontos.map((p) => [p.rotulo, p.valor]) }}
          carregando={!pronto || !!aCarregar[id]}
          alturaEsqueleto={altura}
        >
          <Grafico spec={especificacao(g, tipo, titulo)} altura={altura} />
        </CartaoMetrica>
      )
    );
  };

  return (
    <Pagina>
      <div className="mx-auto flex w-full max-w-[900px] flex-col items-center gap-5 pt-6 text-center">
        <div>
          <h1 className="text-[30px] font-semibold leading-9 tracking-tight text-kumo-default">Olá, {nomeProprio}</h1>
          <p className="mt-1 text-sm text-kumo-subtle">Hoje, {data}</p>
        </div>
        <button onClick={pesquisar} title="" className="pleno flex h-10 w-full items-center gap-2 rounded-xl bg-kumo-base px-3 text-left text-sm text-kumo-placeholder ring ring-kumo-line transition-shadow hover:ring-kumo-interact max-sm:h-12" aria-label={T.topo.pesquisar}>
          <Ic nome="lupa" tamanho={16} />
          <span className="flex-1">{T.topo.pesquisaPlaceholder}</span>
          <kbd className="rounded bg-kumo-tint px-1.5 py-0.5 text-[11px] text-kumo-subtle">Ctrl</kbd>
          <kbd className="rounded bg-kumo-tint px-1.5 py-0.5 text-[11px] text-kumo-subtle">K</kbd>
        </button>
      </div>

      {listasVisiveis > 0 && (
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-3">
          {listas.map((l) => visivel(l.id) && <Lista key={l.id} titulo={l.titulo} href={l.href} itens={l.itens} aoOcultar={() => ocultar(l.id)} />)}
          {visivel(LISTA_RECENTES.id) && <Lista titulo={LISTA_RECENTES.titulo} itens={recentesItens} aoOcultar={() => ocultar(LISTA_RECENTES.id)} />}
        </div>
      )}

      {dados.aviso > 0 && podeVer(funcao, AVISO_VISAO.area, AVISO_VISAO.modulo) && (
        <Banner
          className="pleno max-sm:w-[calc(100%+2rem)]"
          variant="alert"
          icon={<Ic nome="aviso" tamanho={18} />}
          title={AVISO_VISAO.mensagem(dados.aviso)}
          action={
            <Link href={AVISO_VISAO.href}>
              <Button size="sm">{AVISO_VISAO.botao}</Button>
            </Link>
          }
        />
      )}

      <Secao
        titulo="Análises"
        acoes={
          <>
            <SeletorPeriodo periodo={periodo} aoMudar={mudarPeriodo} />
            <DropdownMenu>
              <Tooltip content="Adicionar métrica ou lista que ocultou" render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" icon={ICONES.mais} aria-label="Adicionar métrica" />} />} />
              <MenuCartao>
                {escondidos.length === 0 && <DropdownMenu.Item disabled>Todos os cartões estão visíveis</DropdownMenu.Item>}
                {escondidos.map((e) => (
                  <DropdownMenu.Item key={e.id} icon={<Ic nome="mais" />} onClick={() => mostrar(e.id)}>
                    {e.titulo}
                  </DropdownMenu.Item>
                ))}
              </MenuCartao>
            </DropdownMenu>
            <BotaoIcone dica="Atualizar tudo" icone="atualizar" aoClicar={() => atualizar()} />
          </>
        }
      >
        <GrelhaOrdenavel
          chave="inicio"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          itens={[
          ...CARTOES_SERIE.map((c) => ({ id: c.id, className: c.linha === 1 ? "sm:col-span-2" : undefined, conteudo: cartao(c.id, c.titulo, c.href, c.altura) })),
          { id: CARTAO_ANEL.id, conteudo: visivel(CARTAO_ANEL.id) && (
            <CartaoMetrica key={`${CARTAO_ANEL.id}-${versoes[CARTAO_ANEL.id] ?? 0}`} titulo={CARTAO_ANEL.titulo} valor={`${dados.taxa} %`} dica={DICA_CARTAO[CARTAO_ANEL.id]} href={CARTAO_ANEL.href} aoAtualizar={() => atualizar(CARTAO_ANEL.id)} aoRemover={() => ocultar(CARTAO_ANEL.id)} carregando={!pronto || !!aCarregar[CARTAO_ANEL.id]} anel>
              <div className="mt-3 flex flex-col gap-4">
                <Meter trackClassName="h-2.5" label={CARTAO_ANEL.rotuloMedidor} value={dados.taxa} max={100} />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {dados.indicadores.map((i) => (
                    <div key={i.rotulo}>
                      <div className="text-xs text-kumo-subtle">{i.rotulo}</div>
                      <div className="text-lg font-semibold tabular-nums">{i.valor}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CartaoMetrica>
          ) },
          ]}
        />
      </Secao>
    </Pagina>
  );
}
