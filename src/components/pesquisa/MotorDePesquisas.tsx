// O que liga a pesquisa a fundo ao painel: arranca o motor da fila, desenha as duas janelas (analisar e pesquisa em curso) e, quando uma análise acaba (ou falha), avisa: um aviso no ecrã e uma mensagem da IA no chat, com o cartão para ver o resultado e exportá-lo. Também tem o botão do cabeçalho com o tempo estimado e o cartão que aparece dentro do chat.
"use client";

import { Button, Loader, Tooltip } from "@cloudflare/kumo";
import { useEffect } from "react";
import { registar } from "@/lib/atividade";
import { abrirDados } from "@/lib/dados-da-pagina";
import { useApp } from "@/lib/estado";
import { EVENTO_PESQUISA_ACABOU, ligarMotor } from "@/lib/pesquisa-motor";
import { abrirPesquisas, FINAIS, fonteDaAnalise, textoDoTempo, trabalhoPorId, useTrabalhos } from "@/lib/pesquisa-profunda";
import { Ic, ICONES } from "../Icones";
import { AnalisarComIa } from "./AnalisarComIa";
import { PesquisaEmCurso } from "./PesquisaEmCurso";

/** Uma mensagem da IA no chat (o chat, se estiver fechado, mostra o balão). */
function mensagemNoChat(texto: string, cartoes?: unknown[]) {
  window.dispatchEvent(new CustomEvent("painel:chat-mensagem", { detail: { texto, cartoes } }));
}

export function MotorDePesquisas() {
  const { avisar } = useApp();
  useEffect(() => ligarMotor(), []);
  useEffect(() => {
    const aoAcabar = (e: Event) => {
      const { id, estado, erro } = (e as CustomEvent<{ id: string; estado: string; erro?: string }>).detail;
      const t = trabalhoPorId(id);
      if (!t) return;
      if (estado === "concluida") {
        registar("ia", `A análise «${t.titulo}» terminou`);
        avisar(`A análise «${t.titulo}» terminou`);
        const resumo = t.resultado?.resumo ? t.resultado.resumo.replace(/\s*\[\d+\]/g, "") : "";
        mensagemNoChat(`Terminei a análise \`${t.titulo}\`. ${resumo}`.trim(), [{ tipo: "pesquisa-pronta", id }]);
      } else {
        registar("ia", `A análise «${t.titulo}» falhou: ${erro ?? ""}`);
        avisar(`A análise «${t.titulo}» falhou`);
        mensagemNoChat(`Não consegui acabar a análise \`${t.titulo}\`: ${erro ?? "houve um problema"}.`, [{ tipo: "pesquisa-pronta", id }]);
      }
    };
    window.addEventListener(EVENTO_PESQUISA_ACABOU, aoAcabar);
    return () => window.removeEventListener(EVENTO_PESQUISA_ACABOU, aoAcabar);
  }, [avisar]);
  return (
    <>
      <AnalisarComIa />
      <PesquisaEmCurso />
    </>
  );
}

/** O botão do cabeçalho: só aparece quando há análises por acabar (ou por ler) e mostra quanto falta. */
export function ChipDePesquisas() {
  const { trabalhos, etas, porAcabar, porLer } = useTrabalhos();
  if (porAcabar === 0 && porLer === 0) return null;
  const falta = Math.max(0, ...trabalhos.filter((t) => !FINAIS.includes(t.estado)).map((t) => etas.get(t.id) ?? 0));
  const texto = porAcabar > 0 ? `${porAcabar} ${porAcabar === 1 ? "análise" : "análises"} · ~${textoDoTempo(falta)}` : `${porLer} ${porLer === 1 ? "análise pronta" : "análises prontas"}`;
  return (
    <Tooltip
      content="Pesquisa em curso"
      render={
        <Button variant="ghost" className="h-8" aria-label={`Pesquisa em curso: ${texto}`} icon={porAcabar > 0 ? <Loader size={14} /> : <Ic nome="certo" tamanho={16} />} onClick={() => abrirPesquisas()}>
          <span className="hidden whitespace-nowrap text-xs tabular-nums md:inline">{texto}</span>
        </Button>
      }
    />
  );
}

/** O cartão que a IA põe no chat quando uma análise acaba. */
export function CartaoDePesquisaPronta({ id }: { id: string }) {
  const { trabalhos } = useTrabalhos();
  const t = trabalhos.find((x) => x.id === id);
  if (!t) return <div className="my-2 rounded-xl p-3 text-sm text-kumo-subtle ring ring-kumo-line">Esta análise já não existe.</div>;
  const fonte = fonteDaAnalise(t);
  return (
    <div className="my-2 flex flex-col gap-2 rounded-xl bg-kumo-base p-3 text-sm text-kumo-default ring ring-kumo-line" role="group" aria-label="Análise">
      <div className="flex items-start gap-2">
        <Ic nome={t.estado === "concluida" ? "certo" : "aviso"} tamanho={16} className="mt-0.5 shrink-0" />
        <span className="min-w-0 flex-1 font-medium">{t.estado === "concluida" ? (t.resultado?.titulo ?? t.titulo) : t.titulo}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={() => abrirPesquisas(id)}>
          {t.estado === "concluida" ? "Ver o resultado" : "Ver o que aconteceu"}
        </Button>
        {fonte && (
          <Button size="sm" variant="secondary" icon={ICONES.transferir} onClick={() => abrirDados("exportar", fonte)}>
            Exportar
          </Button>
        )}
      </div>
    </div>
  );
}
