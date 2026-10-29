// O termo em etiqueta: um quadrado de cantos suaves, cinzento, com o texto da cor principal do tema. Todos se podem clicar: abre-se uma explicação a sério (o que é, onde está), com «Copiar» (copia o termo e a explicação, estruturados) e «Perguntar à IA» (abre o chat e pergunta o que significa aqui). Passando o rato por cima, o navegador mostra o início da explicação. Dentro de uma dica ou de uma explicação a etiqueta é só de ver (não se abre outra em cima).
"use client";

import { Button, Popover } from "@cloudflare/kumo";
import { createContext, useContext, useState, type ReactNode } from "react";
import { copiarEstruturado, estruturaDeRegisto } from "@/lib/copiar-dados";
import { perguntarAIa } from "@/lib/ia-contexto";
import { explicarTermo } from "@/lib/termos";
import { Frase } from "./Frase";
import { PopupCartao } from "./Flutuantes";
import { Ic } from "./Icones";

/** Dentro de uma explicação as etiquetas não se abrem. */
const SemAbrir = createContext(false);

const FORMA = "mx-0.5 inline-flex items-center rounded-md bg-current/10 px-1.5 py-px text-xs font-medium ring ring-current/15";

export function Pilula({ children, inverso = false, contexto }: { children: ReactNode; inverso?: boolean; contexto?: string }) {
  const semAbrir = useContext(SemAbrir);
  const [aberta, setAberta] = useState(false);
  const termo = typeof children === "string" ? children : "";
  const cor = inverso ? "text-inherit" : "text-kumo-default";
  if (inverso || semAbrir || !termo) return <span className={`${FORMA} ${cor}`}>{children}</span>;
  const gatilho = (
    <span
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={aberta}
      className={`${FORMA} ${cor} cursor-pointer select-text transition-colors hover:bg-current/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kumo-brand`}
      onMouseEnter={(e) => {
        // o início da explicação, no tooltip do navegador (só se calcula quando se passa por cima)
        if (!e.currentTarget.title) e.currentTarget.title = `${explicarTermo(termo, contexto).texto.slice(0, 160).replace(/«|»/g, "")} Clique para saber mais.`;
      }}
      onClick={(e) => {
        e.stopPropagation();
        setAberta(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          setAberta(true);
        }
      }}
    >
      {children}
    </span>
  );
  // a janela só existe enquanto está aberta: numa tabela com centenas de etiquetas não custa nada
  if (!aberta) return gatilho;
  return (
    <Popover.Root open onOpenChange={(v) => !v && setAberta(false)}>
      <Popover.Trigger nativeButton={false} render={gatilho} />
      <PopupCartao alinhar="start" className="w-[min(340px,calc(100vw-2rem))]">
        <SemAbrir.Provider value>
          <Explicacao termo={termo} contexto={contexto} />
        </SemAbrir.Provider>
      </PopupCartao>
    </Popover.Root>
  );
}

function Explicacao({ termo, contexto }: { termo: string; contexto?: string }) {
  const e = explicarTermo(termo, contexto);
  const [copiado, setCopiado] = useState<"ocioso" | "ok" | "erro">("ocioso");
  const copiar = async () => {
    setCopiado((await copiarEstruturado(estruturaDeRegisto(termo, { termo, tipo: e.tipo, explicacao: e.texto.replace(/«|»/g, ""), ...(e.onde ? { onde: e.onde } : {}) }, window.location.pathname))) ? "ok" : "erro");
    window.setTimeout(() => setCopiado("ocioso"), 2200);
  };
  return (
    <div className="flex flex-col gap-3 p-3.5 text-left">
      <div className="min-w-0">
        <div className="text-xs font-medium text-kumo-subtle">{e.tipo}</div>
        <div className="break-words text-sm font-semibold text-kumo-default">{termo}</div>
      </div>
      <p className="text-sm leading-6 text-kumo-default">
        <Frase>{e.texto}</Frase>
      </p>
      {e.onde && (
        <div className="text-xs text-kumo-subtle">
          <Frase>{`Onde: ${e.onde}`}</Frase>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={<Ic nome={copiado === "ok" ? "certo" : copiado === "erro" ? "aviso" : "copiar"} tamanho={14} />} onClick={copiar}>
          {copiado === "ok" ? "Copiado" : copiado === "erro" ? "Não copiou" : "Copiar"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<Ic nome="ia" tamanho={14} />}
          onClick={() => perguntarAIa(`O que significa ${termo} neste ecrã?`, { enviar: true, contexto: { titulo: `o termo ${termo}`, dados: { termo, tipo: e.tipo, explicacaoDoPainel: e.texto.replace(/«|»/g, ""), ...(e.onde ? { onde: e.onde } : {}) } } })}
        >
          Perguntar à IA
        </Button>
      </div>
    </div>
  );
}
