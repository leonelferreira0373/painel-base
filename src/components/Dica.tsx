// Dicas (tooltips) do painel: o mesmo componente do Kumo que a Cloudflare usa, com um formato único para títulos, linhas e passos.
"use client";

import { Tooltip } from "@cloudflare/kumo";
import type { ReactNode } from "react";
import { Ic } from "./Icones";

type Lado = "top" | "bottom" | "left" | "right";

/** Envolve qualquer elemento e mostra a dica ao passar o rato ou ao focar. */
export function Dica({ conteudo, children, lado = "top", linha = false, bloco = false }: { conteudo: ReactNode; children: ReactNode; lado?: Lado; linha?: boolean; bloco?: boolean }) {
  if (conteudo === null || conteudo === undefined || conteudo === "") return <>{children}</>;
  return (
    <Tooltip content={conteudo} side={lado} render={<span className={bloco ? "flex w-full min-w-0" : linha ? "flex w-full min-w-0 sm:w-auto" : "inline-flex max-w-full"} />}>
      {children}
    </Tooltip>
  );
}

/** Corpo de uma dica com título, texto e uma lista opcional de linhas «rótulo: valor». */
export function CorpoDica({ titulo, texto, linhas }: { titulo?: string; texto?: string; linhas?: { rotulo: string; valor: ReactNode }[] }) {
  return (
    <div className="flex max-w-[280px] flex-col gap-1 text-left text-[13px] leading-snug">
      {titulo && <b className="font-semibold">{titulo}</b>}
      {texto && <span>{texto}</span>}
      {linhas && linhas.length > 0 && (
        <dl className="mt-0.5 flex flex-col gap-0.5">
          {linhas.map((l) => (
            <div key={l.rotulo} className="flex flex-col">
              <dt className="text-[11px] uppercase tracking-wide opacity-70">{l.rotulo}</dt>
              <dd className="m-0">{l.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Ícone «i» com a explicação de uma métrica ou de um campo, como os dos títulos do painel da Cloudflare. */
export function DicaInfo({ texto, titulo }: { texto: string; titulo?: string }) {
  return (
    <Tooltip content={<CorpoDica titulo={titulo} texto={texto} />} side="top" render={<span className="dica-info inline-flex cursor-help items-center text-kumo-inactive transition-colors hover:text-kumo-subtle" aria-label={titulo ? `${titulo}: ${texto}` : texto} />}>
      <Ic nome="info" tamanho={13} />
    </Tooltip>
  );
}
