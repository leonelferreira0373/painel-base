// Peças de página do painel (as mesmas proporções do painel da Cloudflare): contentor centrado, título com ações, cartão de métrica com menu de opções e cartão de painel.
"use client";

import { Button, DropdownMenu, Surface, Tooltip } from "@cloudflare/kumo";
import Link from "next/link";
import type { ReactNode } from "react";
import { CorpoDica, Dica, DicaInfo } from "./Dica";
import { EsqueletoCartao } from "./Estados";
import { Ic, ICONES, type Icone } from "./Icones";
import { mesmoPeriodo, PERIODOS, type Periodo } from "./Periodo";

export function Pagina({ children, largo = false }: { children: ReactNode; largo?: boolean }) {
  return <div className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 ${largo ? "max-w-[1440px]" : "max-w-[1220px]"}`}>{children}</div>;
}

export function Titulo({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-semibold tracking-tight text-kumo-default">{titulo}</h1>
      {children && <div className="grid auto-cols-fr grid-flow-col gap-2 sm:flex sm:items-center">{children}</div>}
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
  carregando?: boolean;
  alturaEsqueleto?: number;
  anel?: boolean;
}) {
  const sobe = (variacao ?? 0) >= 0;
  const temPeriodo = !!(periodo && aoMudarPeriodo);
  const temTipo = !!(tipo && aoMudarTipo);
  const temMenu = !!(href || aoAtualizar || aoRemover || temPeriodo || temTipo);
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
            <Tooltip content="Opções do cartão" render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="xs" icon={ICONES.mais3} aria-label="Opções do cartão" className="-mr-1.5 text-kumo-subtle" />} />} />
            <DropdownMenu.Content collisionPadding={12}>
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
                  <DropdownMenu.SubContent sideOffset={10} collisionPadding={12}>
                    {PERIODOS.map((p) => (
                      <DropdownMenu.Item key={p.rotulo} selected={mesmoPeriodo(p, periodo!)} onClick={() => aoMudarPeriodo!(p)}>
                        {p.rotulo}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
              )}
              {temTipo && (
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger icon={<Ic nome={tipoAtual?.icone ?? "serie"} />}>Visualizar como</DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent sideOffset={10} collisionPadding={12}>
                    {TIPOS_CARTAO.map((t) => (
                      <DropdownMenu.Item key={t.id} icon={<Ic nome={t.icone} />} selected={t.id === tipo} onClick={() => aoMudarTipo!(t.id)}>
                        {t.rotulo}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
              )}
              {aoRemover && (
                <>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item icon={<Ic nome="lixo" />} variant="danger" onClick={aoRemover}>
                    Remover
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
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
    <Surface className={`pleno flex min-w-0 flex-col rounded-xl ${className}`}>
      <div className="flex min-h-11 items-center justify-between gap-3 px-4 pt-3">
        <h3 className="text-sm font-semibold text-kumo-default">{titulo}</h3>
        {acoes}
      </div>
      <div className="p-4 pt-2">{children}</div>
    </Surface>
  );
}
