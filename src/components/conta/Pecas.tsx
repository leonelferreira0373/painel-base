// Peças comuns das definições da conta: cartão com linhas, linha com título e controlo, interruptor, janela de confirmação e formatos de data.
"use client";

import { Button, Dialog, Input, LayerCard, Popover, Switch, Tooltip } from "@cloudflare/kumo";
import { useEffect, useState, type ReactNode } from "react";
import { Dica, DicaInfo } from "../Dica";
import { ICONES } from "../Icones";
import { EscolherCor } from "../EscolherCor";
import { PopupCartao } from "../Flutuantes";
import { Frase, Pilula } from "../Frase";

export function Cartao({ titulo, dica, acoes, children, perigo = false }: { titulo: string; dica?: string; acoes?: ReactNode; children: ReactNode; perigo?: boolean }) {
  return (
    <LayerCard className={`pleno min-w-0 ${perigo ? "ring-kumo-danger/40" : ""}`}>
      <LayerCard.Secondary className="flex items-center justify-between gap-3">
        <h3 className={`inline-flex items-center gap-1.5 text-sm font-medium ${perigo ? "text-kumo-danger" : ""}`}>
          {titulo}
          {dica && <DicaInfo titulo={titulo} texto={dica} />}
        </h3>
        {acoes}
      </LayerCard.Secondary>
      <LayerCard.Primary className="flex flex-col p-0 pb-1">{children}</LayerCard.Primary>
    </LayerCard>
  );
}

/** Uma linha do cartão: o título (com «i» opcional) e o estado à esquerda, o controlo à direita. */
export function Linha({ titulo, dica, estado, children }: { titulo: ReactNode; dica?: string; estado?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-kumo-hairline px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-kumo-default">
          {typeof titulo === "string" ? <Frase>{titulo}</Frase> : titulo}
          {dica && <DicaInfo texto={dica} />}
        </div>
        {estado && <div className="mt-0.5 text-[13px] text-kumo-subtle">{typeof estado === "string" ? <Frase>{estado}</Frase> : estado}</div>}
      </div>
      {children && <div className="sem-barra flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto p-1 -m-1 [&>*]:shrink-0 sm:m-0 sm:shrink-0 sm:p-0 sm:flex-wrap sm:justify-end sm:overflow-visible">{children}</div>}
    </div>
  );
}

/** Linha em que o controlo ocupa a largura toda (campos de texto). */
export function LinhaCampo({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-t border-kumo-hairline px-4 py-3 first:border-t-0">{children}</div>;
}

export function Interruptor({ marcado, aoMudar, rotulo, desativado }: { marcado: boolean; aoMudar: (v: boolean) => void; rotulo: string; desativado?: boolean }) {
  return <Switch checked={marcado} onCheckedChange={aoMudar} aria-label={rotulo} disabled={desativado} />;
}

/** Itens com um interruptor cada (liga-se mais do que um ao mesmo tempo): é a mesma lista nos filtros do painel e na escolha dos locais de uma imagem. */
export function ListaDeInterruptores({ itens, escolhidos, aoMudar, rotulo }: { itens: { id: string; rotulo: string; contagem?: number }[]; escolhidos: string[]; aoMudar: (id: string, ligado: boolean) => void; rotulo: string }) {
  return (
    <>
      {itens.map((i) => (
        <label key={i.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 hover:bg-kumo-tint">
          <span className="min-w-0 truncate text-sm text-kumo-default">{i.rotulo}</span>
          <span className="inline-flex shrink-0 items-center gap-2">
            {i.contagem !== undefined && <span className="text-xs tabular-nums text-kumo-subtle">{i.contagem}</span>}
            <Interruptor marcado={escolhidos.includes(i.id)} aoMudar={(v) => aoMudar(i.id, v)} rotulo={`${rotulo}: ${i.rotulo}`} />
          </span>
        </label>
      ))}
    </>
  );
}

/** Uma linha de cor: o nome à esquerda e, à direita, o quadrado da cor com o seu valor, que abre o seletor (as cores prontas, a que se escreve e a escolha de «sem cor»). */
export function LinhaDeCor({ titulo, valor, aoMudar, cores, padrao }: { titulo: string; valor: string | null; aoMudar: (hex: string | null) => void; cores: { rotulo: string; hex: string }[]; /** A cor com que o seletor começa quando ainda não há nenhuma. */ padrao: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate text-sm text-kumo-default">{titulo}</span>
      <Popover.Root>
        <Tooltip
          content={`Escolher a cor: ${titulo}`}
          render={
            <Popover.Trigger
              render={
                <Button variant="secondary" size="sm" icon={<span aria-hidden className="size-4 rounded-[4px] ring-1 ring-black/10 dark:ring-white/20" style={{ background: valor ?? "transparent" }} />}>
                  {valor ? valor.toUpperCase() : "Sem cor"}
                </Button>
              }
            />
          }
        />
        <PopupCartao alinhar="end" className="w-[232px] p-3">
          <EscolherCor alternar cor={valor} aoMudar={aoMudar} cores={cores} padrao={padrao} rotuloDeVoltar="Tirar a cor" />
        </PopupCartao>
      </Popover.Root>
    </div>
  );
}

/** Um grupo do formulário: o título do campo e, por baixo, o que se escolhe ou escreve. */
export function Seccao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-kumo-default">{titulo}</h3>
      {children}
    </section>
  );
}

/** Opções prontas que se escolhem com um toque (uma ou várias) e um botão «Personalizar» para quem quer escrever a sua: preencher um campo sem precisar de saber o que escrever. */
export function EscolhaDeOpcoes({ rotulo, opcoes, valor, aoMudar, varias = false, personalizar = true, placeholder = "Escreva e carregue em Enter", renderizar }: { rotulo: string; opcoes: string[]; valor: string[]; aoMudar: (v: string[]) => void; varias?: boolean; /** Mostra o botão «Personalizar». */ personalizar?: boolean; placeholder?: string; /** Como se mostra cada opção (por omissão, o próprio texto). */ renderizar?: (opcao: string) => ReactNode }) {
  const [aEscrever, setAEscrever] = useState(false);
  const [texto, setTexto] = useState("");
  const todas = [...opcoes, ...valor.filter((v) => !opcoes.includes(v))];
  const alternar = (o: string) => aoMudar(valor.includes(o) ? valor.filter((x) => x !== o) : varias ? [...valor, o] : [o]);
  const juntar = () => {
    const t = texto.trim();
    setTexto("");
    setAEscrever(false);
    if (t && !valor.includes(t)) aoMudar(varias ? [...valor, t] : [t]);
  };
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-2">
      {todas.map((o) => (
        <Button key={o} size="sm" variant="secondary" aria-pressed={valor.includes(o)} className={valor.includes(o) ? "!bg-kumo-brand/15 !ring-kumo-brand/50" : ""} onClick={() => alternar(o)}>
          {renderizar ? renderizar(o) : o}
        </Button>
      ))}
      {aEscrever ? (
        <Input
          aria-label={`${rotulo}: escrever`}
          autoFocus
          size="sm"
          className="w-48"
          value={texto}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => setTexto(e.target.value)}
          onBlur={juntar}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.preventDefault(), juntar());
            else if (e.key === "Escape") (setTexto(""), setAEscrever(false));
          }}
        />
      ) : personalizar ? (
        <Button size="sm" variant="ghost" icon={ICONES.mais} onClick={() => setAEscrever(true)}>
          Personalizar
        </Button>
      ) : null}
    </div>
  );
}

/** A janela modal das ações do painel: confirmar algo que muda ou apaga, ou pedir um valor (`children` é o campo; `desativado` segura o botão de ação até o valor servir). */
/** Para comparar a frase escrita: sem maiúsculas e com os espaços repetidos reduzidos a um. */
const normalizar = (t: string) => t.trim().replace(/\s+/g, " ").toUpperCase();

export function Confirmar({
  aberto,
  aoMudar,
  titulo,
  texto,
  rotuloAcao,
  perigo = false,
  aoConfirmar,
  escrever,
  children,
  desativado = false,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  titulo: string;
  texto: ReactNode;
  rotuloAcao: string;
  perigo?: boolean;
  aoConfirmar: () => void;
  /** A frase que a pessoa tem de escrever para confirmar: o verbo e o nome do que muda («APAGAR eventos de marketing»). Não distingue maiúsculas de minúsculas. */
  escrever?: string;
  /** Conteúdo próprio entre o texto e os botões (por exemplo, um campo). */
  children?: ReactNode;
  /** Desativa o botão de ação. */
  desativado?: boolean;
}) {
  const [digitado, setDigitado] = useState("");
  const pode = !escrever || normalizar(digitado) === normalizar(escrever);
  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(v) => {
        if (!v) setDigitado("");
        aoMudar(v);
      }}
    >
      <Dialog size="base" className="p-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <Dialog.Title className="text-lg font-semibold">{titulo}</Dialog.Title>
          <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
        </div>
        <div className="text-sm text-kumo-default">{typeof texto === "string" ? <Frase>{texto}</Frase> : texto}</div>
        {children && <div className="mt-4">{children}</div>}
        {escrever && (
          <label className="mt-4 flex flex-col gap-1.5 text-xs text-kumo-subtle">
            <span className="leading-6">
              Escreva <Pilula>{escrever}</Pilula> para confirmar
            </span>
            <Input aria-label="Frase de confirmação" value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
          </label>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
          <Button
            variant={perigo ? "destructive" : "primary"}
            disabled={!pode || desativado}
            onClick={() => {
              aoConfirmar();
              setDigitado("");
              aoMudar(false);
            }}
          >
            {rotuloAcao}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

const relativo = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });

/** «há 2 horas», «ontem», «há 3 dias»… */
export function haTempo(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  if (abs < 60_000) return "agora mesmo";
  if (abs < 3_600_000) return relativo.format(Math.round(ms / 60_000), "minute");
  if (abs < 86_400_000) return relativo.format(Math.round(ms / 3_600_000), "hour");
  if (abs < 86_400_000 * 45) return relativo.format(Math.round(ms / 86_400_000), "day");
  return relativo.format(Math.round(ms / (86_400_000 * 30)), "month");
}

export const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const soData = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

export const emailValido = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.trim());

/** Máscara do e-mail: «m*****@empresa.exemplo». */
export function mascarar(email: string): string {
  const [a, b] = email.split("@");
  return b ? `${a[0]}${"•".repeat(Math.max(2, a.length - 1))}@${b}` : email;
}

/** Código de seis dígitos para a simulação (em produção iria por e-mail ou por SMS). */
export const codigoSimulado = () => String(Math.floor(100000 + Math.random() * 900000));

export { BotaoCopiar, copiar } from "../Copiar";

export function descarregar(nome: string, conteudo: string, tipo = "text/plain") {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
