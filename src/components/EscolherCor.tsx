// O conteúdo do cartão onde se escolhe uma cor: as cores prontas, o seletor de cor do painel, o código e o botão que volta à cor original. Serve a cor dos gráficos e a cor e o realce do texto do blog; quem o usa põe-no dentro de um PopupCartao.
"use client";

import { Button, Input } from "@cloudflare/kumo";
import { useEffect, useState } from "react";
import { corValida } from "@/lib/cores-graficos";
import { EscolhaDeCor } from "./SeletorDeCor";

export function EscolherCor({ cor, aoMudar, cores, padrao = "#155dfc", rotuloDeVoltar = "Voltar à cor original", alternar = false }: { cor: string | null; aoMudar: (hex: string | null) => void; cores: { rotulo: string; hex: string }[]; padrao?: string; rotuloDeVoltar?: string; /** Carregar na cor que já está escolhida tira-a (uma vez põe, outra tira). */ alternar?: boolean }) {
  const [escrito, setEscrito] = useState(cor ?? "");
  useEffect(() => setEscrito(cor ?? ""), [cor]);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-8 gap-1.5" role="group" aria-label="Cores prontas">
        {cores.map((c) => (
          <button key={c.hex} type="button" aria-label={c.rotulo} aria-pressed={cor === c.hex} title={c.rotulo} onClick={() => aoMudar(alternar && cor === c.hex ? null : c.hex)} className="size-5 rounded-[4px] ring-1 ring-black/10 transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-kumo-default dark:ring-white/20" style={{ background: c.hex }} />
        ))}
      </div>
      <EscolhaDeCor valor={cor ?? padrao} aoMudar={(hex) => aoMudar(hex)} />
      <Input
        label="Código da cor"
        value={escrito}
        placeholder={padrao}
        onChange={(e) => {
          setEscrito(e.target.value);
          const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
          if (corValida(v)) aoMudar(v.toLowerCase());
        }}
        error={escrito !== "" && !corValida(escrito.startsWith("#") ? escrito : `#${escrito}`) ? "Use seis dígitos, de 0 a 9 e de a a f." : undefined}
      />
      <Button variant="ghost" size="sm" disabled={!cor} onClick={() => aoMudar(null)}>
        {rotuloDeVoltar}
      </Button>
    </div>
  );
}
