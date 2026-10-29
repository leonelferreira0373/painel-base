// «Pesquisa em curso»: as análises a fundo da fila, cada uma com o seu tempo estimado, o passo em que vai, o que a IA pensa e faz em direto (procurar, ler, escrever) e, quando acaba, o documento. Aqui a pessoa corrige a IA enquanto ela trabalha, pausa, cancela, muda a profundidade, o foco e a internet, exporta o resultado em qualquer formato e repete. Abre-se pelo «…» do chat, pelo botão do cabeçalho ou pelo cartão de aviso do chat.
"use client";

import { Button, Dialog, Input, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useRef, useState } from "react";
import { registar } from "@/lib/atividade";
import { copiarEstruturado } from "@/lib/copiar-dados";
import { abrirDados } from "@/lib/dados-da-pagina";
import { useResultadoTemporario } from "../Copiar";
import { reciclar } from "@/lib/reciclagem";
import { cancelarPesquisa, pausarPesquisa, retomarPesquisa } from "@/lib/pesquisa-motor";
import {
  abrirAnalise,
  apagarTrabalho,
  corrigirTrabalho,
  ENFASES,
  EVENTO_ABRIR_PESQUISAS,
  FINAIS,
  FOCOS,
  fonteDaAnalise,
  mudarTrabalho,
  PROFUNDIDADES,
  repetirTrabalho,
  ROTULO_DO_ESTADO,
  textoDoTempo,
  useTrabalhos,
  type Enfase,
  type EstadoDaPesquisa,
  type Foco,
  type PassoDaPesquisa,
  type Profundidade,
  type TipoDePasso,
  type TrabalhoDePesquisa,
} from "@/lib/pesquisa-profunda";
import { Confirmar, Interruptor } from "../conta/Pecas";
import { Estado } from "../Estado";
import { Frase } from "../Frase";
import { Ic, ICONES, type Icone } from "../Icones";
import { PensarEmLinha } from "../ia/PensarEmLinha";
import { Separadores } from "../ui";
import { DocumentoNaTela } from "./ObjetosRicos";

const VARIANTE: Record<EstadoDaPesquisa, "success" | "error" | "warning" | "neutral"> = { fila: "warning", "a pesquisar": "success", "em pausa": "warning", concluida: "success", falhou: "error", cancelada: "neutral" };
const ICONE_DO_PASSO: Record<TipoDePasso, Icone> = { pensamento: "ia", pesquisa: "lupa", resultados: "lista", leitura: "globo", nota: "lembrete", correcao: "enviar", escrita: "artigo", erro: "aviso" };
const ROTULO_DO_PASSO: Record<TipoDePasso, string> = { pensamento: "A IA pensa", pesquisa: "Pesquisa", resultados: "Resultados", leitura: "Leitura", nota: "Nota", correcao: "A sua correção", escrita: "Escrita", erro: "Problema" };

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const haTempo = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora mesmo";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86_400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86_400)} d`;
};
const itens = <T extends string>(o: Record<T, { rotulo: string }>) => Object.fromEntries((Object.keys(o) as T[]).map((k) => [k, o[k].rotulo]));

export function PesquisaEmCurso() {
  const [aberta, setAberta] = useState(false);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const { trabalhos, etas } = useTrabalhos();
  useEffect(() => {
    const abrir = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id) setEscolhida(id);
      setAberta(true);
    };
    window.addEventListener(EVENTO_ABRIR_PESQUISAS, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_PESQUISAS, abrir);
  }, []);

  // a ordem: o que está por acabar primeiro (o mais antigo em cima), depois o que já acabou (o mais recente em cima)
  const ordenados = useMemo(() => {
    const porAcabar = trabalhos.filter((t) => !FINAIS.includes(t.estado)).sort((a, b) => a.criado.localeCompare(b.criado));
    const acabados = trabalhos.filter((t) => FINAIS.includes(t.estado)).sort((a, b) => (b.concluido ?? b.criado).localeCompare(a.concluido ?? a.criado));
    return [...porAcabar, ...acabados];
  }, [trabalhos]);
  const atual = ordenados.find((t) => t.id === escolhida) ?? ordenados[0] ?? null;

  // ao ver um resultado, passa a lido
  useEffect(() => {
    if (aberta && atual?.estado === "concluida" && !atual.lido) mudarTrabalho(atual.id, (t) => ({ ...t, lido: true }));
  }, [aberta, atual?.id, atual?.estado, atual?.lido]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog.Root open={aberta} onOpenChange={setAberta}>
      <Dialog size="xl" className="max-h-[92dvh] overflow-hidden p-0">
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-kumo-hairline px-4 py-3 sm:px-5">
            <Dialog.Title className="text-lg font-semibold">Pesquisa em curso</Dialog.Title>
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={ICONES.mais} onClick={() => abrirAnalise({ titulo: "", tipo: "livre" })}>
                <span className="hidden sm:inline">Nova análise</span>
              </Button>
              <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
            </div>
          </div>
          {ordenados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-sm">
              <Ic nome="ia" tamanho={32} />
              <div className="font-medium">Não há análises</div>
              <div className="max-w-sm text-kumo-subtle">
                <Frase>Escolha «Investigar com IA» no menu de três pontos de um cartão, de uma lista ou de um registo, ou comece uma pergunta livre.</Frase>
              </div>
              <Button variant="primary" icon={ICONES.ia} onClick={() => abrirAnalise({ titulo: "", tipo: "livre" })}>
                Nova análise
              </Button>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[17rem_minmax(0,1fr)]">
              <Lista trabalhos={ordenados} etas={etas} atual={atual?.id ?? null} aoEscolher={setEscolhida} />
              <div className="min-h-0 overflow-y-auto">{atual && <Detalhe t={atual} eta={etas.get(atual.id) ?? 0} aposApagar={() => setEscolhida(null)} aoFechar={() => setAberta(false)} />}</div>
            </div>
          )}
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

function Lista({ trabalhos, etas, atual, aoEscolher }: { trabalhos: TrabalhoDePesquisa[]; etas: Map<string, number>; atual: string | null; aoEscolher: (id: string) => void }) {
  return (
    <div className="sem-barra flex max-h-44 shrink-0 gap-2 overflow-x-auto border-b border-kumo-hairline p-2 lg:max-h-none lg:flex-col lg:gap-1 lg:overflow-y-auto lg:overflow-x-visible lg:border-b-0 lg:border-r">
      {trabalhos.map((t) => {
        const acabado = FINAIS.includes(t.estado);
        const progresso = acabado ? 1 : Math.min(1, t.passoAtual / Math.max(1, t.passosPrevistos));
        return (
          <button key={t.id} type="button" onClick={() => aoEscolher(t.id)} aria-current={t.id === atual} className={`flex w-56 shrink-0 cursor-pointer flex-col gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition-colors lg:w-auto ${t.id === atual ? "bg-kumo-tint ring ring-kumo-line" : "hover:bg-kumo-tint"}`}>
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0 truncate font-medium">{t.titulo}</span>
              {t.estado === "concluida" && !t.lido && <span aria-label="Por ler" className="mt-1.5 size-2 shrink-0 rounded-full bg-kumo-brand" />}
            </span>
            <span className="flex items-center justify-between gap-2 text-xs text-kumo-subtle">
              <Estado valor={ROTULO_DO_ESTADO[t.estado]} variante={VARIANTE[t.estado]} />
              <span className="tabular-nums">{acabado ? haTempo(t.concluido ?? t.criado) : `~${textoDoTempo(etas.get(t.id) ?? 0)}`}</span>
            </span>
            {!acabado && (
              <span className="h-1 overflow-hidden rounded-full bg-kumo-line" aria-hidden>
                <span className="block h-full rounded-full bg-kumo-brand transition-[width] duration-500" style={{ width: `${Math.max(4, progresso * 100)}%` }} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Detalhe({ t, eta, aposApagar, aoFechar }: { t: TrabalhoDePesquisa; eta: number; aposApagar: () => void; aoFechar: () => void }) {
  const [aba, setAba] = useState<"resultado" | "passos">("passos");
  const [correcao, setCorrecao] = useState("");
  const [apagar, setApagar] = useState(false);
  const [copia, definirCopia] = useResultadoTemporario();
  const fim = useRef<HTMLDivElement>(null);
  const acabado = FINAIS.includes(t.estado);
  const aTrabalhar = t.estado === "a pesquisar";

  // um trabalho que acabou abre no resultado; um que corre, nos passos
  useEffect(() => setAba(t.estado === "concluida" ? "resultado" : "passos"), [t.id, t.estado === "concluida"]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (aba === "passos" && !acabado) fim.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [t.passos.length, aba, acabado]);

  const mudarConfig = (parcial: Partial<TrabalhoDePesquisa["config"]>) =>
    mudarTrabalho(t.id, (x) => {
      const config = { ...x.config, ...parcial };
      return { ...x, config, passosPrevistos: PROFUNDIDADES[config.profundidade].passos };
    });
  const enviar = () => {
    if (!correcao.trim()) return;
    corrigirTrabalho(t.id, correcao);
    registar("ia", `Corrigiu a IA na análise «${t.titulo}»: ${correcao.trim().slice(0, 120)}`);
    setCorrecao("");
  };
  const ultimoPensamento = [...t.passos].reverse().find((p) => p.tipo === "pensamento");
  const aEscrever = aTrabalhar && t.passos[t.passos.length - 1]?.tipo === "escrita";
  const pendentes = t.correcoes.filter((c) => !c.aplicada);

  return (
    <div className="flex flex-col gap-4 p-4 pt-0 sm:p-5 sm:pt-0">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b border-kumo-hairline bg-kumo-base px-4 pb-3 pt-4 sm:-mx-5 sm:px-5 sm:pt-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-base font-semibold">{t.titulo}</h3>
          <Estado valor={ROTULO_DO_ESTADO[t.estado]} variante={VARIANTE[t.estado]} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-kumo-subtle">
          {!acabado && (
            <span>
              {t.estado === "fila" ? "Espera pela vez" : t.estado === "em pausa" ? "Em pausa" : `Passo ${Math.min(t.passoAtual + 1, t.passosPrevistos)} de ${t.passosPrevistos}`} · falta cerca de {textoDoTempo(eta)}
            </span>
          )}
          {acabado && t.concluido && <span>{haTempo(t.concluido)}</span>}
          <span className="tabular-nums">
            {t.tokens.toLocaleString("pt-PT")} tokens · {t.neurons.toLocaleString("pt-PT", { maximumFractionDigits: 0 })} neurons
          </span>
          {t.pedido && <span className="min-w-0 truncate">Pedido: {t.pedido}</span>}
        </div>
        {aTrabalhar && ultimoPensamento && (
          <div className="min-w-0">
            <PensarEmLinha forma={aEscrever ? "lapis" : "cerebro"} texto={aEscrever ? "A escrever o documento…" : ultimoPensamento.texto} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {aTrabalhar && (
          <Button variant="secondary" onClick={() => pausarPesquisa(t.id)}>
            Pausar
          </Button>
        )}
        {t.estado === "em pausa" && (
          <Button variant="secondary" onClick={() => retomarPesquisa(t.id)}>
            Retomar
          </Button>
        )}
        {!acabado && (
          <Button variant="secondary" onClick={() => cancelarPesquisa(t.id)}>
            Cancelar
          </Button>
        )}
        {t.estado === "concluida" && (
          <>
            <Button variant="primary" icon={ICONES.transferir} onClick={() => (aoFechar(), abrirDados("exportar", fonteDaAnalise(t) ?? undefined))}>
              Exportar
            </Button>
            <Button variant="secondary" icon={ICONES.copiar} onClick={async () => t.resultado && definirCopia((await copiarEstruturado({ tipo: "analise", titulo: t.resultado.titulo, origem: t.alvo.pagina, geradoEm: new Date().toISOString(), dados: t.resultado })) ? "ok" : "erro")}>
              {copia === "ok" ? "Copiado" : "Copiar"}
            </Button>
          </>
        )}
        {acabado && (
          <Button variant="secondary" onClick={() => repetirTrabalho(t.id)}>
            {t.estado === "falhou" ? "Tentar de novo" : "Repetir"}
          </Button>
        )}
        {acabado && (
          <Button variant="ghost" icon={ICONES.lixo} onClick={() => setApagar(true)}>
            Apagar
          </Button>
        )}
      </div>

      </div>

      {!acabado && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Profundidade" value={t.config.profundidade} onValueChange={(v) => mudarConfig({ profundidade: String(v) as Profundidade })} items={itens(PROFUNDIDADES)} />
          <Select label="Foco da resposta" value={t.config.foco} onValueChange={(v) => mudarConfig({ foco: String(v) as Foco })} items={itens(FOCOS)} />
          <Select label="Ênfase" value={t.config.enfase} onValueChange={(v) => mudarConfig({ enfase: String(v) as Enfase })} items={itens(ENFASES)} />
          <div className="flex items-end">
            <div className="flex h-9 w-full items-center justify-between gap-3 rounded-lg px-3 ring ring-kumo-line">
              <span className="text-sm font-medium">Internet</span>
              <Interruptor marcado={t.config.internet} aoMudar={(v) => mudarConfig({ internet: v })} rotulo="Pesquisar na internet" />
            </div>
          </div>
        </div>
      )}

      {t.estado === "falhou" && t.erro && (
        <div className="flex items-start gap-3 rounded-xl p-3 text-sm ring ring-kumo-danger/40" role="alert">
          <Ic nome="aviso" tamanho={18} className="mt-0.5 shrink-0" />
          <span>{t.erro}</span>
        </div>
      )}

      {acabado && t.resultado && <Separadores itens={[{ id: "resultado", rotulo: "Resultado" }, { id: "passos", rotulo: `Passos (${t.passos.length})` }]} valor={aba} aoMudar={(v) => setAba(v as "resultado" | "passos")} />}

      {aba === "resultado" && t.resultado ? (
        <>
          {t.avisos && t.avisos.length > 0 && <p className="text-xs text-kumo-subtle">{t.avisos.join(" ")}</p>}
          <DocumentoNaTela doc={t.resultado} />
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {t.passos.length === 0 ? (
            <p className="text-sm text-kumo-subtle">{t.estado === "fila" ? "Ainda não começou." : "A IA ainda não fez nada."}</p>
          ) : (
            <ol className="flex flex-col gap-2" aria-live="polite">
              {t.passos.map((p) => (
                <Passo key={p.id} p={p} />
              ))}
            </ol>
          )}
          <div ref={fim} />
        </div>
      )}

      {!acabado && (
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-kumo-hairline bg-kumo-base px-4 pb-1 pt-3 sm:-mx-5 sm:px-5">
          {pendentes.length > 0 && <p className="text-xs text-kumo-subtle">{pendentes.length === 1 ? "A correção entra no próximo passo." : `${pendentes.length} correções entram no próximo passo.`}</p>}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
          >
            <div className="min-w-0 flex-1">
              <Input aria-label="Corrigir ou orientar a IA" placeholder="Corrigir ou orientar a IA enquanto trabalha" value={correcao} onChange={(e) => setCorrecao(e.target.value)} autoComplete="off" className="w-full" />
            </div>
            <Button type="submit" variant="primary" icon={ICONES.enviar} disabled={!correcao.trim()} aria-label="Enviar a correção" />
          </form>
        </div>
      )}

      <Confirmar
        aberto={apagar}
        aoMudar={setApagar}
        titulo="Apagar a análise"
        perigo
        texto={`A análise «${t.titulo}» e os seus passos vão para a reciclagem e podem ser restaurados durante o prazo definido pelo Master Admin.`}
        rotuloAcao="Apagar"
        aoConfirmar={() => {
          void reciclar({ tipo: "Análise a fundo", dados: t, origem: { kind: "pesquisa" } });
          apagarTrabalho(t.id);
          aposApagar();
        }}
      />
    </div>
  );
}

function Passo({ p }: { p: PassoDaPesquisa }) {
  const [aberto, setAberto] = useState(false);
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ring ring-kumo-line ${p.tipo === "erro" ? "text-kumo-danger" : ""}`}>
        <Ic nome={ICONE_DO_PASSO[p.tipo]} tamanho={13} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs font-medium text-kumo-subtle">{ROTULO_DO_PASSO[p.tipo]}</span>
          <span className="text-xs tabular-nums text-kumo-subtle">{hora(p.quando)}</span>
        </div>
        <div className={`break-words leading-6 ${p.tipo === "pensamento" ? "italic" : ""}`}>{p.texto}</div>
        {p.detalhe && (
          <>
            <button type="button" className="text-xs text-kumo-subtle underline-offset-2 hover:text-kumo-default hover:underline" onClick={() => setAberto((a) => !a)}>
              {aberto ? "Esconder" : "Ver"}
            </button>
            {aberto && <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-kumo-tint p-2 text-xs">{p.detalhe}</pre>}
          </>
        )}
      </div>
    </li>
  );
}
