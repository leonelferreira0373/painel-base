// A página pública de receber ficheiros (sem entrar no painel): quem abre a ligação ou o QR do painel fica ligado ao aparelho que o mostrou e recebe os ficheiros por WebRTC, direitos do outro navegador. Também pode mandar ficheiros de volta. É a mesma ideia do SnapShare, e as duas páginas falam entre si.
"use client";

import { Banner } from "@cloudflare/kumo";
import { useCallback, useEffect, useRef, useState } from "react";
import { avisoDeTamanho } from "@/lib/partilha";
import { useColarFicheiros, useLargarFicheiros } from "@/lib/partilha-navegador";
import { usarPar } from "@/lib/usar-par";
import { TelaEntrada } from "../auth/Moldura";
import { Cartao } from "../conta/Pecas";
import { AvisoDeLargar, CampoDoCodigo, LeitorDeQr, ListaDeAparelhos, ListaDeTransferencias, ParesRecentes, ZonaDeEnvio } from "./PecasDaPartilha";
import { Vazio } from "../conteudo/ConteudoPecas";
import { Button } from "@cloudflare/kumo";
import { Ic } from "../Icones";

export function PaginaReceber() {
  const par = usarPar({ descarregar: true, guardarCodigo: false });
  const [pendentes, setPendentes] = useState<File[]>([]);
  const [leitor, setLeitor] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const abertos = par.aparelhos.filter((a) => a.estado === "aberto");
  const jaLigou = useRef(false);

  // a ligação traz o aparelho a que se liga («?peer=snap-K7MQ3X»)
  useEffect(() => {
    if (par.estado !== "pronto" || jaLigou.current) return;
    const id = new URLSearchParams(window.location.search).get("peer");
    if (!id) return;
    jaLigou.current = true;
    par.ligar(id);
  }, [par.estado, par]);

  const entregar = useCallback(
    (ficheiros: File[]) => {
      const movel = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const bons = ficheiros.filter((f) => {
        const a = avisoDeTamanho(f.size, movel);
        if (a?.nivel === "bloqueio") {
          setAviso(`«${f.name}»: ${a.texto}`);
          return false;
        }
        return true;
      });
      if (bons.length === 0) return;
      if (abertos.length > 0) void par.enviar(bons);
      else setPendentes((p) => [...p, ...bons]);
    },
    [abertos.length, par],
  );
  useEffect(() => {
    if (abertos.length > 0 && pendentes.length > 0) {
      void par.enviar(pendentes);
      setPendentes([]);
    }
  }, [abertos.length, pendentes, par]);
  useColarFicheiros(entregar);
  const aArrastar = useLargarFicheiros(entregar);

  const lerQr = (texto: string) => {
    try {
      const id = new URL(texto).searchParams.get("peer");
      if (id) return par.ligar(id);
    } catch {
      /* não é uma ligação */
    }
    par.ligar(texto.trim());
  };
  const recentes = par.pares.filter((p) => p.peerId !== par.meuId && !par.aparelhos.some((a) => a.peerId === p.peerId));

  return (
    <TelaEntrada>
      <div className="mb-6 text-left">
        <h1 className="text-balance text-2xl font-semibold text-kumo-default">
          <div className="text-center">Receber ficheiros</div>
        </h1>
      </div>
      <div className="flex flex-col gap-4">
        {par.estado === "erro" && <Banner variant="error" title="Não foi possível ligar" description={par.erro ?? undefined} />}
        {par.estado === "a-ligar" && <p className="text-center text-sm text-kumo-subtle">A preparar a ligação…</p>}
        {par.estado === "pronto" && abertos.length === 0 && (
          <Cartao titulo="Ligar">
            <CampoDoCodigo rotulo="O código do outro aparelho" aoLigar={par.ligar} />
            <div className="flex px-4 pb-4">
              <Button variant="secondary" icon={<Ic nome="escanear" tamanho={16} />} onClick={() => setLeitor(true)}>
                Ler o QR
              </Button>
            </div>
            {par.erro && <p className="px-4 pb-4 text-sm text-kumo-danger">{par.erro}</p>}
            {recentes.length > 0 && <ParesRecentes pares={recentes} aoLigar={par.ligar} aoEsquecer={par.esquecer} />}
          </Cartao>
        )}
        {par.aparelhos.length > 0 && (
          <Cartao titulo="Ligado a">
            <ListaDeAparelhos aparelhos={par.aparelhos} aoReligar={par.religar} aoDesligar={par.desligar} aoDesligarTodos={par.desligarTodos} />
          </Cartao>
        )}
        {aviso && <Banner variant="alert" title={aviso} />}
        {par.aparelhos.length > 0 && (
          <Cartao titulo={par.transferencias.length > 0 ? `Transferências (${par.transferencias.length})` : "Transferências"}>
            <ListaDeTransferencias transferencias={par.transferencias} aparelhos={par.aparelhos} pares={par.pares} podeReenviar={abertos.length > 0} aoReenviar={par.reenviar} aoCancelar={par.cancelar} vazio={<Vazio icone="bandeja" titulo="À espera de ficheiros" texto="O que o outro aparelho enviar descarrega-se sozinho." />} />
          </Cartao>
        )}
        {par.aparelhos.length > 0 && (
          <Cartao titulo="Enviar de volta">
            <ZonaDeEnvio aparelhosAbertos={abertos.length} aoEscolher={entregar} pendentes={pendentes.length} />
          </Cartao>
        )}
      </div>
      <LeitorDeQr aberto={leitor} aoFechar={() => setLeitor(false)} aoLer={lerQr} />
      <AvisoDeLargar visivel={aArrastar && par.aparelhos.length > 0} />
    </TelaEntrada>
  );
}
