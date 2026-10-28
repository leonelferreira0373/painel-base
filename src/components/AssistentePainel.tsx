// O assistente de IA do painel: o módulo ai-chat (github.com/ferreirakorp/ai-chat) com o conteúdo do projeto e as cores do painel. O botão «Perguntar à IA» do cabeçalho abre-o.
"use client";

import { AssistenteIA } from "ai-chat";
import "ai-chat/estilos/tema-padrao.css";
import "@/styles/assistente.css";
import NextLink from "next/link";
import { useEffect, useMemo } from "react";
import { AREAS, caminho } from "@/dados/estrutura";
import { ASSISTENTE } from "@/dados/assistente";

/** O evento que o botão do cabeçalho envia para abrir o assistente. */
export const EVENTO_ASSISTENTE = "painel:assistente";

export function AssistentePainel() {
  const paginas = useMemo(() => ["/", ...AREAS.filter((a) => a.id !== "inicio").flatMap((a) => a.modulos.map((m) => caminho(a.id, m.id)))], []);
  useEffect(() => {
    const abrir = () => {
      const botao = document.querySelector<HTMLButtonElement>(".aia-botao");
      if (botao && botao.getAttribute("aria-expanded") !== "true") botao.click();
    };
    window.addEventListener(EVENTO_ASSISTENTE, abrir);
    return () => window.removeEventListener(EVENTO_ASSISTENTE, abrir);
  }, []);
  return <AssistenteIA dados={ASSISTENTE.conteudo} endpoint={ASSISTENTE.endpoint} paginas={paginas} Ligacao={NextLink} seletorDaHero={false} atrasoMs={0} chaveDeSessao={ASSISTENTE.chaveDeSessao} />;
}
