// O campo do IBAN: o prefixo da moeda («AO06», «PT50») vem escrito e fixo, e quem preenche só escreve os 21 dígitos que faltam. Cola-se um IBAN inteiro e o prefixo é tirado.
"use client";

import { useId } from "react";
import { corpoDoIban, DIGITOS_DO_IBAN, formatarCorpo, prefixoDaMoeda } from "@/lib/iban";

/** `corpo` são só os dígitos escritos (sem prefixo); `aoMudar` devolve os dígitos já limpos. */
export function CampoIban({ moeda, corpo, aoMudar, erro, autoFocus }: { moeda: string; corpo: string; aoMudar: (corpo: string) => void; erro?: string; autoFocus?: boolean }) {
  const id = useId();
  const prefixo = prefixoDaMoeda(moeda);
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="m-0 select-none text-base font-medium text-kumo-default">
        IBAN
      </label>
      <div className={`flex h-10 w-full cursor-text items-center rounded-lg border-0 bg-kumo-control text-base text-kumo-default ring focus-within:ring-[1.5px] focus-within:ring-kumo-focus/50 ${erro ? "ring-kumo-danger" : "ring-kumo-line"}`}>
        <span className="shrink-0 select-none pl-4 pr-2 font-medium tabular-nums text-kumo-subtle" aria-hidden>
          {prefixo}
        </span>
        <input
          id={id}
          value={formatarCorpo(corpo)}
          onChange={(e) => aoMudar(corpoDoIban(e.target.value, moeda))}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={DIGITOS_DO_IBAN + Math.ceil(DIGITOS_DO_IBAN / 4) + 8}
          placeholder="0040 0000 1234 5678 1014 2"
          aria-label={`IBAN, depois de ${prefixo}`}
          className="h-full min-w-0 grow rounded-none border-0 bg-transparent pr-3 text-base tabular-nums outline-none"
        />
      </div>
      {erro && <span className="text-[13px] text-kumo-danger">{erro}</span>}
    </div>
  );
}
