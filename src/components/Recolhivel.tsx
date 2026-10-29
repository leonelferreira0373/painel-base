// Uma secção que se abre e fecha: o título com um chevron que aponta para a direita e, ao abrir, vira para baixo; à direita, um resumo do que lá está. O conteúdo entra e sai com a altura a animar-se. Serve para mostrar só o essencial e deixar o resto a um toque (como a janela de contexto da IA).
"use client";

import { useId, useState, type ReactNode } from "react";
import { Ic } from "./Icones";

export function Recolhivel({ titulo, resumo, sempre, aberto: abertoInicial = false, children }: { titulo: ReactNode; resumo?: ReactNode; /** O que fica sempre à vista por baixo do título (uma barra, um número), aberto ou fechado. */ sempre?: ReactNode; aberto?: boolean; children: ReactNode }) {
  const [aberto, setAberto] = useState(abertoInicial);
  const id = useId();
  return (
    <div className="border-t border-kumo-hairline first:border-t-0">
      <button type="button" aria-expanded={aberto} aria-controls={id} onClick={() => setAberto((v) => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-kumo-tint/60 focus-visible:outline-2 focus-visible:outline-kumo-brand">
        <Ic nome="seta" tamanho={14} className={`shrink-0 text-kumo-subtle transition-transform duration-200 ${aberto ? "rotate-90" : ""}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-kumo-default">{titulo}</span>
        {resumo !== undefined && <span className="shrink-0 text-sm tabular-nums text-kumo-subtle">{resumo}</span>}
      </button>
      {sempre && <div className="px-4 pb-3 pl-10">{sempre}</div>}
      <div id={id} className={`grid transition-[grid-template-rows] duration-200 ease-out ${aberto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} inert={!aberto}>
        <div className="overflow-hidden">
          <div className="px-4 pb-3 pl-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
