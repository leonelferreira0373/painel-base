// A janela pequena de localizar e substituir, no canto do texto (como no Google Docs): o que se procura, quantos há e qual é o escolhido, anda-se para trás e para a frente, distingue-se ou não as maiúsculas e substitui-se um ou todos. Enter vai para o seguinte, Shift+Enter para o anterior e Esc fecha.
"use client";

import { Input } from "@cloudflare/kumo";
import type { Editor } from "@tiptap/react";
import { CaseSensitive, ChevronDown, ChevronUp, Replace, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CartaoFlutuante } from "../Flutuantes";
import { BotaoIcone } from "../ui";
import { chaveDoLocalizar } from "./Localizar";
import { PEQUENO } from "./PecasDoTexto";

export function BarraDeLocalizar({ editor, comSubstituir, aoFechar }: { editor: Editor; comSubstituir: boolean; aoFechar: () => void }) {
  const [termo, setTermo] = useState("");
  const [troca, setTroca] = useState("");
  const [maiusculas, setMaiusculas] = useState(false);
  const [substituir, setSubstituir] = useState(comSubstituir);
  const [, setTique] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  // o número de achados vem do editor, que o recalcula quando o texto muda
  useEffect(() => {
    const t = () => setTique((n) => n + 1);
    editor.on("transaction", t);
    return () => void editor.off("transaction", t);
  }, [editor]);
  useEffect(() => {
    setSubstituir(comSubstituir);
    campo.current?.focus();
    campo.current?.select();
  }, [comSubstituir]);
  useEffect(() => () => void editor.commands.localizar(""), [editor]);

  const s = chaveDoLocalizar.getState(editor.state);
  const total = s?.achados.length ?? 0;
  const atual = s?.atual ?? 0;

  // o achado escolhido fica à vista
  useEffect(() => {
    if (total === 0) return;
    editor.view.dom.querySelector(".localizar-atual")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [atual, total, termo, editor]);

  const procurar = (t: string, m: boolean) => {
    setTermo(t);
    setMaiusculas(m);
    editor.commands.localizar(t, m);
  };
  const ir = (sentido: 1 | -1) => editor.commands.irParaAchado(sentido);

  return (
    <CartaoFlutuante role="search" aria-label="Localizar e substituir" className="fixed right-6 top-[8.25rem] z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 p-3">
      <div className="flex items-center gap-1">
        <BotaoIcone dica={substituir ? "Só localizar" : "Substituir"} icone={Replace} tamanho="sm" className={PEQUENO} ligado={substituir} aoClicar={() => setSubstituir((v) => !v)} />
        <Input
          ref={campo}
          aria-label="Localizar"
          size="sm"
          value={termo}
          placeholder="Localizar"
          autoComplete="off"
          className="min-w-0 flex-1"
          onChange={(e) => procurar(e.target.value, maiusculas)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.preventDefault(), ir(e.shiftKey ? -1 : 1));
            else if (e.key === "Escape") aoFechar();
          }}
        />
        <span className="w-14 shrink-0 text-center text-xs tabular-nums text-kumo-subtle" aria-live="polite">
          {termo ? `${total ? atual + 1 : 0} de ${total}` : ""}
        </span>
        <BotaoIcone dica="Distinguir maiúsculas de minúsculas" icone={CaseSensitive} tamanho="sm" className={PEQUENO} ligado={maiusculas} aoClicar={() => procurar(termo, !maiusculas)} />
        <BotaoIcone dica="Anterior (Shift+Enter)" icone={ChevronUp} tamanho="sm" className={PEQUENO} desativado={total === 0} aoClicar={() => ir(-1)} />
        <BotaoIcone dica="Seguinte (Enter)" icone={ChevronDown} tamanho="sm" className={PEQUENO} desativado={total === 0} aoClicar={() => ir(1)} />
        <BotaoIcone dica="Fechar" icone={X} tamanho="sm" className={PEQUENO} aoClicar={aoFechar} />
      </div>
      {substituir && (
        <div className="flex items-center gap-1">
          <span className="size-7 shrink-0" aria-hidden />
          <Input
            aria-label="Substituir por"
            size="sm"
            value={troca}
            placeholder="Substituir por"
            autoComplete="off"
            className="min-w-0 flex-1"
            onChange={(e) => setTroca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.preventDefault(), editor.commands.substituirAchado(troca));
              else if (e.key === "Escape") aoFechar();
            }}
          />
          <button type="button" disabled={total === 0} onClick={() => editor.commands.substituirAchado(troca)} className="h-7 shrink-0 cursor-pointer rounded-md px-2 text-xs font-medium text-kumo-default ring ring-kumo-line hover:bg-kumo-tint disabled:cursor-default disabled:opacity-40">
            Substituir
          </button>
          <button type="button" disabled={total === 0} onClick={() => editor.commands.substituirTodos(troca)} className="h-7 shrink-0 cursor-pointer rounded-md px-2 text-xs font-medium text-kumo-default ring ring-kumo-line hover:bg-kumo-tint disabled:cursor-default disabled:opacity-40">
            Todos
          </button>
        </div>
      )}
    </CartaoFlutuante>
  );
}
