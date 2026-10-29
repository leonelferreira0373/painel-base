// Conteúdo > Enviar ficheiros: as funções do SnapShare dentro do painel. Liga este navegador a outro aparelho (telemóvel, computador, tablet) por um código, uma ligação ou um QR e envia ficheiros, imagens e texto direitos de um para o outro por WebRTC, sem servidor no meio e sem conta. Quem recebe abre a ligação do painel (sem entrar) ou a do SnapShare.
"use client";

import { Button, Input, Select } from "@cloudflare/kumo";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { caminho } from "@/dados/estrutura";
import { FUNCOES } from "@/dados/rbac";
import { registar } from "@/lib/atividade";
import { guardarNaBiblioteca } from "@/lib/biblioteca-guardar";
import { alternarFuncao, motivoDeRecusa, pastaValida, podeEnviar, podeReceber, POLITICA_DE_ORIGEM, politicaValida, type PoliticaDePartilha } from "@/lib/partilha-politica";
import { avisoDeTamanho, formatarTamanho, ligacaoDoPar, nomeDoAparelho, plataformaDe } from "@/lib/partilha";
import { ecraPodeFicarLigado, useCapturaDaPrancheta, useColarFicheiros, useEcraLigado, useLargarFicheiros, usePreferenciaDaPartilha } from "@/lib/partilha-navegador";
import { guardarConfiguracaoDaPartilha, lerConfiguracaoDaPartilha, usarPar, type ConfiguracaoDaPartilha } from "@/lib/usar-par";
import { useApp } from "@/lib/estado";
import { useEditar } from "@/lib/permissao";
import { Cartao, Confirmar, Interruptor, Linha, LinhaCampo } from "../conta/Pecas";
import { useGuardado } from "@/lib/guardado";
import { Vazio } from "../conteudo/ConteudoPecas";
import { Pagina, Titulo } from "../ui";
import { AvisoDeLargar, CampoDoCodigo, CodigoEQr, LeitorDeQr, ListaDeAparelhos, ListaDeTransferencias, ParesRecentes, ZonaDeEnvio } from "./PecasDaPartilha";

const LIMITES = { "0": "Sem limite", "10": "10 MB", "50": "50 MB", "100": "100 MB", "500": "500 MB", "1024": "1 GB" };

export function PartilhaDeFicheiros() {
  const router = useRouter();
  const editarModulo = useEditar();
  const { avisar, funcao } = useApp();
  // quem pode enviar e receber, e o que se faz com o que chega: vale para todo o painel
  const [guardada, setGuardada] = useGuardado<PoliticaDePartilha>("partilha-politica", POLITICA_DE_ORIGEM);
  const politica = useMemo(() => politicaValida(guardada), [guardada]);
  const [pasta, setPasta] = useState(politica.pasta);
  useEffect(() => setPasta(politica.pasta), [politica.pasta]);
  const editar = editarModulo && podeEnviar(politica, funcao.id);
  const recebe = podeReceber(politica, funcao.id);
  const [descarregar, setDescarregar] = usePreferenciaDaPartilha("descarregar", false);
  const [prancheta, setPrancheta] = usePreferenciaDaPartilha("prancheta", false);
  const [ecra, setEcra] = usePreferenciaDaPartilha("ecra", false);
  const [leitor, setLeitor] = useState(false);
  const [servidor, setServidor] = useState(false);
  const [pendentes, setPendentes] = useState<File[]>([]);
  const [base, setBase] = useState("");
  useEffect(() => setBase(window.location.origin), []);

  const par = usarPar({
    descarregar: descarregar && recebe,
    // o que a função não pode receber, ou passa do limite, ou é um programa, nem chega a entrar
    aoChegar: (f) => motivoDeRecusa(politica, funcao.id, f),
    aoConcluir: (t) => {
      registar("dados", `${t.sentido === "enviado" ? "Enviou" : "Recebeu"} «${t.nome}» (${formatarTamanho(t.tamanho)}) ${t.sentido === "enviado" ? "para" : "de"} ${nomeDoAparelho(t.peerId)}`);
      // o que chega fica guardado no painel, no gestor de ficheiros
      if (t.sentido === "recebido" && t.blob && politica.guardarNaBiblioteca) {
        void guardarNaBiblioteca(t.blob, t.nome, politica.pasta, t.mime).then(
          (g) => {
            registar("dados", `Guardou «${g.nome}» no gestor de ficheiros, na pasta «${g.pasta}»`);
            avisar(`«${g.nome}» ficou guardado em Conteúdo › Gestor de ficheiros › ${g.pasta}`);
          },
          () => avisar(`Não foi possível guardar «${t.nome}» no painel`),
        );
      }
    },
  });
  const abertos = par.aparelhos.filter((a) => a.estado === "aberto");
  const ligacao = par.meuId ? ligacaoDoPar(par.meuId, base) : "";

  // um ficheiro grande avisa; um enorme, num telemóvel, não segue
  const aceitar = useCallback(
    (ficheiros: File[]) => {
      const movel = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const bons: File[] = [];
      for (const f of ficheiros) {
        const a = avisoDeTamanho(f.size, movel);
        if (a?.nivel === "bloqueio") avisar(`«${f.name}»: ${a.texto}`);
        else {
          if (a) avisar(a.texto);
          bons.push(f);
        }
      }
      return bons;
    },
    [avisar],
  );
  const abertosRef = useRef(abertos.length);
  abertosRef.current = abertos.length;
  const enviarRef = useRef(par.enviar);
  enviarRef.current = par.enviar;
  const entregar = useCallback(
    (ficheiros: File[]) => {
      if (!editar) return;
      const bons = aceitar(ficheiros);
      if (bons.length === 0) return;
      if (abertosRef.current > 0) void enviarRef.current(bons);
      else setPendentes((p) => [...p, ...bons]);
    },
    [editar, aceitar],
  );
  // o que esperava por uma ligação sai quando ela abre
  useEffect(() => {
    if (abertos.length > 0 && pendentes.length > 0) {
      void par.enviar(pendentes);
      setPendentes([]);
    }
  }, [abertos.length, pendentes, par]);

  useColarFicheiros(entregar);
  const aArrastar = useLargarFicheiros(entregar);
  useCapturaDaPrancheta(
    prancheta && editar,
    (f) => entregar([f]),
    (m) => {
      avisar(m);
      setPrancheta(false);
    },
  );
  useEcraLigado(ecra && par.aparelhos.length > 0);

  const lerQr = (texto: string) => {
    const id = texto.includes("peer=") ? new URL(texto).searchParams.get("peer") : null;
    par.ligar(id ?? texto.trim());
  };

  return (
    <Pagina>
      <Titulo titulo="Enviar ficheiros" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Cartao titulo="Este aparelho" dica="O código identifica este navegador. Quem o escrever, ler o QR ou abrir a ligação liga-se aqui, e os ficheiros passam direitos de um aparelho para o outro (WebRTC), sem servidor no meio.">
            <CodigoEQr meuId={par.meuId} ligacao={ligacao} aoLer={() => setLeitor(true)} aLer={leitor} />
          </Cartao>
          <Cartao titulo="Ligar a outro aparelho">
            <CampoDoCodigo rotulo={abertos.length > 0 ? "Juntar mais um aparelho" : "O código do outro aparelho"} aoLigar={par.ligar} desativado={par.estado !== "pronto"} />
            {par.erro && <p className="px-4 pb-4 text-sm text-kumo-danger">{par.erro}</p>}
          </Cartao>
          {par.aparelhos.length > 0 && (
            <Cartao titulo={`Aparelhos ligados (${par.aparelhos.length})`}>
              <ListaDeAparelhos aparelhos={par.aparelhos} aoReligar={par.religar} aoDesligar={par.desligar} aoDesligarTodos={par.desligarTodos} />
            </Cartao>
          )}
          {par.pares.filter((p) => p.peerId !== par.meuId && !par.aparelhos.some((a) => a.peerId === p.peerId)).length > 0 && (
            <Cartao titulo="Ligados há pouco">
              <ParesRecentes pares={par.pares.filter((p) => p.peerId !== par.meuId && !par.aparelhos.some((a) => a.peerId === p.peerId))} aoLigar={par.ligar} aoEsquecer={par.esquecer} />
            </Cartao>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Cartao titulo="Enviar">
            {!podeEnviar(politica, funcao.id) && <Linha titulo="Esta função não pode enviar ficheiros" estado="Quem gere o painel liga-lhe o envio em «Quem pode enviar e receber»." />}
            <ZonaDeEnvio aparelhosAbertos={abertos.length} aoEscolher={entregar} desativada={!editar} pendentes={pendentes.length} />
          </Cartao>
          <Cartao titulo={par.transferencias.length > 0 ? `Transferências (${par.transferencias.length})` : "Transferências"}>
            <ListaDeTransferencias
              transferencias={par.transferencias}
              aparelhos={par.aparelhos}
              pares={par.pares}
              podeReenviar={editar && abertos.length > 0}
              aoReenviar={par.reenviar}
              aoCancelar={par.cancelar}
              vazio={<Vazio icone="bandeja" titulo="Ainda não houve transferências" texto="O que enviar ou receber aparece aqui, com o progresso e a velocidade." />}
            />
          </Cartao>
          <Cartao titulo="Quem pode enviar e receber" dica="Cada função tem dois interruptores: enviar e receber. Quem não pode receber nem vê chegar o ficheiro (o outro aparelho é avisado); quem não pode enviar não tem a zona de envio. O que chega guarda-se no gestor de ficheiros do painel, na pasta que escolher. Vale para todo o painel.">
            {FUNCOES.map((f) => (
              <Linha key={f.id} titulo={f.pessoa} estado={f.rotulo}>
                <label className="inline-flex items-center gap-2 text-sm text-kumo-subtle">
                  Enviar
                  <Interruptor marcado={podeEnviar(politica, f.id)} aoMudar={(v) => setGuardada(alternarFuncao(politica, "enviar", f.id, v))} rotulo={`${f.pessoa}: enviar`} desativado={!editarModulo} />
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-kumo-subtle">
                  Receber
                  <Interruptor marcado={podeReceber(politica, f.id)} aoMudar={(v) => setGuardada(alternarFuncao(politica, "receber", f.id, v))} rotulo={`${f.pessoa}: receber`} desativado={!editarModulo} />
                </label>
              </Linha>
            ))}
            <Linha titulo="Guardar no painel o que chega" dica="Cada ficheiro recebido fica no gestor de ficheiros (Conteúdo), na pasta abaixo, com o nome de origem; se já existir, ganha um número.">
              <Interruptor marcado={politica.guardarNaBiblioteca} aoMudar={(v) => setGuardada({ ...politica, guardarNaBiblioteca: v })} rotulo="Guardar no painel o que chega" desativado={!editarModulo} />
            </Linha>
            <LinhaCampo>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Pasta dos recebidos"
                  value={pasta}
                  disabled={!editarModulo || !politica.guardarNaBiblioteca}
                  onChange={(e) => setPasta(e.target.value)}
                  onBlur={() => (pastaValida(pasta) ? setGuardada({ ...politica, pasta: pasta.trim() }) : setPasta(politica.pasta))}
                  error={pasta && !pastaValida(pasta) ? "Um nome sem barras nem símbolos." : undefined}
                  autoComplete="off"
                />
                <Select label="Tamanho máximo" className="w-full min-w-0" value={String(politica.tamanhoMaximoMb)} disabled={!editarModulo} onValueChange={(v) => setGuardada({ ...politica, tamanhoMaximoMb: Number(v) })} items={LIMITES} />
              </div>
            </LinhaCampo>
            <Linha titulo="Recusar programas e scripts" dica="Não deixa entrar ficheiros .exe, .bat, .sh, .apk e parecidos.">
              <Interruptor marcado={politica.recusarProgramas} aoMudar={(v) => setGuardada({ ...politica, recusarProgramas: v })} rotulo="Recusar programas e scripts" desativado={!editarModulo} />
            </Linha>
            <Linha titulo="Os ficheiros recebidos">
              <Button variant="secondary" onClick={() => router.push(caminho("conteudo", "biblioteca"))}>
                Abrir o gestor de ficheiros
              </Button>
            </Linha>
          </Cartao>
          <Cartao titulo="Opções">
            <Linha titulo="Descarregar também para este aparelho" dica="O que chega fica sempre guardado no painel (veja «Quem pode enviar e receber»). Com isto ligado, o ficheiro descarrega-se também para a pasta de transferências deste aparelho. O texto e as ligações ficam aqui, para ler e copiar.">
              <Interruptor marcado={descarregar} aoMudar={setDescarregar} rotulo="Descarregar também para este aparelho" desativado={!recebe} />
            </Linha>
            <Linha titulo="Enviar o que copiar" dica="Quando volta a este separador, o que copiou (texto ou imagem) segue sozinho para os aparelhos ligados. O que já estava copiado ao ligar não segue.">
              <Interruptor marcado={prancheta} aoMudar={setPrancheta} rotulo="Enviar o que copiar" desativado={!editar} />
            </Linha>
            {ecraPodeFicarLigado() && (
              <Linha titulo="Manter o ecrã ligado" dica="Enquanto houver aparelhos ligados, o ecrã não se apaga (um ecrã apagado corta as transferências no telemóvel).">
                <Interruptor marcado={ecra} aoMudar={setEcra} rotulo="Manter o ecrã ligado" />
              </Linha>
            )}
            <Linha titulo="Servidor de ligação" dica="Só serve para os dois aparelhos se encontrarem: os ficheiros nunca passam por ele. Por omissão usa o servidor público da PeerJS; pode pôr o seu e um servidor TURN para redes mais fechadas.">
              <Button variant="secondary" onClick={() => setServidor(true)}>
                Configurar
              </Button>
            </Linha>
          </Cartao>
        </div>
      </div>

      <LeitorDeQr aberto={leitor} aoFechar={() => setLeitor(false)} aoLer={lerQr} />
      <ConfiguracaoDoServidor aberto={servidor} aoMudar={setServidor} />
      <AvisoDeLargar visivel={aArrastar && editar} />
    </Pagina>
  );
}

function ConfiguracaoDoServidor({ aberto, aoMudar }: { aberto: boolean; aoMudar: (v: boolean) => void }) {
  const { avisar } = useApp();
  const [c, setC] = useState<ConfiguracaoDaPartilha>({});
  useEffect(() => {
    if (aberto) setC(lerConfiguracaoDaPartilha());
  }, [aberto]);
  const servidor = c.servidor ?? { host: "" };
  const erroDoServidor = useMemo(() => (servidor.host && !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(servidor.host) ? "Escreva só o nome do servidor, sem https://." : null), [servidor.host]);
  const erroDoTurn = c.turn?.urls && !/^turns?:[^\s]+$/i.test(c.turn.urls) ? "Um endereço TURN começa por turn: ou turns:." : null;
  const guardar = () => {
    guardarConfiguracaoDaPartilha({ ...(servidor.host ? { servidor: { ...servidor, host: servidor.host.trim() } } : {}), ...(c.turn?.urls ? { turn: { ...c.turn, urls: c.turn.urls.trim() } } : {}) });
    avisar("Configuração guardada. A página volta a abrir para a usar.");
    window.setTimeout(() => window.location.reload(), 600);
  };
  return (
    <Confirmar aberto={aberto} aoMudar={aoMudar} titulo="Servidor de ligação" texto={null} rotuloAcao="Guardar" desativado={!!erroDoServidor || !!erroDoTurn} aoConfirmar={guardar}>
      <div className="flex flex-col gap-3">
        <Input label="Servidor PeerJS" placeholder="0.peerjs.com (vazio: o público)" value={servidor.host} onChange={(e) => setC({ ...c, servidor: { ...servidor, host: e.target.value } })} autoComplete="off" error={erroDoServidor ?? undefined} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Porta" inputMode="numeric" placeholder="443" value={servidor.porta ? String(servidor.porta) : ""} onChange={(e) => setC({ ...c, servidor: { ...servidor, porta: Number(e.target.value.replace(/\D/g, "")) || undefined } })} autoComplete="off" />
          <Input label="Caminho" placeholder="/" value={servidor.caminho ?? ""} onChange={(e) => setC({ ...c, servidor: { ...servidor, caminho: e.target.value || undefined } })} autoComplete="off" />
        </div>
        <Input label="Servidor TURN" placeholder="turn:turn.exemplo.com:3478" value={c.turn?.urls ?? ""} onChange={(e) => setC({ ...c, turn: { ...c.turn, urls: e.target.value } })} autoComplete="off" error={erroDoTurn ?? undefined} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Utilizador do TURN" value={c.turn?.utilizador ?? ""} onChange={(e) => setC({ ...c, turn: { urls: c.turn?.urls ?? "", ...c.turn, utilizador: e.target.value } })} autoComplete="off" />
          <Input label="Palavra-passe do TURN" type="password" value={c.turn?.credencial ?? ""} onChange={(e) => setC({ ...c, turn: { urls: c.turn?.urls ?? "", ...c.turn, credencial: e.target.value } })} autoComplete="off" />
        </div>
      </div>
    </Confirmar>
  );
}

export { plataformaDe };
