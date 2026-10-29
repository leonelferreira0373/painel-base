// Uma linha de uma lista ordenada, como a RankedListRow da Cloudflare: nome, barra de proporção e valor. Ao passar o rato (ou focar a linha com o teclado) aparece o botão de copiar o dado da linha; no telemóvel está sempre visível. É o único sítio onde se desenha uma linha assim.
"use client";

import type { ReactNode } from "react";
import { BotaoCopiar } from "./Copiar";
import { Ic } from "./Icones";

export function LinhaOrdenada({ conteudo: nomeEmElementos, nome, valor, proporcao, copiar = nome, ativa = false, aoPassar, aoAbrir, rotulo, larguraDoValor = "min-w-14" }: { /** A largura mínima da coluna do valor (uma classe), para as barras começarem todas no mesmo sítio quando o valor é longo. */ larguraDoValor?: string; /** O nome desenhado à medida (pills, por exemplo); `nome` fica para a dica e para copiar. */ conteudo?: ReactNode; nome: string; valor: ReactNode; proporcao: number; copiar?: string; ativa?: boolean; aoPassar?: () => void; aoAbrir?: () => void; rotulo?: string }) {
  const conteudo = (
    <>
      <span className="min-w-0 flex-1 truncate font-medium text-kumo-default" title={nome}>
        {nomeEmElementos ?? nome}
      </span>
      <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-kumo-tint">
        <span className="block h-full rounded-full bg-kumo-brand" style={{ width: `${Math.min(100, Math.max(0, proporcao))}%` }} />
      </span>
      <span className={`${larguraDoValor} shrink-0 text-right tabular-nums text-kumo-strong`}>{valor}</span>
      {aoAbrir && <Ic nome="seta" tamanho={12} className="shrink-0 text-kumo-subtle" />}
    </>
  );
  return (
    <div onMouseEnter={aoPassar} className={`group/linha relative flex h-11 items-center gap-2 border-b border-kumo-hairline text-sm transition-colors last:border-b-0 [@media(hover:hover)]:hover:bg-kumo-tint/60 has-[:focus-visible]:bg-kumo-tint ${ativa ? "bg-kumo-tint/60" : ""}`}>
      {aoAbrir ? (
        <button type="button" onFocus={aoPassar} onClick={aoAbrir} aria-label={rotulo} className="flex h-full min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none">
          {conteudo}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{conteudo}</div>
      )}
      <span className="shrink-0 pr-1 opacity-0 transition-opacity group-hover/linha:opacity-100 group-focus-within/linha:opacity-100 [@media(hover:none)]:opacity-100">
        <BotaoCopiar texto={copiar} tamanho="xs" dica="Copiar" />
      </span>
    </div>
  );
}
