// O anel de contexto da IA: mede, a sério, quanto da janela do modelo a última chamada ocupou (os tokens que a Cloudflare contou), como o contexto do Claude Code. Cinzento quando a IA não está a ser usada, colorido (verde, âmbar, vermelho) enquanto está. Ao carregar abre a janela com o modelo, a janela de contexto, os tokens, o dinheiro e a ligação ao histórico.
"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { caminho } from "@/dados/estrutura";
import { estruturaDeRegisto } from "@/lib/copiar-dados";
import { formatarUsd, NEURONS_GRATIS_POR_DIA } from "@/lib/ia-modelos";
import { aPagar, repartirContexto, ROTULO_DA_ORIGEM, tomDoAnel, useUsoDaIa, type OrigemDaIa, type ParteDoContexto } from "@/lib/ia-uso";
import { BotaoCopiar } from "../Copiar";
import { Dica } from "../Dica";
import { coresDoAnel, useCorDoAnel } from "@/lib/ia-aparencia";
import { ICONES } from "../Icones";
import { Recolhivel } from "../Recolhivel";

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
export function Anel({ ocupacao, ativo, aTrabalhar = false, tamanho = 26, espessura = 3, corPropria }: { ocupacao: number; ativo: boolean; /** A IA está a responder agora: o anel pulsa. */ aTrabalhar?: boolean; tamanho?: number; espessura?: number; /** A cor que a pessoa escolheu nas definições: manda no arco e no fio (senão, as cores do aviso). */ corPropria?: string | null }) {
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  const propria = corPropria ? coresDoAnel(corPropria) : null;
  const cor = propria ? propria.arco : ativo ? COR_DO_TOM[tomDoAnel(ocupacao)] : "var(--color-kumo-subtle)";
  // um fio mínimo à vista mesmo com 0,5 %, para o anel nunca parecer vazio quando já houve uma chamada
  const arco = ocupacao > 0 ? Math.max(ocupacao, 0.02) : 0;
  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden className={`shrink-0 -rotate-90 ${aTrabalhar ? "animate-pulse" : ""}`}>
      <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={propria ? propria.fio : "var(--color-kumo-hairline)"} strokeWidth={espessura} />
      <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - arco)} style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1), stroke 300ms" }} opacity={ativo ? 1 : 0.55} />
    </svg>
  );
}

/** O botão do anel: tem de estar sempre à mão ao lado de onde a IA se usa. `ativo` só é verdadeiro enquanto a IA trabalha (ou acabou de trabalhar) para esta origem. */
export function AnelDeContexto({ origem, ativo, tamanho = 26, className = "" }: { origem: OrigemDaIa; ativo: boolean; tamanho?: number; className?: string }) {
  const { contexto } = useUsoDaIa();
  const corDoAnel = useCorDoAnel();
  const [aberto, setAberto] = useState(false);
  const c = contexto(origem);
  const dica = c ? `Contexto: ${percentagem(c.ocupacao)} · ${inteiro(c.tokens)} de ${inteiro(c.janela)} tokens. Carregue para ver o modelo e o gasto.` : "Contexto da IA: ainda sem chamadas. Carregue para ver o modelo e o gasto.";
  return (
    <>
      <Dica conteudo={dica}>
        <button type="button" aria-label="Contexto e utilização da IA" onClick={() => setAberto(true)} onMouseDown={(e) => e.preventDefault()} style={corDoAnel ? { background: coresDoAnel(corDoAnel).fundo } : undefined} className={`grid size-9 shrink-0 place-items-center rounded-full text-kumo-subtle transition-colors hover:bg-kumo-tint focus-visible:outline-2 focus-visible:outline-kumo-brand ${className}`}>
          <Anel ocupacao={c?.ocupacao ?? 0} ativo={!!c} aTrabalhar={ativo} tamanho={tamanho} corPropria={corDoAnel} />
        </button>
      </Dica>
      <ContextoDaIa aberto={aberto} aoMudar={setAberto} origemInicial={origem} />
    </>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className="text-kumo-subtle">{rotulo}</span>
      <span className="text-right font-medium tabular-nums text-kumo-default">{children}</span>
    </div>
  );
}

const sec = (ms: number) => `${(ms / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} s`;
const neurons = (n: number) => `${n.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} neurons`;

/** A janela do contexto, no espírito do /context do Claude Code: só o essencial à vista (a barra e a percentagem) e o resto em secções que se abrem com um toque. */
export function ContextoDaIa({ aberto, aoMudar, origemInicial }: { aberto: boolean; aoMudar: (v: boolean) => void; origemInicial: OrigemDaIa }) {
  const router = useRouter();
  const { contexto, sessao, hoje, recarregarHoje } = useUsoDaIa();
  const [origem, setOrigem] = useState<OrigemDaIa>(origemInicial);
  const c = contexto(origem);
  const partes = c ? repartirContexto(c.registo.uso, c.registo.partes) : [];
  const m = c?.modelo;
  const pagar = hoje ? aPagar(hoje) : 0;
  const quota = hoje?.limiteGratis ?? NEURONS_GRATIS_POR_DIA;
  const u = c?.registo.uso;
  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(v) => {
        if (v) recarregarHoje();
        aoMudar(v);
      }}
    >
      <Dialog size="base" className="flex max-h-[85dvh] flex-col p-0">
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-4">
          <Dialog.Title className="text-lg font-semibold">Utilização da IA</Dialog.Title>
          <span className="flex items-center gap-1">
            <Dica conteudo="Atualizar">
              <Button variant="ghost" shape="square" icon={ICONES.atualizar} aria-label="Atualizar" onClick={recarregarHoje} />
            </Dica>
            <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </span>
        </div>
        <div className="sem-barra flex shrink-0 gap-1 overflow-x-auto px-4 pb-3" role="tablist" aria-label="Origem">
          {(["pesquisa", "assistente"] as const).map((o) => (
            <button key={o} type="button" role="tab" aria-selected={origem === o} onClick={() => setOrigem(o)} className="shrink-0 rounded-full px-3 py-1 text-[13px] font-medium text-kumo-subtle aria-selected:bg-kumo-tint aria-selected:text-kumo-default">
              {ROTULO_DA_ORIGEM[o]}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="mb-1.5 text-xs font-medium text-kumo-subtle">Contexto</div>
          <div className="overflow-hidden rounded-xl bg-kumo-base ring ring-kumo-line">
            <Recolhivel
              titulo="Janela de contexto"
              resumo={c ? `${percentagem(c.ocupacao)} utilizado` : "Sem chamadas"}
              sempre={
                c ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex h-2 overflow-hidden rounded-full bg-kumo-hairline" role="img" aria-label="Repartição do contexto por partes">
                      {partes
                        .filter((p) => p.id !== "livre")
                        .map((p) => (
                          <span key={p.id} className="h-full" style={{ width: `${Math.max((p.tokens / c.janela) * 100, p.tokens > 0 ? 0.6 : 0)}%`, background: COR_DA_PARTE[p.id] }} />
                        ))}
                    </div>
                    <div className="text-xs tabular-nums text-kumo-subtle">
                      {inteiro(c.tokens)} de {inteiro(c.janela)} tokens
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-kumo-subtle">Ainda sem chamadas neste navegador.</div>
                )
              }
            >
              <ul className="flex flex-col gap-1 text-sm">
                {partes.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: COR_DA_PARTE[p.id] }} />
                    <span className="min-w-0 flex-1 truncate text-kumo-default">{p.rotulo}</span>
                    <span className="tabular-nums text-kumo-subtle">{inteiro(p.tokens)}</span>
                    <span className="w-12 text-right tabular-nums text-kumo-subtle">{percentagem(c ? p.tokens / c.janela : 0)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-kumo-subtle">A entrada e a saída são as que a Cloudflare contou; a repartição da entrada por partes é uma estimativa pelo tamanho do texto.</p>
            </Recolhivel>
          </div>

          <div className="mb-1.5 mt-4 text-xs font-medium text-kumo-subtle">Utilização</div>
          <div className="overflow-hidden rounded-xl bg-kumo-base ring ring-kumo-line">
            <Recolhivel titulo="Modelo" resumo={m ? m.nome : "—"}>
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
              <Linha rotulo="Preço por milhão de tokens">{m ? `${formatarUsd(m.precoEntrada)} entrada · ${formatarUsd(m.precoSaida)} saída` : "—"}</Linha>
              <Linha rotulo="Chamada de ferramentas">{m ? (m.ferramentas ? "Sim" : "Não") : "—"}</Linha>
            </Recolhivel>
            <Recolhivel titulo="Última chamada" resumo={u ? `${inteiro(u.tokensEntrada + u.tokensSaida)} tokens` : "—"}>
              <Linha rotulo="Entrada">{u ? `${inteiro(u.tokensEntrada)} tokens` : "—"}</Linha>
              <Linha rotulo="Saída">{u ? `${inteiro(u.tokensSaida)} tokens` : "—"}</Linha>
              <Linha rotulo="Neurons">{u ? neurons(u.neurons) : "—"}</Linha>
              <Linha rotulo="Custo">{u ? formatarUsd(u.custoUsd) : "—"}</Linha>
              <Linha rotulo="Duração">{u ? sec(u.ms) : "—"}</Linha>
            </Recolhivel>
            <Recolhivel titulo="Esta sessão" resumo={sessao.chamadas > 0 ? `${inteiro(sessao.chamadas)} ${sessao.chamadas === 1 ? "chamada" : "chamadas"}` : "—"}>
              <Linha rotulo="Entrada">{sessao.chamadas > 0 ? `${inteiro(sessao.tokensEntrada)} tokens` : "—"}</Linha>
              <Linha rotulo="Saída">{sessao.chamadas > 0 ? `${inteiro(sessao.tokensSaida)} tokens` : "—"}</Linha>
              <Linha rotulo="Neurons">{sessao.chamadas > 0 ? neurons(sessao.neurons) : "—"}</Linha>
              <Linha rotulo="Custo">{sessao.chamadas > 0 ? formatarUsd(sessao.custoUsd) : "—"}</Linha>
            </Recolhivel>
            <Recolhivel
              titulo="Hoje"
              resumo={hoje ? `${inteiro(hoje.neurons)} de ${inteiro(quota)} neurons` : `${inteiro(quota)} neurons por dia`}
              sempre={
                <div className="h-1.5 overflow-hidden rounded-full bg-kumo-hairline" role="progressbar" aria-label="Quota gratuita de hoje" aria-valuemin={0} aria-valuemax={quota} aria-valuenow={hoje ? Math.min(hoje.neurons, quota) : 0}>
                  <div className="h-full rounded-full bg-kumo-brand transition-[width] duration-700" style={{ width: `${hoje ? Math.min(100, (hoje.neurons / quota) * 100) : 0}%` }} />
                </div>
              }
            >
              <Linha rotulo="Custo a preço de tabela">{hoje ? formatarUsd(hoje.custoUsd) : "—"}</Linha>
              <Linha rotulo="A pagar">{hoje ? `${formatarUsd(pagar)}${pagar === 0 ? " (quota gratuita)" : ""}` : "—"}</Linha>
              <Linha rotulo="Restam hoje">{hoje ? neurons(hoje.restantes) : "—"}</Linha>
              <p className="mt-2 text-xs text-kumo-subtle">Passado o limite do dia o painel deixa de usar a IA até à meia-noite (UTC): nunca gasta dinheiro. O gasto de hoje soma toda a gente que usa este painel.</p>
            </Recolhivel>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-kumo-hairline px-4 py-3">
          <Button
            variant="secondary"
            onClick={() => {
              aoMudar(false);
              router.push(caminho("ia", "uso"));
            }}
          >
            Ver o histórico de utilização
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
