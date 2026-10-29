// Ferramentas de programador, segunda parte: cópias de segurança (destino, agenda, criar, restaurar), firewall (ligar e desligar, limite, regras, bloqueios), páginas do site (ativar, manutenção, desativar), envio de e-mails (registo, SMTP, teste, DNS), ligação às APIs e limpeza de dados. Em modo simulado tudo vive no navegador; em modo ligado cada ação chama o contrato.
"use client";

import { Badge, Button, Input, InputArea, Select, Tabs } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { DIAS_DE_DADOS, FREQUENCIA_DE_COPIA, LIMITE_POR_MINUTO, PORTA_SMTP, RETENCAO_DE_COPIAS } from "@/dados/personalizados";
import { gerarBackups, gerarBloqueios, gerarEmails, PAGINAS_DE_ORIGEM, REGRAS_DE_ORIGEM, type Backup, type Bloqueio, type EmailEnviado, type PaginaSite, type RegraFirewall } from "@/dados/super-dados";
import { chamar, erroDoEndereco, guardarLigacao, useApi, useLigacao, type LigacaoApi } from "@/lib/api/cliente";
import { useColecao } from "@/lib/api/colecao";
import { comoCurl, ENDPOINTS, paraOpenApi } from "@/lib/api/contrato";
import { formatarTamanho } from "@/lib/biblioteca";
import { DESTINOS, destinosAtivos, destinosDaConfig, emailValido, erroDoAlvo, erroDoDestino, erroDoNovoDestino, linhasApagadas, rotuloDoDestino, type DestinoDeCopia, type TipoDeDestino } from "@/lib/dev";
import { useApp } from "@/lib/estado";
import { escolherPasta, escreverNaPasta, guardarPasta, lerPasta, licencaDaPasta, podeEscolherPasta, tirarPasta, type PastaDoNavegador } from "@/lib/pasta-do-navegador";
import { frasaDaRota, textoDaRota } from "@/lib/rotas";
import { useEditar } from "@/lib/permissao";
import { acumular, agrupar, contarPorIntervalo, instante, intervalosPara, razao, somarPorIntervalo } from "@/lib/serie";
import { CampoSenha } from "../auth/CampoSenha";
import { useAcessoDeIp } from "./AcessoDeIp";
import { BotaoCopiar, Cartao, Confirmar, descarregar, Interruptor, Linha, LinhaCampo } from "../conta/Pecas";
import { Estado } from "../Estado";
import { Frase, Rota } from "../Frase";
import { ICONES } from "../Icones";
import { SeletorPersonalizavel } from "../SeletorPersonalizavel";
import { SeletorDeHora } from "../SeletoresDeTempo";
import { BotaoIcone, Pagina, Titulo } from "../ui";
import { AvisoDeApi, dataHora, Estatistica, horaCompleta, inteiro, percentagem, TabelaSimples, useGuardado, useTick, type ColunaSimples } from "./SuperPecas";

// ---------- cópias de segurança ----------

interface ConfigDeCopias {
  /** Os sítios para onde vai cada cópia: pode haver vários ao mesmo tempo. */
  destinos: DestinoDeCopia[];
  automatico: boolean;
  frequencia: string;
  hora: string;
  retencao: string;
}

const COPIAS_DE_ORIGEM: ConfigDeCopias = { destinos: [{ id: "dest-1", nome: "Nuvem", tipo: "s3", endereco: "s3://copias/painel", ativo: true }], automatico: true, frequencia: "24", hora: "02:00", retencao: "14" };

type ResultadoDoTeste = { ok: boolean; texto: string } | "a-testar";
const DESTINO_VAZIO = { nome: "", tipo: "endpoint" as TipoDeDestino, endereco: "", pasta: false };
const PLACEHOLDER_DO_ENDERECO: Record<TipoDeDestino, string> = { s3: "s3://nome-do-balde/pasta", sftp: "sftp://servidor/pasta", local: "/var/copias", drive: "Identificador da pasta", endpoint: "http://192.168.0.50:9000/copias", offline: "D:\\copias  ou  \\\\NAS\\copias" };

export function Backups() {
  const ligacao = useLigacao();
  const { avisar } = useApp();
  const editar = useEditar();
  const colecao = useColecao<Backup>("/v1/dev/backups", "backups", gerarBackups());
  const [bruta, setBruta] = useGuardado<ConfigDeCopias & { tipo?: TipoDeDestino; endereco?: string }>("backups-config", COPIAS_DE_ORIGEM);
  // as configurações antigas tinham um só destino: passam a ter um na lista
  const config = useMemo<ConfigDeCopias>(() => ({ ...COPIAS_DE_ORIGEM, ...bruta, destinos: destinosDaConfig(bruta) }), [bruta]);
  const [rascunho, setRascunho] = useState(config);
  const [testes, setTestes] = useState<Record<string, ResultadoDoTeste>>({});
  const [janela, setJanela] = useState<{ id: string | null } | null>(null);
  const [form, setForm] = useState(DESTINO_VAZIO);
  /** O acesso à pasta que acabou de se escolher (guarda-se com o destino). */
  const [pastaNova, setPastaNova] = useState<PastaDoNavegador | null>(null);
  const [seletor, setSeletor] = useState(false);
  const [aguentaPastas, setAguentaPastas] = useState(false);
  useEffect(() => setAguentaPastas(podeEscolherPasta()), []);
  const [tirar, setTirar] = useState<DestinoDeCopia | null>(null);
  const [restaurar, setRestaurar] = useState<Backup | null>(null);
  const [apagar, setApagar] = useState<Backup | null>(null);
  useEffect(() => setRascunho(config), [config]);
  const mudouAgenda = JSON.stringify({ ...rascunho, destinos: 0 }) !== JSON.stringify({ ...config, destinos: 0 });
  const erroDaJanela = janela ? erroDoNovoDestino(form, config.destinos, janela.id ?? undefined) : null;
  const copias = useMemo(() => [...colecao.itens].sort((a, b) => (b.quando ?? "").localeCompare(a.quando ?? "")), [colecao.itens]);
  const concluidas = copias.filter((c) => c.estado === "Concluído");
  const baldes = useMemo(() => agrupar(copias, (c) => instante(c.quando), intervalosPara(copias.length)), [copias]);
  const ativos = destinosAtivos(config.destinos);

  /** O que o servidor recebe: todos os destinos e, por compatibilidade, o primeiro ligado em `tipo` e `endereco`. */
  const paraOServidor = (c: ConfigDeCopias) => ({ ...c, tipo: destinosAtivos(c.destinos)[0]?.tipo, endereco: destinosAtivos(c.destinos)[0]?.endereco, retencao: Number(c.retencao) });
  const guardarConfig = async (nova: ConfigDeCopias, mensagem: string) => {
    try {
      if (ligacao.modo === "ligado") await chamar(ligacao, "PUT", "/v1/dev/backups/destino", paraOServidor(nova));
      setBruta(nova);
      avisar(mensagem);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível guardar");
    }
  };
  const mudarDestino = (id: string, parcial: Partial<DestinoDeCopia>, mensagem: string) => guardarConfig({ ...config, destinos: config.destinos.map((d) => (d.id === id ? { ...d, ...parcial } : d)) }, mensagem);

  const abrirJanela = (d: DestinoDeCopia | null) => {
    setForm(d ? { nome: d.nome, tipo: d.tipo, endereco: d.endereco, pasta: !!d.pasta } : DESTINO_VAZIO);
    setPastaNova(null);
    setJanela({ id: d?.id ?? null });
  };
  const guardarDestino = () => {
    if (!janela) return;
    const id = janela.id ?? `dest-${Date.now().toString(36)}`;
    const dados = { nome: form.nome.trim(), tipo: form.tipo, endereco: form.endereco.trim(), pasta: form.tipo === "offline" && form.pasta };
    // o acesso à pasta escolhida fica neste navegador, com o identificador do destino
    if (pastaNova && dados.pasta) void guardarPasta(id, pastaNova);
    if (!dados.pasta) void tirarPasta(id).catch(() => undefined);
    if (janela.id) void mudarDestino(id, dados, "Destino guardado");
    else void guardarConfig({ ...config, destinos: [...config.destinos, { id, ...dados, ativo: true }] }, "Destino adicionado");
  };
  /** Abre a janela de pastas do sistema; o navegador só devolve o nome da pasta, que passa a ser o endereço. */
  const escolher = async () => {
    if (!aguentaPastas) return avisar("Este navegador só escolhe pastas numa ligação segura (https) e no Chrome ou no Edge");
    setSeletor(true);
    try {
      const p = await escolherPasta();
      if (p) {
        setPastaNova(p);
        setForm((f) => ({ ...f, tipo: "offline", endereco: p.name, pasta: true, nome: f.nome.trim() ? f.nome : p.name }));
      }
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível abrir a janela de pastas.");
    }
    setSeletor(false);
  };

  /** Testa um destino (o do formulário usa o id «novo»); nada disto precisa de internet para um destino offline. */
  const testar = async (id: string, d: Pick<DestinoDeCopia, "tipo" | "endereco" | "pasta">, aPasta?: PastaDoNavegador | null) => {
    setTestes((t) => ({ ...t, [id]: "a-testar" }));
    if (d.pasta) {
      // uma pasta escolhida no navegador: vê-se se o navegador deixa escrever nela
      try {
        const p = aPasta ?? (await lerPasta(id));
        const ok = !!p && (await licencaDaPasta(p));
        return setTestes((t) => ({ ...t, [id]: ok ? { ok: true, texto: `A pasta «${d.endereco}» está ligada e pode receber cópias.` } : { ok: false, texto: p ? "O navegador não deixou escrever na pasta." : "Escolha a pasta outra vez: este navegador já não tem acesso a ela." } }));
      } catch {
        return setTestes((t) => ({ ...t, [id]: { ok: false, texto: "Não foi possível abrir a pasta." } }));
      }
    }
    await new Promise((r) => window.setTimeout(r, 900));
    const erro = erroDoDestino(d.tipo, d.endereco);
    if (erro) return setTestes((t) => ({ ...t, [id]: { ok: false, texto: erro } }));
    if (ligacao.modo === "ligado") {
      try {
        await chamar(ligacao, "GET", "/v1/dev/backups");
      } catch (e) {
        return setTestes((t) => ({ ...t, [id]: { ok: false, texto: e instanceof Error ? e.message : "Falhou." } }));
      }
    }
    setTestes((t) => ({ ...t, [id]: { ok: true, texto: `Ligação a ${DESTINOS[d.tipo].toLowerCase()} confirmada.` } }));
  };
  const criar = async () => {
    if (ativos.length === 0) return avisar("Ligue pelo menos um destino para criar a cópia");
    if (ligacao.modo === "ligado") {
      await chamar(ligacao, "POST", "/v1/dev/backups", {});
      colecao.recarregar();
      return;
    }
    const id = `bk-${Date.now().toString(36)}`;
    const destino = ativos.map((d) => d.endereco).join(" · ");
    await colecao.guardar({ id, quando: new Date().toISOString(), tipo: "Manual", bytes: 0, estado: "A decorrer", destino });
    window.setTimeout(() => {
      const feita: Backup = { id, quando: new Date().toISOString(), tipo: "Manual", bytes: 52_400_000 * ativos.length, estado: "Concluído", destino };
      void colecao.guardar(feita);
      // as pastas escolhidas no navegador recebem mesmo o ficheiro da cópia
      for (const d of ativos.filter((x) => x.pasta)) {
        void lerPasta(d.id)
          .then(async (p) => {
            if (!p || !(await licencaDaPasta(p, false))) throw new Error("sem acesso");
            await escreverNaPasta(p, `copia-${id}.json`, JSON.stringify(feita, null, 2));
          })
          .catch(() => avisar(`Não foi possível escrever na pasta «${d.endereco}»: volte a escolhê-la ou use «Testar»`));
      }
    }, 3500);
  };

  const colunas: ColunaSimples<Backup>[] = [
    { rotulo: "Quando", render: (c) => <span className="tabular-nums">{dataHora(c.quando)}</span> },
    { rotulo: "Tipo", render: (c) => c.tipo },
    { rotulo: "Tamanho", direita: true, render: (c) => (c.bytes ? formatarTamanho(c.bytes) : "—") },
    { rotulo: "Estado", filtro: (c) => String(c.estado), render: (c) => <Estado valor={c.estado} /> },
    { rotulo: "Destinos", render: (c) => <span className="flex flex-col gap-0.5 text-kumo-subtle">{String(c.destino).split(" · ").map((x) => <span key={x} className="whitespace-nowrap">{x}</span>)}</span> },
    ...(editar
      ? [
          {
            rotulo: "",
            direita: true,
            render: (c: Backup) => (
              <span className="inline-flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={c.estado !== "Concluído"} onClick={() => descarregar(`copia-${c.id}.json`, JSON.stringify(c, null, 2), "application/json")}>
                  Descarregar
                </Button>
                <Button variant="ghost" size="sm" disabled={c.estado !== "Concluído"} onClick={() => setRestaurar(c)}>
                  Restaurar
                </Button>
                <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Apagar a cópia de ${dataHora(c.quando)}`} onClick={() => setApagar(c)} />
              </span>
            ),
          },
        ]
      : []),
  ];

  const resultadoDoForm = testes.novo;
  return (
    <Pagina>
      <Titulo titulo="Cópias de segurança">
        {editar && (
          <Button variant="primary" onClick={() => void criar()}>
            Criar cópia agora
          </Button>
        )}
      </Titulo>
      <AvisoDeApi erro={colecao.erro} aoTentar={colecao.recarregar} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Estatistica titulo="Cópias guardadas" valor={inteiro(concluidas.length)} numero={concluidas.length} serie={acumular(contarPorIntervalo(baldes, (c) => c.estado === "Concluído"))} />
        <Estatistica titulo="Última com sucesso" valor={concluidas[0] ? dataHora(concluidas[0].quando) : "—"} />
        <Estatistica titulo="Espaço ocupado" valor={formatarTamanho(concluidas.reduce((t, c) => t + c.bytes, 0))} numero={concluidas.reduce((t, c) => t + c.bytes, 0)} serie={acumular(somarPorIntervalo(baldes, (c) => c.bytes, (c) => c.estado === "Concluído"))} />
        <Estatistica titulo="Falhadas" valor={inteiro(copias.filter((c) => c.estado === "Falhou").length)} pior numero={copias.filter((c) => c.estado === "Falhou").length} serie={contarPorIntervalo(baldes, (c) => c.estado === "Falhou")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao
          titulo={`Para onde vão as cópias (${ativos.length} de ${config.destinos.length})`}
          dica="Cada cópia vai para todos os destinos que estiverem ligados. Pode juntar quantos quiser: na nuvem (S3, SFTP, Google Drive), num endpoint seu (um servidor ou um NAS em http://… na rede local) ou num disco ou pasta offline. Um destino guarda-se mesmo sem ligação à internet."
          acoes={
            editar ? (
              <Button size="sm" variant="secondary" icon={ICONES.mais} onClick={() => abrirJanela(null)}>
                Adicionar
              </Button>
            ) : undefined
          }
        >
          {config.destinos.length === 0 && <Linha titulo="Ainda não há destinos" estado="Adicione pelo menos um para as cópias terem para onde ir." />}
          {config.destinos.map((d) => {
            const r = testes[d.id];
            return (
              <Linha key={d.id} titulo={d.nome.trim() || DESTINOS[d.tipo]} estado={<span className="block break-all">{d.nome.trim() ? `${DESTINOS[d.tipo]} · ${d.endereco}` : d.endereco}</span>}>
                {r && r !== "a-testar" && <Estado valor={r.ok ? "Ligado" : "Sem ligação"} variante={r.ok ? "success" : "error"} />}
                <Button variant="ghost" size="sm" disabled={r === "a-testar"} onClick={() => void testar(d.id, d)}>
                  {r === "a-testar" ? "A testar…" : "Testar"}
                </Button>
                {editar && (
                  <>
                    <BotaoIcone dica="Mudar este destino" icone="engrenagem" tamanho="sm" aoClicar={() => abrirJanela(d)} />
                    <BotaoIcone dica="Tirar este destino" icone="lixo" tamanho="sm" aoClicar={() => setTirar(d)} />
                  </>
                )}
                <Interruptor marcado={d.ativo} aoMudar={(v) => void mudarDestino(d.id, { ativo: v }, v ? "Destino ligado" : "Destino desligado")} rotulo={`Destino ${rotuloDoDestino(d)} ligado`} desativado={!editar} />
              </Linha>
            );
          })}
          {Object.entries(testes).some(([id, r]) => r !== "a-testar" && !r.ok && id !== "novo") && (
            <div className="border-t border-kumo-hairline px-4 py-3 text-sm text-kumo-danger">
              {config.destinos.filter((d) => { const r = testes[d.id]; return r && r !== "a-testar" && !r.ok; }).map((d) => <div key={d.id}>{rotuloDoDestino(d)}: {(testes[d.id] as { texto: string }).texto}</div>)}
            </div>
          )}
        </Cartao>
        <Cartao titulo="Agenda">
          <Linha titulo="Cópia automática" estado="Faz uma cópia sozinha, sem ninguém ter de se lembrar.">
            <Interruptor marcado={rascunho.automatico} aoMudar={(v) => setRascunho({ ...rascunho, automatico: v })} rotulo="Cópia automática" desativado={!editar} />
          </Linha>
          <LinhaCampo>
            <SeletorPersonalizavel label="Frequência" valor={rascunho.frequencia} opcoes={FREQUENCIA_DE_COPIA.opcoes} personalizado={FREQUENCIA_DE_COPIA.personalizado} aoMudar={(v) => setRascunho({ ...rascunho, frequencia: v })} disabled={!editar || !rascunho.automatico} />
            <SeletorDeHora label="Hora" valor={rascunho.hora} aoMudar={(v) => setRascunho({ ...rascunho, hora: v })} disabled={!editar || !rascunho.automatico} />
            <SeletorPersonalizavel label="Guardar durante" valor={rascunho.retencao} opcoes={RETENCAO_DE_COPIAS.opcoes} personalizado={RETENCAO_DE_COPIAS.personalizado} aoMudar={(v) => setRascunho({ ...rascunho, retencao: v })} disabled={!editar} />
            {editar && (
              <div>
                <Button variant="primary" disabled={!mudouAgenda} onClick={() => void guardarConfig({ ...config, automatico: rascunho.automatico, frequencia: rascunho.frequencia, hora: rascunho.hora, retencao: rascunho.retencao }, "Agenda guardada")}>
                  Guardar
                </Button>
              </div>
            )}
          </LinhaCampo>
        </Cartao>
      </div>
      <Cartao titulo={`Cópias (${copias.length})`}>
        <TabelaSimples colunas={colunas} linhas={copias} chave={(c) => c.id} vazio="Ainda não há cópias." />
      </Cartao>
      <Confirmar
        aberto={!!janela}
        aoMudar={(v) => !v && (setJanela(null), setTestes((t) => Object.fromEntries(Object.entries(t).filter(([k]) => k !== "novo"))))}
        titulo={janela?.id ? "Mudar o destino" : "Adicionar um destino"}
        texto=""
        rotuloAcao="Guardar"
        desativado={!!erroDaJanela}
        aoConfirmar={guardarDestino}
      >
        <div className="flex flex-col gap-4">
          <Select label="Tipo" className="w-full min-w-0" value={form.tipo} onValueChange={(v) => { const tipo = String(v) as TipoDeDestino; setForm({ ...form, tipo, pasta: tipo === "offline" && form.pasta, endereco: erroDoDestino(tipo, form.endereco, tipo === "offline" && form.pasta) ? "" : form.endereco }); }} items={DESTINOS} />
          <Input label="Nome (opcional)" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Disco do escritório" autoComplete="off" />
          <Input label={form.pasta ? "Pasta" : "Endereço"} value={form.endereco} onChange={(e) => (setPastaNova(null), setForm({ ...form, endereco: e.target.value, pasta: false }))} error={form.endereco ? (erroDaJanela ?? undefined) : undefined} placeholder={PLACEHOLDER_DO_ENDERECO[form.tipo]} autoComplete="off" />
          {resultadoDoForm && resultadoDoForm !== "a-testar" && <span className={`text-sm ${resultadoDoForm.ok ? "text-kumo-default" : "text-kumo-danger"}`}>{resultadoDoForm.texto}</span>}
          <div className="flex flex-wrap gap-2">
            {form.tipo === "offline" && (
              <Button variant="secondary" icon={ICONES.pasta} loading={seletor} onClick={() => void escolher()}>
                Escolher a pasta
              </Button>
            )}
            <Button variant="secondary" disabled={resultadoDoForm === "a-testar" || !form.endereco.trim()} onClick={() => void testar(janela?.id ?? "novo", form, pastaNova)}>
              {resultadoDoForm === "a-testar" ? "A testar…" : "Testar a ligação"}
            </Button>
          </div>
        </div>
      </Confirmar>
      <Confirmar aberto={!!tirar} aoMudar={(v) => !v && setTirar(null)} titulo="Tirar o destino" perigo texto={tirar ? `As cópias novas deixam de ir para «${rotuloDoDestino(tirar)}». As que lá estão não se apagam.` : ""} rotuloAcao="Tirar" aoConfirmar={() => tirar && void guardarConfig({ ...config, destinos: config.destinos.filter((d) => d.id !== tirar.id) }, "Destino tirado")} />
      <Confirmar aberto={!!restaurar} aoMudar={(v) => !v && setRestaurar(null)} titulo="Restaurar a cópia" texto={restaurar ? `Os dados voltam ao estado de ${dataHora(restaurar.quando)}. O que foi feito depois disso perde-se.` : ""} rotuloAcao="Restaurar" perigo escrever={restaurar ? `RESTAURAR ${dataHora(restaurar.quando)}` : "RESTAURAR"} aoConfirmar={async () => {
        if (!restaurar) return;
        if (ligacao.modo === "ligado") await chamar(ligacao, "POST", "/v1/dev/backups/{id}/restaurar", {}, { id: restaurar.id }).catch(() => undefined);
        avisar("Restauro iniciado");
      }} />
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Apagar a cópia" texto={apagar ? `A cópia de ${dataHora(apagar.quando)} deixa de existir. Não se pode desfazer.` : ""} rotuloAcao="Apagar" perigo aoConfirmar={() => apagar && void colecao.remover(apagar.id)} />
    </Pagina>
  );
}

// ---------- firewall ----------

interface EstadoFirewall {
  ativo: boolean;
  limitePorMinuto: number;
}

const ACOES_FIREWALL = { bloquear: "Bloquear", permitir: "Permitir" };

export function Firewall() {
  const ligacao = useLigacao();
  const { avisar } = useApp();
  const editar = useEditar();
  const t = useTick(3000) * 3;
  const [local, setLocal] = useGuardado<EstadoFirewall>("firewall", { ativo: true, limitePorMinuto: 120 });
  const api = useApi<EstadoFirewall>("/v1/dev/firewall", () => local);
  const estado = ligacao.modo === "ligado" ? (api.dados ?? local) : local;
  const regras = useColecao<RegraFirewall>("/v1/dev/firewall/regras", "firewall-regras", REGRAS_DE_ORIGEM);
  const bloqueios = useApi<{ itens: Bloqueio[] }>("/v1/dev/firewall/bloqueios", () => ({ itens: estado.ativo ? gerarBloqueios(t, regras.itens, estado.limitePorMinuto) : [] }), 3000);
  const [desligar, setDesligar] = useState(false);
  const [nova, setNova] = useState(false);
  const [rascunho, setRascunho] = useState({ acao: "bloquear", alvo: "", nota: "" });
  const [remover, setRemover] = useState<RegraFirewall | null>(null);
  const acesso = useAcessoDeIp(regras);
  const erroAlvo = rascunho.alvo ? erroDoAlvo(rascunho.alvo) : null;

  const mudar = async (parcial: Partial<EstadoFirewall>) => {
    const novo = { ...estado, ...parcial };
    if (ligacao.modo === "ligado") {
      await chamar(ligacao, "PATCH", "/v1/dev/firewall", novo);
      api.recarregar();
    } else setLocal(novo);
  };
  const colunas: ColunaSimples<RegraFirewall>[] = [
    { rotulo: "Ação", filtro: (r) => String(r.acao === "bloquear" ? "Bloqueado" : "Permitido"), render: (r) => <Estado valor={r.acao === "bloquear" ? "Bloqueado" : "Permitido"} variante={r.acao === "bloquear" ? "error" : "success"} /> },
    { rotulo: "Alvo", render: (r) => <span className="font-medium tabular-nums">{r.alvo}</span> },
    { rotulo: "Nota", render: (r) => <span className="text-kumo-subtle">{r.nota || "—"}</span> },
    { rotulo: "Ativa", render: (r) => <Interruptor marcado={r.ativa} aoMudar={(v) => void regras.guardar({ ...r, ativa: v })} rotulo={`Regra ${r.alvo} ativa`} desativado={!editar} /> },
    ...(editar ? [{ rotulo: "", direita: true, render: (r: RegraFirewall) => <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Apagar a regra ${r.alvo}`} onClick={() => setRemover(r)} /> }] : []),
  ];
  const colunasBloqueios: ColunaSimples<Bloqueio>[] = [
    { rotulo: "Hora", render: (b) => <span className="tabular-nums">{horaCompleta(b.quando)}</span> },
    { rotulo: "IP", render: (b) => <span className="tabular-nums">{b.ip}</span> },
    { rotulo: "Caminho", render: (b) => b.caminho },
    { rotulo: "Motivo", render: (b) => <span className="text-kumo-subtle">{b.motivo}</span> },
    ...(editar
      ? [{ rotulo: "", direita: true, render: (b: Bloqueio) => <Button variant="ghost" size="sm" onClick={() => acesso.pedir(b.ip)}>{acesso.bloqueadoPor(b.ip) ? "Desbloquear" : "Bloquear IP"}</Button> }]
      : []),
  ];
  return (
    <Pagina>
      <Titulo titulo="Firewall">
        {editar && (
          <Button variant="primary" onClick={() => setNova(true)}>
            Nova regra
          </Button>
        )}
      </Titulo>
      <AvisoDeApi erro={api.erro ?? regras.erro} aoTentar={() => (api.recarregar(), regras.recarregar())} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Estatistica titulo="Regras ativas" valor={inteiro(regras.itens.filter((r) => r.ativa).length)} numero={regras.itens.filter((r) => r.ativa).length} />
        <Estatistica titulo="Bloqueios recentes" valor={inteiro(bloqueios.dados?.itens.length ?? 0)} pior numero={bloqueios.dados?.itens.length ?? 0} />
      </div>
      <Cartao titulo="Proteção">
        <Linha titulo="Firewall" estado={estado.ativo ? "Os pedidos passam pelas regras e pelo limite." : "Desligado: nenhum pedido é bloqueado."}>
          <Interruptor marcado={estado.ativo} aoMudar={(v) => (v ? void mudar({ ativo: true }) : setDesligar(true))} rotulo="Firewall" desativado={!editar} />
        </Linha>
        <Linha titulo="Limite de pedidos" dica="Quantos pedidos cada visitante pode fazer num minuto. Passado o limite, os pedidos seguintes são bloqueados até o minuto acabar." estado="Por visitante (IP)">
          <SeletorPersonalizavel rotulo="Limite de pedidos" valor={String(estado.limitePorMinuto)} opcoes={LIMITE_POR_MINUTO.opcoes} personalizado={LIMITE_POR_MINUTO.personalizado} aoMudar={(v) => void mudar({ limitePorMinuto: Number(v) })} className="w-44" disabled={!editar || !estado.ativo} />
        </Linha>
      </Cartao>
      <Cartao titulo={`Regras (${regras.itens.length})`}>
        <TabelaSimples colunas={colunas} linhas={regras.itens} chave={(r) => r.id} vazio="Sem regras: só o limite de pedidos protege." />
      </Cartao>
      <Cartao titulo="Pedidos bloqueados agora">
        <TabelaSimples colunas={colunasBloqueios} linhas={bloqueios.dados?.itens ?? []} chave={(b) => b.id} vazio={estado.ativo ? "Nada bloqueado neste momento." : "O firewall está desligado."} />
      </Cartao>
      {acesso.dialogo}
      <Confirmar aberto={desligar} aoMudar={setDesligar} titulo="Desligar o firewall" texto="Sem firewall, nenhuma regra nem o limite de pedidos se aplica. O servidor fica exposto a abusos até o ligar de novo." rotuloAcao="Desligar" perigo escrever="DESLIGAR firewall" aoConfirmar={() => void mudar({ ativo: false })} />
      <Confirmar aberto={!!remover} aoMudar={(v) => !v && setRemover(null)} titulo="Apagar a regra" texto={remover ? `A regra para ${remover.alvo} deixa de existir.` : ""} rotuloAcao="Apagar" perigo aoConfirmar={() => remover && void regras.remover(remover.id)} />
      <Confirmar
        aberto={nova}
        aoMudar={setNova}
        titulo="Nova regra"
        texto="Bloqueie ou permita um IP, uma gama de IPs ou um país inteiro."
        rotuloAcao="Acrescentar a regra"
        desativado={!rascunho.alvo || !!erroAlvo}
        aoConfirmar={async () => {
          await regras.guardar({ id: `fw-${Date.now().toString(36)}`, acao: rascunho.acao as RegraFirewall["acao"], alvo: rascunho.alvo.trim().toUpperCase().length === 2 ? rascunho.alvo.trim().toUpperCase() : rascunho.alvo.trim(), nota: rascunho.nota.trim(), ativa: true });
          setRascunho({ acao: "bloquear", alvo: "", nota: "" });
          avisar("Regra acrescentada");
        }}
      >
        <div className="flex flex-col gap-3">
          <Select label="Ação" value={rascunho.acao} onValueChange={(v) => setRascunho({ ...rascunho, acao: String(v) })} items={ACOES_FIREWALL} />
          <Input label="Alvo" value={rascunho.alvo} onChange={(e) => setRascunho({ ...rascunho, alvo: e.target.value })} error={erroAlvo ?? undefined} placeholder="203.0.113.0/24 ou RU" />
          <Input label="Nota" value={rascunho.nota} onChange={(e) => setRascunho({ ...rascunho, nota: e.target.value })} placeholder="Porque existe esta regra" />
        </div>
      </Confirmar>
    </Pagina>
  );
}

// ---------- páginas do site ----------

const ESTADOS_DE_PAGINA = { ativa: "Ativa", manutencao: "Em manutenção", desativada: "Desativada" };
const NOME_DE_ESTADO = (e: PaginaSite["estado"]) => ESTADOS_DE_PAGINA[e];

export function PaginasDoSite() {
  const ligacao = useLigacao();
  const { avisar } = useApp();
  const editar = useEditar();
  const [local, setLocal] = useGuardado<PaginaSite[]>("paginas-do-site", PAGINAS_DE_ORIGEM);
  const api = useApi<{ itens: PaginaSite[] }>("/v1/dev/paginas", () => ({ itens: local }));
  const paginas = ligacao.modo === "ligado" ? (api.dados?.itens ?? []) : local;
  const [alvo, setAlvo] = useState<{ pagina: PaginaSite; estado: PaginaSite["estado"] } | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [nova, setNova] = useState(false);
  const [caminho, setCaminho] = useState("");
  const erroCaminho = caminho && (!/^\/[\w\-./]*$/.test(caminho) ? "Comece por / e use só letras, números, hífen e ponto." : paginas.some((p) => p.caminho === caminho) ? "Esta página já está na lista." : null);

  const aplicar = async (p: PaginaSite) => {
    if (ligacao.modo === "ligado") {
      await chamar(ligacao, "PATCH", "/v1/dev/paginas", p);
      api.recarregar();
    } else setLocal((l) => (l.some((x) => x.caminho === p.caminho) ? l.map((x) => (x.caminho === p.caminho ? p : x)) : [...l, p]));
  };
  const escolher = (pagina: PaginaSite, estado: PaginaSite["estado"]) => {
    if (estado === "ativa") return void aplicar({ ...pagina, estado, mensagem: "" });
    setMensagem(pagina.mensagem || (estado === "manutencao" ? "Estamos a melhorar esta página. Voltamos já." : "Esta página já não está disponível."));
    setAlvo({ pagina, estado });
  };
  const colunas: ColunaSimples<PaginaSite>[] = [
    { rotulo: "Página", render: (p) => <span title={p.caminho}><Rota caminho={p.caminho} /></span> },
    { rotulo: "Estado", filtro: (p) => String(NOME_DE_ESTADO(p.estado)), render: (p) => <Estado valor={NOME_DE_ESTADO(p.estado)} variante={p.estado === "ativa" ? "success" : p.estado === "manutencao" ? "warning" : "error"} /> },
    { rotulo: "Mensagem aos visitantes", render: (p) => <span className="text-kumo-subtle">{p.mensagem || "—"}</span> },
    { rotulo: "Mudar para", render: (p) => <Select aria-label={`Estado de ${textoDaRota(p.caminho)}`} value={p.estado} onValueChange={(v) => escolher(p, String(v) as PaginaSite["estado"])} items={ESTADOS_DE_PAGINA} className="w-44" disabled={!editar} /> },
  ];
  return (
    <Pagina>
      <Titulo titulo="Páginas do site">
        {editar && (
          <Button variant="primary" onClick={() => setNova(true)}>
            Acrescentar página
          </Button>
        )}
      </Titulo>
      <AvisoDeApi erro={api.erro} aoTentar={api.recarregar} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Estatistica titulo="Ativas" valor={inteiro(paginas.filter((p) => p.estado === "ativa").length)} numero={paginas.filter((p) => p.estado === "ativa").length} />
        <Estatistica titulo="Em manutenção" valor={inteiro(paginas.filter((p) => p.estado === "manutencao").length)} pior numero={paginas.filter((p) => p.estado === "manutencao").length} />
        <Estatistica titulo="Desativadas" valor={inteiro(paginas.filter((p) => p.estado === "desativada").length)} pior numero={paginas.filter((p) => p.estado === "desativada").length} />
      </div>
      <Cartao titulo={`Páginas (${paginas.length})`} dica="Uma página em manutenção ou desativada mostra aos visitantes a mensagem escolhida em vez do conteúdo.">
        <TabelaSimples colunas={colunas} linhas={paginas} chave={(p) => p.caminho} />
      </Cartao>
      <Confirmar
        aberto={!!alvo}
        aoMudar={(v) => !v && setAlvo(null)}
        titulo={alvo?.estado === "manutencao" ? "Pôr em manutenção" : "Desativar a página"}
        texto={alvo ? `Os visitantes de ${frasaDaRota(alvo.pagina.caminho)} passam a ver só a mensagem.` : ""}
        rotuloAcao={alvo?.estado === "manutencao" ? "Pôr em manutenção" : "Desativar"}
        perigo={alvo?.estado === "desativada"}
        desativado={!mensagem.trim()}
        aoConfirmar={() => alvo && void aplicar({ ...alvo.pagina, estado: alvo.estado, mensagem: mensagem.trim() })}
      >
        <InputArea label="Mensagem aos visitantes" value={mensagem} onValueChange={setMensagem} minRows={2} autoResize />
      </Confirmar>
      <Confirmar aberto={nova} aoMudar={setNova} titulo="Acrescentar página" texto="Escreva o caminho da página, a começar por /." rotuloAcao="Acrescentar" desativado={!caminho || !!erroCaminho} aoConfirmar={() => (void aplicar({ caminho, estado: "ativa", mensagem: "" }), setCaminho(""), avisar("Página acrescentada"))}>
        <Input label="Caminho" value={caminho} onChange={(e) => setCaminho(e.target.value.trim())} error={erroCaminho || undefined} placeholder="/novidades" />
      </Confirmar>
    </Pagina>
  );
}

// ---------- envio de e-mails ----------

interface ConfigDeEmail {
  servidor: string;
  porta: string;
  utilizador: string;
  senha: string;
  remetente: string;
}

const EMAIL_DE_ORIGEM: ConfigDeEmail = { servidor: "mail.exemplo.pt", porta: "587", utilizador: "nao-responder", senha: "", remetente: "Painel <nao-responder@exemplo.pt>" };

interface VerificacaoDns {
  nome: string;
  estado: "ok" | "aviso" | "falta";
  detalhe: string;
}

const DNS_DE_ORIGEM: VerificacaoDns[] = [
  { nome: "SPF", estado: "ok", detalhe: "v=spf1 mx -all" },
  { nome: "DKIM", estado: "ok", detalhe: "Chave publicada no seletor «default»." },
  { nome: "DMARC", estado: "aviso", detalhe: "p=none: recebe relatórios mas não rejeita falsificações. Passe a p=quarantine quando tudo estiver estável." },
  { nome: "PTR (DNS inverso)", estado: "falta", detalhe: "O IP do servidor não aponta para o nome do servidor de e-mail. Alguns fornecedores rejeitam por isso: peça ao fornecedor do servidor para o configurar." },
];

const FILTRO_DE_EMAIL: Record<string, string> = { todos: "Todos", Entregue: "Entregues", Enviado: "Enviados", Fila: "Na fila", Rejeitado: "Rejeitados", Falhou: "Falhados" };

export function EnviosDeEmail() {
  const ligacao = useLigacao();
  const { avisar } = useApp();
  const editar = useEditar();
  const lista = useColecao<EmailEnviado>("/v1/dev/emails", "dev-emails", gerarEmails());
  const dns = useApi<{ itens: VerificacaoDns[] }>("/v1/dev/emails/dns", () => ({ itens: DNS_DE_ORIGEM }));
  const [guardada, setGuardada] = useGuardado<ConfigDeEmail>("emails-config", EMAIL_DE_ORIGEM);
  const [config, setConfig] = useState(guardada);
  const [filtro, setFiltro] = useState("todos");
  const [teste, setTeste] = useState(false);
  const [para, setPara] = useState("");
  useEffect(() => setConfig(guardada), [guardada]);

  const emails = lista.itens;
  const visiveis = useMemo(() => emails.filter((e) => filtro === "todos" || e.estado === filtro).sort((a, b) => b.quando.localeCompare(a.quando)), [emails, filtro]);
  const entregues = emails.filter((e) => e.estado === "Entregue" || e.estado === "Enviado").length;
  const mau = emails.filter((e) => e.estado === "Rejeitado" || e.estado === "Falhou").length;
  const baldesDeEmails = useMemo(() => agrupar(emails, (e) => instante(e.quando), intervalosPara(emails.length)), [emails]);
  const erroServidor = config.servidor && !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(config.servidor) ? "Escreva só o nome do servidor, sem http://." : null;
  const enderecoRemetente = /<([^>]+)>/.exec(config.remetente)?.[1] ?? config.remetente;
  const erroRemetente = config.remetente && !emailValido(enderecoRemetente) ? "Use Nome <endereco@dominio.pt> ou só o endereço." : null;
  const mudou = JSON.stringify(config) !== JSON.stringify(guardada);

  const seguir = (e: EmailEnviado, depois: EmailEnviado["estado"][]) => {
    depois.forEach((estado, i) => window.setTimeout(() => void lista.guardar({ ...e, estado, erro: undefined, quando: new Date().toISOString() }), 1200 * (i + 1)));
  };
  const enviarTeste = async () => {
    if (ligacao.modo === "ligado") {
      try {
        await chamar(ligacao, "POST", "/v1/dev/emails/teste", { para });
        avisar("E-mail de teste enviado");
        lista.recarregar();
      } catch (e) {
        avisar(e instanceof Error ? e.message : "Falhou o envio");
      }
      return;
    }
    const novo: EmailEnviado = { id: `em-t${Date.now().toString(36)}`, para, assunto: "E-mail de teste do painel", estado: "Fila", quando: new Date().toISOString() };
    await lista.guardar(novo);
    seguir(novo, ["Enviado", "Entregue"]);
    setPara("");
  };
  const reenviar = async (e: EmailEnviado) => {
    await lista.guardar({ ...e, estado: "Fila", erro: undefined });
    seguir(e, ["Enviado", "Entregue"]);
  };
  const guardarConfig = async () => {
    if (ligacao.modo === "ligado") await chamar(ligacao, "PUT", "/v1/dev/emails/configuracao", { ...config, porta: Number(config.porta) });
    setGuardada(config);
    avisar("Configuração do e-mail guardada");
  };
  const colunas: ColunaSimples<EmailEnviado>[] = [
    { rotulo: "Hora", render: (e) => <span className="tabular-nums">{dataHora(e.quando)}</span> },
    { rotulo: "Para", render: (e) => e.para },
    { rotulo: "Assunto", render: (e) => e.assunto },
    { rotulo: "Estado", filtro: (e) => String(e.estado), render: (e) => <Estado valor={e.estado} variante={e.estado === "Entregue" || e.estado === "Enviado" ? "success" : e.estado === "Fila" ? "warning" : "error"} /> },
    { rotulo: "Erro", render: (e) => <span className="text-kumo-subtle">{e.erro ?? "—"}</span> },
    ...(editar ? [{ rotulo: "", direita: true, render: (e: EmailEnviado) => (e.estado === "Falhou" ? <Button variant="ghost" size="sm" onClick={() => void reenviar(e)}>Reenviar</Button> : null) }] : []),
  ];
  return (
    <Pagina>
      <Titulo titulo="Envio de e-mails">
        {editar && (
          <Button variant="primary" onClick={() => setTeste(true)}>
            Enviar e-mail de teste
          </Button>
        )}
      </Titulo>
      <AvisoDeApi erro={lista.erro ?? dns.erro} aoTentar={() => (lista.recarregar(), dns.recarregar())} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Estatistica titulo="Registados" valor={inteiro(emails.length)} numero={emails.length} serie={contarPorIntervalo(baldesDeEmails)} />
        <Estatistica titulo="Taxa de entrega" valor={percentagem(emails.length ? entregues / emails.length : 0, 1)} numero={emails.length ? (entregues / emails.length) * 100 : 0} serie={razao(contarPorIntervalo(baldesDeEmails, (e) => e.estado === "Entregue" || e.estado === "Enviado"), contarPorIntervalo(baldesDeEmails))} />
        <Estatistica titulo="Rejeitados ou falhados" valor={inteiro(mau)} pior numero={mau} serie={contarPorIntervalo(baldesDeEmails, (e) => e.estado === "Rejeitado" || e.estado === "Falhou")} />
        <Estatistica titulo="Na fila" valor={inteiro(emails.filter((e) => e.estado === "Fila").length)} pior numero={emails.filter((e) => e.estado === "Fila").length} serie={contarPorIntervalo(baldesDeEmails, (e) => e.estado === "Fila")} />
      </div>
      <Cartao titulo="Autenticação do domínio" dica="O SPF, o DKIM e o DMARC dizem aos outros servidores que os e-mails vêm mesmo de si. Sem eles, vão parar ao lixo ou são rejeitados.">
        {(dns.dados?.itens ?? []).map((v) => (
          <Linha key={v.nome} titulo={v.nome} estado={v.detalhe}>
            <Estado valor={v.estado === "ok" ? "Válido" : v.estado === "aviso" ? "A rever" : "Em falta"} variante={v.estado === "ok" ? "success" : v.estado === "aviso" ? "warning" : "error"} />
          </Linha>
        ))}
      </Cartao>
      <Cartao titulo="Servidor de envio (SMTP)">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Input label="Servidor" value={config.servidor} disabled={!editar} onChange={(e) => setConfig({ ...config, servidor: e.target.value.trim() })} error={erroServidor ?? undefined} placeholder="smtp.exemplo.pt" />
          <SeletorPersonalizavel label="Porta" valor={config.porta} opcoes={PORTA_SMTP.opcoes} personalizado={PORTA_SMTP.personalizado} aoMudar={(v) => setConfig({ ...config, porta: v })} disabled={!editar} />
          <Input label="Utilizador" value={config.utilizador} disabled={!editar} onChange={(e) => setConfig({ ...config, utilizador: e.target.value })} autoComplete="off" />
          {editar && <CampoSenha label="Palavra-passe" value={config.senha} onValueChange={(v) => setConfig({ ...config, senha: v })} autoComplete="new-password" tamanho="base" />}
          <div className="sm:col-span-2">
            <Input label="Remetente" value={config.remetente} disabled={!editar} onChange={(e) => setConfig({ ...config, remetente: e.target.value })} error={erroRemetente ?? undefined} />
          </div>
          {editar && (
            <div className="sm:col-span-2">
              <Button variant="primary" disabled={!mudou || !!erroServidor || !!erroRemetente || !config.servidor} onClick={() => void guardarConfig()}>
                Guardar
              </Button>
            </div>
          )}
        </div>
      </Cartao>
      <Cartao titulo={`Registo de envios (${visiveis.length})`} acoes={<Select aria-label="Filtrar por estado" value={filtro} onValueChange={(v) => setFiltro(String(v))} items={FILTRO_DE_EMAIL} className="w-40" />}>
        <TabelaSimples colunas={colunas} linhas={visiveis} chave={(e) => e.id} vazio="Nenhum e-mail com este estado." />
      </Cartao>
      <Confirmar aberto={teste} aoMudar={setTeste} titulo="Enviar e-mail de teste" texto="Mandamos uma mensagem curta para o endereço que escolher e mostramos aqui o que aconteceu." rotuloAcao="Enviar" desativado={!emailValido(para)} aoConfirmar={() => void enviarTeste()}>
        <Input label="Para" type="email" value={para} onChange={(e) => setPara(e.target.value)} placeholder="eu@exemplo.pt" autoComplete="off" />
      </Confirmar>
    </Pagina>
  );
}

// ---------- API e ligações ----------

const MODOS_DE_LIGACAO = { simulado: "Dados de demonstração", ligado: "Ligado a um servidor" };

export function ApiLigacoes() {
  const atual = useLigacao();
  const { avisar } = useApp();
  const editar = useEditar();
  const [rascunho, setRascunho] = useState<LigacaoApi>(atual);
  const [teste, setTeste] = useState<{ ok: boolean; texto: string } | "a-testar" | null>(null);
  const [area, setArea] = useState<"pagamentos" | "marketing" | "dev" | "painel">("pagamentos");
  useEffect(() => setRascunho(atual), [atual]);
  const erro = rascunho.modo === "ligado" ? (rascunho.base ? erroDoEndereco(rascunho.base) : "Escreva o endereço do servidor.") : null;
  const mudou = JSON.stringify(rascunho) !== JSON.stringify(atual);

  const testar = async () => {
    setTeste("a-testar");
    try {
      await chamar(rascunho, "GET", "/v1/dev/saude");
      setTeste({ ok: true, texto: "O servidor respondeu e aceitou o token." });
    } catch (e) {
      setTeste({ ok: false, texto: e instanceof Error ? e.message : "Falhou." });
    }
  };
  const doArea = ENDPOINTS.filter((e) => e.area === area);
  const base = (atual.modo === "ligado" ? atual.base : rascunho.base) || "https://api.exemplo.pt";
  return (
    <Pagina>
      <Titulo titulo="API e ligações">
        <Button variant="secondary" onClick={() => descarregar("openapi.json", JSON.stringify(paraOpenApi("API do painel"), null, 2), "application/json")}>
          Descarregar OpenAPI
        </Button>
      </Titulo>
      <Cartao titulo="Ligação" dica="Em «dados de demonstração» o painel funciona sozinho, sem servidor. Para o usar a sério, ponha aqui o endereço de um servidor que cumpra o contrato abaixo.">
        <div className="flex flex-col gap-4 p-4">
          <Select label="Origem dos dados" value={rascunho.modo} onValueChange={(v) => setRascunho({ ...rascunho, modo: String(v) as LigacaoApi["modo"] })} items={MODOS_DE_LIGACAO} disabled={!editar} />
          {rascunho.modo === "ligado" && (
            <>
              <Input label="Endereço do servidor" value={rascunho.base} disabled={!editar} onChange={(e) => setRascunho({ ...rascunho, base: e.target.value.trim() })} error={rascunho.base ? (erro ?? undefined) : undefined} placeholder="https://api.exemplo.pt" autoComplete="off" />
              {editar && <CampoSenha label="Token de acesso" value={rascunho.token} onValueChange={(v) => setRascunho({ ...rascunho, token: v })} autoComplete="off" tamanho="base" />}
            </>
          )}
          {teste && teste !== "a-testar" && <span className={`text-sm ${teste.ok ? "text-kumo-default" : "text-kumo-danger"}`}>{teste.texto}</span>}
          {editar && (
            <div className="flex flex-wrap gap-2">
              {rascunho.modo === "ligado" && (
                <Button variant="secondary" disabled={!!erro || teste === "a-testar"} onClick={() => void testar()}>
                  {teste === "a-testar" ? "A testar…" : "Testar a ligação"}
                </Button>
              )}
              <Button variant="primary" disabled={!mudou || !!erro} onClick={() => (guardarLigacao(rascunho), avisar("Ligação guardada"))}>
                Guardar
              </Button>
            </div>
          )}
        </div>
      </Cartao>
      <Cartao titulo={`Contrato das APIs (${ENDPOINTS.length} endereços)`} dica="Tudo o que o painel lê e escreve. Um servidor que responda a estes endereços liga-se ao painel sem mudar nenhum ecrã.">
        <div className="border-b border-kumo-hairline p-3">
          <Tabs
            variant="segmented"
            value={area}
            onValueChange={(v) => setArea(v as typeof area)}
            tabs={[
              { value: "pagamentos", label: "Pagamentos" },
              { value: "marketing", label: "Marketing" },
              { value: "dev", label: "Ferramentas de programador" },
              { value: "painel", label: "Painel" },
            ]}
          />
        </div>
        {doArea.map((e) => (
          <div key={e.id} className="flex flex-col gap-2 border-t border-kumo-hairline px-4 py-3 first:border-t-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="outline">{e.metodo}</Badge>
                <code className="min-w-0 truncate text-sm">{e.caminho}</code>
              </div>
              <BotaoCopiar texto={comoCurl(e, base, editar ? atual.token : "")} rotulo="Copiar curl" dica="Copiar como comando curl" tamanho="sm" />
            </div>
            <span className="text-[13px] text-kumo-subtle">{e.descricao}</span>
          </div>
        ))}
      </Cartao>
    </Pagina>
  );
}

// ---------- limpeza ----------

interface AlvoDeLimpeza {
  id: string;
  titulo: string;
  texto: string;
  /** Quantos itens há para apagar (em demonstração). */
  itens: number;
  /** Se depende de uma idade em dias. */
  comIdade: boolean;
}

const ALVOS: AlvoDeLimpeza[] = [
  { id: "cache", titulo: "Cache", texto: "Esvazia a cache de páginas e de respostas. O site pode ficar um pouco mais lento até ela voltar a encher.", itens: 1840, comIdade: false },
  { id: "logs", titulo: "Registos antigos (logs)", texto: "Apaga os registos de pedidos e de erros mais antigos do que o prazo escolhido.", itens: 88_340, comIdade: true },
  { id: "temporarios", titulo: "Ficheiros temporários", texto: "Apaga os uploads que ficaram a meio e os ficheiros gerados para descarregar.", itens: 312, comIdade: true },
  { id: "sessoes", titulo: "Sessões expiradas", texto: "Apaga as sessões que já caducaram. As ativas não são tocadas.", itens: 3912, comIdade: false },
  { id: "eventos", titulo: "Eventos de marketing", texto: "Apaga as visitas e cliques registados mais antigos do que o prazo escolhido. Os totais já calculados mantêm-se.", itens: 412_880, comIdade: true },
  { id: "teste", titulo: "Dados de teste", texto: "Apaga os pagamentos, pedidos e e-mails marcados como teste.", itens: 146, comIdade: false },
];

interface EntradaDeHistorico {
  id: string;
  quando: string;
  texto: string;
}

export function Limpeza() {
  const ligacao = useLigacao();
  const editar = useEditar();
  const [dias, setDias] = useState("90");
  const [historico, setHistorico] = useGuardado<EntradaDeHistorico[]>("limpeza-historico", []);
  const [alvo, setAlvo] = useState<AlvoDeLimpeza | null>(null);
  const apagados = (a: AlvoDeLimpeza) => (a.comIdade ? linhasApagadas(a.itens, Number(dias)) : a.itens);

  return (
    <Pagina>
      <Titulo titulo="Limpeza" />
      <AvisoDeApi erro={null} aoTentar={() => undefined} />
      <Cartao
        titulo="Apagar dados"
        dica="Cada ação pede que escreva APAGAR e fica registada no histórico. O que se apaga não volta: se tiver dúvidas, faça primeiro uma cópia de segurança."
        acoes={editar ? <SeletorPersonalizavel rotulo="Apagar o que tem mais de" valor={dias} opcoes={DIAS_DE_DADOS.opcoes} personalizado={DIAS_DE_DADOS.personalizado} aoMudar={setDias} className="w-40" /> : undefined}
      >
        {ALVOS.map((a) => (
          <Linha key={a.id} titulo={a.titulo} estado={a.texto}>
            {editar && (
              <Button variant="secondary" icon={ICONES.lixo} onClick={() => setAlvo(a)}>
                Apagar
              </Button>
            )}
          </Linha>
        ))}
      </Cartao>
      <Cartao titulo={`Histórico (${historico.length})`} acoes={editar && historico.length > 0 ? <Button variant="ghost" size="sm" onClick={() => setHistorico([])}>Limpar o histórico</Button> : undefined}>
        <TabelaSimples
          colunas={[
            { rotulo: "Quando", render: (h: EntradaDeHistorico) => <span className="tabular-nums">{dataHora(h.quando)}</span> },
            { rotulo: "O que foi apagado", render: (h: EntradaDeHistorico) => h.texto },
          ]}
          linhas={historico}
          chave={(h) => h.id}
          vazio="Ainda não apagou nada."
        />
      </Cartao>
      <Confirmar
        aberto={!!alvo}
        aoMudar={(v) => !v && setAlvo(null)}
        titulo={alvo ? `Apagar: ${alvo.titulo.toLowerCase()}` : "Apagar"}
        texto={alvo ? `${alvo.texto} Vão ser apagados cerca de ${inteiro(apagados(alvo))} itens${alvo.comIdade ? ` com mais de ${dias} dias` : ""}.` : ""}
        rotuloAcao="Apagar"
        perigo
        escrever={alvo ? `APAGAR ${alvo.titulo.toLowerCase()}` : "APAGAR"}
        aoConfirmar={async () => {
          if (!alvo) return;
          const n = apagados(alvo);
          if (ligacao.modo === "ligado") await chamar(ligacao, "POST", "/v1/dev/limpeza", { alvo: alvo.id, dias: Number(dias) }).catch(() => undefined);
          setHistorico((h) => [{ id: `h-${Date.now().toString(36)}`, quando: new Date().toISOString(), texto: `${alvo.titulo}: ${inteiro(n)} itens${alvo.comIdade ? ` com mais de ${dias} dias` : ""}` }, ...h].slice(0, 50));
        }}
      />
    </Pagina>
  );
}
