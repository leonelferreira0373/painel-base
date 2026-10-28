// Definições da conta → Atalhos: cada atalho mostra a combinação em vigor; «Alterar» grava a próxima combinação premida, «Repor» volta à de origem.
"use client";

import { Button } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { ATALHOS, ATALHOS_FIXOS } from "@/dados/atalhos";
import { atalhosEfetivos, combinacaoDe, erroDeCombinacao, mostrarCombinacao } from "@/lib/atalhos";
import { useConta } from "@/lib/conta";
import { Dica } from "../Dica";
import { ICONES } from "../Icones";
import { Cartao, Linha } from "./Pecas";

export function SecaoAtalhos() {
  const { conta, mudar } = useConta();
  const efetivos = useMemo(() => atalhosEfetivos(conta.atalhos), [conta.atalhos]);
  const [aGravar, setAGravar] = useState<string | null>(null);
  const [erro, setErro] = useState<{ id: string; texto: string } | null>(null);

  useEffect(() => {
    if (!aGravar) return;
    const aoTecla = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setAGravar(null);
        setErro(null);
        return;
      }
      const combinacao = combinacaoDe(e);
      if (!combinacao) return;
      const texto = erroDeCombinacao(combinacao, aGravar, efetivos);
      if (texto) {
        setErro({ id: aGravar, texto });
        return;
      }
      mudar({ atalhos: { ...(conta.atalhos ?? {}), [aGravar]: combinacao } }, "Atalho alterado");
      setAGravar(null);
      setErro(null);
    };
    window.addEventListener("keydown", aoTecla, true);
    return () => window.removeEventListener("keydown", aoTecla, true);
  }, [aGravar, conta.atalhos, efetivos, mudar]);

  const repor = (id: string) => {
    const resto = { ...(conta.atalhos ?? {}) };
    delete resto[id];
    mudar({ atalhos: resto }, "Atalho reposto");
  };

  return (
    <>
      <Cartao titulo="Atalhos de teclado" dica="Escolha as combinações que mais lhe convêm. Cada uma tem de incluir Ctrl ou Alt (ou ser uma tecla F) e não pode ser uma das do navegador.">
        {ATALHOS.map((a) => {
          const alterado = efetivos[a.id] !== a.padrao;
          const gravando = aGravar === a.id;
          return (
            <div key={a.id}>
              <Linha titulo={a.rotulo} dica={a.descricao}>
                <div className="flex items-center gap-2">
                  <kbd className={`rounded px-2 py-1 text-xs font-medium ${gravando ? "bg-kumo-brand text-white" : "bg-kumo-tint text-kumo-default"}`}>{gravando ? "Prima as teclas…" : mostrarCombinacao(efetivos[a.id])}</kbd>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setErro(null);
                      setAGravar(gravando ? null : a.id);
                    }}
                  >
                    {gravando ? "Cancelar" : "Alterar"}
                  </Button>
                  <Dica conteudo={alterado ? `Voltar a ${mostrarCombinacao(a.padrao)}` : "Já é a combinação de origem"}>
                    <Button variant="ghost" shape="square" size="sm" icon={ICONES.repor} aria-label="Repor a combinação de origem" disabled={!alterado} onClick={() => repor(a.id)} />
                  </Dica>
                </div>
              </Linha>
              {erro?.id === a.id && <div className="px-4 pb-3 text-xs text-kumo-danger">{erro.texto}</div>}
            </div>
          );
        })}
        <div className="flex justify-end px-4 py-3">
          <Button variant="ghost" size="sm" disabled={Object.keys(conta.atalhos ?? {}).length === 0} onClick={() => mudar({ atalhos: {} }, "Atalhos repostos")}>
            Repor todos
          </Button>
        </div>
      </Cartao>
      <Cartao titulo="Atalhos fixos" dica="Fazem parte dos menus e das janelas; não se mudam.">
        {ATALHOS_FIXOS.map((a) => (
          <Linha key={a.teclas} titulo={a.acao}>
            <kbd className="rounded bg-kumo-tint px-2 py-1 text-xs font-medium text-kumo-default">{a.teclas}</kbd>
          </Linha>
        ))}
      </Cartao>
    </>
  );
}
