// Dicas (tooltips) do painel: o mesmo componente do Kumo que a Cloudflare usa, com um formato único para títulos, linhas e passos.
"use client";

import { Button, Popover, Tooltip } from "@cloudflare/kumo";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { copiarEstruturado, estruturaDeRegisto } from "@/lib/copiar-dados";
import { EVENTO_FECHAR_FLUTUANTES, perguntarAIa } from "@/lib/ia-contexto";
import { PopupCartao } from "./Flutuantes";
import { Frase, semMarcas } from "./Frase";
import { Ic } from "./Icones";

type Lado = "top" | "bottom" | "left" | "right";

/** Envolve qualquer elemento e mostra a dica ao passar o rato ou ao focar. O invólucro tem a largura do conteúdo (w-fit): numa coluna flex esticava até à largura toda e a dica ficava longe do botão. */
export function Dica({ conteudo, children, lado = "top", linha = false, bloco = false }: { conteudo: ReactNode; children: ReactNode; lado?: Lado; linha?: boolean; bloco?: boolean }) {
  if (conteudo === null || conteudo === undefined || conteudo === "") return <>{children}</>;
  return (
    <Tooltip content={typeof conteudo === "string" ? <span className="block max-w-[280px] text-left text-[13px] leading-snug whitespace-normal"><Frase inverso>{conteudo}</Frase></span> : conteudo} side={lado} render={<span className={bloco ? "flex w-full min-w-0" : linha ? "flex w-full min-w-0 sm:w-auto" : "inline-flex w-fit max-w-full"} />}>
      {children}
    </Tooltip>
  );
}

/** Um item de uma lista de dica: o que é, um pormenor e, se fizer sentido, se está ao alcance (visto ✓) ou não (cadeado). */
export interface ItemDeDica {
  titulo: ReactNode;
  detalhe?: ReactNode;
  /** «sim» põe um visto, «nao» um cadeado; sem isto o item leva só um ponto. */
  alcance?: "sim" | "nao";
  /** O que diz o visto ou o cadeado, por extenso. */
  alcanceTexto?: string;
}

/** Corpo de uma dica: título, texto, linhas «rótulo: valor» e, se for preciso, listas com um cabeçalho (os passos seguintes de um estado, por exemplo). */
export function CorpoDica({ titulo, texto, linhas, listas }: { titulo?: string; texto?: string; linhas?: { rotulo: string; valor: ReactNode }[]; listas?: { cabecalho: string; itens: ItemDeDica[] }[] }) {
  return (
    <div className="flex max-w-[300px] flex-col gap-1.5 text-left text-[13px] leading-snug">
      {titulo && <b className="font-semibold">{titulo}</b>}
      {texto && (
        <span>
          <Frase inverso>{texto}</Frase>
        </span>
      )}
      {linhas && linhas.length > 0 && (
        <dl className="mt-0.5 flex flex-col gap-1">
          {linhas.map((l, i) => (
            <div key={`${l.rotulo}-${i}`} className="flex flex-col">
              <dt className="text-[11px] font-medium uppercase tracking-wide opacity-70">{l.rotulo}</dt>
              <dd className="m-0">{l.valor}</dd>
            </div>
          ))}
        </dl>
      )}
      {listas?.map((l, i) => (
        <div key={`${l.cabecalho}-${i}`} className="mt-0.5 flex flex-col gap-1">
          <div className="text-[11px] font-medium uppercase tracking-wide opacity-70">{l.cabecalho}</div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {l.itens.map((it, j) => (
              <li key={j} className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-current/15">
                  {it.alcance === "sim" ? <Ic nome="certo" tamanho={10} /> : it.alcance === "nao" ? <Ic nome="cadeado" tamanho={10} /> : <span className="size-1 rounded-full bg-current" />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{it.titulo}</span>
                  {it.detalhe && <span className="opacity-80">{it.detalhe}</span>}
                  {it.alcanceTexto && <span className="opacity-80">{it.alcanceTexto}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const FORMA_DO_INFO = "dica-info -m-1 inline-flex cursor-pointer items-center rounded-md p-1 text-kumo-inactive transition-colors hover:text-kumo-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kumo-brand";

/**
 * Ícone «i» com a explicação de uma métrica ou de um campo, como os dos títulos do painel da Cloudflare. Passando o rato por cima mostra a dica; clicar (ou tocar, ou Enter) abre
 * a explicação com «Copiar» (o título e o texto, estruturados) e «Perguntar à IA» (abre o chat e pergunta o que significa aqui). A janela só existe enquanto está aberta.
 */
export function DicaInfo({ texto, titulo }: { texto: string; titulo?: string }) {
  const [aberta, setAberta] = useState(false);
  // perguntar à IA a partir da explicação fecha-a (o chat abre por cima)
  useEffect(() => {
    if (!aberta) return;
    const fechar = () => setAberta(false);
    window.addEventListener(EVENTO_FECHAR_FLUTUANTES, fechar);
    return () => window.removeEventListener(EVENTO_FECHAR_FLUTUANTES, fechar);
  }, [aberta]);
  const propriedades = {
    type: "button" as const,
    "aria-label": titulo ? `Mais sobre ${titulo}` : "Mais informação",
    "aria-haspopup": "dialog" as const,
    "aria-expanded": aberta,
    className: FORMA_DO_INFO,
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      setAberta(true);
    },
  };
  if (!aberta)
    return (
      <Tooltip content={<CorpoDica titulo={titulo} texto={texto} />} side="top" render={<button {...propriedades} />}>
        <Ic nome="info" tamanho={13} />
      </Tooltip>
    );
  return (
    <Popover.Root open onOpenChange={(v) => !v && setAberta(false)}>
      <Popover.Trigger render={<button {...propriedades} />}>
        <Ic nome="info" tamanho={13} />
      </Popover.Trigger>
      <PopupCartao alinhar="start" modalNoTelemovel aoFechar={() => setAberta(false)} className="w-[min(340px,calc(100vw-2rem))]">
        <ExplicacaoDaDica titulo={titulo} texto={texto} />
      </PopupCartao>
    </Popover.Root>
  );
}

function ExplicacaoDaDica({ titulo, texto }: { titulo?: string; texto: string }) {
  const [copiado, setCopiado] = useState<"ocioso" | "ok" | "erro">("ocioso");
  const simples = semMarcas(texto);
  const copiar = async () => {
    setCopiado((await copiarEstruturado(estruturaDeRegisto(titulo ?? "Informação", { ...(titulo ? { campo: titulo } : {}), explicacao: simples }, window.location.pathname))) ? "ok" : "erro");
    window.setTimeout(() => setCopiado("ocioso"), 2200);
  };
  return (
    <div className="flex flex-col gap-3 p-3.5 text-left">
      {titulo && <div className="break-words text-sm font-semibold text-kumo-default">{titulo}</div>}
      <p className="text-sm leading-6 text-kumo-default">
        <Frase>{texto}</Frase>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={<Ic nome={copiado === "ok" ? "certo" : copiado === "erro" ? "aviso" : "copiar"} tamanho={14} />} onClick={copiar}>
          {copiado === "ok" ? "Copiado" : copiado === "erro" ? "Não copiou" : "Copiar"}
        </Button>
        <Button size="sm" variant="secondary" icon={<Ic nome="ia" tamanho={14} />} onClick={() => perguntarAIa(titulo ? `O que significa ${titulo} neste ecrã?` : "Explica-me esta informação do ecrã.", { enviar: true, contexto: { titulo: titulo ?? "uma informação do ecrã", dados: { ...(titulo ? { campo: titulo } : {}), explicacaoDoPainel: simples } } })}>
          Perguntar à IA
        </Button>
      </div>
    </div>
  );
}
