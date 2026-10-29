// O «a pensar» do chat numa linha, para onde mais a IA trabalhe (a pesquisa em linguagem natural, por exemplo): o texto com o brilho que passa e o ícone animado, o cérebro enquanto pensa e o lápis enquanto escreve, tal e qual no chat. Usa as mesmas classes e os mesmos movimentos do módulo do assistente.
"use client";

import { IconeDaAccao } from "@/assistente/cliente/icones";

export function PensarEmLinha({ forma, texto }: { forma: "cerebro" | "lapis"; texto: string }) {
  return (
    <span className="pesq-pensa inline-flex min-w-0 items-center gap-1.5 text-sm" role="status" aria-live="polite">
      <span className="aia-pensa-icone" aria-hidden>
        <span className="aia-pensa-icone-forma" data-forma={forma} key={forma}>
          <IconeDaAccao forma={forma} className="aia-icone-pequeno" />
        </span>
      </span>
      <span className="aia-pensa-brilho truncate">{texto}</span>
    </span>
  );
}
