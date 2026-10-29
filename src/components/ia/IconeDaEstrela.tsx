// O ícone do botão da IA no cabeçalho: a estrela quando a IA está parada; o cérebro (a pensar) ou o lápis (a escrever) enquanto trabalha, com os mesmos movimentos do chat. Quando outra coisa usa a IA (a pesquisa em linguagem natural, uma análise a fundo) mostra o cérebro.
"use client";

import { IconeDaAccao } from "@/assistente/cliente/icones";
import { useEmUso, useFaseDaIa } from "@/lib/ia-uso";
import { Ic } from "../Icones";

export function IconeDaEstrela() {
  const fase = useFaseDaIa();
  const outra = useEmUso("analise") || useEmUso("pesquisa");
  const forma = fase === "escrever" ? "lapis" : fase === "pensar" || outra ? "cerebro" : null;
  if (!forma) return <Ic nome="ia" tamanho={16} peso="fill" className="-translate-y-px text-kumo-subtle" />;
  return (
    <span className="aia-pensa-icone" aria-hidden role="status">
      <span className="aia-pensa-icone-forma" data-forma={forma} key={forma}>
        <IconeDaAccao forma={forma} className="aia-icone-pequeno" />
      </span>
    </span>
  );
}
