// O que os ecrãs de e-mail do Marketing partilham: as mensagens e as campanhas (em modo simulado vivem no navegador, em modo ligado vêm do servidor), a hora de agora, a fila que anda sozinha em modo simulado e a janela de escrever uma mensagem, para enviar já ou agendar.
"use client";

import { Button, Checkbox, Input, InputArea, Popover, Select, Tooltip } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { gerarCampanhas, gerarEmails } from "@/dados/email";
import { useColecao } from "@/lib/api/colecao";
import { contactoCorresponde, ESTADOS_DE_CONTACTO, ORDEM_DOS_ESTADOS, type Contacto, type EstadoDeContacto } from "@/lib/email-contactos";
import { amanhaAsNove, campanhasDevidas, enderecosDe, soEndereco, emailsDevidos, erroDoAgendamento, erroDoEmail, localParaIso, type CampanhaDeEmail, type Email, type RascunhoDeEmail } from "@/lib/email";
import { Confirmar } from "../conta/Pecas";
import { PopupCartao } from "../Flutuantes";
import { ICONES } from "../Icones";
import { PilulaDeEstado } from "../PilulaDeEstado";
import { SeletorDeDataHora } from "../SeletoresDeTempo";
import { useTick } from "./SuperPecas";

/** As mensagens de todas as pastas (a pasta é um campo de cada uma). */
export function useEmails() {
  const inicial = useMemo(() => gerarEmails(), []);
  return useColecao<Email>("/v1/marketing/emails", "emails", inicial);
}

export function useCampanhasDeEmail() {
  const inicial = useMemo(() => gerarCampanhas(), []);
  return useColecao<CampanhaDeEmail>("/v1/marketing/campanhas-email", "campanhas-email", inicial);
}

/** A hora de agora, atualizada de `ms` em `ms`; `null` até o ecrã estar no navegador (assim o que depende da hora não difere do que se gerou no servidor). */
export function useAgora(ms = 30_000): Date | null {
  const t = useTick(ms);
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => setAgora(new Date()), [t]);
  return agora;
}

/** Em modo simulado a fila anda sozinha: o que estava agendado e já passou de hora sai, à hora marcada. Em modo ligado a fila é do servidor. */
export function useFilaSimulada({ emails, campanhas }: { emails?: ReturnType<typeof useEmails>; campanhas?: ReturnType<typeof useCampanhasDeEmail> }) {
  const agora = useAgora();
  const modo = (emails ?? campanhas)?.modo;
  useEffect(() => {
    if (modo === "ligado" || !agora) return;
    if (emails) for (const e of emailsDevidos(emails.itens, agora)) void emails.guardar(e);
    if (campanhas) for (const c of campanhasDevidas(campanhas.itens, agora)) void campanhas.guardar(c);
  }, [agora, modo, emails?.itens, campanhas?.itens]); // eslint-disable-line react-hooks/exhaustive-deps
  return agora;
}

const QUANDO = { agora: "Enviar agora", agendar: "Agendar" } as const;

/** Os números de uma caixa, numa só faixa («Recebidos 10 | Por ler 3 | Urgente 1 | Leads 3»). Cada um que tem `aoClicar` filtra a lista. */
export function FaixaDeNumeros({ itens }: { itens: { rotulo: string; valor: number; aoClicar?: () => void; ativo?: boolean }[] }) {
  return (
    <div className="grid grid-cols-4 divide-x divide-kumo-hairline overflow-hidden rounded-xl bg-kumo-base ring ring-kumo-line">
      {itens.map((i) => (
        <button key={i.rotulo} type="button" disabled={!i.aoClicar} onClick={i.aoClicar} aria-pressed={i.ativo} className="flex min-w-0 flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors enabled:cursor-pointer enabled:hover:bg-kumo-tint aria-pressed:bg-kumo-tint">
          <span className="w-full truncate text-xs text-kumo-subtle">{i.rotulo}</span>
          <span className="text-xl font-semibold tabular-nums text-kumo-default">{i.valor.toLocaleString("pt-PT")}</span>
        </button>
      ))}
    </div>
  );
}

/** O filtro por estado, ao lado do «Todas»: escolhe-se um ou vários estados (urgente, lead, quente…) e a lista fica só com essas pessoas. */
export function FiltroPorEstado({ escolhidos, aoMudar, contagens }: { escolhidos: EstadoDeContacto[]; aoMudar: (e: EstadoDeContacto[]) => void; contagens: Partial<Record<EstadoDeContacto, number>> }) {
  const ativo = escolhidos.length > 0;
  return (
    <Popover.Root>
      <Tooltip content={ativo ? `Filtro por estado (${escolhidos.length})` : "Filtrar por estado"} render={<Popover.Trigger render={<Button variant="secondary" shape="square" icon={ICONES.filtrar} aria-label="Filtrar por estado" className="relative shrink-0" />} />} />
      <PopupCartao alinhar="start" className="w-[min(300px,calc(100vw-2rem))]">
        <div className="flex flex-col gap-1 p-2">
          {ORDEM_DOS_ESTADOS.map((s) => (
            <label key={s} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-kumo-tint">
              <span className="inline-flex items-center gap-2">
                <Checkbox aria-label={ESTADOS_DE_CONTACTO[s].rotulo} checked={escolhidos.includes(s)} onCheckedChange={(v) => aoMudar(v ? [...escolhidos, s] : escolhidos.filter((x) => x !== s))} />
                <PilulaDeEstado estado={s} semDica />
              </span>
              <span className="text-xs tabular-nums text-kumo-subtle">{contagens[s] ?? 0}</span>
            </label>
          ))}
          <div className="flex justify-end border-t border-kumo-hairline pt-2">
            <Button variant="ghost" size="sm" disabled={!ativo} onClick={() => aoMudar([])}>
              Limpar
            </Button>
          </div>
        </div>
      </PopupCartao>
    </Popover.Root>
  );
}

/** A janela de escrever uma mensagem (nova, resposta ou reencaminhada): `inicial` abre-a, com o que já vier escrito. `aoEnviar` recebe `quando` (ISO) se foi agendada. */
export function Compor({ inicial, aoFechar, aoEnviar, contactos }: { inicial: RascunhoDeEmail | null; aoFechar: () => void; aoEnviar: (r: RascunhoDeEmail, quando: string | null) => void; /** As pessoas conhecidas, com o estado de cada uma: aparecem como sugestões no «Para». */ contactos?: Record<string, Contacto> }) {
  const [r, setR] = useState<RascunhoDeEmail>({ para: "", assunto: "", corpo: "" });
  const [modo, setModo] = useState<keyof typeof QUANDO>("agora");
  const [quando, setQuando] = useState("");
  const [aEscrever, setAEscrever] = useState(false);
  useEffect(() => {
    if (!inicial) return;
    setR(inicial);
    setModo("agora");
    setQuando(amanhaAsNove(new Date()));
  }, [inicial]);
  const erro = erroDoEmail(r) ?? (modo === "agendar" ? erroDoAgendamento(quando, new Date()) : null);
  // as sugestões: quem ainda não está no «Para» e corresponde ao que se escreve, os mais importantes primeiro
  const jaEsta = useMemo(() => new Set(enderecosDe(r.para).map((x) => soEndereco(x).toLowerCase())), [r.para]);
  const fragmento = r.para.split(/[,;]/).pop()?.trim() ?? "";
  const sugestoes = useMemo(
    () =>
      Object.values(contactos ?? {})
        .filter((c) => !jaEsta.has(c.endereco) && c.principal !== "automatico" && contactoCorresponde(c, fragmento))
        .sort((a, b) => ORDEM_DOS_ESTADOS.indexOf(a.principal) - ORDEM_DOS_ESTADOS.indexOf(b.principal) || a.horasDesdeOUltimo - b.horasDesdeOUltimo)
        .slice(0, 6),
    [contactos, jaEsta, fragmento],
  );
  const juntar = (c: Contacto) => {
    const antes = r.para.includes(",") || r.para.includes(";") ? r.para.slice(0, Math.max(r.para.lastIndexOf(","), r.para.lastIndexOf(";")) + 1).trim() : "";
    setR({ ...r, para: `${antes ? `${antes} ` : ""}${c.endereco}, ` });
  };
  return (
    <Confirmar aberto={!!inicial} aoMudar={(v) => !v && aoFechar()} titulo="Escrever e-mail" texto={null} rotuloAcao={modo === "agendar" ? "Agendar" : "Enviar"} desativado={!!erro} aoConfirmar={() => aoEnviar({ para: r.para.trim(), assunto: r.assunto.trim(), corpo: r.corpo.trim() }, modo === "agendar" ? localParaIso(quando) : null)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Input label="Para" value={r.para} onChange={(e) => setR({ ...r, para: e.target.value })} onFocus={() => setAEscrever(true)} onBlur={() => window.setTimeout(() => setAEscrever(false), 150)} placeholder="nome@empresa.pt, outro@empresa.pt" autoComplete="off" autoFocus={!inicial?.para} />
          {aEscrever && sugestoes.length > 0 && (
            <ul role="listbox" aria-label="Pessoas sugeridas" className="sem-barra m-0 flex max-h-52 list-none flex-col overflow-y-auto rounded-xl bg-kumo-base p-1 ring ring-kumo-line">
              {sugestoes.map((c) => (
                <li key={c.endereco}>
                  <button type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => juntar(c)} className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-kumo-tint">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-kumo-default">{c.nome}</span>
                      <span className="block truncate text-xs text-kumo-subtle">{c.endereco}</span>
                    </span>
                    <PilulaDeEstado estado={c.principal} semDica />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Input label="Assunto" value={r.assunto} onChange={(e) => setR({ ...r, assunto: e.target.value })} autoComplete="off" />
        <InputArea label="Mensagem" value={r.corpo} onValueChange={(v) => setR({ ...r, corpo: v })} minRows={7} autoResize />
        <Select label="Quando" value={modo} onValueChange={(v) => setModo(String(v) as keyof typeof QUANDO)} items={QUANDO} />
        {modo === "agendar" && <SeletorDeDataHora label="Enviar em" valor={quando} aoMudar={setQuando} minimo={new Date()} erro={erroDoAgendamento(quando, new Date()) ?? undefined} />}
      </div>
    </Confirmar>
  );
}
