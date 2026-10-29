// As campanhas de e-mail e os agendados do Marketing. «Campanhas»: os números das enviadas (com gráfico), a lista e o editor (a mensagem, a audiência, o remetente e quando sai: rascunho, já ou agendada, com pré-visualização). «Agendados»: a fila do que vai sair, campanhas e mensagens, por dia, com enviar já, mudar a hora e cancelar. Em modo simulado a fila anda sozinha; em modo ligado é do servidor.
"use client";

import { Button, DropdownMenu, Input, InputArea, Select, Tooltip } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { REMETENTES, REMETENTE_DE_ORIGEM } from "@/dados/email";
import { identificador } from "@/lib/conta";
import {
  agendarCampanha,
  AUDIENCIAS,
  campanhaNova,
  contagemPorDia,
  duplicarCampanha,
  enviarCampanha,
  enviarEmail,
  erroDaCampanha,
  erroDoAgendamento,
  horaDe,
  isoParaLocal,
  localParaIso,
  nomeDe,
  pessoasDaAudiencia,
  quandoFalta,
  rotuloDaAudiencia,
  rotuloDoDia,
  serieDeCampanhas,
  taxaDeAbertura,
  taxaDeCliques,
  taxaDeFalhas,
  totaisDeCampanhas,
  voltarARascunho,
  amanhaAsNove,
  enderecosDe,
  type CampanhaDeEmail,
  type Email,
} from "@/lib/email";
import { useEditar } from "@/lib/permissao";
import { Cartao, Confirmar, Linha } from "../conta/Pecas";
import { Estado } from "../Estado";
import { MenuCartao, SeparadorDeMenu } from "../Flutuantes";
import { Frase } from "../Frase";
import { Ic, ICONES } from "../Icones";
import { SeletorDeDataHora } from "../SeletoresDeTempo";
import { BotaoIcone, CartaoEstatistica, Pagina, Titulo } from "../ui";
import { Vazio } from "../conteudo/ConteudoPecas";
import { useCampanhasDeEmail, useEmails, useFilaSimulada } from "./EmailPecas";
import { AvisoDeApi, dataHora, Estatistica, inteiro, percentagem, TabelaSimples, type ColunaSimples } from "./SuperPecas";

const AUDIENCIAS_ITENS = Object.fromEntries(Object.entries(AUDIENCIAS).map(([id, a]) => [id, `${a.rotulo} (${a.pessoas.toLocaleString("pt-PT")})`]));
const QUANDO = { rascunho: "Guardar como rascunho", agora: "Enviar agora", agendar: "Agendar" } as const;
type ModoDeEnvio = keyof typeof QUANDO;

// ---------- o editor ----------

function Editor({ inicial, aoGuardar, aoDuplicar, aoSair }: { inicial: CampanhaDeEmail; aoGuardar: (c: CampanhaDeEmail, modo: ModoDeEnvio, quando: string) => void; aoDuplicar: () => void; aoSair: () => void }) {
  const editar = useEditar();
  const fechada = inicial.estado === "Enviada" || inicial.estado === "Cancelada" || inicial.estado === "A enviar";
  const [c, setC] = useState(inicial);
  const [modo, setModo] = useState<ModoDeEnvio>(inicial.estado === "Agendada" ? "agendar" : "rascunho");
  const [quando, setQuando] = useState(inicial.agendadaPara ? isoParaLocal(inicial.agendadaPara) : amanhaAsNove(new Date()));
  const [sujo, setSujo] = useState(false);
  const [saida, setSaida] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const mudar = (parcial: Partial<CampanhaDeEmail>) => (setC((x) => ({ ...x, ...parcial })), setSujo(true));
  const pessoas = pessoasDaAudiencia(c.audiencia);
  // um rascunho pode estar incompleto; para enviar ou agendar tem de estar tudo
  const erro = modo === "rascunho" ? (c.nome.trim() ? null : "Dê um nome à campanha.") : (erroDaCampanha(c) ?? (modo === "agendar" ? erroDoAgendamento(quando, new Date()) : null));
  const desativado = !editar || fechada;
  const acao = () => (modo === "agora" ? setConfirmar(true) : (aoGuardar(c, modo, quando), setSujo(false)));

  return (
    <Pagina largo>
      <Titulo titulo={c.nome.trim() || "Campanha nova"}>
        <Button variant="ghost" icon={ICONES.anterior} onClick={() => (sujo ? setSaida(true) : aoSair())}>
          Campanhas
        </Button>
        {fechada ? (
          editar && (
            <Button variant="secondary" onClick={aoDuplicar}>
              Duplicar
            </Button>
          )
        ) : (
          <Button variant="primary" disabled={!editar || !!erro || (modo === "rascunho" && !sujo)} onClick={acao}>
            {modo === "rascunho" ? "Guardar rascunho" : modo === "agora" ? "Enviar agora" : "Agendar envio"}
          </Button>
        )}
      </Titulo>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Cartao titulo="Mensagem">
            <div className="flex flex-col gap-4 p-4">
              <Input label="Nome da campanha" value={c.nome} disabled={desativado} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Só a equipa o vê" autoComplete="off" />
              <Input label="Assunto" value={c.assunto} disabled={desativado} onChange={(e) => mudar({ assunto: e.target.value })} placeholder="O que a pessoa lê antes de abrir" autoComplete="off" />
              <InputArea label="Mensagem" value={c.corpo} disabled={desativado} onValueChange={(v) => mudar({ corpo: v })} minRows={10} autoResize />
            </div>
          </Cartao>
          {inicial.estado === "Enviada" && (
            <Cartao titulo="Resultados">
              <div className="grid grid-cols-2 gap-px bg-kumo-hairline sm:grid-cols-5">
                {[
                  ["Destinatários", inteiro(inicial.destinatarios)],
                  ["Entregues", inteiro(inicial.entregues)],
                  ["Abertos", `${inteiro(inicial.abertos)} (${percentagem(taxaDeAbertura(inicial), 1)})`],
                  ["Cliques", `${inteiro(inicial.cliques)} (${percentagem(taxaDeCliques(inicial), 1)})`],
                  ["Falhas", `${inteiro(inicial.falhas)} (${percentagem(taxaDeFalhas(inicial), 1)})`],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex flex-col gap-0.5 bg-kumo-base p-4">
                    <span className="text-[13px] text-kumo-subtle">{rotulo}</span>
                    <span className="text-base font-semibold tabular-nums text-kumo-default">{valor}</span>
                  </div>
                ))}
              </div>
            </Cartao>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
          <Cartao titulo="Envio">
            <div className="flex flex-col gap-4 p-4">
              <Select label="Audiência" value={c.audiencia} disabled={desativado} onValueChange={(v) => mudar({ audiencia: String(v) })} items={AUDIENCIAS_ITENS} />
              <Select label="Remetente" value={c.remetente || REMETENTE_DE_ORIGEM} disabled={desativado} onValueChange={(v) => mudar({ remetente: String(v) })} items={REMETENTES} />
              {!fechada && (
                <>
                  <Select label="Quando" value={modo} onValueChange={(v) => (setModo(String(v) as ModoDeEnvio), setSujo(true))} items={QUANDO} disabled={desativado} />
                  {modo === "agendar" && <SeletorDeDataHora label="Enviar em" valor={quando} aoMudar={(v) => (setQuando(v), setSujo(true))} minimo={new Date()} erro={erroDoAgendamento(quando, new Date()) ?? undefined} />}
                </>
              )}
              {inicial.estado === "Enviada" && inicial.enviadaEm && <span className="text-sm text-kumo-subtle">Enviada a {dataHora(inicial.enviadaEm)}.</span>}
            </div>
          </Cartao>
          <Cartao titulo="Pré-visualização">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-0.5 text-[13px] text-kumo-subtle">
                <span>
                  De <span className="text-kumo-default">{nomeDe(c.remetente || REMETENTE_DE_ORIGEM)}</span>
                </span>
                <span>
                  Para <span className="text-kumo-default">{rotuloDaAudiencia(c.audiencia)}</span> · {pessoas.toLocaleString("pt-PT")} pessoas
                </span>
              </div>
              <div className="rounded-lg bg-kumo-tint p-4">
                <div className="mb-2 text-sm font-semibold text-kumo-default">{c.assunto.trim() || "Sem assunto"}</div>
                <div className="whitespace-pre-wrap break-words text-sm leading-6 text-kumo-default">{c.corpo.trim() || "A mensagem aparece aqui."}</div>
              </div>
            </div>
          </Cartao>
        </div>
      </div>
      <Confirmar aberto={saida} aoMudar={setSaida} titulo="Sair sem guardar?" texto="As alterações a esta campanha ainda não foram guardadas." rotuloAcao="Sair sem guardar" perigo aoConfirmar={aoSair} />
      <Confirmar aberto={confirmar} aoMudar={setConfirmar} titulo="Enviar agora" texto={`«${c.nome.trim()}» vai ser enviada agora a ${pessoas.toLocaleString("pt-PT")} pessoas (${rotuloDaAudiencia(c.audiencia)}). Não se pode desfazer.`} rotuloAcao="Enviar" aoConfirmar={() => (aoGuardar(c, "agora", quando), setSujo(false))} />
    </Pagina>
  );
}

// ---------- as campanhas ----------

export function CampanhasDeEmail() {
  const editar = useEditar();
  const campanhas = useCampanhasDeEmail();
  const agora = useFilaSimulada({ campanhas });
  const [aEditar, setAEditar] = useState<CampanhaDeEmail | null>(null);
  const [enviarJa, setEnviarJa] = useState<CampanhaDeEmail | null>(null);
  const [apagar, setApagar] = useState<CampanhaDeEmail | null>(null);
  const ligado = campanhas.modo === "ligado";
  const ordenadas = useMemo(() => [...campanhas.itens].sort((a, b) => b.atualizada.localeCompare(a.atualizada)), [campanhas.itens]);
  const totais = useMemo(() => totaisDeCampanhas(campanhas.itens), [campanhas.itens]);
  const serie = (f: (c: CampanhaDeEmail) => number) => serieDeCampanhas(campanhas.itens, f);

  const enviarJaAgora = (c: CampanhaDeEmail) => void campanhas.guardar(ligado ? { ...c, estado: "A enviar", agendadaPara: undefined, atualizada: new Date().toISOString() } : enviarCampanha(c, new Date()));
  const guardar = (c: CampanhaDeEmail, modo: ModoDeEnvio, quando: string) => {
    const agoraDt = new Date();
    const limpa = { ...c, nome: c.nome.trim(), assunto: c.assunto.trim(), corpo: c.corpo.trim(), atualizada: agoraDt.toISOString() };
    if (modo === "agora") enviarJaAgora(limpa);
    else void campanhas.guardar(modo === "agendar" ? agendarCampanha(limpa, localParaIso(quando), agoraDt) : voltarARascunho(limpa, agoraDt));
    setAEditar(null);
  };

  if (aEditar)
    return <Editor key={aEditar.id} inicial={aEditar} aoGuardar={guardar} aoDuplicar={() => (void campanhas.guardar(duplicarCampanha(aEditar, identificador(), new Date())), setAEditar(null))} aoSair={() => setAEditar(null)} />;

  const colunas: ColunaSimples<CampanhaDeEmail>[] = [
    {
      rotulo: "Campanha",
      render: (c) => (
        <div className="min-w-0">
          <button type="button" onClick={() => setAEditar(c)} className="max-w-72 truncate text-left font-medium hover:underline">
            <Frase>{c.nome}</Frase>
          </button>
          <div className="max-w-72 truncate text-[13px] text-kumo-subtle">{c.assunto}</div>
        </div>
      ),
    },
    { rotulo: "Audiência", render: (c) => rotuloDaAudiencia(c.audiencia) },
    { rotulo: "Estado", render: (c) => <Estado valor={c.estado} /> },
    {
      rotulo: "Envio",
      render: (c) => (c.estado === "Enviada" && c.enviadaEm ? <span className="tabular-nums">{dataHora(c.enviadaEm)}</span> : c.estado === "Agendada" && c.agendadaPara ? <span className="tabular-nums">{dataHora(c.agendadaPara)}</span> : "—"),
    },
    { rotulo: "Abertura", direita: true, render: (c) => (c.estado === "Enviada" ? percentagem(taxaDeAbertura(c), 1) : "—") },
    { rotulo: "Cliques", direita: true, render: (c) => (c.estado === "Enviada" ? percentagem(taxaDeCliques(c), 1) : "—") },
    {
      rotulo: "",
      direita: true,
      render: (c) => (
        <DropdownMenu>
          <Tooltip content="Mais opções da campanha" render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="sm" icon={ICONES.mais3} aria-label={`Mais opções de ${c.nome}`} />} />} />
          <MenuCartao className="w-[220px]">
            <DropdownMenu.Item icon={<Ic nome={editar && c.estado !== "Enviada" ? "campos" : "olho"} />} onClick={() => setAEditar(c)}>
              {editar && c.estado !== "Enviada" && c.estado !== "Cancelada" ? "Editar" : "Ver"}
            </DropdownMenu.Item>
            {editar && (c.estado === "Rascunho" || c.estado === "Agendada") && (
              <DropdownMenu.Item icon={<Ic nome="enviar" />} disabled={!!erroDaCampanha(c)} onClick={() => setEnviarJa(c)}>
                Enviar agora
              </DropdownMenu.Item>
            )}
            {editar && c.estado === "Agendada" && (
              <DropdownMenu.Item icon={<Ic nome="fechar" />} onClick={() => void campanhas.guardar(voltarARascunho(c, new Date()))}>
                Cancelar o agendamento
              </DropdownMenu.Item>
            )}
            {editar && (
              <DropdownMenu.Item icon={<Ic nome="copiar" />} onClick={() => void campanhas.guardar(duplicarCampanha(c, identificador(), new Date()))}>
                Duplicar
              </DropdownMenu.Item>
            )}
            {editar && c.estado !== "A enviar" && (
              <>
                <SeparadorDeMenu />
                <DropdownMenu.Item variant="danger" icon={<Ic nome="lixo" />} onClick={() => setApagar(c)}>
                  Remover
                </DropdownMenu.Item>
              </>
            )}
          </MenuCartao>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <Pagina>
      <Titulo titulo="Campanhas de e-mail">
        {editar && (
          <Button variant="primary" icon={ICONES.mais} onClick={() => setAEditar(campanhaNova(identificador(), new Date(), REMETENTE_DE_ORIGEM))}>
            Nova campanha
          </Button>
        )}
      </Titulo>
      <AvisoDeApi erro={campanhas.erro} aoTentar={campanhas.recarregar} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Estatistica titulo="E-mails enviados" valor={inteiro(totais.destinatarios)} dica="Soma dos destinatários das campanhas enviadas." numero={totais.destinatarios} serie={serie((c) => c.destinatarios)} />
        <Estatistica titulo="Taxa de abertura" valor={percentagem(totais.aberturas, 1)} dica="Das mensagens entregues, quantas foram abertas." numero={totais.aberturas * 100} serie={serie((c) => taxaDeAbertura(c) * 100)} />
        <Estatistica titulo="Taxa de cliques" valor={percentagem(totais.cliques, 1)} dica="Das mensagens entregues, quantas tiveram um clique numa ligação." numero={totais.cliques * 100} serie={serie((c) => taxaDeCliques(c) * 100)} />
        <Estatistica titulo="Falhas de entrega" valor={percentagem(totais.falhas, 1)} pior dica="Mensagens que não chegaram: endereços que não existem, caixas cheias." numero={totais.falhas * 100} serie={serie((c) => taxaDeFalhas(c) * 100)} />
      </div>
      <Cartao titulo={`Campanhas${ordenadas.length ? ` (${ordenadas.length})` : ""}`}>
        {!agora || campanhas.aCarregar ? (
          <div className="p-6 text-sm text-kumo-subtle">A abrir as campanhas…</div>
        ) : ordenadas.length === 0 ? (
          <Vazio icone="correio" titulo="Ainda não há campanhas" texto="Crie a primeira: escolha a audiência, escreva a mensagem e envie ou agende." />
        ) : (
          <TabelaSimples colunas={colunas} linhas={ordenadas} chave={(c) => c.id} />
        )}
      </Cartao>
      <Confirmar
        aberto={!!enviarJa}
        aoMudar={(v) => !v && setEnviarJa(null)}
        titulo="Enviar agora"
        texto={enviarJa ? `«${enviarJa.nome}» vai ser enviada agora a ${pessoasDaAudiencia(enviarJa.audiencia).toLocaleString("pt-PT")} pessoas (${rotuloDaAudiencia(enviarJa.audiencia)}). Não se pode desfazer.` : ""}
        rotuloAcao="Enviar"
        aoConfirmar={() => enviarJa && enviarJaAgora(enviarJa)}
      />
      <Confirmar
        aberto={!!apagar}
        aoMudar={(v) => !v && setApagar(null)}
        titulo="Remover a campanha"
        texto={apagar ? `«${apagar.nome}» e os seus resultados vão ser removidos. Não se pode desfazer.` : ""}
        rotuloAcao="Remover"
        perigo
        escrever={apagar ? `APAGAR ${apagar.nome.toLowerCase()}` : undefined}
        aoConfirmar={() => apagar && void campanhas.remover(apagar.id)}
      />
    </Pagina>
  );
}

// ---------- os agendados ----------

interface ItemAgendado {
  chave: string;
  tipo: "campanha" | "email";
  quando: string;
  titulo: string;
  /** Para quem vai: a audiência de uma campanha ou os destinatários de uma mensagem. */
  destino: string;
  pessoas: number;
  campanha?: CampanhaDeEmail;
  email?: Email;
}

export function EmailsAgendados() {
  const editar = useEditar();
  const emails = useEmails();
  const campanhas = useCampanhasDeEmail();
  const agora = useFilaSimulada({ emails, campanhas });
  const ligado = emails.modo === "ligado";
  const [enviarJa, setEnviarJa] = useState<ItemAgendado | null>(null);
  const [cancelar, setCancelar] = useState<ItemAgendado | null>(null);
  const [mudar, setMudar] = useState<{ item: ItemAgendado; quando: string } | null>(null);

  const itens = useMemo<ItemAgendado[]>(() => {
    const deMensagens = emails.itens
      .filter((e) => e.pasta === "agendados")
      .map<ItemAgendado>((e) => ({ chave: `e-${e.id}`, tipo: "email", quando: e.data, titulo: e.assunto, destino: e.para, pessoas: enderecosDe(e.para).length, email: e }));
    const deCampanhas = campanhas.itens
      .filter((c) => c.estado === "Agendada" && c.agendadaPara)
      .map<ItemAgendado>((c) => ({ chave: `c-${c.id}`, tipo: "campanha", quando: c.agendadaPara!, titulo: c.nome, destino: rotuloDaAudiencia(c.audiencia), pessoas: pessoasDaAudiencia(c.audiencia), campanha: c }));
    return [...deMensagens, ...deCampanhas].sort((a, b) => a.quando.localeCompare(b.quando));
  }, [emails.itens, campanhas.itens]);
  const porDia = useMemo(() => {
    const grupos = new Map<string, ItemAgendado[]>();
    if (agora) for (const i of itens) grupos.set(rotuloDoDia(i.quando, agora), [...(grupos.get(rotuloDoDia(i.quando, agora)) ?? []), i]);
    return [...grupos];
  }, [itens, agora]);

  const enviar = (i: ItemAgendado) => {
    if (i.email) void emails.guardar(ligado ? { ...i.email, pasta: "enviados", data: new Date().toISOString() } : enviarEmail(i.email, new Date()));
    if (i.campanha) void campanhas.guardar(ligado ? { ...i.campanha, estado: "A enviar", agendadaPara: undefined, atualizada: new Date().toISOString() } : enviarCampanha(i.campanha, new Date()));
  };
  const reagendar = (i: ItemAgendado, local: string) => {
    const iso = localParaIso(local);
    if (i.email) void emails.guardar({ ...i.email, data: iso });
    if (i.campanha) void campanhas.guardar(agendarCampanha(i.campanha, iso, new Date()));
  };
  const cancelarEnvio = (i: ItemAgendado) => {
    if (i.email) void emails.remover(i.email.id);
    if (i.campanha) void campanhas.guardar(voltarARascunho(i.campanha, new Date()));
  };

  const proximo = itens[0];
  const dias = agora ? 7 : 0;
  const contagem = agora ? contagemPorDia(itens, (i) => i.quando, agora, dias) : [];
  const destinatarios = agora ? contagemPorDia(itens, (i) => i.quando, agora, dias, (i) => i.pessoas) : [];

  return (
    <Pagina>
      <Titulo titulo="E-mails agendados" />
      <AvisoDeApi erro={emails.erro ?? campanhas.erro} aoTentar={() => (emails.recarregar(), campanhas.recarregar())} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Estatistica titulo="Agendados" valor={inteiro(itens.length)} dica="Campanhas e mensagens à espera da hora de saírem. O gráfico mostra quantas saem em cada um dos próximos 7 dias." numero={itens.length} serie={contagem} />
        <Estatistica titulo="Destinatários" valor={inteiro(itens.reduce((s, i) => s + i.pessoas, 0))} dica="Pessoas que vão receber o que está agendado. O gráfico mostra quantas em cada um dos próximos 7 dias." numero={itens.reduce((s, i) => s + i.pessoas, 0)} serie={destinatarios} />
        <CartaoEstatistica titulo="Próximo envio" valor={proximo && agora ? quandoFalta(proximo.quando, agora) : "—"} variacao={null} valores={[]} dica="Quanto falta para a próxima campanha ou mensagem sair." />
      </div>
      {!agora || emails.aCarregar || campanhas.aCarregar ? (
        <Cartao titulo="Agendados">
          <div className="p-6 text-sm text-kumo-subtle">A abrir a fila…</div>
        </Cartao>
      ) : itens.length === 0 ? (
        <Cartao titulo="Agendados">
          <Vazio icone="relogio" titulo="Nada agendado" texto="Agende uma campanha ou escreva uma mensagem para mais tarde e aparece aqui." />
        </Cartao>
      ) : (
        porDia.map(([dia, lista]) => (
          <Cartao key={dia} titulo={`${dia[0].toUpperCase()}${dia.slice(1)}`}>
            {lista.map((i) => (
              <Linha
                key={i.chave}
                titulo={
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="truncate">
                      <Frase>{i.titulo}</Frase>
                    </span>
                    <Estado valor={i.tipo === "campanha" ? "Campanha" : "E-mail"} variante="neutral" />
                  </span>
                }
                estado={`${horaDe(i.quando)}, ${quandoFalta(i.quando, agora)} · ${i.destino}${i.tipo === "campanha" ? ` (${i.pessoas.toLocaleString("pt-PT")})` : ""}`}
              >
                {editar && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEnviarJa(i)}>
                      Enviar agora
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setMudar({ item: i, quando: isoParaLocal(i.quando) })}>
                      Mudar a hora
                    </Button>
                    <BotaoIcone dica={i.tipo === "campanha" ? "Cancelar o agendamento" : "Cancelar o envio"} icone="fechar" aoClicar={() => setCancelar(i)} />
                  </div>
                )}
              </Linha>
            ))}
          </Cartao>
        ))
      )}
      <Confirmar aberto={!!enviarJa} aoMudar={(v) => !v && setEnviarJa(null)} titulo="Enviar agora" texto={enviarJa ? `«${enviarJa.titulo}» vai ser enviada agora, sem esperar pela hora marcada, a ${enviarJa.pessoas.toLocaleString("pt-PT")} ${enviarJa.pessoas === 1 ? "pessoa" : "pessoas"}. Não se pode desfazer.` : ""} rotuloAcao="Enviar" aoConfirmar={() => enviarJa && enviar(enviarJa)} />
      <Confirmar
        aberto={!!cancelar}
        aoMudar={(v) => !v && setCancelar(null)}
        titulo={cancelar?.tipo === "campanha" ? "Cancelar o agendamento" : "Cancelar o envio"}
        texto={cancelar ? (cancelar.tipo === "campanha" ? `«${cancelar.titulo}» deixa de estar agendada e volta a rascunho.` : `«${cancelar.titulo}» não vai ser enviada e é removida da fila.`) : ""}
        rotuloAcao={cancelar?.tipo === "campanha" ? "Cancelar o agendamento" : "Cancelar o envio"}
        perigo
        aoConfirmar={() => cancelar && cancelarEnvio(cancelar)}
      />
      <Confirmar aberto={!!mudar} aoMudar={(v) => !v && setMudar(null)} titulo="Mudar a hora" texto={mudar ? `Quando deve sair «${mudar.item.titulo}»?` : ""} rotuloAcao="Guardar" desativado={!mudar || !!erroDoAgendamento(mudar.quando, new Date())} aoConfirmar={() => mudar && reagendar(mudar.item, mudar.quando)}>
        {mudar && <SeletorDeDataHora valor={mudar.quando} aoMudar={(v) => setMudar({ ...mudar, quando: v })} minimo={new Date()} erro={erroDoAgendamento(mudar.quando, new Date()) ?? undefined} />}
      </Confirmar>
    </Pagina>
  );
}
