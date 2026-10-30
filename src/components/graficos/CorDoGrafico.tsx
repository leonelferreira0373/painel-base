// A cor de um gráfico, escolhida por quem o vê: um botão com uma paleta de cores prontas e o seletor de cor do painel. Cada gráfico tem a sua cor e a escolha fica guardada neste navegador (lib/cores-graficos.ts). O cartão ou o painel que contém o gráfico dá-lhe o id (a página e o título) por contexto, por isso nenhum gráfico precisa de saber disto.
"use client";

import { Button, Popover } from "@cloudflare/kumo";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { CORES_DE_GRAFICO, idDoGrafico, useCorDoGrafico } from "@/lib/cores-graficos";
import { Dica } from "../Dica";
import { PopupCartao } from "../Flutuantes";
import { Ic } from "../Icones";
import { EscolherCor } from "../EscolherCor";

const IdContexto = createContext<string | undefined>(undefined);

/** Dá aos gráficos lá dentro o id do cartão (a página e o título) para a sua cor ficar guardada. */
export function IdDoGraficoProvider({ titulo, children }: { titulo: string; children: ReactNode }) {
  const pagina = usePathname() ?? "";
  return <IdContexto.Provider value={idDoGrafico(pagina, titulo)}>{children}</IdContexto.Provider>;
}

export const useIdDoGrafico = () => useContext(IdContexto);

/** O botão da cor de um gráfico: aparece ao passar o rato no cartão (no telemóvel está sempre à vista). */
export function BotaoCorDoGrafico({ id, className = "" }: { id: string; className?: string }) {
  const [cor, mudar] = useCorDoGrafico(id);
  return (
    <Popover.Root>
      <Dica conteudo="Cor do gráfico">
        <Popover.Trigger
          render={
            <Button variant="ghost" shape="square" size="xs" aria-label="Cor do gráfico" className={`opacity-0 transition-opacity group-hover/grafico:opacity-100 group-focus-within/grafico:opacity-100 data-[popup-open]:opacity-100 [@media(hover:none)]:opacity-100 ${className}`} icon={cor ? <span aria-hidden className="size-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/20" style={{ background: cor }} /> : <Ic nome="paleta" tamanho={14} />} />
          }
        />
      </Dica>
      <PopupCartao alinhar="end" className="w-[232px] p-3">
        <EscolherCor cor={cor ?? null} aoMudar={mudar} cores={CORES_DE_GRAFICO} />
      </PopupCartao>
    </Popover.Root>
  );
}
