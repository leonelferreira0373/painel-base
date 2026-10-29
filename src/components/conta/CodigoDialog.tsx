// Janela para introduzir um código de seis dígitos (e-mail, telefone ou aplicação autenticadora): uma caixinha por dígito, só números, verificação logo que o sexto entra, e um limite de tentativas (cinco códigos errados fecham o campo, por mais tempo de cada vez) e de reenvios. Na simulação mostra o código; em produção ele chegaria por fora.
"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatarEspera, useEsperaDeReenvio, useLimiteDeTentativas } from "@/lib/limite-tentativas";
import { CampoOtp } from "../CampoOtp";
import { ICONES } from "../Icones";

const COMPRIMENTO = 6;

export function CodigoDialog({
  aberto,
  aoMudar,
  titulo,
  texto,
  codigo,
  aoConfirmar,
  aoReenviar,
  rotuloAcao = "Confirmar",
  extra,
  chave,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  titulo: string;
  texto: ReactNode;
  /** O código certo; quando muda com o tempo (aplicação autenticadora), passa-se uma função. */
  codigo: string | (() => string);
  aoConfirmar: () => void;
  aoReenviar?: () => void;
  rotuloAcao?: string;
  /** Conteúdo acima do campo, por exemplo a chave secreta. */
  extra?: ReactNode;
  /** Quem partilha o limite de tentativas (por omissão, o título da janela). */
  chave?: string;
}) {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [, tique] = useState(0);
  const limiteId = `codigo:${chave ?? titulo}`;
  const limite = useLimiteDeTentativas(limiteId);
  const reenvio = useEsperaDeReenvio(limiteId, 30);
  const apagar = useRef<number>(undefined);
  const lerCodigo = () => (typeof codigo === "function" ? codigo() : codigo);
  const atual = lerCodigo();

  useEffect(() => {
    if (!aberto || typeof codigo !== "function") return;
    const id = window.setInterval(() => tique((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [aberto, codigo]);
  useEffect(() => {
    if (aberto) {
      setValor("");
      setErro(false);
      setMensagem(null);
      limite.reler();
    }
    return () => window.clearTimeout(apagar.current);
    // só ao abrir ou fechar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);
  // quando o campo volta a abrir, a frase do fecho desaparece
  useEffect(() => {
    if (!limite.bloqueado) setMensagem((m) => (m?.startsWith("Demasiadas") ? null : m));
  }, [limite.bloqueado]);

  const verificar = (escrito: string) => {
    if (limite.bloqueado || erro) return;
    if (escrito === lerCodigo()) {
      limite.acertar();
      aoConfirmar();
      aoMudar(false);
      return;
    }
    setMensagem(limite.falhar());
    setErro(true);
    // as caixinhas ficam um instante a vermelho e depois limpam-se para tentar de novo
    window.clearTimeout(apagar.current);
    apagar.current = window.setTimeout(() => {
      setValor("");
      setErro(false);
    }, 700);
  };

  const frase = limite.bloqueado ? `Demasiadas tentativas. Tente de novo dentro de ${formatarEspera(limite.espera)}.` : mensagem;

  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="base" className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valor.length === COMPRIMENTO) verificar(valor);
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">{titulo}</Dialog.Title>
            <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
          <div className="text-sm text-kumo-default">{texto}</div>
          {extra}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg bg-kumo-tint px-3 py-2 text-sm text-kumo-default">
            <span className="min-w-0">
              Simulação: o código é <b className="whitespace-nowrap tabular-nums">{`${atual.slice(0, 3)} ${atual.slice(3)}`}</b>
            </span>
            <Button type="button" size="sm" variant="secondary" className="ml-auto" disabled={limite.bloqueado} onClick={() => (setErro(false), setValor(lerCodigo()))}>
              Preencher
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <span className="text-base font-medium text-kumo-default">Código de {COMPRIMENTO} dígitos</span>
            <CampoOtp valor={valor} aoMudar={(v) => (setValor(v), setErro(false))} aoCompletar={verificar} comprimento={COMPRIMENTO} erro={erro} desativado={limite.bloqueado} autoFocus />
            <div className="min-h-5 text-center text-[13px] text-kumo-danger" role="status" aria-live="polite">
              {frase}
            </div>
            {aoReenviar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-center"
                disabled={reenvio.espera > 0}
                onClick={() => {
                  aoReenviar();
                  reenvio.iniciar();
                  setValor("");
                  setErro(false);
                  setMensagem(null);
                }}
              >
                {reenvio.espera > 0 ? `Enviar outro código (${reenvio.espera} s)` : "Enviar outro código"}
              </Button>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
            <Button type="submit" variant="primary" disabled={valor.length !== COMPRIMENTO || limite.bloqueado || erro}>
              {rotuloAcao}
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
}
