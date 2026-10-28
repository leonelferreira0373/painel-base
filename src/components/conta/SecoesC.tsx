// Definições da conta, parte 3: notificações (e-mail, canais, silêncio, ausência) e lembretes (criar, ligar, repetir; avisam enquanto a página está aberta).
"use client";

import { Badge, Banner, Button, Empty, Input, InputArea, Select } from "@cloudflare/kumo";
import { useState } from "react";
import { EVENTOS } from "@/dados/conta";
import { FUNCOES } from "@/dados/rbac";
import { identificador, useConta, type Canais, type Repeticao } from "@/lib/conta";
import { useApp } from "@/lib/estado";
import { Dica } from "../Dica";
import { ICONES, Ic } from "../Icones";
import { Cartao, Interruptor, Linha, LinhaCampo, haTempo } from "./Pecas";

export function SecaoNotificacoes() {
  const { conta, mudar } = useConta();
  const { funcao } = useApp();
  const outras = FUNCOES.filter((f) => f.id !== funcao.id);
  const ligar = (evento: string, canal: keyof Canais, v: boolean) => mudar((c) => ({ notif: { ...c.notif, [evento]: { ...c.notif[evento], [canal]: v } } }));

  return (
    <>
      <Cartao titulo="E-mail" dica="Desligar não apaga as suas escolhas: só deixa de enviar, e volta a enviar quando ligar outra vez.">
        <Linha titulo="Receber e-mails do painel" estado={conta.receberEmails ? "Ligado: recebe o que escolher abaixo." : "Desligado: só os avisos de segurança continuam a chegar por e-mail."}>
          <Interruptor marcado={conta.receberEmails} aoMudar={(v) => mudar({ receberEmails: v }, v ? "E-mails ligados" : "E-mails desligados")} rotulo="Receber e-mails do painel" />
        </Linha>
        <Linha titulo="Resumo por e-mail" dica="Um só e-mail com tudo o que aconteceu, em vez de um por pedido.">
          <Select value={conta.resumo} onValueChange={(v) => mudar({ resumo: String(v) as "nunca" | "diario" | "semanal" }, "Frequência do resumo alterada")} aria-label="Resumo" disabled={!conta.receberEmails} className="w-40" items={{ nunca: "Nunca", diario: "Todos os dias", semanal: "Todas as semanas" }} />
          {conta.resumo !== "nunca" && <Input type="time" aria-label="Hora do resumo" disabled={!conta.receberEmails} value={conta.horaResumo} onChange={(e) => mudar({ horaResumo: e.target.value })} className="w-28" />}
        </Linha>
      </Cartao>

      <Cartao titulo="O que quer receber" dica="Escolha, para cada acontecimento, por onde quer ser avisado.">
        <div className="grid grid-cols-[1fr_repeat(3,3rem)] items-center gap-x-1.5 sm:grid-cols-[1fr_repeat(3,3.75rem)] sm:gap-x-2 border-t border-kumo-hairline px-4 py-2 text-xs font-medium text-kumo-subtle first:border-t-0">
          <span>Acontecimento</span>
          <span className="text-center">E-mail</span>
          <span className="text-center">No painel</span>
          <span className="text-center">SMS</span>
        </div>
        {EVENTOS.map((e) => {
          const c = conta.notif[e.id] ?? { email: false, painel: true, telefone: false };
          return (
            <div key={e.id} className="grid grid-cols-[1fr_repeat(3,3rem)] items-center gap-x-1.5 sm:grid-cols-[1fr_repeat(3,3.75rem)] sm:gap-x-2 border-t border-kumo-hairline px-4 py-3">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium">
                {e.rotulo}
                <Dica conteudo={e.dica}>
                  <span className="inline-flex cursor-help text-kumo-inactive max-sm:hidden">
                    <Ic nome="info" tamanho={13} />
                  </span>
                </Dica>
              </span>
              <span className="flex justify-center">
                <Interruptor marcado={e.obrigatorioEmail ? true : c.email && conta.receberEmails} desativado={!!e.obrigatorioEmail || !conta.receberEmails} aoMudar={(v) => ligar(e.id, "email", v)} rotulo={`${e.rotulo}: e-mail`} />
              </span>
              <span className="flex justify-center">
                <Interruptor marcado={c.painel} aoMudar={(v) => ligar(e.id, "painel", v)} rotulo={`${e.rotulo}: no painel`} />
              </span>
              <span className="flex justify-center">
                <Interruptor marcado={c.telefone} aoMudar={(v) => ligar(e.id, "telefone", v)} rotulo={`${e.rotulo}: SMS`} />
              </span>
            </div>
          );
        })}
      </Cartao>

      <Cartao titulo="Não incomodar" dica="Nestas horas guardamos os avisos e entregamo-los de uma vez quando acabar o silêncio. Os de segurança passam sempre.">
        <Linha titulo="Silenciar os avisos">
          <Interruptor marcado={conta.silencio.ativo} aoMudar={(v) => mudar((c) => ({ silencio: { ...c.silencio, ativo: v } }), v ? "Não incomodar ligado" : "Não incomodar desligado")} rotulo="Silenciar os avisos" />
        </Linha>
        {conta.silencio.ativo && (
          <LinhaCampo>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Das" type="time" value={conta.silencio.de} onChange={(e) => mudar((c) => ({ silencio: { ...c.silencio, de: e.target.value } }))} />
              <Input label="Às" type="time" value={conta.silencio.ate} onChange={(e) => mudar((c) => ({ silencio: { ...c.silencio, ate: e.target.value } }))} />
            </div>
          </LinhaCampo>
        )}
      </Cartao>

      <Cartao titulo="Ausência e delegação" dica="Enquanto estiver ausente, as aprovações que lhe chegarem vão para a pessoa que escolher, e quem lhe escrever recebe a sua mensagem.">
        <Linha titulo="Estou ausente">
          <Interruptor marcado={conta.ausencia.ativa} aoMudar={(v) => mudar((c) => ({ ausencia: { ...c.ausencia, ativa: v } }), v ? "Ausência ligada" : "Ausência desligada")} rotulo="Estou ausente" />
        </Linha>
        {conta.ausencia.ativa && (
          <LinhaCampo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Regresso em" type="date" value={conta.ausencia.ate} onChange={(e) => mudar((c) => ({ ausencia: { ...c.ausencia, ate: e.target.value } }))} />
              <Select label="Delegar as aprovações a" value={conta.ausencia.delegar} onValueChange={(v) => mudar((c) => ({ ausencia: { ...c.ausencia, delegar: String(v) } }), "Pessoa delegada alterada")} items={Object.fromEntries(outras.map((f) => [f.id, `${f.pessoa} (${f.rotulo})`]))} />
            </div>
            <InputArea label="Mensagem automática" value={conta.ausencia.mensagem} onValueChange={(v) => mudar((c) => ({ ausencia: { ...c.ausencia, mensagem: v } }))} minRows={2} autoResize />
          </LinhaCampo>
        )}
      </Cartao>
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const paraCampo = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const daquiA = (ms: number) => paraCampo(new Date(Date.now() + ms));
const amanha9 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return paraCampo(d);
};
const segunda9 = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  d.setHours(9, 0, 0, 0);
  return paraCampo(d);
};
const REPETICOES: Record<Repeticao, string> = { nao: "Não repetir", diario: "Todos os dias", semanal: "Todas as semanas", mensal: "Todos os meses" };

export function SecaoLembretes() {
  const { conta, mudar } = useConta();
  const { avisar } = useApp();
  const [titulo, setTitulo] = useState("");
  const [quando, setQuando] = useState(daquiA(3_600_000));
  const [repetir, setRepetir] = useState<Repeticao>("nao");
  const [canal, setCanal] = useState<"painel" | "email">("painel");
  const ordenados = [...conta.lembretes].sort((a, b) => a.quando.localeCompare(b.quando));
  const passado = quando && new Date(quando).getTime() <= Date.now();

  const estado = (l: (typeof conta.lembretes)[number]) => {
    const t = new Date(l.quando).getTime();
    if (l.disparado) return <Badge variant="secondary">Já avisou</Badge>;
    if (!l.ativo) return <Badge variant="outline">Desligado</Badge>;
    return t <= Date.now() ? <Badge variant="warning">A avisar</Badge> : <Badge variant="info">{haTempo(l.quando)}</Badge>;
  };

  return (
    <>
      <Cartao titulo="Novo lembrete" dica="Avisa-o à hora marcada enquanto o painel estiver aberto; por e-mail, também fora dele.">
        <LinhaCampo>
          <Input label="O que quer lembrar" placeholder="Por exemplo, confirmar a recolha das 06:00" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Quando" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} error={passado ? "Escolha uma hora que ainda não passou." : undefined} />
            <Select label="Repetir" value={repetir} onValueChange={(v) => setRepetir(String(v) as Repeticao)} items={REPETICOES} />
            <Select label="Avisar por" value={canal} onValueChange={(v) => setCanal(String(v) as "painel" | "email")} items={{ painel: "No painel", email: "No painel e por e-mail" }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setQuando(daquiA(3_600_000))}>
                Daqui a 1 hora
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setQuando(amanha9())}>
                Amanhã às 09:00
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setQuando(segunda9())}>
                Segunda às 09:00
              </Button>
            </div>
            <Button
              variant="primary"
              icon={ICONES.mais}
              disabled={!titulo.trim() || !quando || !!passado}
              onClick={() => {
                mudar((c) => ({ lembretes: [...c.lembretes, { id: identificador(), titulo: titulo.trim(), quando, repetir, canal, ativo: true }] }), `Lembrete criado: ${titulo.trim()}`);
                avisar("Lembrete criado");
                setTitulo("");
                setQuando(daquiA(3_600_000));
              }}
            >
              Adicionar lembrete
            </Button>
          </div>
        </LinhaCampo>
      </Cartao>

      <Cartao titulo="Os meus lembretes">
        {ordenados.length === 0 ? (
          <Empty size="sm" icon={<Ic nome="lembrete" tamanho={32} />} title="Sem lembretes" />
        ) : (
          ordenados.map((l) => (
            <Linha key={l.id} titulo={<span className="inline-flex flex-wrap items-center gap-2">{l.titulo}{estado(l)}</span>} estado={`${new Date(l.quando).toLocaleString("pt-PT", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${REPETICOES[l.repetir].toLowerCase()} · ${l.canal === "email" ? "painel e e-mail" : "painel"}`}>
              <Interruptor marcado={l.ativo} aoMudar={(v) => mudar((c) => ({ lembretes: c.lembretes.map((x) => (x.id === l.id ? { ...x, ativo: v, disparado: v ? false : x.disparado } : x)) }))} rotulo={`Ligar o lembrete ${l.titulo}`} />
              <Dica conteudo="Apagar o lembrete">
                <Button variant="ghost" shape="square" icon={ICONES.lixo} aria-label="Apagar o lembrete" onClick={() => mudar((c) => ({ lembretes: c.lembretes.filter((x) => x.id !== l.id) }), `Lembrete apagado: ${l.titulo}`)} />
              </Dica>
            </Linha>
          ))
        )}
      </Cartao>
      {conta.lembretes.some((l) => l.canal === "email") && <Banner variant="default" title="Os lembretes por e-mail são enviados para o e-mail da conta." />}
    </>
  );
}
