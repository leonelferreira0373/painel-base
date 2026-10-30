// Uma conversa com a IA aberta por inteiro, como um replay do que se disse e se fez: o que a pessoa escreveu, os passos da IA, o que se permitiu ou recusou e cada resposta, pela ordem e com a hora. Na lista da atividade a conversa ocupa uma linha só, com o botão que a abre aqui.
"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { lerConversa, type ItemDaConversa } from "@/lib/conversas-ia";
import { BotaoIcone } from "../ui";
import { Vazio } from "../conteudo/ConteudoPecas";
import { Frase } from "../Frase";
import { Ic, ICONES } from "../Icones";
import { dataHora, horaCompleta } from "../super/SuperPecas";

function Mensagem({ item }: { item: ItemDaConversa }) {
  const hora = <span className="text-xs tabular-nums text-kumo-subtle">{horaCompleta(item.quando)}</span>;
  if (item.papel === "pessoa") {
    return (
      <li className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-kumo-tint px-3.5 py-2 text-sm text-kumo-default">{item.texto}</div>
        {hora}
      </li>
    );
  }
  if (item.papel === "ia") {
    return (
      <li className="flex flex-col items-start gap-1">
        <div className="max-w-[92%] whitespace-pre-wrap break-words text-sm text-kumo-default">{item.texto}</div>
        {hora}
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2 text-[13px] text-kumo-subtle">
      <Ic nome={item.papel === "aviso" ? "aviso" : item.papel === "decisao" ? "certo" : "ia"} tamanho={14} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1 break-words">
        <Frase>{item.texto}</Frase>
      </span>
      {hora}
    </li>
  );
}

function Replay({ id }: { id: string }) {
  const conversa = useMemo(() => lerConversa(id), [id]);
  return (
    <div className="flex max-h-[92dvh] min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-kumo-hairline px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <Dialog.Title className="truncate text-lg font-semibold">Conversa com a IA</Dialog.Title>
          {conversa && <div className="text-[13px] tabular-nums text-kumo-subtle">{dataHora(conversa.inicio)}</div>}
        </div>
        <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
      </div>
      {conversa ? (
        <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5">
          {conversa.itens.map((item, i) => (
            <Mensagem key={`${item.quando}-${i}`} item={item} />
          ))}
        </ol>
      ) : (
        <Vazio icone="conversa" titulo="A conversa já não está neste navegador" />
      )}
    </div>
  );
}

/** O botão que abre a conversa `id` em ecrã quase cheio. */
export function BotaoDaConversa({ id }: { id: string }) {
  const [aberta, setAberta] = useState(false);
  // a janela vive dentro da linha da tabela: o clique não pode chegar à linha (que filtra por pessoa)
  return (
    <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
      <BotaoIcone dica="Abrir a conversa" icone="conversa" tamanho="sm" aoClicar={() => setAberta(true)} />
      <Dialog.Root open={aberta} onOpenChange={setAberta}>
        <Dialog size="xl" className="flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden p-0">
          {aberta && <Replay id={id} />}
        </Dialog>
      </Dialog.Root>
    </span>
  );
}
