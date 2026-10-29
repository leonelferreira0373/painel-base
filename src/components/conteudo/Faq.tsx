// O editor de FAQ do painel: a lista de perguntas frequentes, onde se escreve a pergunta e a resposta, se publica ou esconde e se muda a ordem. As publicadas valem também para o assistente de IA, que as usa como respostas oficiais. As perguntas ficam no navegador.
"use client";

import { Button, Input, InputArea } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { identificador } from "@/lib/conta";
import { erroDaFaq, faqNova, LIMITE_DA_PERGUNTA, LIMITE_DA_RESPOSTA, useFaq, type Faq as PerguntaFrequente } from "@/lib/faq";
import { useEditar } from "@/lib/permissao";
import { Cartao, Confirmar, Interruptor, Linha } from "../conta/Pecas";
import { DicaInfo } from "../Dica";
import { Dica } from "../Dica";
import { Frase } from "../Frase";
import { Ic, ICONES } from "../Icones";
import { BotaoIcone, Pagina, Titulo } from "../ui";
import { Vazio } from "./ConteudoPecas";

export function Faq() {
  const editar = useEditar();
  const { faq, pronto, guardar, remover, mover } = useFaq();
  const [rascunho, setRascunho] = useState<PerguntaFrequente | null>(null);
  const [apagar, setApagar] = useState<PerguntaFrequente | null>(null);
  const publicadas = useMemo(() => faq.filter((f) => f.ativa).length, [faq]);
  const erro = rascunho ? erroDaFaq(rascunho, faq) : null;

  const gravar = () => {
    if (!rascunho || erro) return;
    guardar({ ...rascunho, pergunta: rascunho.pergunta.trim(), resposta: rascunho.resposta.trim(), atualizado: new Date().toISOString() });
  };
  const mudar = (parcial: Partial<PerguntaFrequente>) => setRascunho((r) => (r ? { ...r, ...parcial } : r));

  return (
    <Pagina>
      <Titulo titulo="Editor de FAQ">
        {editar && (
          <Button variant="primary" icon={ICONES.mais} onClick={() => setRascunho(faqNova(identificador()))}>
            Nova pergunta
          </Button>
        )}
      </Titulo>
      <Cartao titulo={`Perguntas${faq.length ? ` (${publicadas} de ${faq.length} publicadas)` : ""}`} dica="As perguntas publicadas aparecem no site e são as respostas oficiais do assistente de IA: ao responder, ele usa-as tal como estão.">
        {!pronto ? (
          <div className="p-6 text-sm text-kumo-subtle">A abrir as perguntas…</div>
        ) : faq.length === 0 ? (
          <Vazio icone="ajuda" titulo="Ainda não há perguntas" texto="Escreva a primeira pergunta e a resposta." />
        ) : (
          faq.map((f, i) => (
            <Linha
              key={f.id}
              titulo={
                editar ? (
                  <button type="button" onClick={() => setRascunho(f)} className="min-w-0 text-left font-medium hover:underline">
                    <Frase>{f.pergunta}</Frase>
                  </button>
                ) : (
                  <Frase>{f.pergunta}</Frase>
                )
              }
              estado={
                <span className="line-clamp-2">
                  <Frase>{f.resposta}</Frase>
                </span>
              }
            >
              <div className="flex items-center gap-1">
                {f.ativa && f.sugerida && (
                  <Dica conteudo="Aparece como pergunta pronta no chat">
                    <span className="inline-flex size-8 items-center justify-center text-kumo-subtle">
                      <Ic nome="ia" tamanho={14} />
                    </span>
                  </Dica>
                )}
                <Interruptor marcado={f.ativa} aoMudar={(v) => guardar({ ...f, ativa: v, atualizado: new Date().toISOString() })} rotulo={f.ativa ? `Esconder «${f.pergunta}»` : `Publicar «${f.pergunta}»`} desativado={!editar} />
                {editar && (
                  <>
                    <span className={i === 0 ? "pointer-events-none opacity-40" : undefined}>
                      <BotaoIcone dica="Subir" icone="cima" aoClicar={() => mover(f.id, -1)} />
                    </span>
                    <span className={i === faq.length - 1 ? "pointer-events-none opacity-40" : undefined}>
                      <BotaoIcone dica="Descer" icone="baixo" aoClicar={() => mover(f.id, 1)} />
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setRascunho(f)}>
                      Editar
                    </Button>
                    <BotaoIcone dica="Remover a pergunta" icone="lixo" aoClicar={() => setApagar(f)} />
                  </>
                )}
              </div>
            </Linha>
          ))
        )}
      </Cartao>

      <Confirmar aberto={!!rascunho} aoMudar={(v) => !v && setRascunho(null)} titulo={rascunho && faq.some((f) => f.id === rascunho.id) ? "Editar a pergunta" : "Nova pergunta"} texto={null} rotuloAcao="Guardar" aoConfirmar={gravar} desativado={!!erro}>
        {rascunho && (
          <div className="flex flex-col gap-3">
            <Input label="Pergunta" value={rascunho.pergunta} onChange={(e) => mudar({ pergunta: e.target.value })} error={rascunho.pergunta.trim() && erro && /pergunta/i.test(erro) ? erro : undefined} placeholder="Como posso acompanhar o meu pedido?" maxLength={LIMITE_DA_PERGUNTA + 20} autoComplete="off" autoFocus />
            <InputArea label="Resposta" value={rascunho.resposta} onValueChange={(v) => mudar({ resposta: v })} error={rascunho.resposta.trim().length > LIMITE_DA_RESPOSTA ? erro ?? undefined : undefined} minRows={6} autoResize placeholder="Escreva a resposta como a diria a um cliente." />
            <div className="flex items-center justify-between gap-3 text-sm text-kumo-default">
              Publicada
              <Interruptor marcado={rascunho.ativa} aoMudar={(v) => mudar({ ativa: v })} rotulo="Publicada" />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-kumo-default">
              <span className="inline-flex items-center gap-1.5">
                Sugerir no chat
                <DicaInfo texto="Aparece como pergunta pronta (um pill) no chat do assistente. Sem isto, o assistente continua a usar a resposta quando lhe perguntam." />
              </span>
              <Interruptor marcado={rascunho.sugerida} aoMudar={(v) => mudar({ sugerida: v })} rotulo="Sugerir no chat" desativado={!rascunho.ativa} />
            </div>
          </div>
        )}
      </Confirmar>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover a pergunta" texto={apagar ? `«${apagar.pergunta}» vai ser removida, do site e do assistente. Não se pode desfazer.` : ""} rotuloAcao="Remover" perigo aoConfirmar={() => apagar && remover(apagar.id)} />
    </Pagina>
  );
}
