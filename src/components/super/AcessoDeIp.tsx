// Bloquear e desbloquear um IP a partir de onde ele aparece (pedidos em tempo real, pedidos bloqueados): uma só janela de confirmação e uma só lógica (`planoDeAcesso`), que cria, muda ou apaga a regra do firewall.
"use client";

import { Input } from "@cloudflare/kumo";
import { useState } from "react";
import type { RegraFirewall } from "@/dados/super-dados";
import type { useColecao } from "@/lib/api/colecao";
import { useLigacao } from "@/lib/api/cliente";
import { planoDeAcesso, regraQueApanha } from "@/lib/dev";
import { useApp } from "@/lib/estado";
import { Confirmar } from "../conta/Pecas";
import { useGuardado } from "./SuperPecas";

export type RegrasDoFirewall = ReturnType<typeof useColecao<RegraFirewall>>;

/** Se o firewall está ligado (em modo simulado; em modo ligado é o servidor que decide, e o painel confia nas regras). */
export function useFirewallLigado(): boolean {
  const ligacao = useLigacao();
  const [firewall] = useGuardado<{ ativo: boolean }>("firewall", { ativo: true });
  return ligacao.modo === "ligado" || firewall.ativo;
}

/** `regras` é a coleção das regras do firewall (a do ecrã, para os dois verem a mesma lista). Devolve o estado de um IP, o pedido de mudança e a janela de confirmação a pôr no ecrã. */
export function useAcessoDeIp(regras: RegrasDoFirewall) {
  const { avisar } = useApp();
  const ligado = useFirewallLigado();
  const [alvo, setAlvo] = useState<{ ip: string; pais?: string; quer: "bloquear" | "permitir" } | null>(null);
  const [nota, setNota] = useState("");

  /** A regra que bloqueia o IP, ou null se o firewall o deixa passar. */
  const bloqueadoPor = (ip: string, pais?: string): RegraFirewall | null => {
    const r = regraQueApanha(ip, regras.itens, pais);
    return r?.acao === "bloquear" ? r : null;
  };
  const pedir = (ip: string, pais?: string) => {
    setNota("");
    setAlvo({ ip, pais, quer: bloqueadoPor(ip, pais) ? "permitir" : "bloquear" });
  };
  const confirmar = async () => {
    if (!alvo) return;
    const plano = planoDeAcesso(alvo.ip, alvo.pais, regras.itens, alvo.quer, `fw-${Date.now().toString(36)}`, nota.trim());
    try {
      if (plano.remover) await regras.remover(plano.remover);
      if (plano.guardar) await regras.guardar(plano.guardar);
      avisar(alvo.quer === "bloquear" ? `${alvo.ip} bloqueado` : `${alvo.ip} desbloqueado`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível mudar a regra");
    }
  };

  const regraAtual = alvo ? bloqueadoPor(alvo.ip, alvo.pais) : null;
  const texto = !alvo
    ? ""
    : alvo.quer === "bloquear"
      ? `${alvo.ip} deixa de conseguir abrir o site: os pedidos dele são recusados pelo firewall.${ligado ? "" : " O firewall está desligado, por isso a regra só vale depois de o ligar."}`
      : planoDeAcesso(alvo.ip, alvo.pais, regras.itens, "permitir", "x").remover
        ? `A regra para ${alvo.ip} deixa de existir e o IP volta a poder abrir o site.`
        : `${alvo.ip} está bloqueado pela regra ${regraAtual?.alvo ?? "do firewall"}. Fica uma regra que o permite, e a regra de ${regraAtual?.alvo ?? "do firewall"} continua para os outros.`;

  const dialogo = (
    <Confirmar
      aberto={!!alvo}
      aoMudar={(v) => !v && setAlvo(null)}
      titulo={alvo?.quer === "permitir" ? "Desbloquear o IP" : "Bloquear o IP"}
      texto={texto}
      rotuloAcao={alvo?.quer === "permitir" ? "Desbloquear" : "Bloquear"}
      perigo={alvo?.quer !== "permitir"}
      aoConfirmar={() => void confirmar()}
    >
      {alvo?.quer === "bloquear" && <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Porque bloqueia este IP" autoComplete="off" />}
    </Confirmar>
  );

  return { bloqueadoPor, pedir, dialogo, ligado };
}
