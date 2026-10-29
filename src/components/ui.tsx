// Peças de página do painel (as mesmas proporções do painel da Cloudflare): contentor centrado, título com ações, cartão de métrica com menu de opções e cartão de painel.
"use client";

import { Button, DropdownMenu, LayerCard, Surface, Tooltip } from "@cloudflare/kumo";
import { MenuCartao, SubMenuCartao, SeparadorDeMenu } from "./Flutuantes";
import Link from "next/link";
import type { ReactNode } from "react";
import { CorpoDica, Dica, DicaInfo } from "./Dica";
import { EsqueletoCartao } from "./Estados";
import { Ic, ICONES, type Icone } from "./Icones";
import { AreaMini } from "./graficos/Pequenos";
import { mesmoPeriodo, PERIODOS, type Periodo } from "./Periodo";
import { GatilhoDoMenu, ItensDeExportar } from "./MenuDeDados";
import { useResultadoTemporario } from "./Copiar";
import type { DadosExportaveis } from "@/lib/exportar-dados";
import { useEditar } from "@/lib/permissao";
import { T } from "@/dados/textos";

export function Pagina({ children, largo = false }: { children: ReactNode; largo?: boolean }) {
  return <div className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 ${largo ? "max-w-[1440px]" : "max-w-[1220px]"}`}>{children}</div>;
}

/** A marca de um ecrã em que a função ativa só pode ver. */
export function SoLeitura() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-kumo-subtle">
      <Ic nome="cadeado" tamanho={14} />
      {T.acesso.somenteLeitura}
    </span>
  );
}

export function Titulo({ titulo, children }: { titulo: string; children?: ReactNode }) {
  const editar = useEditar();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-semibold tracking-tight text-kumo-default">{titulo}</h1>
      {(children || !editar) && (
        <div className="grid auto-cols-fr grid-flow-col gap-2 sm:flex sm:items-center">
          {!editar && <SoLeitura />}
          {children}
        </div>
      )}
    </div>
  );
}

export function Secao({ titulo, acoes, children }: { titulo: string; acoes?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-kumo-default">{titulo}</h2>
        {acoes && <div className="flex items-center gap-2">{acoes}</div>}
      </div>
      {children}
    </section>
  );
}

/** Botão só com ícone e dica ao passar o rato, como os botões de ícone do painel da Cloudflare. */
export function BotaoIcone({ dica, icone, aoClicar, tamanho = "base", variante = "ghost" }: { dica: string; icone: keyof typeof ICONES; aoClicar?: () => void; tamanho?: "xs" | "sm" | "base"; variante?: "ghost" | "secondary" }) {
  return <Tooltip content={dica} render={<Button variant={variante} shape="square" size={tamanho} icon={ICONES[icone]} aria-label={dica} onClick={aoClicar} />} />;
}

export type TipoCartao = "serie" | "colunas" | "rosca";
export const TIPOS_CARTAO: { id: TipoCartao; rotulo: string; icone: Icone }[] = [
  { id: "serie", rotulo: "Série temporal", icone: "serie" },
  { id: "colunas", rotulo: "Colunas", icone: "grafico" },
  { id: "rosca", rotulo: "Rosca", icone: "rosca" },
];

/** Cartão com o aspeto das métricas da página inicial da Cloudflare: título pequeno com menu de opções, número grande, variação e gráfico. */
export function CartaoMetrica({
  titulo,
  valor,
  variacao,
  variacaoDica,
  dica,
  children,
  className = "",
  href,
  aoAtualizar,
  aoRemover,
  periodo,
  aoMudarPeriodo,
  tipo,
  aoMudarTipo,
  exportar,
  carregando = false,
  alturaEsqueleto = 110,
  anel = false,
}: {
  titulo: string;
  valor?: string;
  variacao?: number | null;
  /** Explica a variação: com que período se compara e os valores. */
  variacaoDica?: string;
  /** Explica o que o cartão mede; aparece como «i» ao lado do título. */
  dica?: string;
  children?: ReactNode;
  className?: string;
  href?: string;
  aoAtualizar?: () => void;
  aoRemover?: () => void;
  /** Período do próprio cartão; com `aoMudarPeriodo` o menu ganha a lista de períodos. */
  periodo?: Periodo;
  aoMudarPeriodo?: (p: Periodo) => void;
  /** Tipo de gráfico do cartão; com `aoMudarTipo` o menu ganha «Visualizar como». */
  tipo?: TipoCartao;
  aoMudarTipo?: (t: TipoCartao) => void;
  /** Os dados do cartão; com eles o menu ganha «Exportar» (CSV, JSON e copiar como imagem). */
  exportar?: DadosExportaveis;
  carregando?: boolean;
  alturaEsqueleto?: number;
  anel?: boolean;
}) {
  const sobe = (variacao ?? 0) >= 0;
  const temPeriodo = !!(periodo && aoMudarPeriodo);
  const temTipo = !!(tipo && aoMudarTipo);
  const temMenu = !!(href || aoAtualizar || aoRemover || temPeriodo || temTipo || exportar);
  const [copia, definirCopia] = useResultadoTemporario();
  const tipoAtual = TIPOS_CARTAO.find((t) => t.id === tipo);
  return (
    <Surface className={`pleno group/cartao flex min-w-0 flex-col gap-1 rounded-xl p-4 ${className}`}>
      <div className="flex h-5 items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-kumo-subtle">
          {titulo}
          {dica && <DicaInfo titulo={titulo} texto={dica} />}
        </span>
        {temMenu && (
          <DropdownMenu>
            <GatilhoDoMenu estado={copia} />
            <MenuCartao>
              {href && (
                <DropdownMenu.LinkItem href={href} icon={<Ic nome="olho" />} render={<Link href={href} />}>
                  Ver detalhes
                </DropdownMenu.LinkItem>
              )}
              {aoAtualizar && (
                <DropdownMenu.Item icon={<Ic nome="atualizar" />} onClick={aoAtualizar}>
                  Atualizar
                </DropdownMenu.Item>
              )}
              {temPeriodo && (
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger icon={<Ic nome="calendario" />}>{periodo!.rotulo}</DropdownMenu.SubTrigger>
                  <SubMenuCartao>
                    {PERIODOS.map((p) => (
                      <DropdownMenu.Item key={p.rotulo} selected={mesmoPeriodo(p, periodo!)} onClick={() => aoMudarPeriodo!(p)}>
                        {p.rotulo}
                      </DropdownMenu.Item>
                    ))}
                  </SubMenuCartao>
                </DropdownMenu.Sub>
              )}
              {temTipo && (
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger icon={<Ic nome={tipoAtual?.icone ?? "serie"} />}>Visualizar como</DropdownMenu.SubTrigger>
                  <SubMenuCartao>
                    {TIPOS_CARTAO.map((t) => (
                      <DropdownMenu.Item key={t.id} icon={<Ic nome={t.icone} />} selected={t.id === tipo} onClick={() => aoMudarTipo!(t.id)}>
                        {t.rotulo}
                      </DropdownMenu.Item>
                    ))}
                  </SubMenuCartao>
                </DropdownMenu.Sub>
              )}
              {exportar && <ItensDeExportar dados={exportar} aoCopiarImagem={(ok) => definirCopia(ok ? "ok" : "erro")} />}
              {aoRemover && (
                <>
                  <SeparadorDeMenu />
                  <DropdownMenu.Item icon={<Ic nome="lixo" />} variant="danger" onClick={aoRemover}>
                    Remover
                  </DropdownMenu.Item>
                </>
              )}
            </MenuCartao>
          </DropdownMenu>
        )}
      </div>
      {carregando ? (
        <EsqueletoCartao altura={alturaEsqueleto} anel={anel} />
      ) : (
        <>
          {valor !== undefined && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums tracking-tight text-kumo-default">{valor}</span>
              {variacao !== null && variacao !== undefined && Number.isFinite(variacao) && (
                <Dica conteudo={variacaoDica ? <CorpoDica texto={variacaoDica} /> : null}>
                  <span className={`inline-flex items-center gap-0.5 text-[13px] font-medium ${sobe ? "text-kumo-success" : "text-kumo-danger"}`}>
                    <Ic nome={sobe ? "subida" : "descida"} tamanho={13} />
                    {Math.abs(variacao).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} %
                  </span>
                </Dica>
              )}
            </div>
          )}
          {children}
        </>
      )}
    </Surface>
  );
}

export function Painel({ titulo, children, acoes, className = "" }: { titulo: string; children: ReactNode; acoes?: ReactNode; className?: string }) {
  return (
    <LayerCard className={`pleno min-w-0 ${className}`}>
      <LayerCard.Secondary className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{titulo}</h3>
        {acoes}
      </LayerCard.Secondary>
      <LayerCard.Primary className="p-4">{children}</LayerCard.Primary>
    </LayerCard>
  );
}

/** Cartão de estatística da análise, como os da Cloudflare: título pequeno, número grande, variação face ao período anterior e, por baixo, o gráfico de área de ponta a ponta. A variação mostra-se sem abrir nada; `pior` marca as estatísticas em que subir é mau. */
export function CartaoEstatistica({ titulo, valor, variacao, pior = false, dica, valores, carregando = false }: { titulo: string; valor: string; variacao: number | null; pior?: boolean; dica?: string; valores: number[]; carregando?: boolean }) {
  const sobe = (variacao ?? 0) >= 0;
  const bom = pior ? !sobe : sobe;
  return (
    <div className="pleno relative flex h-32 min-h-0 min-w-0 flex-col overflow-hidden rounded-lg bg-kumo-base ring ring-kumo-line transition-colors hover:ring-kumo-fill">
      <div className="flex items-start gap-3 px-4 pb-0.5 pt-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-kumo-subtle">
          {titulo}
          {dica && <DicaInfo titulo={titulo} texto={dica} />}
        </span>
      </div>
      {carregando ? (
        <div className="px-4 pt-1">
          <EsqueletoCartao altura={60} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold leading-tight tabular-nums text-kumo-default">{valor}</span>
            {variacao !== null && Number.isFinite(variacao) && (
              <Dica conteudo="Variação face ao período anterior com a mesma duração.">
                <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${bom ? "text-kumo-success" : "text-kumo-danger"}`}>
                  <Ic nome={sobe ? "subida" : "descida"} tamanho={13} />
                  {Math.abs(variacao).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} %
                </span>
              </Dica>
            )}
          </div>
          <div className="-mx-4 mt-1.5 min-h-10 flex-1">
            <AreaMini valores={valores} altura={60} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Separadores de uma página (Pedidos, Desempenho…), como a lista de separadores da Cloudflare: fundo rebaixado e o separador escolhido em branco, com anel e sombra. */
export function Separadores({ itens, valor, aoMudar }: { itens: readonly { id: string; rotulo: string }[]; valor: string; aoMudar: (id: string) => void }) {
  return (
    <div role="tablist" className="sem-barra flex h-9 min-w-0 shrink items-stretch overflow-x-auto rounded-lg bg-kumo-recessed px-0.5">
      {itens.map((i) => (
        <button key={i.id} role="tab" aria-selected={i.id === valor} onClick={() => aoMudar(i.id)} className={`my-0.5 flex items-center whitespace-nowrap rounded-md px-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kumo-brand ${i.id === valor ? "bg-kumo-base text-kumo-default shadow-sm ring ring-kumo-line" : "text-kumo-subtle hover:text-kumo-default"}`}>
          {i.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Legenda de um gráfico com o valor de cada série (como «TCP handshake 94 ms» nos gráficos da Cloudflare). */
export function LegendaValores({ itens }: { itens: { nome: string; cor: string; valor: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
      {itens.map((i) => (
        <span key={i.nome} className="inline-flex items-center gap-1.5 text-kumo-subtle">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: i.cor }} />
          {i.nome}
          <b className="font-semibold tabular-nums text-kumo-default">{i.valor}</b>
        </span>
      ))}
    </div>
  );
}
