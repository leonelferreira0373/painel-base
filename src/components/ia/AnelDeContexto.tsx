// O anel de contexto da IA: mede, a sério, quanto da janela do modelo a última chamada ocupou (os tokens que a Cloudflare contou), como o contexto do Claude Code. Cinzento quando a IA não está a ser usada, colorido (verde, âmbar, vermelho) enquanto está. Ao carregar abre a janela com o modelo, a janela de contexto, os tokens, o dinheiro e a ligação ao histórico.
"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { caminho } from "@/dados/estrutura";
import { estruturaDeRegisto } from "@/lib/copiar-dados";
import { formatarUsd, NEURONS_GRATIS_POR_DIA } from "@/lib/ia-modelos";
import { aPagar, quadradosDe, repartirContexto, ROTULO_DA_ORIGEM, tomDoAnel, useUsoDaIa, type OrigemDaIa, type ParteDoContexto } from "@/lib/ia-uso";
import { BotaoCopiar } from "../Copiar";
import { Dica } from "../Dica";
import { ICONES } from "../Icones";
import { NumeroEmRoda } from "../NumeroEmRoda";

const COR_DO_TOM = { sucesso: "var(--color-kumo-success)", aviso: "var(--color-kumo-warning)", perigo: "var(--color-kumo-danger)" } as const;
const COR_DA_PARTE: Record<ParteDoContexto["id"], string> = {
  sistema: "var(--color-kumo-brand)",
  ferramentas: "var(--color-kumo-warning)",
  mensagens: "var(--color-kumo-success)",
  resposta: "var(--color-kumo-danger)",
  livre: "var(--color-kumo-hairline)",
};

const inteiro = (n: number) => Math.round(n).toLocaleString("pt-PT");
const percentagem = (f: number) => `${(f * 100).toLocaleString("pt-PT", { maximumFractionDigits: f < 0.1 ? 1 : 0 })} %`;

/** O anel desenhado: o arco é a parte da janela ocupada. */
export function Anel({ ocupacao, ativo, tamanho = 26, espessura = 3 }: { ocupacao: number; ativo: boolean; tamanho?: number; espessura?: number }) {
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  const cor = ativo ? COR_DO_TOM[tomDoAnel(ocupacao)] : "var(--color-kumo-subtle)";
  // um fio mínimo à vista mesmo com 0,5 %, para o anel nunca parecer vazio quando já houve uma chamada
  const arco = ocupacao > 0 ? Math.max(ocupacao, 0.02) : 0;
  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--color-kumo-hairline)" strokeWidth={espessura} />
      <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - arco)} style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1), stroke 300ms" }} opacity={ativo ? 1 : 0.55} />
    </svg>
  );
}

/** O botão do anel: tem de estar sempre à mão ao lado de onde a IA se usa. `ativo` só é verdadeiro enquanto a IA trabalha (ou acabou de trabalhar) para esta origem. */
export function AnelDeContexto({ origem, ativo, tamanho = 26, className = "" }: { origem: OrigemDaIa; ativo: boolean; tamanho?: number; className?: string }) {
  const { contexto } = useUsoDaIa();
  const [aberto, setAberto] = useState(false);
  const c = contexto(origem);
  const dica = c ? `Contexto: ${percentagem(c.ocupacao)} · ${inteiro(c.tokens)} de ${inteiro(c.janela)} tokens. Carregue para ver o modelo e o gasto.` : "Contexto da IA: ainda sem chamadas. Carregue para ver o modelo e o gasto.";
  return (
    <>
      <Dica conteudo={dica}>
        <button type="button" aria-label="Contexto e utilização da IA" onClick={() => setAberto(true)} onMouseDown={(e) => e.preventDefault()} className={`grid size-9 shrink-0 place-items-center rounded-full text-kumo-subtle transition-colors hover:bg-kumo-tint focus-visible:outline-2 focus-visible:outline-kumo-brand ${className}`}>
          <Anel ocupacao={c?.ocupacao ?? 0} ativo={ativo && !!c} tamanho={tamanho} />
        </button>
      </Dica>
      <ContextoDaIa aberto={aberto} aoMudar={setAberto} origemInicial={origem} />
    </>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-kumo-subtle">{rotulo}</span>
      <span className="text-right font-medium tabular-nums text-kumo-default">{children}</span>
    </div>
  );
}

/** A janela do contexto, no espírito do /context do Claude Code: o que ocupa a janela, o modelo, os tokens, o dinheiro e a quota do dia. */
export function ContextoDaIa({ aberto, aoMudar, origemInicial }: { aberto: boolean; aoMudar: (v: boolean) => void; origemInicial: OrigemDaIa }) {
  const router = useRouter();
  const { contexto, sessao, hoje, recarregarHoje } = useUsoDaIa();
  const [origem, setOrigem] = useState<OrigemDaIa>(origemInicial);
  const c = contexto(origem);
  const partes = c ? repartirContexto(c.registo.uso, c.registo.partes) : [];
  const quadrados = partes.length > 0 ? quadradosDe(partes, 50) : null;
  const m = c?.modelo;
  const pagar = hoje ? aPagar(hoje) : 0;
  const grelha = quadrados ? (["sistema", "ferramentas", "mensagens", "resposta", "livre"] as const).flatMap((id) => Array.from({ length: quadrados[id] }, () => id)) : [];
  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(v) => {
        if (v) recarregarHoje();
        aoMudar(v);
      }}
    >
      <Dialog size="lg" className="max-h-[85dvh] overflow-y-auto p-0">
        <div className="flex items-center justify-between gap-4 border-b border-kumo-hairline px-6 py-4">
          <div className="min-w-0">
            <Dialog.Title className="text-lg font-semibold">Contexto e utilização da IA</Dialog.Title>
            <div className="mt-2 flex gap-1" role="tablist" aria-label="Origem">
              {(["pesquisa", "assistente"] as const).map((o) => (
                <button key={o} type="button" role="tab" aria-selected={origem === o} onClick={() => setOrigem(o)} className="rounded-full px-3 py-1 text-[13px] font-medium text-kumo-subtle aria-selected:bg-kumo-tint aria-selected:text-kumo-default">
                  {ROTULO_DA_ORIGEM[o]}
                </button>
              ))}
            </div>
          </div>
          <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
        </div>

        <div className="flex flex-col gap-6 px-6 py-5">
          {/* a janela de contexto */}
          <section aria-label="Janela de contexto" className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Anel ocupacao={c?.ocupacao ?? 0} ativo={!!c} tamanho={64} espessura={6} />
              <div className="min-w-0">
                <div className="text-2xl font-semibold tabular-nums">{c ? <NumeroEmRoda valor={percentagem(c.ocupacao)} aoAparecer={false} /> : "—"}</div>
                <div className="text-sm text-kumo-subtle">{c ? `${inteiro(c.tokens)} de ${inteiro(c.janela)} tokens da janela do modelo` : "Ainda sem chamadas neste navegador."}</div>
              </div>
            </div>
            {quadrados && (
              <>
                <div className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[3px]" role="img" aria-label="Repartição do contexto por partes">
                  {grelha.map((id, i) => (
                    <span key={i} className="aspect-square rounded-[3px]" style={{ background: COR_DA_PARTE[id], opacity: id === "livre" ? 0.6 : 1 }} />
                  ))}
                </div>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {partes.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: COR_DA_PARTE[p.id] }} />
                      <span className="min-w-0 flex-1 truncate text-kumo-default">{p.rotulo}</span>
                      <span className="tabular-nums text-kumo-subtle">
                        {inteiro(p.tokens)} tokens · {percentagem(c ? p.tokens / c.janela : 0)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-kumo-subtle">O total de entrada e o de saída são os que a Cloudflare contou; a repartição da entrada por partes é uma estimativa pelo tamanho do texto.</p>
              </>
            )}
          </section>

          {/* o modelo */}
          <section aria-label="Modelo" className="rounded-xl bg-kumo-base px-4 py-2 ring ring-kumo-line">
            <Linha rotulo="Modelo">{m ? m.nome : "—"}</Linha>
            <Linha rotulo="Identificador">
              {m ? (
                <span className="inline-flex items-center gap-1.5">
                  <code className="break-all text-xs">{m.id}</code>
                  <BotaoCopiar texto={m.id} estruturado={estruturaDeRegisto(`Modelo ${m.nome}`, { ...m }, "/ia/uso/")} tamanho="xs" dica="Copiar os dados do modelo" />
                </span>
              ) : (
                "—"
              )}
            </Linha>
            <Linha rotulo="Fornecedor">{m ? `${m.fornecedor} · Cloudflare Workers AI` : "Cloudflare Workers AI"}</Linha>
            <Linha rotulo="Janela de contexto">{m ? `${inteiro(m.janela)} tokens` : "—"}</Linha>
            <Linha rotulo="Preço (por milhão de tokens)">{m ? `${formatarUsd(m.precoEntrada)} entrada · ${formatarUsd(m.precoSaida)} saída` : "—"}</Linha>
            <Linha rotulo="Chamada de ferramentas">{m ? (m.ferramentas ? "Sim" : "Não") : "—"}</Linha>
            <Linha rotulo="Última resposta">{c ? `${(c.registo.uso.ms / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} s` : "—"}</Linha>
          </section>

          {/* a utilização */}
          <section aria-label="Utilização" className="overflow-hidden rounded-xl ring ring-kumo-line">
            <div className="grid grid-cols-3 gap-px bg-kumo-hairline text-sm">
              {[
                { titulo: "Última chamada", t: c ? { tin: c.registo.uso.tokensEntrada, tout: c.registo.uso.tokensSaida, n: c.registo.uso.neurons, usd: c.registo.uso.custoUsd } : null },
                { titulo: "Esta sessão", t: sessao.chamadas > 0 ? { tin: sessao.tokensEntrada, tout: sessao.tokensSaida, n: sessao.neurons, usd: sessao.custoUsd } : null },
                { titulo: "Hoje (todos)", t: hoje ? { tin: hoje.tokensEntrada, tout: hoje.tokensSaida, n: hoje.neurons, usd: hoje.custoUsd } : null },
              ].map(({ titulo, t }) => (
                <div key={titulo} className="flex flex-col gap-1 bg-kumo-base p-3">
                  <span className="text-xs font-medium text-kumo-subtle">{titulo}</span>
                  <span className="tabular-nums text-kumo-default">{t ? `${inteiro(t.tin)} entrada` : "—"}</span>
                  <span className="tabular-nums text-kumo-default">{t ? `${inteiro(t.tout)} saída` : ""}</span>
                  <span className="tabular-nums text-kumo-subtle">{t ? `${t.n.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} neurons` : ""}</span>
                  <span className="font-medium tabular-nums text-kumo-default">{t ? formatarUsd(t.usd) : ""}</span>
                </div>
              ))}
            </div>
          </section>

          {/* o dinheiro e a quota */}
          <section aria-label="Dinheiro" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium text-kumo-default">Quota gratuita de hoje</span>
              <span className="text-sm tabular-nums text-kumo-subtle">{hoje ? `${inteiro(hoje.neurons)} de ${inteiro(hoje.limiteGratis)} neurons` : `${inteiro(NEURONS_GRATIS_POR_DIA)} neurons por dia`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-kumo-hairline" role="progressbar" aria-valuemin={0} aria-valuemax={hoje?.limiteGratis ?? NEURONS_GRATIS_POR_DIA} aria-valuenow={hoje ? Math.min(hoje.neurons, hoje.limiteGratis) : 0}>
              <div className="h-full rounded-full bg-kumo-brand transition-[width] duration-700" style={{ width: `${hoje ? Math.min(100, (hoje.neurons / hoje.limiteGratis) * 100) : 0}%` }} />
            </div>
            <div className="rounded-xl bg-kumo-base px-4 py-2 ring ring-kumo-line">
              <Linha rotulo="Custo a preço de tabela (hoje)">{hoje ? formatarUsd(hoje.custoUsd) : "—"}</Linha>
              <Linha rotulo="A pagar">{hoje ? `${formatarUsd(pagar)}${pagar === 0 ? " (dentro da quota gratuita)" : ""}` : "—"}</Linha>
              <Linha rotulo="Restam hoje">{hoje ? `${inteiro(hoje.restantes)} neurons` : "—"}</Linha>
            </div>
            <p className="text-xs text-kumo-subtle">Passado o limite do dia o painel deixa de usar a IA até à meia-noite (UTC): nunca gasta dinheiro. O gasto de hoje soma toda a gente que usa este painel.</p>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-kumo-hairline px-6 py-4">
          <Button
            variant="secondary"
            onClick={() => {
              aoMudar(false);
              router.push(caminho("ia", "uso"));
            }}
          >
            Ver o histórico de utilização
          </Button>
          <Dialog.Close render={(props) => <Button {...props} variant="primary">Fechar</Button>} />
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
