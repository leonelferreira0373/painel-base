// O histórico de utilização da IA: tudo o que a pesquisa em linguagem natural e o assistente gastaram. «Neste navegador» tem cada chamada com a pergunta e a resposta (que só ficam aqui); «Servidor» tem os números de toda a gente que usa o painel (nunca o texto). Cada cartão tem o seu gráfico e a variação face ao período anterior.
"use client";

import { Button, Dialog, Input, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { PROJETO } from "@/dados/projeto";
import { reciclar } from "@/lib/reciclagem";
import { abrirDados, useFonteDeExportacao } from "@/lib/dados-da-pagina";
import { formatarUsd, modeloDe, NEURONS_GRATIS_POR_DIA } from "@/lib/ia-modelos";
import { apagarHistoricoDaIa, ROTULO_DA_ORIGEM, somarUso, useUsoDaIa, type OrigemDaIa, type RegistoDeUso } from "@/lib/ia-uso";
import { useEditar } from "@/lib/permissao";
import { Confirmar } from "../conta/Pecas";
import { Vazio } from "../conteudo/ConteudoPecas";
import { Estado } from "../Estado";
import { ICONES } from "../Icones";
import { Pagina, Separadores, Titulo } from "../ui";
import { Cartao } from "../conta/Pecas";
import { dataHora, Estatistica, inteiro, TabelaSimples, type ColunaSimples } from "../super/SuperPecas";

interface DiaDoServidor {
  dia: string;
  chamadas: number;
  tin: number;
  tout: number;
  neurons: number;
  custo: number;
}
interface ChamadaDoServidor {
  quando: string;
  origem: OrigemDaIa;
  modelo: string;
  tin: number;
  tout: number;
  neurons: number;
  custo: number;
  ms: number;
  estimado: number;
}

const dia = (iso: string) => iso.slice(0, 10);
const curto = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);
const neurons = (n: number) => n.toLocaleString("pt-PT", { maximumFractionDigits: 1 });

export function UsoDaIa() {
  const editar = useEditar();
  const { historico, versao } = useUsoDaIa();
  const [separador, setSeparador] = useState("navegador");
  const [origem, setOrigem] = useState("todas");
  const [texto, setTexto] = useState("");
  const [aVer, setAVer] = useState<RegistoDeUso | null>(null);
  const [apagar, setApagar] = useState(false);
  const [servidor, setServidor] = useState<{ dias: DiaDoServidor[]; recentes: ChamadaDoServidor[] } | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!PROJETO.urlIa) return;
    const ctl = new AbortController();
    fetch(`${PROJETO.urlIa}/uso/historico?dias=30`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { dias: DiaDoServidor[]; recentes: ChamadaDoServidor[] }) => setServidor(d))
      .catch(() => !ctl.signal.aborted && setFalhou(true));
    return () => ctl.abort();
  }, [versao]);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return historico.filter((r) => (origem === "todas" || r.origem === origem) && (!q || `${r.pergunta} ${r.resposta} ${r.ferramentas?.join(" ") ?? ""}`.toLowerCase().includes(q)));
  }, [historico, origem, texto]);
  const totais = useMemo(() => somarUso(historico), [historico]);

  // os cartões: um número por dia, do servidor (toda a gente) ou, sem servidor, do histórico deste navegador
  const porDia = useMemo(() => {
    if (servidor && servidor.dias.length >= 2) return servidor.dias.map((d) => ({ dia: d.dia, chamadas: d.chamadas, tokens: d.tin + d.tout, neurons: d.neurons, custo: d.custo }));
    const m = new Map<string, { chamadas: number; tokens: number; neurons: number; custo: number }>();
    for (const r of [...historico].reverse()) {
      const d = dia(r.quando);
      const x = m.get(d) ?? { chamadas: 0, tokens: 0, neurons: 0, custo: 0 };
      m.set(d, { chamadas: x.chamadas + 1, tokens: x.tokens + r.uso.tokensEntrada + r.uso.tokensSaida, neurons: x.neurons + r.uso.neurons, custo: x.custo + r.uso.custoUsd });
    }
    return [...m].map(([d, v]) => ({ dia: d, ...v }));
  }, [servidor, historico]);
  const serie = (f: (d: (typeof porDia)[number]) => number) => porDia.map(f);
  const soma = (f: (d: (typeof porDia)[number]) => number) => porDia.reduce((s, d) => s + f(d), 0);
  const doServidor = !!servidor && servidor.dias.length >= 2;

  const colunas: ColunaSimples<RegistoDeUso>[] = [
    { rotulo: "Quando", render: (r) => <span className="tabular-nums">{dataHora(r.quando)}</span> },
    { rotulo: "Origem", filtro: (r) => String(ROTULO_DA_ORIGEM[r.origem]), render: (r) => <Estado valor={ROTULO_DA_ORIGEM[r.origem]} variante="neutral" /> },
    { rotulo: "Pergunta", render: (r) => <button type="button" onClick={() => setAVer(r)} className="max-w-72 truncate text-left font-medium hover:underline" title={r.pergunta}>{curto(r.pergunta) || "—"}</button> },
    { rotulo: "Ferramentas", render: (r) => (r.ferramentas?.length ? r.ferramentas.join(", ") : "—") },
    { rotulo: "Tokens", direita: true, render: (r) => `${inteiro(r.uso.tokensEntrada)} + ${inteiro(r.uso.tokensSaida)}` },
    { rotulo: "Neurons", direita: true, render: (r) => neurons(r.uso.neurons) },
    { rotulo: "Custo", direita: true, render: (r) => formatarUsd(r.uso.custoUsd) },
    { rotulo: "Tempo", direita: true, render: (r) => `${(r.uso.ms / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} s` },
  ];
  const colunasDoServidor: ColunaSimples<ChamadaDoServidor>[] = [
    { rotulo: "Quando", render: (r) => <span className="tabular-nums">{dataHora(r.quando)}</span> },
    { rotulo: "Origem", filtro: (r) => String(ROTULO_DA_ORIGEM[r.origem] ?? r.origem), render: (r) => <Estado valor={ROTULO_DA_ORIGEM[r.origem] ?? r.origem} variante="neutral" /> },
    { rotulo: "Modelo", render: (r) => modeloDe(r.modelo).nome },
    { rotulo: "Tokens", direita: true, render: (r) => `${inteiro(r.tin)} + ${inteiro(r.tout)}${r.estimado ? " (estimado)" : ""}` },
    { rotulo: "Neurons", direita: true, render: (r) => neurons(r.neurons) },
    { rotulo: "Custo", direita: true, render: (r) => formatarUsd(r.custo) },
    { rotulo: "Tempo", direita: true, render: (r) => `${(r.ms / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} s` },
  ];

  const fonte = useMemo(() => ({ nome: "utilizacao-da-ia", titulo: "Utilização da IA", dados: { nome: "utilizacao-da-ia", titulo: "Utilização da IA", colunas: ["Quando", "Origem", "Modelo", "Pergunta", "Resposta", "Tokens de entrada", "Tokens de saída", "Neurons", "Custo (USD)", "Tempo (ms)"], linhas: filtrados.map((r) => [r.quando, ROTULO_DA_ORIGEM[r.origem], r.uso.modelo, r.pergunta, r.resposta, r.uso.tokensEntrada, r.uso.tokensSaida, Number(r.uso.neurons.toFixed(2)), Number(r.uso.custoUsd.toFixed(6)), r.uso.ms]) } }), [filtrados]);
  useFonteDeExportacao(fonte);

  return (
    <Pagina>
      <Titulo titulo="Utilização da IA">
        <Button variant="secondary" icon={ICONES.transferir} onClick={() => abrirDados("exportar")} disabled={filtrados.length === 0}>
          Exportar
        </Button>
        {editar && (
          <Button variant="secondary" icon={ICONES.lixo} onClick={() => setApagar(true)} disabled={historico.length === 0}>
            Apagar o histórico
          </Button>
        )}
      </Titulo>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Estatistica titulo="Chamadas" valor={inteiro(doServidor ? soma((d) => d.chamadas) : totais.chamadas)} dica={doServidor ? "Chamadas à IA de todos os que usam o painel, por dia." : "Chamadas à IA neste navegador, por dia."} serie={serie((d) => d.chamadas)} numero={totais.chamadas} />
        <Estatistica titulo="Tokens" valor={inteiro(doServidor ? soma((d) => d.tokens) : totais.tokensEntrada + totais.tokensSaida)} dica="Tokens de entrada e de saída, como a Cloudflare os contou." serie={serie((d) => d.tokens)} numero={totais.tokensEntrada + totais.tokensSaida} />
        <Estatistica titulo="Neurons" valor={neurons(doServidor ? soma((d) => d.neurons) : totais.neurons)} dica={`A unidade em que a Cloudflare cobra: ${inteiro(NEURONS_GRATIS_POR_DIA)} por dia são gratuitas.`} serie={serie((d) => d.neurons)} numero={totais.neurons} />
        <Estatistica titulo="Custo a preço de tabela" valor={formatarUsd(doServidor ? soma((d) => d.custo) : totais.custoUsd)} pior dica="O que custaria sem a quota gratuita. Dentro da quota diária não se paga nada." serie={serie((d) => d.custo)} numero={totais.custoUsd} />
      </div>

      <Separadores itens={[{ id: "navegador", rotulo: "Neste navegador" }, { id: "servidor", rotulo: "Servidor (todos)" }]} valor={separador} aoMudar={setSeparador} />

      {separador === "navegador" ? (
        <Cartao titulo={`Chamadas${filtrados.length ? ` (${filtrados.length})` : ""}`}>
          <div className="flex flex-col gap-2 border-b border-kumo-hairline p-3 sm:flex-row">
            <Input aria-label="Pesquisar no histórico" placeholder="Pesquisar nas perguntas e nas respostas" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" className="w-full" />
            <div className="sm:w-52 sm:shrink-0">
              <Select aria-label="Origem" value={origem} onValueChange={(v) => setOrigem(String(v))} items={{ todas: "Todas as origens", pesquisa: ROTULO_DA_ORIGEM.pesquisa, assistente: ROTULO_DA_ORIGEM.assistente, analise: ROTULO_DA_ORIGEM.analise }} />
            </div>
          </div>
          {historico.length === 0 ? <Vazio icone="ia" titulo="Ainda não há chamadas" texto="Use a pesquisa com uma frase sua ou pergunte ao assistente: cada chamada aparece aqui." /> : <TabelaSimples colunas={colunas} linhas={filtrados} chave={(r) => r.id} vazio="Nenhuma chamada corresponde à pesquisa." />}
        </Cartao>
      ) : (
        <Cartao titulo="Últimas chamadas de todos">
          {!PROJETO.urlIa ? <Vazio icone="ia" titulo="Sem servidor da IA" texto="O Worker da IA não está ligado." /> : falhou ? <Vazio icone="aviso" titulo="Não foi possível ler o servidor" texto="Tente de novo daqui a pouco." /> : !servidor ? <div className="p-6 text-sm text-kumo-subtle">A ler o servidor…</div> : <TabelaSimples colunas={colunasDoServidor} linhas={servidor.recentes} chave={(r) => `${r.quando}-${r.origem}-${r.tin}-${r.ms}`} vazio="O servidor ainda não registou chamadas." />}
        </Cartao>
      )}

      <Dialog.Root open={!!aVer} onOpenChange={(v) => !v && setAVer(null)}>
        <Dialog size="lg" className="max-h-[85dvh] overflow-y-auto p-6">
          {aVer && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <Dialog.Title className="text-lg font-semibold">Chamada de {dataHora(aVer.quando)}</Dialog.Title>
                <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
              </div>
              <div className="flex flex-wrap gap-2 text-[13px] text-kumo-subtle">
                <Estado valor={ROTULO_DA_ORIGEM[aVer.origem]} variante="neutral" />
                <span>{modeloDe(aVer.uso.modelo).nome}</span>
                <span>· {inteiro(aVer.uso.tokensEntrada)} + {inteiro(aVer.uso.tokensSaida)} tokens</span>
                <span>· {neurons(aVer.uso.neurons)} neurons</span>
                <span>· {formatarUsd(aVer.uso.custoUsd)}</span>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-kumo-subtle">Pergunta</div>
                <p className="whitespace-pre-wrap rounded-lg bg-kumo-tint p-3 text-sm">{aVer.pergunta || "—"}</p>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-kumo-subtle">Resposta</div>
                <p className="whitespace-pre-wrap rounded-lg bg-kumo-tint p-3 text-sm">{aVer.resposta || "—"}</p>
              </div>
              {aVer.ferramentas?.length ? <div className="text-sm text-kumo-subtle">Ferramentas usadas: {aVer.ferramentas.join(", ")}</div> : null}
            </div>
          )}
        </Dialog>
      </Dialog.Root>
      <Confirmar aberto={apagar} aoMudar={setApagar} titulo="Apagar o histórico da IA" texto="O histórico deste navegador (as perguntas, as respostas e o gasto de cada chamada) vai ser apagado. O servidor continua com os números de toda a gente. Não se pode desfazer." rotuloAcao="Apagar" perigo escrever="APAGAR histórico da IA" aoConfirmar={() => (void reciclar({ tipo: "Histórico da IA", rotulo: `Histórico da IA (${historico.length} chamadas)`, dados: historico, origem: { kind: "uso-ia" } }), apagarHistoricoDaIa())} />
    </Pagina>
  );
}
