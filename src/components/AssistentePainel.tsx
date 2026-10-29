// O assistente de IA do painel: o módulo ai-chat (github.com/ferreirakorp/ai-chat) com o conteúdo do projeto e as cores do painel. O botão «Perguntar à IA» do cabeçalho abre-o.
"use client";

import { AssistenteIA } from "ai-chat";
import "ai-chat/estilos/tema-padrao.css";
import "@/styles/assistente.css";
import NextLink from "next/link";
import { useEffect, useMemo } from "react";
import { AREAS, caminho } from "@/dados/estrutura";
import { useArmazem } from "@/lib/armazem";
import { useControlosIA, type DocumentoDeMemoria } from "@/lib/ia-controlos";
import { perguntasProntas, useFaq } from "@/lib/faq";
import { ASSISTENTE } from "@/dados/assistente";

/** O evento que o botão do cabeçalho envia para abrir o assistente. */
export const EVENTO_ASSISTENTE = "painel:assistente";

/** A resposta de um documento da memória: o começo do texto, sem passar de 420 caracteres. */
const resumoDe = (texto: string) => {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > 420 ? `${limpo.slice(0, 420).replace(/\s\S*$/, "")}…` : limpo;
};

export function AssistentePainel() {
  const controlos = useControlosIA();
  const { itens: memoria } = useArmazem<DocumentoDeMemoria>("memoria");
  const { faq } = useFaq();
  // o nome, a primeira mensagem e a memória ativa (um resumo de cada documento) vêm dos controlos da IA
  const dados = useMemo(
    () => ({
      ...ASSISTENTE.conteudo,
      nome: controlos.nome || ASSISTENTE.conteudo.nome,
      abertura: [controlos.boasVindas || ASSISTENTE.conteudo.abertura[0]],
      // as perguntas frequentes publicadas vêm primeiro: são as respostas oficiais da equipa (a IA lê-as como tal e, sem IA, respondem às perguntas escritas)
      perguntas: [...perguntasProntas(faq), ...ASSISTENTE.conteudo.perguntas, ...memoria.filter((d) => d.ativo).slice(0, 8).map((d) => ({ pergunta: `O que diz «${d.nome}»?`, resposta: resumoDe(d.texto) }))],
    }),
    [controlos, memoria, faq],
  );
  const paginas = useMemo(() => ["/", ...AREAS.filter((a) => a.id !== "inicio").flatMap((a) => a.modulos.map((m) => caminho(a.id, m.id)))], []);
  useEffect(() => {
    const abrir = () => {
      const botao = document.querySelector<HTMLButtonElement>(".aia-botao");
      if (botao && botao.getAttribute("aria-expanded") !== "true") botao.click();
    };
    window.addEventListener(EVENTO_ASSISTENTE, abrir);
    return () => window.removeEventListener(EVENTO_ASSISTENTE, abrir);
  }, []);
  return <AssistenteIA dados={dados} endpoint={ASSISTENTE.endpoint} paginas={paginas} Ligacao={NextLink} seletorDaHero={false} atrasoMs={0} chaveDeSessao={ASSISTENTE.chaveDeSessao} />;
}
