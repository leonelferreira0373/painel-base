// A cor de um gráfico, escolhida por quem o vê: um botão com uma paleta de cores prontas e o seletor de cor do painel. Cada gráfico tem a sua cor e a escolha fica guardada neste navegador (lib/cores-graficos.ts). O cartão ou o painel que contém o gráfico dá-lhe o id (a página e o título) por contexto, por isso nenhum gráfico precisa de saber disto.
"use client";

import { Button, Input, Popover } from "@cloudflare/kumo";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CORES_DE_GRAFICO, corValida, idDoGrafico, useCorDoGrafico } from "@/lib/cores-graficos";
import { Dica } from "../Dica";
import { PopupCartao } from "../Flutuantes";
import { Ic } from "../Icones";
import { EscolhaDeCor } from "../SeletorDeCor";

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
  const [escrito, setEscrito] = useState(cor ?? "");
  useEffect(() => setEscrito(cor ?? ""), [cor]);
  const atual = cor ?? "#155dfc";
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
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-8 gap-1.5" role="group" aria-label="Cores prontas">
            {CORES_DE_GRAFICO.map((c) => (
              <button key={c.hex} type="button" aria-label={c.rotulo} aria-pressed={cor === c.hex} title={c.rotulo} onClick={() => mudar(c.hex)} className="size-5 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-kumo-default dark:ring-white/20" style={{ background: c.hex }} />
            ))}
          </div>
          <EscolhaDeCor valor={atual} aoMudar={(hex) => mudar(hex)} />
          <Input
            label="Código da cor"
            value={escrito}
            placeholder="#155dfc"
            onChange={(e) => {
              setEscrito(e.target.value);
              const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
              if (corValida(v)) mudar(v.toLowerCase());
            }}
            error={escrito !== "" && !corValida(escrito.startsWith("#") ? escrito : `#${escrito}`) ? "Use seis dígitos, de 0 a 9 e de a a f." : undefined}
          />
          <Button variant="ghost" size="sm" disabled={!cor} onClick={() => mudar(null)}>
            Voltar à cor original
          </Button>
        </div>
      </PopupCartao>
    </Popover.Root>
  );
}
