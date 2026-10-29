// O registo de atividade do painel: cada sessão (quando entrou, o IP, o local, o navegador e o aparelho, quanto durou), tudo o que se fez em cada uma (páginas, cliques, definições ligadas e desligadas com o antes e o depois, campos, janelas, mensagens com a IA, tokens) e os convites (quem se convidou e se aceitou). Em modo simulado vem deste navegador; em modo ligado, do servidor.
"use client";

import { Button, Dialog, Input, InputArea, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { FUNCOES, funcaoPorId } from "@/dados/rbac";
import { useApi } from "@/lib/api/cliente";
import { reciclar } from "@/lib/reciclagem";
import { abrirDados, useFonteDeExportacao } from "@/lib/dados-da-pagina";
import { useColecao } from "@/lib/api/colecao";
import { apagarAtividade, duracaoDe, filtrarAcoes, lerAcoes, lerSessoes, registar, rotuloDoDispositivo, rotuloDoLocal, rotuloDoTipoDeAparelho, ROTULO_DO_TIPO, textoDaDuracao, useAtividade, type Acao, type Sessao, type TipoDeAcao } from "@/lib/atividade";
import { cancelarConvite, conviteNovo, corpoDoConvite, erroDoConvite, expirarConvites, reenviarConvite, responderAoConvite, totaisDeConvites, type Convite, type EstadoDoConvite } from "@/lib/convites";
import { contagemPorDia, emailNovo, enviarEmail } from "@/lib/email";
import { useEditar } from "@/lib/permissao";
import { useSessao } from "@/lib/auth";
import { Confirmar, Cartao } from "../conta/Pecas";
import { Vazio } from "../conteudo/ConteudoPecas";
import { Estado } from "../Estado";
import { Frase } from "../Frase";
import { ICONES } from "../Icones";
import { useEmails } from "../super/EmailPecas";
import { dataHora, Estatistica, horaCompleta, inteiro, TabelaSimples, type ColunaSimples } from "../super/SuperPecas";
import { Pagina, Separadores, Titulo } from "../ui";
import { rotuloDaPagina } from "./ObservadorDaAtividade";

const INATIVA_MS = 30 * 60_000;

/** Ativa, terminada ou inativa: o que a sessão é agora. */
function estadoDaSessao(s: Sessao, agora: number): { rotulo: string; variante: "success" | "neutral" | "warning" } {
  if (!s.fim) return agora - new Date(s.ultima).getTime() < INATIVA_MS ? { rotulo: "Ativa", variante: "success" } : { rotulo: "Inativa", variante: "neutral" };
  return s.motivoDoFim === "inatividade" ? { rotulo: "Inativa", variante: "neutral" } : { rotulo: "Terminada", variante: "neutral" };
}

const ESTADO_DO_CONVITE: Record<EstadoDoConvite, "success" | "error" | "warning" | "neutral"> = { Pendente: "warning", Aceite: "success", Recusado: "error", Expirado: "neutral", Cancelado: "neutral" };

/** Uma ação em palavras: o texto e, se mudou alguma coisa, o antes e o depois. */
function TextoDaAcao({ a }: { a: Acao }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-y-1">
      <span>
        <Frase>{a.texto}</Frase>
      </span>
      {a.antes !== undefined && a.depois !== undefined && a.antes !== a.depois && (
        <span className="ml-1 text-kumo-subtle">
          <Frase>{`«${a.antes || "vazio"}» > «${a.depois || "vazio"}»`}</Frase>
        </span>
      )}
    </span>
  );
}

const dia = (iso: string) => iso.slice(0, 10);

export function AtividadeDoPainel() {
  const editar = useEditar();
  const { versao, sessoes: locais, acoes: acoesLocais } = useAtividade();
  const [separador, setSeparador] = useState("sessoes");
  const [aVer, setAVer] = useState<Sessao | null>(null);
  const [apagar, setApagar] = useState(false);
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const t = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // em modo ligado vêm do servidor; em modo simulado, deste navegador
  const noServidorSessoes = useApi<{ itens: Sessao[] }>("/v1/painel/sessoes", () => ({ itens: lerSessoes() }), 15_000);
  const noServidorAcoes = useApi<{ itens: Acao[] }>("/v1/painel/atividade", () => ({ itens: lerAcoes() }), 15_000);
  const ligado = noServidorSessoes.modo === "ligado";
  const sessoes = useMemo(() => (ligado ? (noServidorSessoes.dados?.itens ?? []) : locais), [ligado, noServidorSessoes.dados, locais, versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const acoes = useMemo(() => (ligado ? (noServidorAcoes.dados?.itens ?? []) : acoesLocais), [ligado, noServidorAcoes.dados, acoesLocais, versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const sessaoPorId = useMemo(() => new Map(sessoes.map((s) => [s.id, s])), [sessoes]);

  // os quatro cartões: um número por dia nos últimos 14 dias
  const inicio = useMemo(() => new Date(Date.now() - 13 * 86_400_000), []);
  const porDiaSessoes = contagemPorDia(sessoes, (s) => s.inicio, inicio, 14);
  const porDiaAcoes = contagemPorDia(acoes, (a) => a.quando, inicio, 14);
  const pessoas = new Set(sessoes.map((s) => s.utilizador)).size;
  const duracaoMedia = sessoes.length ? sessoes.reduce((t, s) => t + duracaoDe(s, agora ?? 0), 0) / sessoes.length : 0;
  const ativas = agora ? sessoes.filter((s) => estadoDaSessao(s, agora).rotulo === "Ativa").length : 0;

  // exportar: as ações e as sessões, em qualquer formato (a janela «Exportar e importar»)
  const fonteDeSessoes = useMemo(() => ({ nome: "sessoes", titulo: "Sessões do painel", dados: { nome: "sessoes", titulo: "Sessões do painel", colunas: ["Início", "Fim", "Utilizador", "Função", "IP", "Local", "Navegador", "Sistema", "Aparelho", "Duração", "Ações"], linhas: sessoes.map((s) => [s.inicio, s.fim ?? "", s.utilizador, s.funcao, s.ip ?? "", rotuloDoLocal(s), `${s.dispositivo.navegador} ${s.dispositivo.versao}`.trim(), s.dispositivo.sistema, rotuloDoTipoDeAparelho(s.dispositivo.tipo), textoDaDuracao(duracaoDe(s, agora ?? 0)), s.acoes] as (string | number)[]) } }), [sessoes, agora]);
  const fonteDeAcoes = useMemo(() => ({ nome: "atividade", titulo: "Atividade do painel", dados: { nome: "atividade", titulo: "Atividade do painel", colunas: ["Quando", "Utilizador", "Tipo", "Ação", "Antes", "Depois", "Página", "IP"], linhas: acoes.slice(0, 5000).map((a) => [a.quando, sessaoPorId.get(a.sessao)?.utilizador ?? "", ROTULO_DO_TIPO[a.tipo], a.texto, a.antes ?? "", a.depois ?? "", a.caminho ?? "", sessaoPorId.get(a.sessao)?.ip ?? ""]) } }), [acoes, sessaoPorId]);
  useFonteDeExportacao(separador === "sessoes" ? fonteDeSessoes : fonteDeAcoes);

  return (
    <Pagina>
      <Titulo titulo="Sessões e atividade">
        <Button variant="secondary" icon={ICONES.transferir} onClick={() => abrirDados("exportar")} disabled={acoes.length === 0}>
          Exportar
        </Button>
        {editar && !ligado && (
          <Button variant="secondary" icon={ICONES.lixo} onClick={() => setApagar(true)} disabled={sessoes.length === 0}>
            Apagar o histórico
          </Button>
        )}
      </Titulo>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Estatistica titulo="Sessões" valor={inteiro(sessoes.length)} numero={sessoes.length} serie={porDiaSessoes} dica={`${ativas} ${ativas === 1 ? "sessão ativa" : "sessões ativas"} agora. As sessões por dia, nos últimos 14 dias.`} />
        <Estatistica titulo="Ações registadas" valor={inteiro(acoes.length)} numero={acoes.length} serie={porDiaAcoes} dica="Cada página, clique, definição, campo, janela, mensagem com a IA, convite e token." />
        <Estatistica titulo="Pessoas" valor={inteiro(pessoas)} numero={pessoas} dica="Quantas pessoas diferentes entraram." />
        <Estatistica titulo="Duração média" valor={textoDaDuracao(duracaoMedia)} dica="O tempo médio de cada sessão." />
      </div>

      <Separadores
        itens={[
          { id: "sessoes", rotulo: "Sessões" },
          { id: "atividade", rotulo: "Atividade" },
          { id: "convites", rotulo: "Convites" },
        ]}
        valor={separador}
        aoMudar={setSeparador}
      />

      {separador === "sessoes" && <Sessoes sessoes={sessoes} agora={agora} aoAbrir={setAVer} erro={ligado ? noServidorSessoes.erro : null} />}
      {separador === "atividade" && <Atividade acoes={acoes} sessoes={sessoes} sessaoPorId={sessaoPorId} erro={ligado ? noServidorAcoes.erro : null} />}
      {separador === "convites" && <Convites editar={editar} />}

      <Dialog.Root open={!!aVer} onOpenChange={(v) => !v && setAVer(null)}>
        <Dialog size="lg" className="max-h-[88dvh] overflow-y-auto p-6">
          {aVer && <DetalheDaSessao sessao={aVer} acoes={acoes.filter((a) => a.sessao === aVer.id)} agora={agora ?? 0} />}
        </Dialog>
      </Dialog.Root>
      <Confirmar aberto={apagar} aoMudar={setApagar} titulo="Apagar o histórico de atividade" texto="As sessões e as ações guardadas neste navegador vão ser apagadas (fica só a sessão em curso). O servidor, se estiver ligado, tem o seu próprio registo. Não se pode desfazer." rotuloAcao="Apagar" perigo escrever="APAGAR a atividade" aoConfirmar={() => (void reciclar({ tipo: "Histórico de atividade", rotulo: `Histórico de atividade (${sessoes.length} sessões, ${acoes.length} ações)`, dados: { sessoes: lerSessoes(), acoes: lerAcoes() }, origem: { kind: "atividade" } }), apagarAtividade())} />
    </Pagina>
  );
}

// ---------- as sessões ----------

function Sessoes({ sessoes, agora, aoAbrir, erro }: { sessoes: Sessao[]; agora: number | null; aoAbrir: (s: Sessao) => void; erro: string | null }) {
  const colunas: ColunaSimples<Sessao>[] = [
    { rotulo: "Início", render: (s) => <span className="tabular-nums">{dataHora(s.inicio)}</span> },
    { rotulo: "Utilizador", filtro: (s) => s.utilizador, render: (s) => <button type="button" onClick={() => aoAbrir(s)} className="font-medium hover:underline">{s.utilizador}</button> },
    { rotulo: "Função", filtro: (s) => s.funcao, render: (s) => s.funcao },
    { rotulo: "Estado", render: (s) => (agora ? <Estado valor={estadoDaSessao(s, agora).rotulo} variante={estadoDaSessao(s, agora).variante} /> : "—") },
    { rotulo: "IP", render: (s) => (s.ip ? <code className="text-xs">{s.ip}</code> : "—") },
    { rotulo: "Local", filtro: (s) => rotuloDoLocal(s), render: (s) => rotuloDoLocal(s) },
    { rotulo: "Aparelho", filtro: (s) => `${rotuloDoDispositivo(s.dispositivo)} · ${rotuloDoTipoDeAparelho(s.dispositivo.tipo).toLowerCase()}`, render: (s) => `${rotuloDoDispositivo(s.dispositivo)} · ${rotuloDoTipoDeAparelho(s.dispositivo.tipo).toLowerCase()}` },
    { rotulo: "Duração", direita: true, render: (s) => textoDaDuracao(duracaoDe(s, agora ?? 0)) },
    { rotulo: "Ações", direita: true, render: (s) => inteiro(s.acoes) },
  ];
  return (
    <Cartao titulo={`Sessões${sessoes.length ? ` (${sessoes.length})` : ""}`}>
      {erro ? <Vazio icone="aviso" titulo="Não foi possível ler o servidor" texto={erro} /> : sessoes.length === 0 ? <Vazio icone="pessoa" titulo="Ainda não há sessões" texto="A sessão começa quando se entra no painel." /> : <TabelaSimples colunas={colunas} linhas={sessoes} chave={(s) => s.id} aoClicar={aoAbrir} />}
    </Cartao>
  );
}

function Facto({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-kumo-subtle">{rotulo}</div>
      <div className="mt-0.5 break-words text-sm">{children}</div>
    </div>
  );
}

function DetalheDaSessao({ sessao: s, acoes, agora }: { sessao: Sessao; acoes: Acao[]; agora: number }) {
  const estado = estadoDaSessao(s, agora);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <Dialog.Title className="text-lg font-semibold">Sessão de {s.utilizador}</Dialog.Title>
        <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Facto rotulo="Estado">
          <Estado valor={estado.rotulo} variante={estado.variante} />
        </Facto>
        <Facto rotulo="Função">{s.funcao}</Facto>
        <Facto rotulo="Entrou em">{dataHora(s.inicio)}</Facto>
        <Facto rotulo={s.fim ? "Saiu em" : "Última atividade"}>{dataHora(s.fim ?? s.ultima)}</Facto>
        <Facto rotulo="Duração">{textoDaDuracao(duracaoDe(s, agora))}</Facto>
        <Facto rotulo="Ações">{inteiro(s.acoes)}</Facto>
        <Facto rotulo="Endereço IP">{s.ip ? <code className="text-xs">{s.ip}</code> : "Desconhecido"}</Facto>
        <Facto rotulo="Local">{rotuloDoLocal(s)}</Facto>
        <Facto rotulo="Rede">{s.rede || "—"}</Facto>
        <Facto rotulo="Navegador">{`${s.dispositivo.navegador} ${s.dispositivo.versao}`.trim()}</Facto>
        <Facto rotulo="Sistema">{s.dispositivo.sistema}</Facto>
        <Facto rotulo="Aparelho">{rotuloDoTipoDeAparelho(s.dispositivo.tipo)}</Facto>
        <Facto rotulo="Ecrã">{s.dispositivo.ecra || "—"}</Facto>
        <Facto rotulo="Idioma">{s.dispositivo.idioma || "—"}</Facto>
        <Facto rotulo="Fuso horário">{s.dispositivo.fuso || "—"}</Facto>
      </div>
      <div>
        <div className="mb-2 text-sm font-medium">O que fez</div>
        {acoes.length === 0 ? (
          <p className="text-sm text-kumo-subtle">Nada registado nesta sessão.</p>
        ) : (
          <ul className="flex max-h-80 flex-col divide-y divide-kumo-hairline overflow-y-auto rounded-lg ring ring-kumo-line">
            {acoes.slice(0, 300).map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                <span className="w-16 shrink-0 tabular-nums text-kumo-subtle">{horaCompleta(a.quando)}</span>
                <span className="min-w-0 flex-1">
                  <TextoDaAcao a={a} />
                </span>
                <span className="shrink-0 text-xs text-kumo-subtle">{ROTULO_DO_TIPO[a.tipo]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- a atividade ----------

const TIPOS_DO_FILTRO: Record<string, string> = { todos: "Todos os tipos", ...ROTULO_DO_TIPO };

function Atividade({ acoes, sessoes, sessaoPorId, erro }: { acoes: Acao[]; sessoes: Sessao[]; sessaoPorId: Map<string, Sessao>; erro: string | null }) {
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [sessao, setSessao] = useState("todas");
  const [quantas, setQuantas] = useState(100);
  const lista = useMemo(() => filtrarAcoes(acoes, { texto, tipos: tipo === "todos" ? undefined : [tipo as TipoDeAcao], sessao: sessao === "todas" ? undefined : sessao }), [acoes, texto, tipo, sessao]);
  const itensDeSessao = useMemo(() => ({ todas: "Todas as sessões", ...Object.fromEntries(sessoes.map((s) => [s.id, `${s.utilizador} · ${dataHora(s.inicio)}`])) }), [sessoes]);
  const colunas: ColunaSimples<Acao>[] = [
    { rotulo: "Quando", render: (a) => <span className="tabular-nums">{dataHora(a.quando)}</span> },
    { rotulo: "Quem", filtro: (a) => sessaoPorId.get(a.sessao)?.utilizador ?? "—", render: (a) => sessaoPorId.get(a.sessao)?.utilizador ?? "—" },
    { rotulo: "Tipo", filtro: (a) => String(ROTULO_DO_TIPO[a.tipo]), render: (a) => <Estado valor={ROTULO_DO_TIPO[a.tipo]} variante="neutral" /> },
    { rotulo: "Ação", render: (a) => <TextoDaAcao a={a} /> },
    { rotulo: "Página", filtro: (a) => (a.caminho ? rotuloDaPagina(a.caminho) : "—"), render: (a) => (a.caminho ? rotuloDaPagina(a.caminho) : "—") },
  ];
  return (
    <Cartao titulo={`Ações${lista.length ? ` (${lista.length})` : ""}`}>
      <div className="flex flex-col gap-2 border-b border-kumo-hairline p-3 lg:flex-row">
        <Input aria-label="Pesquisar na atividade" placeholder="Pesquisar nas ações, nos valores e nas páginas" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" className="w-full" />
        <div className="lg:w-48 lg:shrink-0">
          <Select aria-label="Tipo de ação" value={tipo} onValueChange={(v) => setTipo(String(v))} items={TIPOS_DO_FILTRO} />
        </div>
        <div className="lg:w-64 lg:shrink-0">
          <Select aria-label="Sessão" value={sessao} onValueChange={(v) => setSessao(String(v))} items={itensDeSessao} />
        </div>
      </div>
      {erro ? (
        <Vazio icone="aviso" titulo="Não foi possível ler o servidor" texto={erro} />
      ) : acoes.length === 0 ? (
        <Vazio icone="recentes" titulo="Ainda não há atividade" texto="Cada página aberta, clique, definição e mensagem fica aqui." />
      ) : (
        <>
          <TabelaSimples colunas={colunas} linhas={lista.slice(0, quantas)} chave={(a) => a.id} vazio="Nenhuma ação corresponde à pesquisa." />
          {lista.length > quantas && (
            <div className="flex justify-center border-t border-kumo-hairline p-3">
              <Button variant="secondary" onClick={() => setQuantas((q) => q + 200)}>
                Mostrar mais
              </Button>
            </div>
          )}
        </>
      )}
    </Cartao>
  );
}

// ---------- os convites ----------

function Convites({ editar }: { editar: boolean }) {
  const { sessao: entrada } = useSessao();
  const lista = useColecao<Convite>("/v1/painel/convites", "convites", []);
  const emails = useEmails();
  const [novo, setNovo] = useState(false);
  const [email, setEmail] = useState("");
  const [funcao, setFuncao] = useState(FUNCOES[2]?.id ?? FUNCOES[0].id);
  const [mensagem, setMensagem] = useState("");
  const simulado = lista.modo !== "ligado";
  const quem = entrada?.nome || "Alguém da equipa";
  const erro = erroDoConvite(email, funcao, lista.itens);
  const totais = totaisDeConvites(lista.itens);

  // em modo simulado os convites expiram sozinhos quando o prazo passa
  useEffect(() => {
    if (!simulado) return;
    const expirar = () => {
      const depois = expirarConvites(lista.itens, new Date());
      depois.forEach((c, i) => {
        if (c !== lista.itens[i]) {
          void lista.guardar(c);
          registar("convite", `O convite a «${c.email}» expirou sem resposta`);
        }
      });
    };
    expirar();
    const t = window.setInterval(expirar, 60_000);
    return () => window.clearInterval(t);
  }, [simulado, lista.itens]); // eslint-disable-line react-hooks/exhaustive-deps

  const escreverEmail = (c: Convite) => {
    if (!simulado) return; // em modo ligado o servidor envia o e-mail
    const agora = new Date();
    void emails.guardar(enviarEmail(emailNovo(`em-convite-${c.id}-${agora.getTime().toString(36)}`, { de: `Painel <nao-responder@painel.exemplo.com>`, para: c.email, assunto: "Foi convidado para o painel", corpo: corpoDoConvite(c, funcaoPorId(c.funcao).rotulo, "Painel") }, agora), agora));
  };

  const convidar = () => {
    const c = conviteNovo(`cv-${Date.now().toString(36)}`, { email, funcao, convidadoPor: quem, mensagem }, new Date());
    void lista.guardar(c);
    escreverEmail(c);
    registar("convite", `Convidou «${c.email}» com a função «${funcaoPorId(funcao).rotulo}»`);
    setNovo(false);
    setEmail("");
    setMensagem("");
  };
  const responder = (c: Convite, aceite: boolean) => {
    void lista.guardar(responderAoConvite(c, aceite, new Date()));
    registar("convite", `«${c.email}» ${aceite ? "aceitou" : "recusou"} o convite`);
  };

  const colunas: ColunaSimples<Convite>[] = [
    { rotulo: "Pessoa", render: (c) => <span className="font-medium">{c.email}</span> },
    { rotulo: "Função", filtro: (c) => funcaoPorId(c.funcao).rotulo, render: (c) => funcaoPorId(c.funcao).rotulo },
    { rotulo: "Convidado por", filtro: (c) => c.convidadoPor, render: (c) => c.convidadoPor },
    { rotulo: "Enviado", render: (c) => <span className="tabular-nums">{dataHora(c.enviadoEm)}</span> },
    { rotulo: "Resposta", render: (c) => (c.respondidoEm ? <span className="tabular-nums">{dataHora(c.respondidoEm)}</span> : c.estado === "Pendente" ? <span className="text-kumo-subtle">Até {dataHora(c.expiraEm)}</span> : "—") },
    { rotulo: "Estado", filtro: (c) => String(c.estado), render: (c) => <Estado valor={c.estado} variante={ESTADO_DO_CONVITE[c.estado]} /> },
    {
      rotulo: "",
      direita: true,
      render: (c) =>
        !editar ? null : (
          <span className="inline-flex gap-2">
            {c.estado === "Pendente" && simulado && (
              <>
                <Button size="sm" variant="secondary" onClick={() => responder(c, true)}>
                  Simular aceite
                </Button>
                <Button size="sm" variant="secondary" onClick={() => responder(c, false)}>
                  Simular recusa
                </Button>
              </>
            )}
            {c.estado === "Pendente" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void lista.guardar(cancelarConvite(c, new Date()));
                  registar("convite", `Cancelou o convite a «${c.email}»`);
                }}
              >
                Cancelar
              </Button>
            )}
            {c.estado !== "Pendente" && c.estado !== "Aceite" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const r = reenviarConvite(c, new Date());
                  void lista.guardar(r);
                  escreverEmail(r);
                  registar("convite", `Reenviou o convite a «${c.email}»`);
                }}
              >
                Reenviar
              </Button>
            )}
          </span>
        ),
    },
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Estatistica titulo="Por responder" valor={inteiro(totais.Pendente)} numero={totais.Pendente} />
        <Estatistica titulo="Aceites" valor={inteiro(totais.Aceite)} numero={totais.Aceite} />
        <Estatistica titulo="Recusados" valor={inteiro(totais.Recusado)} numero={totais.Recusado} pior />
        <Estatistica titulo="Expirados" valor={inteiro(totais.Expirado + totais.Cancelado)} numero={totais.Expirado + totais.Cancelado} pior />
      </div>
      <Cartao
        titulo={`Convites${lista.itens.length ? ` (${lista.itens.length})` : ""}`}
        acoes={
          editar ? (
            <Button variant="primary" icon={ICONES.mais} onClick={() => setNovo(true)}>
              Convidar
            </Button>
          ) : undefined
        }
      >
        {lista.itens.length === 0 ? <Vazio icone="correio" titulo="Ainda não convidou ninguém" texto="Convide uma pessoa por e-mail e escolha a função que ela recebe ao aceitar." /> : <TabelaSimples colunas={colunas} linhas={[...lista.itens].sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm))} chave={(c) => c.id} />}
      </Cartao>
      <Confirmar aberto={novo} aoMudar={setNovo} titulo="Convidar uma pessoa" texto={null} rotuloAcao="Enviar convite" desativado={!!erro} aoConfirmar={convidar}>
        <div className="flex flex-col gap-3">
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.pt" autoComplete="off" autoFocus />
          <Select label="Função" value={funcao} onValueChange={(v) => setFuncao(String(v))} items={Object.fromEntries(FUNCOES.map((f) => [f.id, f.rotulo]))} />
          <InputArea label="Mensagem" value={mensagem} onValueChange={setMensagem} minRows={3} autoResize />
          {email && erro && <p className="text-sm text-kumo-danger">{erro}</p>}
        </div>
      </Confirmar>
    </>
  );
}
