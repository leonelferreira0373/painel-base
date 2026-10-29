// Definições da conta → Aparência → Cores e letras: cada utilizador escolhe as cores de cada tema e as letras do painel. Edita-se um rascunho com pré-visualização ao lado; só «Guardar» o aplica ao painel (e só a esta conta).
"use client";

import { Button, Input, Popover, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { CORES, LETRAS, TIPOS_DE_LETRA, type Aparencia, type CorId, type LetraId, type Modo } from "@/dados/aparencia";
import { contraste, hexValido, paleta, pilhaDe, variaveisDe } from "@/lib/aparencia";
import { useConta } from "@/lib/conta";
import { Dica } from "../Dica";
import { ICONES } from "../Icones";
import { PopupCartao } from "../Flutuantes";
import { Separadores } from "../ui";
import { Cartao, Linha } from "./Pecas";
import { SeletorPersonalizavel } from "../SeletorPersonalizavel";
import { LETRA } from "@/dados/personalizados";
import { EscolhaDeCor } from "../SeletorDeCor";
import type { FonteCarregada } from "@/dados/fontes";
import { guardarFicheiro, registarFonte, retirarFonte } from "@/lib/fontes";
import { AdicionarLetra, ListaDeLetras } from "./Letras";

function CampoCor({ valor, origem, aoMudar }: { valor: string; origem: string; aoMudar: (hex: string) => void }) {
  const [escrito, setEscrito] = useState(valor);
  // o campo do código acompanha a cor quando se arrasta no seletor
  useEffect(() => setEscrito(valor), [valor]);
  const mudado = valor.toLowerCase() !== origem.toLowerCase();
  return (
    <Popover.Root onOpenChange={(v) => v && setEscrito(valor)}>
      <Dica conteudo="Escolher outra cor">
        <Popover.Trigger
          render={
            <button type="button" aria-label={`Cor atual ${valor}. Mudar`} className="flex h-9 items-center gap-2.5 rounded-lg bg-kumo-base pl-1.5 pr-3 text-sm tabular-nums text-kumo-default ring ring-kumo-line transition-colors hover:ring-kumo-interact">
              <span aria-hidden className="size-6 rounded-md ring-1 ring-black/10 dark:ring-white/20" style={{ background: valor }} />
              {valor.toUpperCase()}
            </button>
          }
        />
      </Dica>
      <PopupCartao alinhar="end" className="w-[232px] p-3">
        <div className="flex flex-col gap-3">
          <EscolhaDeCor valor={valor} aoMudar={aoMudar} />
          <Input
            label="Código da cor"
            value={escrito}
            onChange={(e) => {
              setEscrito(e.target.value);
              const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
              if (hexValido(v)) aoMudar(v.toLowerCase());
            }}
            error={escrito !== "" && !hexValido(escrito.startsWith("#") ? escrito : `#${escrito}`) ? "Use seis dígitos, de 0 a 9 e de a a f." : undefined}
          />
          <Button variant="ghost" size="sm" disabled={!mudado} onClick={() => aoMudar(origem)}>
            Voltar à cor de origem ({origem.toUpperCase()})
          </Button>
        </div>
      </PopupCartao>
    </Popover.Root>
  );
}

/** Um painel pequeno, desenhado com as variáveis do rascunho (só dentro desta caixa), para ver as escolhas antes de guardar. */
function Previsao({ modo, rascunho }: { modo: Modo; rascunho: Aparencia }) {
  const p = paleta(modo, rascunho);
  const estilo = { ...variaveisDe(p), colorScheme: modo === "escuro" ? "dark" : "light", "--font-sans": pilhaDe(rascunho.letras?.corpo), "--fonte-titulos": pilhaDe(rascunho.letras?.titulos), "--fonte-numeros": pilhaDe(rascunho.letras?.numeros) } as React.CSSProperties;
  return (
    <div style={estilo} className="overflow-hidden rounded-xl bg-kumo-canvas font-sans text-kumo-default ring ring-kumo-line" aria-label={`Pré-visualização do tema ${modo}`} role="img">
      <div className="flex h-10 items-center justify-between border-b border-kumo-hairline px-3">
        <span style={{ fontFamily: "var(--fonte-titulos)" }} className="text-[13px] font-semibold">
          Visão geral
        </span>
        <span className="size-5 rounded-full bg-kumo-brand" />
      </div>
      <div className="flex flex-col gap-3 p-3">
        <div className="rounded-lg bg-kumo-base p-3 ring ring-kumo-line">
          <div className="text-[11px] font-medium text-kumo-subtle">Pedidos hoje</div>
          <div className="flex items-baseline gap-2">
            <span style={{ fontFamily: "var(--fonte-numeros)" }} className="text-2xl font-semibold tabular-nums">
              1 284
            </span>
            <span className="text-xs font-medium text-kumo-success">↗ 12,4 %</span>
          </div>
          <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="mt-1 block h-8 w-full" aria-hidden>
            <path d="M0,20 L12,16 L25,18 L38,9 L50,12 L63,6 L76,10 L88,3 L100,5 L100,24 L0,24 Z" fill="var(--color-kumo-brand)" opacity="0.16" />
            <path d="M0,20 L12,16 L25,18 L38,9 L50,12 L63,6 L76,10 L88,3 L100,5" fill="none" stroke="var(--color-kumo-brand)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { t: "Concluído", c: "var(--color-kumo-success)" },
            { t: "Pendente", c: "var(--color-kumo-warning)" },
            { t: "Erro", c: "var(--color-kumo-danger)" },
          ].map((e) => (
            <span key={e.t} className="inline-flex items-center gap-1.5 rounded-full bg-kumo-base px-2 py-0.5 text-xs font-medium shadow-xs ring-1 ring-black/10 dark:ring-white/20">
              <span className="size-1.5 rounded-full" style={{ background: e.c }} />
              {e.t}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="inline-flex h-8 items-center rounded-lg bg-kumo-brand px-3 text-[13px] font-medium text-white">Guardar</span>
          <span className="inline-flex h-8 items-center rounded-lg bg-kumo-base px-3 text-[13px] font-medium ring ring-kumo-line">Cancelar</span>
        </div>
        <div className="text-xs leading-relaxed text-kumo-subtle">Um texto de apoio, em tom secundário, por baixo do que importa.</div>
        <div className="text-xs">
          <span className="underline underline-offset-2">Uma ligação</span>, sublinhada, na cor do texto.
        </div>
      </div>
    </div>
  );
}

export function PersonalizarAparencia() {
  const { conta, mudar } = useConta();
  const guardado = conta.aparencia;
  const fontes = conta.fontes ?? [];
  const [adicionarLetra, setAdicionarLetra] = useState(false);
  const [rascunho, setRascunho] = useState<Aparencia>(guardado ?? {});
  const [modo, setModo] = useState<Modo>("claro");
  const sujo = JSON.stringify(rascunho) !== JSON.stringify(guardado ?? {});
  const atual = useMemo(() => paleta(modo, rascunho), [modo, rascunho]);

  const definirCor = (id: CorId, hex: string) => {
    const origem = CORES.find((c) => c.id === id)![modo];
    setRascunho((r) => {
      const resto = { ...(r[modo] ?? {}) };
      if (hex.toLowerCase() === origem.toLowerCase()) delete resto[id];
      else resto[id] = hex.toLowerCase();
      return { ...r, [modo]: resto };
    });
  };
  const definirLetra = (id: LetraId, tipo: string) =>
    setRascunho((r) => {
      const letras = { ...(r.letras ?? {}) };
      if (tipo === "inter") delete letras[id];
      else letras[id] = tipo;
      return { ...r, letras };
    });
  const semLetra = (a: Aparencia | undefined, nome: string): Aparencia | undefined => {
    if (!a?.letras) return a;
    const letras = Object.fromEntries(Object.entries(a.letras).filter(([, v]) => v !== `pers:${nome}`));
    return { ...a, letras };
  };
  /** Acrescenta uma letra: guarda o ficheiro no navegador, regista-a e põe a descrição na conta. */
  const adicionarLetraNova = async (f: FonteCarregada, ficheiro?: File) => {
    if (ficheiro) await guardarFicheiro(f.id, ficheiro);
    await registarFonte(f);
    mudar((c) => ({ fontes: [...(c.fontes ?? []), f] }), `Letra «${f.nome}» adicionada`);
  };
  /** Remove uma letra: tira-a do painel, apaga o ficheiro e deixa de a usar nas escolhas. */
  const removerLetra = async (f: FonteCarregada) => {
    await retirarFonte(f);
    setRascunho((r) => semLetra(r, f.nome) ?? {});
    mudar((c) => ({ fontes: (c.fontes ?? []).filter((x) => x.id !== f.id), aparencia: semLetra(c.aparencia, f.nome) }), `Letra «${f.nome}» removida`);
  };
  const aviso = (id: CorId) => {
    if (id === "texto" || id === "textoSecundario") {
      const r = contraste(atual[id], atual.fundo);
      const minimo = id === "texto" ? 4.5 : 3;
      return r < minimo ? `Pouco contraste com o fundo (${r.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}:1). Pode ser difícil de ler.` : null;
    }
    return null;
  };

  return (
    <>
      <Cartao titulo="Cores" dica="Cada tema tem a sua paleta. O que escolher aqui só vale para a sua conta.">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-1">
          <Separadores itens={[{ id: "claro", rotulo: "Tema claro" }, { id: "escuro", rotulo: "Tema escuro" }]} valor={modo} aoMudar={(id) => setModo(id as Modo)} />
          <Button variant="ghost" size="sm" disabled={Object.keys(rascunho[modo] ?? {}).length === 0} onClick={() => setRascunho((r) => ({ ...r, [modo]: {} }))}>
            Repor este tema
          </Button>
        </div>
        <div className="grid gap-x-8 gap-y-4 px-4 pb-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col gap-4">
            {(["Base", "Destaque", "Estados"] as const).map((g) => (
              <section key={g} aria-label={g}>
                <h4 className="pb-1 text-xs font-semibold uppercase tracking-wide text-kumo-subtle">{g}</h4>
                <div className="divide-y divide-kumo-hairline">
                  {CORES.filter((c) => c.grupo === g).map((c) => (
                    <div key={c.id} className="flex flex-col gap-1 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-kumo-default">{c.rotulo}</div>
                          <div className="text-xs text-kumo-subtle">{c.descricao}</div>
                        </div>
                        <CampoCor valor={atual[c.id]} origem={c[modo]} aoMudar={(hex) => definirCor(c.id, hex)} />
                      </div>
                      {aviso(c.id) && <div className="text-xs text-kumo-danger">{aviso(c.id)}</div>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-kumo-subtle">Pré-visualização · tema {modo}</div>
            <Previsao modo={modo} rascunho={rascunho} />
          </div>
        </div>
      </Cartao>

      <Cartao
        titulo="Letra"
        dica="Escolha uma das letras do painel, uma que já tenha no aparelho (pelo nome) ou carregue a sua: um ficheiro TTF, OTF, WOFF ou WOFF2, ou uma ligação. Os ficheiros ficam só neste navegador."
        acoes={
          <Button variant="secondary" size="sm" icon={ICONES.mais} onClick={() => setAdicionarLetra(true)}>
            Adicionar letra
          </Button>
        }
      >
        {LETRAS.map((l) => (
          <Linha key={l.id} titulo={l.rotulo} dica={l.descricao}>
            <div className="flex items-center gap-3">
              <span className="hidden text-base text-kumo-default sm:inline" style={{ fontFamily: pilhaDe(rascunho.letras?.[l.id]) }}>
                Aa 0123
              </span>
              <SeletorPersonalizavel rotulo={l.rotulo} valor={rascunho.letras?.[l.id] ?? "inter"} opcoes={{ ...Object.fromEntries(TIPOS_DE_LETRA.map((t) => [t.id, t.rotulo])), ...Object.fromEntries(fontes.map((f) => [`pers:${f.nome}`, `${f.nome} (carregada)`])) }} personalizado={LETRA.personalizado} aoMudar={(v) => definirLetra(l.id, v)} />
            </div>
          </Linha>
        ))}
        <ListaDeLetras fontes={fontes} aoRemover={removerLetra} />
      </Cartao>
      <AdicionarLetra aberto={adicionarLetra} aoMudar={setAdicionarLetra} aoAdicionar={adicionarLetraNova} />

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-kumo-base px-4 py-3 shadow-(--elevacao-popup) ring ring-kumo-line">
        <span className="inline-flex items-center gap-2 text-sm text-kumo-subtle">
          <span aria-hidden className={`size-2 rounded-full ${sujo ? "bg-kumo-warning" : "bg-kumo-success"}`} />
          {sujo ? "Alterações por guardar" : "Tudo guardado"}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" disabled={!guardado} onClick={() => { mudar({ aparencia: undefined }, "Aparência reposta"); setRascunho({}); }}>
            Repor o original
          </Button>
          <Button variant="secondary" disabled={!sujo} onClick={() => setRascunho(guardado ?? {})}>
            Descartar
          </Button>
          <Button variant="primary" icon={ICONES.guardar} disabled={!sujo} onClick={() => mudar({ aparencia: Object.keys(rascunho.claro ?? {}).length + Object.keys(rascunho.escuro ?? {}).length + Object.keys(rascunho.letras ?? {}).length === 0 ? undefined : rascunho }, "Aparência alterada")}>
            Guardar alterações
          </Button>
        </div>
      </div>
    </>
  );
}
