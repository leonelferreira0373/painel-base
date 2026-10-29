// Ferramentas de programador, primeira parte: a saúde do servidor (medidores e serviços em tempo real), os pedidos web em tempo real, a base de dados (tabelas, segurança por linha e consola de leitura) e a limpeza de dados. Em modo simulado os números vêm de geradores locais; em modo ligado, do servidor (ver contrato das APIs).
"use client";

import { Badge, Button, Dialog, Input, InputArea, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useRef, useState } from "react";
import { gerarPedido, gerarSaude, gerarTabelas, percentil, REGRAS_DE_ORIGEM, type PedidoWeb, type RegraFirewall, type Saude, type TabelaBd } from "@/dados/super-dados";
import { chamar, useApi, useLigacao } from "@/lib/api/cliente";
import { useColecao } from "@/lib/api/colecao";
import { agrupar, contarPorIntervalo, instante, razao } from "@/lib/serie";
import { formatarTamanho } from "@/lib/biblioteca";
import { correrConsulta, linhasApagadas } from "@/lib/dev";
import { useEditar } from "@/lib/permissao";
import { DIAS_DE_DADOS, RITMO_DE_PEDIDOS } from "@/dados/personalizados";
import { Cartao, Confirmar, Interruptor, Linha } from "../conta/Pecas";
import { Estado } from "../Estado";
import { Vazio } from "../conteudo/ConteudoPecas";
import { Grafico } from "../graficos/Graficos";
import { ICONES } from "../Icones";
import { SeletorPersonalizavel } from "../SeletorPersonalizavel";
import { CartaoEstatistica, Pagina, Titulo } from "../ui";
import { useAcessoDeIp } from "./AcessoDeIp";
import { AvisoDeApi, duracao, Estatistica, horaCompleta, inteiro, percentagem, TabelaSimples, useGuardado, useTick, type ColunaSimples } from "./SuperPecas";

// ---------- saúde do servidor ----------

const mb = (b: number) => `${(b / 1_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 0 })} MB`;
const kbs = (b: number) => `${(b / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 0 })} KB/s`;

export function SaudeVps() {
  const t = useTick(2000) * 2;
  const api = useApi<Saude>("/v1/dev/saude", () => gerarSaude(t), 2000);
  const s = api.dados;
  const [historico, setHistorico] = useState<{ cpu: number; memoria: number; disco: number; saida: number }[]>([]);
  const [parados, setParados] = useState<Record<string, number>>({});
  const [reiniciar, setReiniciar] = useState<string | null>(null);
  useEffect(() => {
    if (!s) return;
    // em modo simulado a história começa já com os 58 s anteriores (o gerador é uma função do tempo); em modo ligado vai-se juntando o que o servidor diz
    const passado = (h: typeof historico) => (h.length === 0 && ligacao.modo !== "ligado" ? Array.from({ length: 29 }, (_, k) => gerarSaude(Math.max(0, t - (29 - k) * 2))).map((x) => ({ cpu: x.cpu, memoria: x.memoria, disco: x.disco, saida: x.redeSaida / 1000 })) : h);
    setHistorico((h) => [...passado(h).slice(-29), { cpu: s.cpu, memoria: s.memoria, disco: s.disco, saida: s.redeSaida / 1000 }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  const ligacao = useLigacao();
  const editar = useEditar();
  const servicos = (s?.servicos ?? []).map((x) => (parados[x.nome] && Date.now() - parados[x.nome] < 4000 ? { ...x, estado: "a-arrancar" as const } : x));
  const colunas: ColunaSimples<Saude["servicos"][number]>[] = [
    { rotulo: "Serviço", render: (x) => <span className="font-medium">{x.nome}</span> },
    { rotulo: "Estado", filtro: (x) => String(x.estado === "saudavel" ? "Saudável" : x.estado === "a-arrancar" ? "A arrancar" : "Parado"), render: (x) => <Estado valor={x.estado === "saudavel" ? "Saudável" : x.estado === "a-arrancar" ? "A arrancar" : "Parado"} /> },
    { rotulo: "CPU", direita: true, render: (x) => percentagem(x.cpu, 1) },
    { rotulo: "Memória", direita: true, render: (x) => mb(x.memoria) },
    ...(editar ? [{ rotulo: "", direita: true, render: (x: Saude["servicos"][number]) => <Button variant="ghost" size="sm" onClick={() => setReiniciar(x.nome)}>Reiniciar</Button> }] : []),
  ];
  return (
    <Pagina>
      <Titulo titulo="Saúde do servidor" />
      <AvisoDeApi erro={api.erro} aoTentar={api.recarregar} />
      {s && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CartaoEstatistica titulo="CPU" valor={percentagem(s.cpu, 0)} pior valores={historico.map((h) => h.cpu * 100)} dica={`Carga do servidor: ${s.carga.map((c) => c.toLocaleString("pt-PT", { maximumFractionDigits: 2 })).join(" · ")} (1, 5 e 15 minutos).`} />
            <CartaoEstatistica titulo="Memória" valor={percentagem(s.memoria, 0)} pior valores={historico.map((h) => h.memoria * 100)} dica="A memória em uso, do total do servidor." />
            <CartaoEstatistica titulo="Disco" valor={percentagem(s.disco, 0)} pior valores={historico.map((h) => h.disco * 100)} dica="O espaço ocupado do disco principal." />
            <CartaoEstatistica titulo="Rede (saída)" valor={kbs(s.redeSaida)} valores={historico.map((h) => h.saida)} dica={`A entrada é de ${kbs(s.redeEntrada)}.`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Cartao titulo="CPU e memória (últimos 60 s)">
              <div className="p-4">
                {historico.length > 2 ? (
                  <Grafico spec={{ tipo: "linhas", rotulos: historico.map((_, i) => `${i * 2}`), series: [{ nome: "CPU (%)", valores: historico.map((h) => Math.round(h.cpu * 100)) }, { nome: "Memória (%)", valores: historico.map((h) => Math.round(h.memoria * 100)) }], unidade: "%" }} altura={200} />
                ) : (
                  <span className="text-sm text-kumo-subtle">A recolher medições…</span>
                )}
              </div>
            </Cartao>
            <Cartao titulo="Servidor">
              <Linha titulo="Tempo ligado" estado={duracao(s.tempoLigado)}>
                <span className="size-2 rounded-full bg-kumo-success" aria-hidden />
              </Linha>
              <Linha titulo="Serviços" estado={`${servicos.filter((x) => x.estado === "saudavel").length} de ${servicos.length} saudáveis`}>
                <Badge variant="outline">{ligacao.modo === "ligado" ? "Em direto" : "Simulado"}</Badge>
              </Linha>
            </Cartao>
          </div>
          <Cartao titulo="Serviços (contentores)">
            <TabelaSimples colunas={colunas} linhas={servicos} chave={(x) => x.nome} />
          </Cartao>
        </>
      )}
      <Confirmar
        aberto={!!reiniciar}
        aoMudar={(v) => !v && setReiniciar(null)}
        titulo="Reiniciar o serviço"
        texto={reiniciar ? `«${reiniciar}» fica indisponível durante alguns segundos.` : ""}
        rotuloAcao="Reiniciar"
        perigo
        aoConfirmar={async () => {
          if (!reiniciar) return;
          if (ligacao.modo === "ligado") await chamar(ligacao, "POST", "/v1/dev/saude/reiniciar", { servico: reiniciar }).catch(() => undefined);
          setParados((p) => ({ ...p, [reiniciar]: Date.now() }));
        }}
      />
    </Pagina>
  );
}

// ---------- pedidos web em tempo real ----------

const CLASSES = { todos: "Todos", "2": "2xx e 3xx", "4": "4xx", "5": "5xx" } as const;

export function PedidosEmTempoReal() {
  const ligacao = useLigacao();
  const [pedidos, setPedidos] = useState<PedidoWeb[]>([]);
  const [pausado, setPausado] = useState(false);
  const [ritmo, setRitmo] = useState("2");
  const [classe, setClasse] = useState<keyof typeof CLASSES>("todos");
  const [procura, setProcura] = useState("");
  const [detalhe, setDetalhe] = useState<PedidoWeb | null>(null);
  const contador = useRef(1);
  const editar = useEditar();
  const api = useApi<{ itens: PedidoWeb[] }>("/v1/dev/pedidos", () => ({ itens: [] }), ligacao.modo === "ligado" && !pausado ? 1000 : undefined);
  const regras = useColecao<RegraFirewall>("/v1/dev/firewall/regras", "firewall-regras", REGRAS_DE_ORIGEM);
  const acesso = useAcessoDeIp(regras);
  // o gerador de pedidos simulados vê sempre as regras de agora: um IP bloqueado passa a ser recusado (403)
  const recusa = useRef<(ip: string, pais: string) => boolean>(() => false);
  recusa.current = (ip, pais) => acesso.ligado && !!acesso.bloqueadoPor(ip, pais);

  // modo simulado: gera pedidos ao ritmo escolhido
  useEffect(() => {
    if (ligacao.modo === "ligado" || pausado) return;
    const t = window.setInterval(() => setPedidos((l) => [gerarPedido(contador.current++, Date.now(), (ip, pais) => recusa.current(ip, pais)), ...l].slice(0, 300)), 1000 / Number(ritmo));
    return () => window.clearInterval(t);
  }, [ligacao.modo, pausado, ritmo]);
  const todos = ligacao.modo === "ligado" ? (api.dados?.itens ?? []) : pedidos;
  const visiveis = useMemo(
    () => todos.filter((p) => (classe === "todos" ? true : classe === "2" ? p.estado < 400 : String(p.estado)[0] === classe) && (!procura.trim() || `${p.caminho} ${p.ip} ${p.metodo}`.toLowerCase().includes(procura.trim().toLowerCase()))).slice(0, 60),
    [todos, classe, procura],
  );
  const ultimoMinuto = todos.filter((p) => Date.now() - new Date(p.quando).getTime() < 60_000);
  const erros = ultimoMinuto.filter((p) => p.estado >= 500).length;
  // o último minuto repartido em 12 intervalos, para o gráfico de cada cartão
  const baldes = agrupar(ultimoMinuto, (p) => instante(p.quando), 12);
  const cor = (e: number) => (e >= 500 ? "error" : e >= 400 ? "warning" : "success") as "error" | "warning" | "success";
  const colunas: ColunaSimples<PedidoWeb>[] = [
    { rotulo: "Hora", render: (p) => <span className="tabular-nums">{horaCompleta(p.quando)}</span> },
    { rotulo: "Método", render: (p) => <Badge variant="outline">{p.metodo}</Badge> },
    { rotulo: "Caminho", render: (p) => <span className="font-medium">{p.caminho}</span> },
    { rotulo: "Estado", filtro: (p) => String(String(p.estado)), render: (p) => <Estado valor={String(p.estado)} variante={cor(p.estado)} /> },
    { rotulo: "Tempo", direita: true, render: (p) => `${p.ms} ms` },
    { rotulo: "IP", render: (p) => <span className="inline-flex items-center gap-2 tabular-nums">{p.ip}{acesso.bloqueadoPor(p.ip, p.pais) && <Estado valor="Bloqueado" variante="error" />}</span> },
    { rotulo: "País", render: (p) => p.pais },
    ...(editar
      ? [
          {
            rotulo: "",
            direita: true,
            render: (p: PedidoWeb) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  acesso.pedir(p.ip, p.pais);
                }}
              >
                {acesso.bloqueadoPor(p.ip, p.pais) ? "Desbloquear" : "Bloquear IP"}
              </Button>
            ),
          },
        ]
      : []),
  ];
  return (
    <Pagina largo>
      <Titulo titulo="Pedidos em tempo real">
        <Button variant="secondary" onClick={() => setPausado((p) => !p)}>
          {pausado ? "Retomar" : "Pausar"}
        </Button>
        <Button variant="ghost" onClick={() => setPedidos([])}>
          Limpar
        </Button>
      </Titulo>
      <AvisoDeApi erro={api.erro ?? regras.erro} aoTentar={() => (api.recarregar(), regras.recarregar())} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Estatistica titulo="Pedidos no último minuto" valor={inteiro(ultimoMinuto.length)} numero={ultimoMinuto.length} serie={contarPorIntervalo(baldes)} />
        <Estatistica titulo="Erros 5xx" valor={percentagem(ultimoMinuto.length ? erros / ultimoMinuto.length : 0, 1)} pior numero={ultimoMinuto.length ? (erros / ultimoMinuto.length) * 100 : 0} serie={razao(contarPorIntervalo(baldes, (p) => p.estado >= 500), contarPorIntervalo(baldes))} />
        <Estatistica titulo="Tempo (mediana)" valor={`${percentil(ultimoMinuto.map((p) => p.ms), 0.5)} ms`} pior numero={percentil(ultimoMinuto.map((p) => p.ms), 0.5)} serie={baldes.map((b) => percentil(b.map((p) => p.ms), 0.5))} />
        <Estatistica titulo="Tempo (percentil 95)" valor={`${percentil(ultimoMinuto.map((p) => p.ms), 0.95)} ms`} pior numero={percentil(ultimoMinuto.map((p) => p.ms), 0.95)} serie={baldes.map((b) => percentil(b.map((p) => p.ms), 0.95))} />
      </div>
      <Cartao
        titulo={`Pedidos (${visiveis.length})`}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            {ligacao.modo !== "ligado" && <SeletorPersonalizavel rotulo="Ritmo dos pedidos simulados" valor={ritmo} opcoes={RITMO_DE_PEDIDOS.opcoes} personalizado={RITMO_DE_PEDIDOS.personalizado} aoMudar={setRitmo} className="w-44" />}
            <Select aria-label="Estado" value={classe} onValueChange={(v) => setClasse(v as keyof typeof CLASSES)} items={CLASSES} className="w-36" />
          </div>
        }
      >
        <div className="border-b border-kumo-hairline px-4 pb-3">
          <Input aria-label="Filtrar pedidos" placeholder="Filtrar por caminho, IP ou método" value={procura} onChange={(e) => setProcura(e.target.value)} className="w-full" />
        </div>
        <TabelaSimples colunas={colunas} linhas={visiveis} chave={(p) => p.id} vazio={pausado ? "Em pausa." : "À espera de pedidos…"} aoClicar={setDetalhe} />
      </Cartao>
      <Dialog.Root open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <Dialog size="lg" className="p-6">
          {detalhe && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <Dialog.Title className="min-w-0 truncate text-lg font-semibold">
                  {detalhe.metodo} {detalhe.caminho}
                </Dialog.Title>
                <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
              </div>
              <pre className="overflow-x-auto rounded-lg bg-kumo-tint p-3 text-xs">{JSON.stringify(detalhe, null, 2)}</pre>
              {editar && (
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => (setDetalhe(null), acesso.pedir(detalhe.ip, detalhe.pais))}>
                    {acesso.bloqueadoPor(detalhe.ip, detalhe.pais) ? "Desbloquear este IP" : "Bloquear este IP"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Dialog>
      </Dialog.Root>
      {acesso.dialogo}
    </Pagina>
  );
}

// ---------- base de dados ----------

export function BaseDeDados() {
  const ligacao = useLigacao();
  const [local, setLocal] = useGuardado<TabelaBd[]>("bd-tabelas", gerarTabelas());
  const api = useApi<{ itens: TabelaBd[] }>("/v1/dev/bd/tabelas", () => ({ itens: [] }));
  const tabelas = ligacao.modo === "ligado" ? (api.dados?.itens ?? []) : local;
  const [politicas, setPoliticas] = useState<string | null>(null);
  const [rlsOff, setRlsOff] = useState<TabelaBd | null>(null);
  const [apagar, setApagar] = useState<TabelaBd | null>(null);
  const [dias, setDias] = useState("90");
  const [sql, setSql] = useState("SELECT * FROM pagamentos LIMIT 5");
  const [resultado, setResultado] = useState(() => correrConsulta("SELECT * FROM pagamentos LIMIT 5"));
  const [novaPolitica, setNovaPolitica] = useState({ nome: "", comando: "SELECT", expressao: "" });
  const [ultimo, setUltimo] = useState<string | null>(null);
  const editar = useEditar();
  const tabelaAberta = tabelas.find((t) => t.nome === politicas);

  const mudar = async (nome: string, parcial: Partial<TabelaBd>) => {
    if (ligacao.modo === "ligado" && parcial.rls !== undefined) {
      await chamar(ligacao, "PATCH", "/v1/dev/bd/tabelas/{nome}/rls", { rls: parcial.rls }, { nome });
      api.recarregar();
    } else setLocal((l) => l.map((t) => (t.nome === nome ? { ...t, ...parcial } : t)));
  };
  const colunas: ColunaSimples<TabelaBd>[] = [
    { rotulo: "Tabela", render: (t) => <span className="font-medium">{t.nome}</span> },
    { rotulo: "Linhas", direita: true, render: (t) => inteiro(t.linhas) },
    { rotulo: "Tamanho", direita: true, render: (t) => formatarTamanho(t.bytes) },
    { rotulo: "Segurança por linha", render: (t) => <Interruptor marcado={t.rls} aoMudar={(v) => (v ? mudar(t.nome, { rls: true }) : setRlsOff(t))} rotulo={`Segurança por linha da tabela ${t.nome}`} desativado={!editar} /> },
    { rotulo: "Políticas", render: (t) => <Button variant="ghost" size="sm" onClick={() => setPoliticas(t.nome)}>{t.politicas.length} {t.politicas.length === 1 ? "política" : "políticas"}</Button> },
    ...(editar ? [{ rotulo: "", direita: true, render: (t: TabelaBd) => <Button variant="ghost" size="sm" icon={ICONES.lixo} onClick={() => setApagar(t)}>Apagar linhas</Button> }] : []),
  ];
  return (
    <Pagina>
      <Titulo titulo="Base de dados" />
      <AvisoDeApi erro={api.erro} aoTentar={api.recarregar} />
      {ultimo && (
        <div role="status" className="rounded-xl bg-kumo-tint px-4 py-3 text-sm">
          {ultimo}
        </div>
      )}
      <Cartao
        titulo={`Tabelas (${tabelas.length})`}
        dica="A segurança por linha (RLS) faz com que cada pessoa só veja as linhas que as políticas permitem. Com ela desligada, qualquer pedido autenticado lê a tabela toda."
        acoes={editar ? <SeletorPersonalizavel rotulo="Apagar linhas mais antigas do que" valor={dias} opcoes={DIAS_DE_DADOS.opcoes} personalizado={DIAS_DE_DADOS.personalizado} aoMudar={setDias} className="w-40" /> : undefined}
      >
        <TabelaSimples colunas={colunas} linhas={tabelas} chave={(t) => t.nome} />
      </Cartao>
      <Cartao titulo="Consola (só de leitura)" dica="Só aceita SELECT … FROM tabela [LIMIT n]; nada se altera. Em modo ligado, o servidor tem a sua própria consola.">
        <div className="flex flex-col gap-3 p-4">
          <InputArea aria-label="Consulta SQL" value={sql} onValueChange={setSql} minRows={2} autoResize className="font-mono text-sm" />
          <div>
            <Button variant="primary" onClick={() => setResultado(correrConsulta(sql))}>
              Correr a consulta
            </Button>
          </div>
          {resultado.erro ? <span className="text-sm text-kumo-danger">{resultado.erro}</span> : <TabelaSimples colunas={resultado.colunas.map((c, i) => ({ rotulo: c, render: (l: (string | number)[]) => String(l[i]) }))} linhas={resultado.linhas} chave={(l) => String(l[0]) + String(l[1] ?? "")} />}
        </div>
      </Cartao>

      <Dialog.Root open={!!tabelaAberta} onOpenChange={(v) => !v && setPoliticas(null)}>
        <Dialog size="lg" className="p-6">
          {tabelaAberta && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <Dialog.Title className="text-lg font-semibold">Políticas de {tabelaAberta.nome}</Dialog.Title>
                <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
              </div>
              {!tabelaAberta.rls && <span className="text-sm text-kumo-danger">A segurança por linha está desligada: estas políticas não se aplicam.</span>}
              {tabelaAberta.politicas.length === 0 ? (
                <Vazio icone="escudo" titulo="Sem políticas" texto="Sem políticas e com a segurança por linha ligada, ninguém lê a tabela." />
              ) : (
                <ul className="divide-y divide-kumo-hairline rounded-lg ring ring-kumo-line">
                  {tabelaAberta.politicas.map((p) => (
                    <li key={p.nome} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block font-medium">{p.nome}</span>
                        <span className="block truncate text-xs text-kumo-subtle">
                          {p.comando} · {p.expressao}
                        </span>
                      </span>
                      {editar && <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Remover a política ${p.nome}`} onClick={() => mudar(tabelaAberta.nome, { politicas: tabelaAberta.politicas.filter((x) => x.nome !== p.nome) })} />}
                    </li>
                  ))}
                </ul>
              )}
              {editar && (
              <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Nome" value={novaPolitica.nome} onChange={(e) => setNovaPolitica({ ...novaPolitica, nome: e.target.value.replace(/\W/g, "_") })} placeholder="ver_da_conta" />
                <Select label="Comando" value={novaPolitica.comando} onValueChange={(v) => setNovaPolitica({ ...novaPolitica, comando: String(v) })} items={{ SELECT: "SELECT", INSERT: "INSERT", UPDATE: "UPDATE", DELETE: "DELETE", ALL: "Todos" }} />
                <Input label="Condição" value={novaPolitica.expressao} onChange={(e) => setNovaPolitica({ ...novaPolitica, expressao: e.target.value })} placeholder="conta_id = auth.conta()" />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  disabled={!novaPolitica.nome || !novaPolitica.expressao || tabelaAberta.politicas.some((p) => p.nome === novaPolitica.nome)}
                  onClick={() => (mudar(tabelaAberta.nome, { politicas: [...tabelaAberta.politicas, novaPolitica] }), setNovaPolitica({ nome: "", comando: "SELECT", expressao: "" }))}
                >
                  Acrescentar a política
                </Button>
              </div>
              </>
              )}
            </div>
          )}
        </Dialog>
      </Dialog.Root>
      <Confirmar aberto={!!rlsOff} aoMudar={(v) => !v && setRlsOff(null)} titulo="Desligar a segurança por linha" texto={rlsOff ? `Com ela desligada, qualquer pedido autenticado lê toda a tabela «${rlsOff.nome}».` : ""} rotuloAcao="Desligar" perigo aoConfirmar={() => rlsOff && mudar(rlsOff.nome, { rls: false })} />
      <Confirmar
        aberto={!!apagar}
        aoMudar={(v) => !v && setApagar(null)}
        titulo="Apagar linhas"
        texto={apagar ? `Apaga as linhas de «${apagar.nome}» com mais de ${dias} dias. Não se pode desfazer.` : ""}
        rotuloAcao="Apagar"
        perigo
        escrever={apagar ? `APAGAR ${apagar.nome}` : "APAGAR"}
        aoConfirmar={async () => {
          if (!apagar) return;
          const n = linhasApagadas(apagar.linhas, Number(dias));
          if (ligacao.modo === "ligado") await chamar(ligacao, "DELETE", "/v1/dev/bd/tabelas/{nome}/linhas", { antes: dias }, { nome: apagar.nome }).catch(() => undefined);
          else await mudar(apagar.nome, { linhas: apagar.linhas - n, bytes: Math.round(apagar.bytes * (1 - n / Math.max(1, apagar.linhas))) });
          setUltimo(`Foram apagadas ${inteiro(n)} linhas de ${apagar.nome} com mais de ${dias} dias.`);
        }}
      />
    </Pagina>
  );
}
