// O seletor de opções fixas com a última opção «Personalizado…»: quem precisa de outro valor escreve a sua especificação (um número de minutos, de dias, o nome de um fuso…) numa janela modal (a mesma de todas as ações do painel, Confirmar) e aplica-a. É o único seletor de opções fixas do painel que aceita um valor livre: nenhum ecrã desenha o seu próprio campo «outro».
"use client";

import { Input, Select } from "@cloudflare/kumo";
import { useState } from "react";
import { Confirmar } from "./conta/Pecas";

/** A especificação que a pessoa pode escrever em vez das opções fixas. */
export interface EspecificacaoPersonalizada {
  /** O que se escreve («Minutos», «Dias», «Nome do fuso»). */
  rotulo: string;
  tipo: "numero" | "texto";
  /** A unidade a seguir ao campo (por exemplo «minutos»). */
  unidade?: string;
  /** Limites de um número inteiro. */
  min?: number;
  max?: number;
  /** Um exemplo, no campo vazio. */
  exemplo?: string;
  /** Como se mostra no seletor um valor personalizado já guardado. */
  mostrar: (valor: string) => string;
  /** Mensagem de erro para o que foi escrito, ou null se serve (além dos limites do número). */
  validar?: (escrito: string) => string | null;
  /** Converte o que foi escrito no valor guardado (por omissão, o próprio texto). */
  guardar?: (escrito: string) => string;
  /** O contrário: o que mostrar no campo ao editar um valor personalizado já guardado (por omissão, o próprio valor). */
  escrito?: (valor: string) => string;
}

const PERSONALIZADO = "__personalizado__";

function erroDe(e: EspecificacaoPersonalizada, escrito: string): string | null {
  const t = escrito.trim();
  if (!t) return "Escreva um valor.";
  if (e.tipo === "numero") {
    if (!/^\d+$/.test(t)) return "Escreva um número inteiro.";
    const n = Number(t);
    if (e.min !== undefined && n < e.min) return `O mínimo é ${e.min}.`;
    if (e.max !== undefined && n > e.max) return `O máximo é ${e.max}.`;
  }
  return e.validar?.(t) ?? null;
}

export function SeletorPersonalizavel({
  valor,
  opcoes,
  personalizado,
  aoMudar,
  label,
  labelTooltip,
  rotulo,
  className,
  disabled,
}: {
  valor: string;
  /** As opções fixas: valor → texto. */
  opcoes: Record<string, string>;
  personalizado: EspecificacaoPersonalizada;
  aoMudar: (valor: string) => void;
  /** O rótulo visível do campo (num formulário) ou, sem ele, o `rotulo` para leitores de ecrã. */
  label?: string;
  labelTooltip?: string;
  rotulo?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [escrito, setEscrito] = useState("");
  const ePersonalizado = !(valor in opcoes);
  const itens: Record<string, string> = { ...opcoes, ...(ePersonalizado ? { [valor]: personalizado.mostrar(valor) } : {}), [PERSONALIZADO]: "Personalizado…" };
  const erro = erroDe(personalizado, escrito);
  const abrir = () => {
    setEscrito(ePersonalizado ? (personalizado.escrito?.(valor) ?? valor) : "");
    setAberto(true);
  };
  const aplicar = () => {
    if (erro) return;
    aoMudar(personalizado.guardar ? personalizado.guardar(escrito.trim()) : escrito.trim());
    setAberto(false);
  };
  return (
    <>
      <Select label={label} labelTooltip={labelTooltip} aria-label={label ? undefined : rotulo} value={valor} disabled={disabled} className={className} items={itens} onValueChange={(v) => (String(v) === PERSONALIZADO ? abrir() : aoMudar(String(v)))} />
      <Confirmar aberto={aberto} aoMudar={setAberto} titulo="Valor personalizado" texto={`${label ?? rotulo ?? personalizado.rotulo}: escreva o valor que quer usar em vez das opções fixas.`} rotuloAcao="Aplicar" aoConfirmar={aplicar} desativado={!!erro}>
        <div className="flex items-end gap-2">
          <Input
            label={personalizado.rotulo}
            type="text"
            inputMode={personalizado.tipo === "numero" ? "numeric" : undefined}
            placeholder={personalizado.exemplo}
            value={escrito}
            onChange={(e) => setEscrito(personalizado.tipo === "numero" ? e.target.value.replace(/\D/g, "") : e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
            error={escrito.trim() !== "" ? (erro ?? undefined) : undefined}
            autoFocus
            className="w-full"
          />
          {personalizado.unidade && <span className="pb-2 text-sm text-kumo-subtle">{personalizado.unidade}</span>}
        </div>
      </Confirmar>
    </>
  );
}
