// O que faz as notas viverem: apaga (para a reciclagem) as que expiraram, deixa a fila dos e-mails agendados andar mesmo com o ecrã dos e-mails fechado (para os lembretes saírem à hora), avisa quem escreveu a nota quando chega a hora de um lembrete e põe o botão «Deixar nota» em qualquer janela que se abra. Também tem o indicador de notas dos cartões e dos KPIs.
"use client";

import { Button, Tooltip } from "@cloudflare/kumo";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/lib/estado";
import { useConta } from "@/lib/conta";
import { useSessao } from "@/lib/auth";
import { abrirNota, expirou, idDoEmailDoLembrete, lerNotas, notaVisivel, notasDoSitio, removerNota, useNotas, type AlvoDeNota, type Quem } from "@/lib/notas";
import { Ic } from "../Icones";
import { useEmails, useFilaSimulada } from "../super/EmailPecas";
import { NotasDoSitio } from "./NotasDoSitio";

const AVISADOS = "painel.notas.lembretes-avisados";
const lerAvisados = (): string[] => {
  try {
    return JSON.parse(window.localStorage.getItem(AVISADOS) ?? "[]") as string[];
  } catch {
    return [];
  }
};

/** Quem está a ver o painel, para saber que notas lhe são para ele. */
export function useQuem(): Quem {
  const { funcao } = useApp();
  const { conta } = useConta();
  const { sessao } = useSessao();
  return useMemo(() => ({ nome: sessao?.nome ?? funcao.pessoa, email: conta.email, funcao: funcao.rotulo }), [sessao?.nome, funcao.pessoa, funcao.rotulo, conta.email]);
}

const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** As janelas que não levam botão de nota (o chat, as próprias notas, os avisos e as janelas do painel que já têm o seu sítio). */
const SEM_NOTA = /^(Notas ·|Exportar e importar|Analisar com IA|Pesquisa em curso|Cor de|Cor deste)/;

interface JanelaComBotao {
  janela: Element;
  gancho: HTMLElement;
  alvo: AlvoDeNota;
}

export function MotorDeNotas() {
  const { avisar } = useApp();
  const quem = useQuem();
  const pathname = usePathname() ?? "";
  const emails = useEmails();
  const { notas } = useNotas();
  const [janelas, setJanelas] = useState<JanelaComBotao[]>([]);
  useFilaSimulada({ emails });

  // as notas que expiraram vão para a reciclagem, com os lembretes que ainda não saíram
  useEffect(() => {
    const varrer = async () => {
      const agora = new Date();
      for (const n of lerNotas().filter((x) => expirou(x, agora))) {
        for (const l of n.lembretes) {
          const e = emails.itens.find((x) => x.id === idDoEmailDoLembrete(n, l) && x.pasta === "agendados");
          if (e) await emails.remover(e.id, { semReciclagem: true });
        }
        await removerNota(n);
        avisar(`A nota de ${n.autor} em «${n.alvo.rotulo}» expirou e foi para a reciclagem`);
      }
    };
    void varrer();
    const t = window.setInterval(() => void varrer(), 60_000);
    return () => window.clearInterval(t);
  }, [emails.itens.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // chegou a hora de um lembrete: avisa-se quem escreveu a nota (o e-mail sai pela fila)
  useEffect(() => {
    const ver = () => {
      const agora = Date.now();
      const feitos = lerAvisados();
      const novos: string[] = [];
      for (const n of lerNotas()) {
        if (n.autor.toLowerCase() !== quem.nome.toLowerCase()) continue;
        for (const l of n.lembretes) {
          const id = `${n.id}-${l.id}`;
          if (new Date(l.quando).getTime() <= agora && !feitos.includes(id)) {
            novos.push(id);
            avisar(`Lembrete: nota em «${n.alvo.rotulo}»`);
          }
        }
      }
      if (novos.length) {
        try {
          window.localStorage.setItem(AVISADOS, JSON.stringify([...feitos, ...novos].slice(-200)));
        } catch {
          /* sem armazenamento */
        }
      }
    };
    ver();
    const t = window.setInterval(ver, 20_000);
    return () => window.clearInterval(t);
  }, [quem.nome, notas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // o botão de nota em qualquer janela que se abra
  useEffect(() => {
    const ligar = (j: Element) => {
      if (j.classList.contains("aia-painel") || j.className.toString().includes("--toast") || j.querySelector("[data-botao-de-nota]") || j.hasAttribute("data-sem-nota")) return;
      const titulo = (j.querySelector("h1, h2, h3, [class*=title]")?.textContent ?? j.getAttribute("aria-label") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
      if (!titulo || SEM_NOTA.test(titulo)) return;
      const gancho = document.createElement("span");
      gancho.setAttribute("data-botao-de-nota", "");
      // o botão fica na linha do título, ao lado do «Fechar» e alinhado com ele; sem essa linha, flutua no canto
      const fechar = (j as HTMLElement).querySelector('button[aria-label="Fechar"]');
      const linha = fechar?.parentElement;
      if (fechar && linha && getComputedStyle(linha).display === "flex") {
        gancho.style.cssText = "margin-left:auto;margin-right:-8px;align-self:center;display:inline-flex";
        linha.insertBefore(gancho, fechar);
      } else {
        gancho.style.cssText = "position:absolute;top:16px;right:64px;z-index:2";
        (j as HTMLElement).appendChild(gancho);
      }
      setJanelas((l) => [...l, { janela: j, gancho, alvo: { tipo: "janela", chave: `janela:${slug(pathname)}:${slug(titulo)}`, rotulo: titulo, pagina: pathname } }]);
    };
    const verificar = () => document.querySelectorAll('[role="dialog"]').forEach(ligar);
    const limpar = () => setJanelas((l) => l.filter((x) => x.janela.isConnected));
    const o = new MutationObserver(() => {
      verificar();
      limpar();
    });
    o.observe(document.body, { childList: true, subtree: true });
    return () => o.disconnect();
  }, [pathname]);

  return (
    <>
      <NotasDoSitio />
      {janelas.map((j, i) => createPortal(<BotaoDeNotaNaJanela alvo={j.alvo} quem={quem} />, j.gancho, `${j.alvo.chave}-${i}`))}
    </>
  );
}

function BotaoDeNotaNaJanela({ alvo, quem }: { alvo: AlvoDeNota; quem: Quem }) {
  const { notas } = useNotas();
  const n = notasDoSitio(notas, alvo.chave).filter((x) => notaVisivel(x, quem, new Date())).length;
  return (
    <Tooltip
      content={n ? `${n} ${n === 1 ? "nota" : "notas"} nesta janela` : "Deixar uma nota nesta janela"}
      render={
        <Button variant="ghost" shape="square" aria-label="Notas desta janela" onClick={() => abrirNota(alvo)} icon={<Ic nome="lembrete" tamanho={16} />}>
          {n > 0 && <span className="ml-1 text-xs font-semibold tabular-nums">{n}</span>}
        </Button>
      }
    />
  );
}

/** O sinal de notas num cartão ou KPI: só aparece quando há notas para quem vê. */
export function IndicadorDeNotas({ alvo }: { alvo: AlvoDeNota }) {
  const { notas } = useNotas();
  const quem = useQuem();
  const n = notasDoSitio(notas, alvo.chave).filter((x) => notaVisivel(x, quem, new Date())).length;
  if (!n) return null;
  return (
    <Tooltip
      content={`${n} ${n === 1 ? "nota" : "notas"} neste cartão`}
      render={
        <button type="button" onClick={() => abrirNota(alvo)} aria-label={`${n} ${n === 1 ? "nota" : "notas"} neste cartão`} className="nota-papel inline-flex h-5 shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold tabular-nums ring-1 ring-black/15">
          <Ic nome="lembrete" tamanho={11} />
          {n}
        </button>
      }
    />
  );
}
