// A barra de guardar dos editores: só os botões, fixa em baixo no ecrã enquanto o resto rola. «Desfazer» volta ao que está guardado; «Guardar» guarda. Não diz «tudo guardado»: os botões desligados já dizem que não há nada a fazer.
"use client";

import { Button } from "@cloudflare/kumo";
import type { ReactNode } from "react";
import { ICONES } from "./Icones";

export function BarraDeGuardar({ sujo, aoDesfazer, aoGuardar, desativadoGuardar, rotuloDesfazer = "Desfazer", rotuloGuardar = "Guardar", extra }: { sujo: boolean; aoDesfazer: () => void; aoGuardar: () => void; /** Para impedir guardar mesmo havendo alterações (um campo mal preenchido). */ desativadoGuardar?: boolean; rotuloDesfazer?: string; rotuloGuardar?: string; /** Outros botões, à esquerda dos dois. */ extra?: ReactNode }) {
  return (
    <div className="sticky bottom-3 z-20 flex justify-end">
      <div className="sem-barra flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto rounded-xl bg-kumo-base p-2 shadow-(--elevacao-popup) ring ring-kumo-line [&>*]:shrink-0">
        {extra}
        <Button variant="secondary" disabled={!sujo} onClick={aoDesfazer}>
          {rotuloDesfazer}
        </Button>
        <Button variant="primary" icon={ICONES.guardar} disabled={!sujo || !!desativadoGuardar} onClick={aoGuardar}>
          {rotuloGuardar}
        </Button>
      </div>
    </div>
  );
}
