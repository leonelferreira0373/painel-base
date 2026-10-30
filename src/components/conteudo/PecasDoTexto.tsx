// As peças do texto que o editor e a barra da seleção partilham: as cores de realce, o tamanho do texto (menos, o número, mais) e o campo da ligação.
"use client";

import { Button, DropdownMenu, Input, Tooltip } from "@cloudflare/kumo";
import type { Editor } from "@tiptap/react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MenuCartao } from "../Flutuantes";
import { BotaoIcone } from "../ui";

/** Os botões da fila de ferramentas: 36 px com ícone de 20 px e traço fino; na barra da seleção, 28 px com ícone de 16 px. */
const GRANDE = "[&_svg]:size-5 [&_svg]:stroke-[1.75]";
export const PEQUENO = "[&_svg]:size-4 [&_svg]:stroke-[1.75]";

export const CORES_DE_REALCE = [
  { rotulo: "Amarelo", hex: "#fef08a" },
  { rotulo: "Verde", hex: "#bbf7d0" },
  { rotulo: "Azul", hex: "#bfdbfe" },
  { rotulo: "Rosa", hex: "#fbcfe8" },
  { rotulo: "Laranja", hex: "#fed7aa" },
  { rotulo: "Roxo", hex: "#e9d5ff" },
  { rotulo: "Cinzento", hex: "#e5e7eb" },
];

const PASSOS_DE_TAMANHO = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96];

/** O número escrito (com vírgula ou ponto), dentro dos limites; `null` se não for um número. */
export function tamanhoEscrito(texto: string, minimo: number, maximo: number): number | null {
  const n = Number.parseFloat(texto.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.min(maximo, Math.max(minimo, Math.round(n * 10) / 10));
}

/** O campo do tamanho, como no Word e no Google Docs: escreve-se o número que se quiser (Enter aplica, Esc volta atrás, as setas sobem e descem de um em um) ou escolhe-se um dos tamanhos prontos na seta. Serve o tamanho do texto e o do título. */
export function CampoDeTamanho({ valor, aoMudar, passos, minimo, maximo, rotulo, pequeno = false, extra }: { valor: number; aoMudar: (n: number) => void; passos: number[]; minimo: number; maximo: number; rotulo: string; /** Botões de 28 px, para as barras por cima do texto. */ pequeno?: boolean; /** Um item à cabeça da lista (por exemplo, «Tamanho normal»). */ extra?: ReactNode }) {
  const [texto, setTexto] = useState(String(Math.round(valor * 10) / 10));
  const ultimo = useRef(valor);
  // o número acompanha o texto escolhido
  useEffect(() => {
    ultimo.current = valor;
    setTexto(String(Math.round(valor * 10) / 10));
  }, [valor]);

  const aplicar = (n: number) => {
    setTexto(String(n));
    if (Math.abs(n - ultimo.current) > 0.01) {
      ultimo.current = n;
      aoMudar(n);
    }
  };
  const escrito = () => {
    const n = tamanhoEscrito(texto, minimo, maximo);
    if (n === null) setTexto(String(ultimo.current));
    else aplicar(n);
  };

  return (
    <span className="flex items-center">
      <Input
        aria-label={rotulo}
        size={pequeno ? "sm" : "base"}
        inputMode="decimal"
        autoComplete="off"
        value={texto}
        className={pequeno ? "w-11 text-center tabular-nums" : "w-12 text-center tabular-nums"}
        onChange={(e) => setTexto(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={escrito}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            escrito();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setTexto(String(ultimo.current));
            e.currentTarget.blur();
          } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            aplicar(Math.min(maximo, Math.max(minimo, (tamanhoEscrito(texto, minimo, maximo) ?? ultimo.current) + (e.key === "ArrowUp" ? 1 : -1))));
          }
        }}
      />
      <DropdownMenu>
        <Tooltip content={`${rotulo}: tamanhos prontos`} render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size={pequeno ? "sm" : "base"} icon={<ChevronDown />} aria-label={`${rotulo}: tamanhos prontos`} className={`${pequeno ? PEQUENO : GRANDE} !w-6 transition-transform active:scale-95 data-[popup-open]:!bg-black/[0.09] dark:data-[popup-open]:!bg-white/15`} />} />} />
        <MenuCartao>
          {extra}
          {passos.map((p) => (
            <DropdownMenu.CheckboxItem key={p} closeOnClick checked={Math.round(valor) === p} onCheckedChange={() => aplicar(p)}>
              {p}
            </DropdownMenu.CheckboxItem>
          ))}
        </MenuCartao>
      </DropdownMenu>
    </span>
  );
}

/** O tamanho do texto: menos, o campo onde se escreve o número (e a seta dos tamanhos prontos) e mais. */
export function TamanhoDoTexto({ editor, tamanho, pequeno = false }: { editor: Editor; tamanho?: string; /** Botões de 28 px, para a barra da seleção. */ pequeno?: boolean }) {
  const atual = tamanho ? Number.parseFloat(tamanho) : 16;
  const ir = (n: number) => editor.chain().focus().setFontSize(`${n}px`).run();
  const menos = [...PASSOS_DE_TAMANHO].reverse().find((p) => p < atual - 0.01);
  const mais = PASSOS_DE_TAMANHO.find((p) => p > atual + 0.01);
  return (
    <span className="flex items-center">
      <BotaoIcone dica="Diminuir o texto" icone={Minus} tamanho={pequeno ? "sm" : "base"} className={pequeno ? PEQUENO : GRANDE} desativado={menos === undefined} aoClicar={() => menos !== undefined && ir(menos)} />
      <CampoDeTamanho
        rotulo="Tamanho do texto"
        valor={atual}
        aoMudar={ir}
        passos={PASSOS_DE_TAMANHO}
        minimo={6}
        maximo={400}
        pequeno={pequeno}
        extra={
          <DropdownMenu.CheckboxItem closeOnClick checked={!tamanho} onCheckedChange={() => editor.chain().focus().unsetFontSize().run()}>
            Tamanho normal
          </DropdownMenu.CheckboxItem>
        }
      />
      <BotaoIcone dica="Aumentar o texto" icone={Plus} tamanho={pequeno ? "sm" : "base"} className={pequeno ? PEQUENO : GRANDE} desativado={mais === undefined} aoClicar={() => mais !== undefined && ir(mais)} />
    </span>
  );
}

/** O campo da ligação: aplica o endereço ao texto escolhido (sem protocolo, assume https). */
export function LigacaoDoTexto({ editor, href }: { editor: Editor; href?: string }) {
  const [valor, setValor] = useState(href ?? "");
  useEffect(() => setValor(href ?? ""), [href]);
  const aplicar = () => {
    const v = valor.trim();
    if (!v) return void editor.chain().focus().extendMarkRange("link").unsetLink().run();
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: /^(https?:\/\/|mailto:|\/)/i.test(v) ? v : `https://${v}` })
      .run();
  };
  return (
    <div className="flex flex-col gap-3">
      <Input label="Endereço da ligação" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="https://" autoComplete="off" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), aplicar())} />
      <div className="flex justify-end gap-2">
        {href && (
          <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>
            Remover
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={aplicar}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}
