// O campo de um código de uma só vez (OTP): uma caixinha por dígito, só aceita números, avança sozinha, volta atrás com o apagar, aceita o código colado ou preenchido pelo SMS (com espaços ou hífenes, que se ignoram) e avisa quando o código fica completo para se verificar logo, sem carregar em nada. Os dígitos ficam sempre seguidos (sem buracos) e, num grupo de seis, em dois grupos de três.
"use client";

import { useEffect, useId, useRef } from "react";
import "@/styles/otp.css";

interface Props {
  /** Os dígitos escritos (só números, até `comprimento`). */
  valor: string;
  aoMudar: (valor: string) => void;
  /** Chamado uma vez quando o código fica completo (à mão, colado ou preenchido pelo telemóvel). */
  aoCompletar?: (codigo: string) => void;
  comprimento?: number;
  /** As caixinhas ficam a vermelho e abanam (o código estava errado). */
  erro?: boolean;
  /** As caixinhas ficam fechadas (por exemplo, enquanto o limite de tentativas não abre). */
  desativado?: boolean;
  autoFocus?: boolean;
  /** O que o campo é, para quem usa um leitor de ecrã («Código de 6 dígitos»). */
  rotulo?: string;
  tamanho?: "base" | "lg";
}

/** Tira tudo o que não é número (espaços, hífenes, letras). */
export const soDigitos = (t: string): string => t.replace(/\D/g, "");

export function CampoOtp({ valor, aoMudar, aoCompletar, comprimento = 6, erro = false, desativado = false, autoFocus = false, rotulo, tamanho = "base" }: Props) {
  const id = useId();
  const caixas = useRef<(HTMLInputElement | null)[]>([]);
  const jaCompletou = useRef("");
  const grupo = comprimento % 3 === 0 ? 3 : comprimento % 4 === 0 ? 4 : comprimento;
  const digitos = soDigitos(valor).slice(0, comprimento);
  /** Os dígitos de agora, já com o que acabou de se escrever (o estado só muda no render seguinte, e o foco muda antes). */
  const ultimos = useRef(digitos);
  ultimos.current = digitos;
  const definir = (novo: string) => {
    ultimos.current = novo;
    aoMudar(novo);
  };

  const focar = (i: number) => {
    const c = caixas.current[Math.max(0, Math.min(comprimento - 1, i))];
    c?.focus();
    c?.select();
  };

  // o código completo avisa uma só vez; se se apagar um dígito, volta a poder avisar
  useEffect(() => {
    if (digitos.length < comprimento) {
      jaCompletou.current = "";
      return;
    }
    if (jaCompletou.current === digitos || desativado) return;
    jaCompletou.current = digitos;
    aoCompletar?.(digitos);
  }, [digitos, comprimento, aoCompletar, desativado]);

  useEffect(() => {
    if (autoFocus && !desativado) focar(digitos.length);
    // só ao abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  // quando o campo se limpa por fora (depois de um erro), a primeira caixa volta a ter o foco
  useEffect(() => {
    if (digitos === "" && !desativado && document.activeElement?.closest(`[data-otp="${id}"]`)) focar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digitos === "", desativado]);

  const escrever = (i: number, novos: string, escrito = false) => {
    // o código inteiro (colado ou do SMS) preenche desde o princípio; poucos dígitos entram a partir da caixinha onde se está
    let d = soDigitos(novos);
    // escrever numa caixinha que já tem um dígito (sem o dígito selecionado) dá dois: fica só o novo
    if (escrito && d.length === 2 && digitos[i]) d = d.replace(digitos[i], "");
    if (d === "") return;
    const comeco = d.length >= comprimento ? 0 : Math.min(i, digitos.length);
    const resultado = (digitos.slice(0, comeco) + d + (d.length >= comprimento ? "" : digitos.slice(comeco + d.length))).slice(0, comprimento);
    definir(resultado);
    focar(Math.min(comeco + d.length, comprimento - 1));
  };

  const grande = tamanho === "lg";
  return (
    <div role="group" aria-label={rotulo ?? `Código de ${comprimento} dígitos`} data-otp={id} className={`flex items-center justify-center ${erro ? "otp-erro" : ""}`}>
      {Array.from({ length: comprimento }, (_, i) => (
        <span key={i} className={`flex ${i > 0 && i % grupo === 0 ? "ml-3 sm:ml-4" : i > 0 ? "ml-1.5 sm:ml-2" : ""}`}>
          <input
            ref={(el) => {
              caixas.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            enterKeyHint="done"
            maxLength={comprimento}
            disabled={desativado}
            value={digitos[i] ?? ""}
            aria-label={`Dígito ${i + 1} de ${comprimento}`}
            aria-invalid={erro || undefined}
            onFocus={(e) => {
              // os dígitos ficam seguidos: tocar numa caixinha depois da primeira vazia leva à primeira vazia
              if (i > ultimos.current.length) focar(ultimos.current.length);
              else e.currentTarget.select();
            }}
            onChange={(e) => escrever(i, e.target.value, true)}
            onPaste={(e) => {
              e.preventDefault();
              escrever(i, e.clipboardData.getData("text"));
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                e.preventDefault();
                if (digitos[i]) {
                  definir(digitos.slice(0, i) + digitos.slice(i + 1));
                  focar(i);
                } else if (i > 0) {
                  definir(digitos.slice(0, i - 1) + digitos.slice(i));
                  focar(i - 1);
                }
              } else if (e.key === "Delete") {
                e.preventDefault();
                if (digitos[i]) definir(digitos.slice(0, i) + digitos.slice(i + 1));
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                focar(i - 1);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                focar(Math.min(i + 1, ultimos.current.length));
              } else if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // letras, espaços e símbolos não entram
                e.preventDefault();
              }
            }}
            className={`${grande ? "h-14 w-11 text-2xl sm:w-12" : "h-12 w-10 text-xl sm:w-11"} rounded-lg border-0 bg-kumo-control text-center font-medium tabular-nums text-kumo-default caret-transparent outline-none ring transition-shadow duration-150 focus:ring-[1.5px] disabled:cursor-not-allowed disabled:opacity-50 ${erro ? "ring-kumo-danger focus:ring-kumo-danger" : "ring-kumo-line focus:ring-kumo-focus/50"}`}
          />
        </span>
      ))}
    </div>
  );
}
