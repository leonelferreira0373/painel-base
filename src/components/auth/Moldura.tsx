// Molduras das páginas de entrada, com as mesmas medidas da Cloudflare: cabeçalho solto com língua e atalho, coluna de 448 px com cartão, texto legal e ligação de cookies; e a moldura de cabeçalho de 58 px e rodapé para as páginas de recuperação.
"use client";

import { Button, Dialog, DropdownMenu, LinkButton, LinkProvider } from "@cloudflare/kumo";
import NextLink from "next/link";
import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import { ICONES } from "../Icones";
import { Ic } from "../Icones";

const LigacaoInterna = forwardRef<HTMLAnchorElement, ComponentProps<"a"> & { href?: string }>(({ href = "#", ...props }, ref) => (/^(https?:|mailto:)/.test(href) ? <a ref={ref} href={href} {...props} /> : <NextLink ref={ref} href={href} {...props} />));
LigacaoInterna.displayName = "LigacaoInterna";

/** As ligações do Kumo passam a navegar dentro da aplicação, sem recarregar a página. */
export function Ambiente({ children }: { children: ReactNode }) {
  return <LinkProvider component={LigacaoInterna as never}>{children}</LinkProvider>;
}

export function Lingua({ soIcone = false }: { soIcone?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={
          soIcone ? (
            <Button variant="ghost" shape="square" size="sm" icon={ICONES.globo} aria-label="Língua" />
          ) : (
            <Button variant="ghost" icon={ICONES.globo} aria-label="Língua">
              Português
              <Ic nome="baixo" tamanho={14} className="text-kumo-subtle" />
            </Button>
          )
        }
      />
      <DropdownMenu.Content collisionPadding={12}>
        <DropdownMenu.Item selected>Português</DropdownMenu.Item>
        <DropdownMenu.Item disabled>English</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

const ARMAZENADOS = [
  { chave: "Sessão", dica: "Mantém a entrada neste navegador (só se escolher guardar o e-mail e o método)." },
  { chave: "Tema", dica: "Claro, escuro ou igual ao sistema." },
  { chave: "Definições da conta", dica: "Notificações, lembretes e preferências, por conta." },
  { chave: "Ficheiros analisados", dica: "Ficam só neste navegador; nunca saem dele." },
];

export function PreferenciasCookies({ className = "" }: { className?: string }) {
  const [aberto, setAberto] = useState(false);
  const apagar = () => {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("painel."))
        .forEach((k) => window.localStorage.removeItem(k));
      Object.keys(window.sessionStorage)
        .filter((k) => k.startsWith("painel."))
        .forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      /* sem armazenamento */
    }
    window.location.href = "/entrar/";
  };
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={`inline-flex items-center gap-2 text-[13px] text-kumo-link hover:underline ${className}`}>
        <span aria-hidden className="relative inline-block h-[15px] w-8 rounded-full bg-kumo-link/15">
          <span className="absolute right-[3px] top-[3px] size-[9px] rounded-full bg-kumo-link" />
        </span>
        Preferências de cookies
      </button>
      <Dialog.Root open={aberto} onOpenChange={setAberto}>
        <Dialog size="base" className="p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">Preferências de cookies</Dialog.Title>
            <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
          <p className="text-sm text-kumo-default">Este ambiente não usa cookies de publicidade nem de terceiros. Só guarda, neste navegador, o que precisa para funcionar:</p>
          <ul className="mt-3 flex flex-col divide-y divide-kumo-hairline rounded-lg ring ring-kumo-line">
            {ARMAZENADOS.map((a) => (
              <li key={a.chave} className="flex flex-col px-3 py-2">
                <b className="text-sm font-medium">{a.chave}</b>
                <span className="text-[13px] text-kumo-subtle">{a.dica}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Dialog.Close render={(props) => <Button {...props} variant="secondary">Fechar</Button>} />
            <Button variant="destructive" onClick={apagar}>
              Apagar tudo e sair
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>
    </>
  );
}

export function TextoLegal() {
  return (
    <div className="mx-auto mt-4 w-[90%] px-8 text-center sm:px-0">
      <p className="mb-4 text-balance text-[0.8rem] leading-[1.5] text-kumo-subtle [&_a]:text-kumo-subtle [&_a]:underline [&_a]:decoration-kumo-inactive [&_a]:underline-offset-4 [&_a:hover]:text-kumo-default">
        Ao continuar, aceito os <NextLink href="/termos/">termos</NextLink>, a <NextLink href="/privacidade/">política de privacidade</NextLink> e a <NextLink href="/cookies/">política de cookies</NextLink>.
      </p>
    </div>
  );
}

/** Entrada: o cabeçalho flutua sobre uma página toda branca, com o cartão centrado numa coluna de 448 px (a Cloudflare põe aqui o logótipo, que o painel não tem). */
export function TelaEntrada({ children, atalho, rodape }: { children: ReactNode; atalho?: { rotulo: string; href: string }; rodape?: ReactNode }) {
  return (
    <Ambiente>
      <div className="relative flex min-h-dvh flex-col items-center bg-kumo-base text-[16px] leading-6 tracking-[-0.01em]">
        <header className="absolute inset-x-0 top-5 z-10 flex items-center justify-between px-4">
          <div className="h-[54.9px] w-12" />
          <div className="flex items-center gap-2">
            <Lingua />
            {atalho && (
              <LinkButton href={atalho.href} variant="secondary">
                {atalho.rotulo}
              </LinkButton>
            )}
          </div>
        </header>
        <div className="w-full overflow-x-clip">
          <div className="flex min-h-dvh w-full">
            <div className="flex min-w-0 flex-1 items-start justify-center bg-kumo-base">
              <div className="flex min-h-dvh w-full max-w-md flex-col items-stretch pt-16 lg:min-h-0 lg:pt-24">
                <div className="w-full">
                  <div className="w-full overflow-hidden bg-transparent px-4 pt-8 sm:bg-kumo-base sm:px-12 sm:py-6">{children}</div>
                </div>
                <TextoLegal />
                {rodape}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-2 left-2">
          <PreferenciasCookies />
        </div>
      </div>
    </Ambiente>
  );
}

/** Registo: cabeçalho de 56 px com língua, coluna de 448 px e rodapé da página. */
export function TelaRegisto({ children }: { children: ReactNode }) {
  return (
    <Ambiente>
      <div className="flex min-h-dvh flex-col bg-kumo-canvas text-[16px] leading-6 tracking-[-0.01em]">
        <header className="flex h-14 items-center justify-between px-4 pt-5">
          <div className="h-[54.9px] w-12" />
          <div className="flex items-center gap-2">
            <Lingua />
          </div>
        </header>
        <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center pb-12 pt-[3vh] md:justify-center">
          <div className="mb-3 flex w-full items-center justify-evenly gap-8 px-4">
            <div className="mb-0 flex w-full max-w-[28rem] flex-col items-center justify-center py-2">{children}</div>
          </div>
        </div>
        <RodapePagina />
      </div>
    </Ambiente>
  );
}

export function RodapePagina() {
  return (
    <footer className="mt-auto border-t border-kumo-line bg-kumo-canvas px-4 py-2.5 md:px-3">
      <div className="flex flex-col justify-center">
        <ul className="m-0 flex flex-wrap items-center justify-center gap-2 p-0 [&>li]:list-none [&>li>a]:pl-4 [&>li>a]:text-[13px] [&>li>a]:text-kumo-strong [&>li>a]:no-underline [&>li>a:hover]:text-kumo-default">
          <li>
            <NextLink href="/termos/">Termos de utilização</NextLink>
          </li>
          <li>
            <NextLink href="/privacidade/">Política de privacidade</NextLink>
          </li>
          <li>
            <NextLink href="/cookies/">Política de cookies</NextLink>
          </li>
          <li>
            <PreferenciasCookies />
          </li>
          <li>
            <span className="text-sm text-kumo-subtle">© 2026</span>
          </li>
        </ul>
      </div>
    </footer>
  );
}

/** Recuperação e documentos: cabeçalho de 58 px, miolo com a mesma largura do painel e rodapé. */
export function TelaPainel({ children }: { children: ReactNode }) {
  return (
    <Ambiente>
      <div className="flex min-h-dvh min-w-0 flex-col bg-kumo-canvas text-[16px] leading-6 tracking-[-0.01em]">
        <header className="sticky top-0 z-20 flex h-[58px] shrink-0 items-center border-b border-kumo-line bg-kumo-canvas px-4">
          <div className="ml-auto flex shrink-0 gap-1">
            <Lingua soIcone />
          </div>
        </header>
        <div className="mx-auto grid w-full max-w-[1200px] auto-rows-min gap-y-7 px-4 py-8 md:px-8">{children}</div>
        <RodapePagina />
      </div>
    </Ambiente>
  );
}
