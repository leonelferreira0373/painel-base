// Os controlos de paginação do painel: os mesmos do Kumo (primeira, anterior, número da página, seguinte e última), mas cada botão tem a sua dica a dizer o que faz, mesmo desativado. É o único sítio onde se desenha a paginação.
"use client";

import { InputGroup, Tooltip } from "@cloudflare/kumo";
import { useEffect, useState } from "react";
import { T } from "@/dados/textos";
import { Ic } from "./Icones";

/** `pagina` e `ultima` contam a partir de 1. */
export function ControlosDePaginacao({ pagina, ultima, aoMudar }: { pagina: number; ultima: number; aoMudar: (p: number) => void }) {
  const P = T.paginacao;
  const [escrita, setEscrita] = useState(String(pagina));
  useEffect(() => setEscrita(String(pagina)), [pagina]);
  const ir = (p: number) => {
    const n = Math.min(Math.max(p, 1), ultima);
    aoMudar(n);
    setEscrita(String(n));
  };
  const confirmar = () => (/^\d+$/.test(escrita.trim()) ? ir(Number(escrita)) : setEscrita(String(pagina)));
  const botao = (rotulo: string, dica: string, desativado: boolean, destino: number, icone: "inicio" | "anterior" | "seta" | "fim") => (
    <InputGroup.Button variant="secondary" aria-label={rotulo} tooltip={dica} tooltipSide="top" disabled={desativado} onClick={() => ir(destino)}>
      <Ic nome={icone} tamanho={16} />
    </InputGroup.Button>
  );
  return (
    <div className="flex grow flex-col items-end">
      <nav aria-label={P.navegacao}>
        <InputGroup>
          {botao(P.primeira, P.dicaPrimeira, pagina <= 1, 1, "inicio")}
          {botao(P.anterior, P.dicaAnterior, pagina <= 1, pagina - 1, "anterior")}
          <Tooltip content={P.dicaNumero} side="top" asChild>
            <InputGroup.Input
              style={{ width: 50 }}
              className="text-center"
              aria-label={P.numero}
              value={escrita}
              onValueChange={setEscrita}
              onBlur={confirmar}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmar();
              }}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </Tooltip>
          {botao(P.seguinte, P.dicaSeguinte, pagina >= ultima, pagina + 1, "seta")}
          {botao(P.ultima, P.dicaUltima, pagina >= ultima, ultima, "fim")}
        </InputGroup>
      </nav>
    </div>
  );
}
