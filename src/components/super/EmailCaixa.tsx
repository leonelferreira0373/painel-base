// As caixas de e-mail do Marketing: «Recebidos» e «Enviados». À esquerda a lista (com pesquisa e um filtro), à direita a mensagem aberta, com responder, reencaminhar, estrela, marcar como por ler e remover; no telemóvel a lista e a mensagem alternam. Escrever abre a janela de escrever, que envia já ou agenda (as agendadas ficam em «Agendados»).
"use client";

import { Button, Input, Select } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { identificador } from "@/lib/conta";
import { dataNaLista, emailNovo, encaminhar, enviarEmail, agendarEmail, nomeDe, pesquisarEmails, responderA, type Email, type PastaDeEmail, type RascunhoDeEmail } from "@/lib/email";
import { useEditar } from "@/lib/permissao";
import { Cartao, Confirmar } from "../conta/Pecas";
import { Estado } from "../Estado";
import { Frase } from "../Frase";
import { Ic, ICONES } from "../Icones";
import { BotaoIcone, Pagina, Titulo } from "../ui";
import { Vazio } from "../conteudo/ConteudoPecas";
import { REMETENTE_DE_ORIGEM } from "@/dados/email";
import { Compor, useEmails, useFilaSimulada } from "./EmailPecas";
import { AvisoDeApi } from "./SuperPecas";

const FILTROS: Record<PastaDeEmail, Record<string, string>> = {
  recebidos: { todas: "Todas", "por-ler": "Por ler", estrela: "Com estrela" },
  enviados: { todas: "Todas", problemas: "Com problemas", estrela: "Com estrela" },
  agendados: { todas: "Todas" },
};
const TITULOS: Record<PastaDeEmail, string> = { recebidos: "Recebidos", enviados: "Enviados", agendados: "Agendados" };

const primeiraLinha = (corpo: string) => corpo.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
const completa = (iso: string) => new Date(iso).toLocaleString("pt-PT", { weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function CaixaDeEmail({ pasta }: { pasta: "recebidos" | "enviados" }) {
  const editar = useEditar();
  const emails = useEmails();
  const agora = useFilaSimulada({ emails });
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [aberto, setAberto] = useState<string | null>(null);
  const [compor, setCompor] = useState<RascunhoDeEmail | null>(null);
  const [apagar, setApagar] = useState<Email | null>(null);

  const daPasta = useMemo(() => emails.itens.filter((e) => e.pasta === pasta), [emails.itens, pasta]);
  const lista = useMemo(
    () =>
      pesquisarEmails(daPasta, texto).filter((e) => (filtro === "por-ler" ? !e.lido : filtro === "estrela" ? e.estrela : filtro === "problemas" ? e.estado === "Falhou" || e.estado === "Devolvido" : true)),
    [daPasta, texto, filtro],
  );
  const porLer = daPasta.filter((e) => !e.lido).length;
  const atual = aberto ? daPasta.find((e) => e.id === aberto) ?? null : null;

  const abrir = (e: Email) => {
    setAberto(e.id);
    if (!e.lido && editar) void emails.guardar({ ...e, lido: true });
  };
  const enviar = (r: RascunhoDeEmail, quando: string | null) => {
    const base = emailNovo(identificador(), { de: REMETENTE_DE_ORIGEM, para: r.para, assunto: r.assunto, corpo: r.corpo });
    void emails.guardar(quando ? agendarEmail(base, quando) : enviarEmail(base, new Date()));
  };
  const alternar = (e: Email, mudanca: Partial<Email>) => void emails.guardar({ ...e, ...mudanca });

  return (
    <Pagina largo>
      <Titulo titulo={TITULOS[pasta]}>
        {editar && (
          <Button variant="primary" icon={ICONES.mais} onClick={() => setCompor({ para: "", assunto: "", corpo: "" })}>
            Escrever
          </Button>
        )}
      </Titulo>
      <AvisoDeApi erro={emails.erro} aoTentar={emails.recarregar} />
      <div className="grid gap-4 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:items-start">
        {/* no telemóvel a lista e a mensagem alternam; no PC estão lado a lado */}
        <div className={`min-w-0 ${atual ? "hidden lg:block" : ""}`}>
          <Cartao titulo={`${TITULOS[pasta]}${daPasta.length ? ` (${daPasta.length}${pasta === "recebidos" && porLer ? `, ${porLer} por ler` : ""})` : ""}`}>
            <div className="flex flex-col gap-2 border-b border-kumo-hairline p-3 sm:flex-row">
              <Input aria-label="Pesquisar mensagens" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pesquisar" autoComplete="off" className="w-full" />
              <div className="sm:w-40 sm:shrink-0">
                <Select aria-label="Mostrar" value={filtro} onValueChange={(v) => setFiltro(String(v))} items={FILTROS[pasta]} />
              </div>
            </div>
            {!agora || emails.aCarregar ? (
              <div className="p-6 text-sm text-kumo-subtle">A abrir as mensagens…</div>
            ) : lista.length === 0 ? (
              <Vazio icone="correio" titulo={daPasta.length === 0 ? "Sem mensagens" : "Nenhuma mensagem"} texto={daPasta.length === 0 ? (pasta === "recebidos" ? "As mensagens que chegarem aparecem aqui." : "As mensagens que enviar aparecem aqui.") : "Nenhuma mensagem corresponde à pesquisa."} />
            ) : (
              <div className="max-h-[70dvh] overflow-y-auto">
                {lista.map((e) => {
                  const naoLido = pasta === "recebidos" && !e.lido;
                  return (
                    <button key={e.id} type="button" onClick={() => abrir(e)} data-ativo={aberto === e.id} className="flex w-full items-start gap-3 border-t border-kumo-hairline px-4 py-3 text-left first:border-t-0 hover:bg-kumo-tint data-[ativo=true]:bg-kumo-tint">
                      <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${naoLido ? "bg-kumo-brand" : "bg-transparent"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm text-kumo-default ${naoLido ? "font-semibold" : "font-medium"}`}>{pasta === "recebidos" ? nomeDe(e.de) : e.para}</span>
                          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-kumo-subtle tabular-nums">
                            {e.estrela && <Ic nome="estrela" tamanho={12} peso="fill" />}
                            {dataNaLista(e.data, agora)}
                          </span>
                        </span>
                        <span className={`block truncate text-sm text-kumo-default ${naoLido ? "font-medium" : ""}`}>{e.assunto}</span>
                        <span className="block truncate text-[13px] text-kumo-subtle">{primeiraLinha(e.corpo)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Cartao>
        </div>

        <div className={`min-w-0 ${atual ? "" : "hidden lg:block"} lg:sticky lg:top-4`}>
          {atual ? (
            <Cartao titulo={TITULOS[pasta]} acoes={<Button variant="ghost" size="sm" className="lg:hidden" icon={ICONES.anterior} onClick={() => setAberto(null)}>{TITULOS[pasta]}</Button>}>
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-kumo-default">
                    <Frase>{atual.assunto}</Frase>
                  </h2>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px] text-kumo-subtle">
                    <dt>De</dt>
                    <dd className="min-w-0 break-words text-kumo-default">{atual.de}</dd>
                    <dt>Para</dt>
                    <dd className="min-w-0 break-words text-kumo-default">{atual.para}</dd>
                    <dt>Data</dt>
                    <dd className="text-kumo-default">{completa(atual.data)}</dd>
                  </dl>
                  {pasta === "enviados" && atual.estado && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Estado valor={atual.estado} />
                      {atual.erro && <span className="text-[13px] text-kumo-subtle">{atual.erro}</span>}
                    </div>
                  )}
                </div>
                {editar && (
                  <div className="flex flex-wrap items-center gap-1 border-y border-kumo-hairline py-2">
                    <Button variant="secondary" size="sm" icon={<Ic nome="enviar" />} onClick={() => setCompor(responderA(atual))}>
                      Responder
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCompor(encaminhar(atual))}>
                      Reencaminhar
                    </Button>
                    {pasta === "enviados" && (atual.estado === "Falhou" || atual.estado === "Devolvido") && (
                      <Button variant="ghost" size="sm" icon={<Ic nome="atualizar" />} onClick={() => setCompor({ para: atual.para, assunto: atual.assunto, corpo: atual.corpo })}>
                        Enviar de novo
                      </Button>
                    )}
                    <span className="ml-auto flex items-center gap-1">
                      <BotaoIcone dica={atual.estrela ? "Tirar a estrela" : "Pôr uma estrela"} icone="estrela" aoClicar={() => alternar(atual, { estrela: !atual.estrela })} />
                      {pasta === "recebidos" && <BotaoIcone dica="Marcar como por ler" icone="olho" aoClicar={() => (alternar(atual, { lido: false }), setAberto(null))} />}
                      <BotaoIcone dica="Remover a mensagem" icone="lixo" aoClicar={() => setApagar(atual)} />
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words text-sm leading-6 text-kumo-default">{atual.corpo}</div>
              </div>
            </Cartao>
          ) : (
            <div className="rounded-xl bg-kumo-base ring ring-kumo-line">
              <Vazio icone="correio" titulo="Escolha uma mensagem" texto="A mensagem aparece aqui." />
            </div>
          )}
        </div>
      </div>

      <Compor inicial={compor} aoFechar={() => setCompor(null)} aoEnviar={enviar} />
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover a mensagem" texto={apagar ? `«${apagar.assunto}» vai ser removida. Não se pode desfazer.` : ""} rotuloAcao="Remover" perigo aoConfirmar={() => apagar && (void emails.remover(apagar.id), setAberto(null))} />
    </Pagina>
  );
}
