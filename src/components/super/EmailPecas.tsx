// O que os ecrãs de e-mail do Marketing partilham: as mensagens e as campanhas (em modo simulado vivem no navegador, em modo ligado vêm do servidor), a hora de agora, a fila que anda sozinha em modo simulado e a janela de escrever uma mensagem, para enviar já ou agendar.
"use client";

import { InputArea, Input, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { gerarCampanhas, gerarEmails } from "@/dados/email";
import { useColecao } from "@/lib/api/colecao";
import { amanhaAsNove, campanhasDevidas, emailsDevidos, erroDoAgendamento, erroDoEmail, localParaIso, type CampanhaDeEmail, type Email, type RascunhoDeEmail } from "@/lib/email";
import { Confirmar } from "../conta/Pecas";
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

/** A janela de escrever uma mensagem (nova, resposta ou reencaminhada): `inicial` abre-a, com o que já vier escrito. `aoEnviar` recebe `quando` (ISO) se foi agendada. */
export function Compor({ inicial, aoFechar, aoEnviar }: { inicial: RascunhoDeEmail | null; aoFechar: () => void; aoEnviar: (r: RascunhoDeEmail, quando: string | null) => void }) {
  const [r, setR] = useState<RascunhoDeEmail>({ para: "", assunto: "", corpo: "" });
  const [modo, setModo] = useState<keyof typeof QUANDO>("agora");
  const [quando, setQuando] = useState("");
  useEffect(() => {
    if (!inicial) return;
    setR(inicial);
    setModo("agora");
    setQuando(amanhaAsNove(new Date()));
  }, [inicial]);
  const erro = erroDoEmail(r) ?? (modo === "agendar" ? erroDoAgendamento(quando, new Date()) : null);
  return (
    <Confirmar aberto={!!inicial} aoMudar={(v) => !v && aoFechar()} titulo="Escrever e-mail" texto={null} rotuloAcao={modo === "agendar" ? "Agendar" : "Enviar"} desativado={!!erro} aoConfirmar={() => aoEnviar({ para: r.para.trim(), assunto: r.assunto.trim(), corpo: r.corpo.trim() }, modo === "agendar" ? localParaIso(quando) : null)}>
      <div className="flex flex-col gap-3">
        <Input label="Para" value={r.para} onChange={(e) => setR({ ...r, para: e.target.value })} placeholder="nome@empresa.pt, outro@empresa.pt" autoComplete="off" autoFocus={!inicial?.para} />
        <Input label="Assunto" value={r.assunto} onChange={(e) => setR({ ...r, assunto: e.target.value })} autoComplete="off" />
        <InputArea label="Mensagem" value={r.corpo} onValueChange={(v) => setR({ ...r, corpo: v })} minRows={7} autoResize />
        <Select label="Quando" value={modo} onValueChange={(v) => setModo(String(v) as keyof typeof QUANDO)} items={QUANDO} />
        {modo === "agendar" && <SeletorDeDataHora label="Enviar em" valor={quando} aoMudar={setQuando} minimo={new Date()} erro={erroDoAgendamento(quando, new Date()) ?? undefined} />}
      </div>
    </Confirmar>
  );
}
