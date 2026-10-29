// O cartão com que a IA pede licença antes de mudar alguma coisa no painel: diz o que quer fazer e a pessoa permite, permite sempre nesta conversa ou recusa. Vive dentro da conversa do assistente. Depois da decisão fica só o que se decidiu.
"use client";

import { Button } from "@cloudflare/kumo";
import { useEffect, useState } from "react";
import { decisaoDe, EVENTO_APROVACAO, resolverAprovacao, type Decisao } from "@/lib/ia-agente";
import { Frase } from "../Frase";
import { Ic } from "../Icones";

export function CartaoDeAprovacao({ id, descricao }: { id: string; descricao: string }) {
  const [decisao, setDecisao] = useState<Decisao | undefined>(() => decisaoDe(id));
  useEffect(() => {
    const ler = () => setDecisao(decisaoDe(id));
    window.addEventListener(EVENTO_APROVACAO, ler);
    ler();
    return () => window.removeEventListener(EVENTO_APROVACAO, ler);
  }, [id]);
  return (
    <div className="my-2 flex flex-col gap-2 rounded-xl bg-kumo-base p-3 text-sm text-kumo-default ring ring-kumo-line" role="group" aria-label="A IA pede licença">
      <div className="flex items-start gap-2">
        <Ic nome={decisao === "nao" ? "fechar" : decisao ? "certo" : "ia"} tamanho={16} className="mt-0.5 shrink-0" />
        <span className="min-w-0 flex-1 font-medium">
          <Frase>{descricao}</Frase>
        </span>
      </div>
      {decisao === undefined ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={() => resolverAprovacao(id, "sim")}>
            Permitir
          </Button>
          <Button size="sm" variant="secondary" onClick={() => resolverAprovacao(id, "sempre")}>
            Permitir sempre nesta conversa
          </Button>
          <Button size="sm" variant="ghost" onClick={() => resolverAprovacao(id, "nao")}>
            Recusar
          </Button>
        </div>
      ) : (
        <span className="text-[13px] text-kumo-subtle">{decisao === "nao" ? "Recusado" : decisao === "sempre" ? "Permitido (sempre nesta conversa)" : "Permitido"}</span>
      )}
    </div>
  );
}
