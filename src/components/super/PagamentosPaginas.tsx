// Os ecrãs de pagamentos que não são uma lista simples: a visão geral com as métricas, os comprovativos recebidos (com a imagem, para validar ou rejeitar) e as contas e IBANs (configuráveis, com o IBAN validado). Os pagamentos em si são um módulo de registos.
"use client";

import { Badge, Button, Input, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useRef, useState } from "react";
import { CONTAS_DE_ORIGEM, gerarComprovativos, gerarPagamentos, METODOS_DE_PAGAMENTO, type ContaBancaria, type Pagamento } from "@/dados/super-dados";
import { REGISTOS } from "@/dados/modulos";
import { useColecao } from "@/lib/api/colecao";
import { useApi } from "@/lib/api/cliente";
import { useArmazem } from "@/lib/armazem";
import { ePasta, formatarTamanho, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { desenharComprovativo } from "@/lib/comprovativos";
import { identificador } from "@/lib/conta";
import { useApp } from "@/lib/estado";
import { erroDoIban, formatarIban, limparIban } from "@/lib/iban";
import { calcularMetricas, type MetricasDePagamentos } from "@/lib/pagamentos";
import { Cartao, Confirmar, Interruptor, Linha } from "../conta/Pecas";
import { BotaoCopiar } from "../Copiar";
import { Estado } from "../Estado";
import { Grafico } from "../graficos/Graficos";
import { GrelhaOrdenavel } from "../GrelhaOrdenavel";
import { ICONES } from "../Icones";
import { LinhaOrdenada } from "../LinhaOrdenada";
import { CartaoEstatistica, Painel, Pagina, Separadores, Titulo } from "../ui";
import { descarregarBlob, PreVisualizar } from "../conteudo/GestorDeFicheiros";
import { useUrlsDeImagens, Vazio, ZonaDeUpload } from "../conteudo/ConteudoPecas";
import { AvisoDeApi, dataHora, dinheiro, Estatistica, inteiro, percentagem, useGuardado } from "./SuperPecas";

export const PASTA_DE_COMPROVATIVOS = "Comprovativos";

// ---------- visão geral ----------

/** Os comprovativos guardados na biblioteca; na primeira visita (a qualquer ecrã de pagamentos) junta alguns de demonstração. */
function useComprovativos() {
  const armazem = useArmazem<ItemDaBiblioteca>("ficheiros");
  const { itens, pronto, guardar } = armazem;
  const [semeado, setSemeado] = useGuardado("comprovativos.semeado", false);
  const aSemear = useRef(false);
  useEffect(() => {
    if (!pronto || semeado || aSemear.current) return;
    aSemear.current = true;
    (async () => {
      const contas = CONTAS_DE_ORIGEM;
      for (const [i, c] of gerarComprovativos().entries()) {
        const p = gerarPagamentos().find((x) => x.referencia === c.pagamento);
        const blob = await desenharComprovativo({ ficheiro: c.ficheiro, banco: contas[i % 2].banco, valor: dinheiro(p?.valor ?? 100000), referencia: c.pagamento, de: c.de, iban: formatarIban(contas[i % 2].iban), data: c.recebido.slice(0, 10) });
        if (blob) await guardar({ id: identificador(), nome: c.ficheiro, tipo: "image/png", tamanho: blob.size, criado: c.recebido, pasta: PASTA_DE_COMPROVATIVOS, blob, meta: { pagamento: c.pagamento, de: c.de, recebido: c.recebido, estado: c.estado } });
      }
      setSemeado(true);
    })();
  }, [pronto, semeado, guardar, setSemeado]);
  return armazem;
}

export function PagamentosVisao() {
  const { registos } = useApp();
  const api = useApi<MetricasDePagamentos>("/v1/pagamentos/metricas", () => calcularMetricas(gerarPagamentos()));
  const local = useMemo(() => calcularMetricas((registos.pagamentos ?? []) as unknown as Pagamento[]), [registos.pagamentos]);
  const m = api.modo === "ligado" ? api.dados : local;
  const { itens } = useComprovativos();
  const porValidar = itens.filter((i) => i.pasta === PASTA_DE_COMPROVATIVOS && i.meta?.estado === "Por validar").length;
  const dias = m?.porDia.slice(-14) ?? [];
  const serie = dias.map((d) => d.valor);
  const maximo = Math.max(1, ...(m?.porMetodo.map((x) => x.valor) ?? [1]));
  return (
    <Pagina>
      <Titulo titulo="Pagamentos" />
      <AvisoDeApi erro={api.erro} aoTentar={api.recarregar} />
      {m && (
        <>
          <GrelhaOrdenavel
            chave="pagamentos-visao"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            itens={[
              { id: "volume", conteudo: <CartaoEstatistica titulo="Volume confirmado" valor={dinheiro(m.volume)} variacao={null} valores={serie} dica="A soma dos pagamentos confirmados." /> },
              { id: "numero", conteudo: <Estatistica titulo="Pagamentos" valor={inteiro(m.numero)} dica="Todos os pagamentos registados, em qualquer estado." numero={m.numero} /> },
              { id: "ticket", conteudo: <Estatistica titulo="Ticket médio" valor={dinheiro(m.ticketMedio)} dica="O volume confirmado a dividir pelo número de pagamentos confirmados." numero={m.ticketMedio} /> },
              { id: "sucesso", conteudo: <Estatistica titulo="Taxa de sucesso" valor={percentagem(m.taxaDeSucesso)} dica="Confirmados sobre confirmados mais recusados." numero={m.taxaDeSucesso * 100} /> },
              { id: "pendentes", conteudo: <Estatistica titulo="Pagamentos pendentes" valor={inteiro(m.pendentes)} pior dica={`${dinheiro(m.valorPendente)} à espera de confirmação.`} numero={m.pendentes} /> },
              { id: "por-validar", conteudo: <Estatistica titulo="Comprovativos por validar" valor={inteiro(porValidar)} pior dica="Os que já chegaram e ninguém conferiu. Estão em Pagamentos, «Comprovativos»." numero={porValidar} /> },
              { id: "reembolsado", conteudo: <Estatistica titulo="Reembolsado" valor={dinheiro(m.reembolsado)} pior dica="O valor devolvido aos clientes no período." numero={m.reembolsado} /> },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <Painel titulo="Volume por dia" className="lg:col-span-2">
              {dias.length > 1 ? <Grafico spec={{ tipo: "linha", pontos: dias.map((d) => ({ chave: d.data, rotulo: d.data.slice(5), valor: d.valor, n: 1 })) }} altura={220} /> : <Vazio icone="grafico" titulo="Ainda sem pagamentos confirmados" />}
            </Painel>
            <Painel titulo="Por estado">
              <Grafico spec={{ tipo: "rosca", pontos: m.porEstado.map((e) => ({ chave: e.estado, rotulo: e.estado, valor: e.numero, n: e.numero })) }} altura={220} />
            </Painel>
            <Painel titulo="Por método">
              <div className="flex flex-col">
                {m.porMetodo.map((x) => (
                  <LinhaOrdenada key={x.metodo} nome={x.metodo} valor={dinheiro(x.valor)} proporcao={(x.valor / maximo) * 100} />
                ))}
              </div>
            </Painel>
          </div>
        </>
      )}
    </Pagina>
  );
}

// ---------- comprovativos ----------

const FILTROS = [
  { id: "todos", rotulo: "Todos" },
  { id: "Por validar", rotulo: "Por validar" },
  { id: "Validado", rotulo: "Validados" },
  { id: "Rejeitado", rotulo: "Rejeitados" },
] as const;

export function Comprovativos() {
  const { itens, pronto, guardar, remover } = useComprovativos();
  const { registos, transitar, avisar } = useApp();
  const comprovativos = useMemo(() => itens.filter((i) => i.pasta === PASTA_DE_COMPROVATIVOS && !ePasta(i)).sort((a, b) => (b.meta?.recebido ?? "").localeCompare(a.meta?.recebido ?? "")), [itens]);
  const urls = useUrlsDeImagens(comprovativos);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("todos");
  const [ver, setVer] = useState<ItemDaBiblioteca | null>(null);
  const [rejeitar, setRejeitar] = useState<ItemDaBiblioteca | null>(null);
  const [nota, setNota] = useState("");
  const [novo, setNovo] = useState<File[] | null>(null);
  const [referencia, setReferencia] = useState("");
  const [apagar, setApagar] = useState<ItemDaBiblioteca | null>(null);
  const pagamentos = (registos.pagamentos ?? []) as unknown as Pagamento[];


  const visiveis = filtro === "todos" ? comprovativos : comprovativos.filter((c) => c.meta?.estado === filtro);
  const decidir = async (c: ItemDaBiblioteca, estado: "Validado" | "Rejeitado", notaDe?: string) => {
    await guardar({ ...c, meta: { ...c.meta, estado, ...(notaDe ? { nota: notaDe } : {}) } });
    if (estado === "Validado") {
      const linha = (registos.pagamentos ?? []).find((l) => l.referencia === c.meta?.pagamento && l.estado === "Pendente");
      const t = REGISTOS.pagamentos?.transicoes?.find((x) => x.para === "Confirmado");
      if (linha && t) transitar("pagamentos", linha, t);
    }
    avisar(estado === "Validado" ? "Comprovativo validado" : "Comprovativo rejeitado");
  };
  const receber = async () => {
    if (!novo) return;
    const p = pagamentos.find((x) => x.referencia === referencia);
    for (const f of novo) await guardar({ id: identificador(), nome: f.name, tipo: f.type || "application/octet-stream", tamanho: f.size, criado: new Date().toISOString(), pasta: PASTA_DE_COMPROVATIVOS, blob: f, meta: { pagamento: referencia, de: p?.cliente ?? "", recebido: new Date().toISOString(), estado: "Por validar" } });
  };

  return (
    <Pagina>
      <Titulo titulo="Comprovativos">
        <ZonaDeUpload aceitar="image/*,application/pdf" aoEscolher={(f) => (setReferencia(pagamentos.find((p) => p.estado === "Pendente")?.referencia ?? ""), setNovo(f))} className="contents">
          {(abrir) => (
            <Button variant="primary" icon={ICONES.enviar} onClick={abrir}>
              Receber comprovativo
            </Button>
          )}
        </ZonaDeUpload>
      </Titulo>
      <Cartao titulo={`Comprovativos recebidos (${comprovativos.length})`} acoes={<Separadores itens={FILTROS.map((f) => ({ id: f.id, rotulo: f.rotulo }))} valor={filtro} aoMudar={(id) => setFiltro(id as typeof filtro)} />}>
        {!pronto ? (
          <div className="p-6 text-sm text-kumo-subtle">A abrir os comprovativos…</div>
        ) : visiveis.length === 0 ? (
          <Vazio icone="pdf" titulo="Nenhum comprovativo aqui" texto="Quando um cliente enviar um comprovativo, aparece nesta lista para validar ou rejeitar." />
        ) : (
          visiveis.map((c) => (
            <Linha
              key={c.id}
              titulo={
                <button type="button" onClick={() => setVer(c)} className="inline-flex min-w-0 items-center gap-3 text-left">
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-kumo-tint ring ring-kumo-line">{urls.get(c.id) ? <img src={urls.get(c.id)} alt={`Comprovativo ${c.nome}`} className="size-full object-cover" /> : <Vazio icone="pdf" titulo="" />}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.nome}</span>
                    <span className="block truncate text-xs font-normal text-kumo-subtle">
                      {c.meta?.pagamento || "Sem pagamento"} · {c.meta?.de || "Remetente desconhecido"}
                    </span>
                  </span>
                </button>
              }
              estado={`${dataHora(c.meta?.recebido ?? c.criado)} · ${formatarTamanho(c.tamanho)}${c.meta?.nota ? ` · ${c.meta.nota}` : ""}`}
            >
              <div className="flex flex-wrap items-center justify-end gap-1">
                <Estado valor={c.meta?.estado ?? "Por validar"} modulo="comprovativos" />
                <Button variant="ghost" size="sm" onClick={() => setVer(c)}>
                  Ver
                </Button>
                {c.meta?.estado === "Por validar" && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => decidir(c, "Validado")}>
                      Validar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => (setNota(""), setRejeitar(c))}>
                      Rejeitar
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Remover ${c.nome}`} onClick={() => setApagar(c)} />
              </div>
            </Linha>
          ))
        )}
      </Cartao>

      <PreVisualizar item={ver} aoFechar={() => setVer(null)} />
      <Confirmar aberto={!!rejeitar} aoMudar={(v) => !v && setRejeitar(null)} titulo="Rejeitar o comprovativo" texto={rejeitar ? `«${rejeitar.nome}»: escreva o motivo, que fica guardado.` : ""} rotuloAcao="Rejeitar" perigo desativado={!nota.trim()} aoConfirmar={() => rejeitar && decidir(rejeitar, "Rejeitado", nota.trim())}>
        <Input label="Motivo" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="O montante não confere" autoFocus />
      </Confirmar>
      <Confirmar aberto={!!novo} aoMudar={(v) => !v && setNovo(null)} titulo="Receber comprovativo" texto={novo ? `${novo.length} ${novo.length === 1 ? "ficheiro" : "ficheiros"}: ${novo.map((f) => f.name).join(", ")}` : ""} rotuloAcao="Receber" aoConfirmar={receber}>
        <Select label="Pagamento a que pertence" value={referencia || "—"} onValueChange={(v) => setReferencia(String(v) === "—" ? "" : String(v))} items={{ "—": "Sem pagamento", ...Object.fromEntries(pagamentos.filter((p) => p.estado === "Pendente").map((p) => [p.referencia, `${p.referencia} · ${p.cliente} · ${dinheiro(p.valor)}`])) }} />
      </Confirmar>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover o comprovativo" texto={apagar ? `«${apagar.nome}» vai ser removido. Não se pode desfazer.` : ""} rotuloAcao="Remover" perigo aoConfirmar={() => apagar && remover(apagar.id)} />
    </Pagina>
  );
}

// ---------- contas e IBANs ----------

const MOEDAS = { AOA: "Kwanza (AOA)", EUR: "Euro (EUR)", USD: "Dólar (USD)" };
const VAZIA: ContaBancaria = { id: "", banco: "", titular: "", iban: "", moeda: "AOA", principal: false, ativa: true };

export function ContasIban() {
  const contas = useColecao<ContaBancaria>("/v1/contas-bancarias", "contas-bancarias", CONTAS_DE_ORIGEM);
  const [metodos, setMetodos] = useGuardado<Record<string, boolean>>("metodos-de-pagamento", Object.fromEntries(METODOS_DE_PAGAMENTO.map((m) => [m, m !== "Numerário"])));
  const [aEditar, setAEditar] = useState<ContaBancaria | null>(null);
  const [apagar, setApagar] = useState<ContaBancaria | null>(null);
  const principal = contas.itens.find((c) => c.principal && c.ativa) ?? contas.itens.find((c) => c.ativa);
  const erro = aEditar ? erroDoIban(aEditar.iban) : null;
  const valida = !!aEditar && !erro && aEditar.banco.trim() !== "" && aEditar.titular.trim() !== "" && !contas.itens.some((c) => c.id !== aEditar.id && limparIban(c.iban) === limparIban(aEditar.iban));
  const duplicada = !!aEditar && contas.itens.some((c) => c.id !== aEditar.id && limparIban(c.iban) === limparIban(aEditar.iban));

  const gravar = async () => {
    if (!aEditar || !valida) return;
    const nova = { ...aEditar, iban: limparIban(aEditar.iban), banco: aEditar.banco.trim(), titular: aEditar.titular.trim(), id: aEditar.id || identificador() };
    // só uma conta é a principal
    if (nova.principal) await contas.guardarVarios(contas.itens.filter((c) => c.principal && c.id !== nova.id).map((c) => ({ ...c, principal: false })));
    await contas.guardar(nova);
  };
  const tornarPrincipal = async (c: ContaBancaria) => {
    await contas.guardarVarios(contas.itens.filter((x) => x.principal).map((x) => ({ ...x, principal: false })));
    await contas.guardar({ ...c, principal: true, ativa: true });
  };

  return (
    <Pagina>
      <Titulo titulo="Contas e IBANs">
        <Button variant="primary" icon={ICONES.mais} onClick={() => setAEditar({ ...VAZIA })}>
          Adicionar conta
        </Button>
      </Titulo>
      <AvisoDeApi erro={contas.erro} aoTentar={contas.recarregar} />
      <Cartao titulo="Contas que recebem pagamentos" dica="O IBAN é validado (país, comprimento e dígitos de controlo). A conta principal é a que se mostra primeiro aos clientes.">
        {contas.itens.length === 0 ? (
          <Vazio icone="moeda" titulo="Ainda não há contas" texto="Acrescente o IBAN para onde os clientes devem pagar." />
        ) : (
          contas.itens.map((c) => (
            <Linha
              key={c.id}
              titulo={
                <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{c.banco}</span>
                  {c.principal && <Badge variant="info">Principal</Badge>}
                  <Badge variant="outline">{c.moeda}</Badge>
                </span>
              }
              estado={`${c.titular} · ${formatarIban(c.iban)}`}
            >
              <div className="flex flex-wrap items-center justify-end gap-1">
                <BotaoCopiar texto={formatarIban(c.iban)} tamanho="sm" variante="ghost" quadrado dica="Copiar o IBAN" />
                <Interruptor marcado={c.ativa} aoMudar={(v) => contas.guardar({ ...c, ativa: v, principal: v ? c.principal : false })} rotulo={`Conta ${c.banco} ativa`} />
                {!c.principal && c.ativa && (
                  <Button variant="ghost" size="sm" onClick={() => tornarPrincipal(c)}>
                    Tornar principal
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setAEditar({ ...c, iban: formatarIban(c.iban) })}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Remover ${c.banco}`} onClick={() => setApagar(c)} />
              </div>
            </Linha>
          ))
        )}
      </Cartao>
      <Cartao titulo="Métodos de pagamento aceites" dica="Os métodos desligados deixam de aparecer ao cliente na altura de pagar.">
        {METODOS_DE_PAGAMENTO.map((m) => (
          <Linha key={m} titulo={m} dica={m === "Transferência" ? "O cliente transfere para uma das contas acima e envia o comprovativo." : undefined}>
            <Interruptor marcado={!!metodos[m]} aoMudar={(v) => setMetodos((x) => ({ ...x, [m]: v }))} rotulo={`Aceitar ${m}`} />
          </Linha>
        ))}
      </Cartao>
      {principal && (
        <Cartao titulo="Como o cliente vê as instruções">
          <div className="flex flex-col gap-2 p-4 text-sm">
            <span>Pague por transferência para:</span>
            <span className="font-medium">{principal.titular}</span>
            <span className="inline-flex flex-wrap items-center gap-2 tabular-nums">
              {principal.banco} · {formatarIban(principal.iban)} ({principal.moeda})
              <BotaoCopiar texto={formatarIban(principal.iban)} tamanho="xs" dica="Copiar o IBAN" />
            </span>
            <span className="text-kumo-subtle">Depois de pagar, envie o comprovativo com a referência do pagamento.</span>
          </div>
        </Cartao>
      )}

      <Confirmar aberto={!!aEditar} aoMudar={(v) => !v && setAEditar(null)} titulo={aEditar?.id ? "Editar a conta" : "Adicionar conta"} texto="O IBAN é validado enquanto escreve." rotuloAcao="Guardar" desativado={!valida} aoConfirmar={gravar}>
        {aEditar && (
          <div className="flex flex-col gap-3">
            <Input label="Banco" value={aEditar.banco} onChange={(e) => setAEditar({ ...aEditar, banco: e.target.value })} placeholder="BAI" autoFocus />
            <Input label="Titular" value={aEditar.titular} onChange={(e) => setAEditar({ ...aEditar, titular: e.target.value })} placeholder="Nome da empresa" />
            <Input label="IBAN" value={aEditar.iban} onChange={(e) => setAEditar({ ...aEditar, iban: formatarIban(e.target.value) })} error={aEditar.iban.trim() ? (erro ?? (duplicada ? "Esta conta já está na lista." : undefined)) : undefined} placeholder="AO78 0000 0000 1234 5678 1017 2" />
            <Select label="Moeda" value={aEditar.moeda} onValueChange={(v) => setAEditar({ ...aEditar, moeda: String(v) })} items={MOEDAS} />
          </div>
        )}
      </Confirmar>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover a conta" texto={apagar ? `${apagar.banco} (${formatarIban(apagar.iban)}) deixa de receber pagamentos.` : ""} rotuloAcao="Remover" perigo aoConfirmar={() => apagar && contas.remover(apagar.id)} />
    </Pagina>
  );
}

