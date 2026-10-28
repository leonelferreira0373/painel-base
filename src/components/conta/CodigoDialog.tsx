// Janela para introduzir um código de seis dígitos (e-mail, telefone ou aplicação autenticadora). Na simulação mostra o código; em produção ele chegaria por fora.
"use client";

import { Banner, Button, Dialog, Input } from "@cloudflare/kumo";
import { useEffect, useState, type ReactNode } from "react";
import { ICONES } from "../Icones";

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
}) {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState(false);
  const [, tique] = useState(0);
  const atual = typeof codigo === "function" ? codigo() : codigo;
  useEffect(() => {
    if (!aberto || typeof codigo !== "function") return;
    const id = window.setInterval(() => tique((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [aberto, codigo]);
  useEffect(() => {
    if (aberto) {
      setValor("");
      setErro(false);
    }
  }, [aberto]);

  const confirmar = () => {
    if (valor.replace(/\s/g, "") === atual) {
      aoConfirmar();
      aoMudar(false);
    } else setErro(true);
  };

  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="base" className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirmar();
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">{titulo}</Dialog.Title>
            <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
          <div className="text-sm text-kumo-default">{texto}</div>
          {extra}
          <Banner className="mt-4" variant="default" title={`Simulação: o código é ${atual.slice(0, 3)} ${atual.slice(3)}`} />
          <div className="mt-4">
            <Input
              label="Código de 6 dígitos"
              value={valor}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="000 000"
              error={erro ? "Esse código não está certo." : undefined}
              onChange={(e) => {
                setValor(e.target.value.replace(/[^\d\s]/g, ""));
                setErro(false);
              }}
            />
          </div>
          <div className="mt-6 flex items-center justify-between gap-2">
            {aoReenviar ? (
              <Button type="button" variant="ghost" onClick={aoReenviar}>
                Enviar outro código
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
              <Button type="submit" variant="primary" disabled={valor.replace(/\s/g, "").length !== 6}>
                {rotuloAcao}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
}
