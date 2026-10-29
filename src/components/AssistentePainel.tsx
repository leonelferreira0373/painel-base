// O assistente de IA do painel: o chat (a cópia local do módulo ai-chat, src/assistente) com a interface do painel, ligado ao Worker da IA da Cloudflare. A IA age no painel como uma pessoa (ver o ecrã, abrir páginas, clicar, escrever…), com a aprovação de quem fala com ela; as perguntas prontas (os pills) e as respostas oficiais vêm do editor de FAQ; o anel de contexto mede, a sério, o que cada chamada ocupa e gasta. O botão «Perguntar à IA» do cabeçalho abre-o.
"use client";

import { AssistenteIA } from "@/assistente";
import "ai-chat/estilos/tema-padrao.css";
import "@/styles/assistente.css";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ASSISTENTE } from "@/dados/assistente";
import { AREAS, caminho } from "@/dados/estrutura";
import { PROJETO } from "@/dados/projeto";
import { useArmazem } from "@/lib/armazem";
import { catalogoDoPainel } from "@/lib/catalogo";
import { faqAtivas, faqComoDocumentos, useFaq } from "@/lib/faq";
import { criarTransporteDoPainel } from "@/lib/ia-agente";
import { instrucoesFinais, procurar, useControlosIA, type DocumentoDeMemoria } from "@/lib/ia-controlos";
import { consumirContexto, textoDoContexto } from "@/lib/ia-contexto";
import { useEmUso } from "@/lib/ia-uso";
import { abrirPesquisas, useTrabalhos } from "@/lib/pesquisa-profunda";
import { useApp } from "@/lib/estado";
import { AnelDeContexto, ContextoDaIa } from "./ia/AnelDeContexto";
import { CartaoDeAprovacao } from "./ia/CartaoDeAprovacao";
import { CartaoDePesquisaPronta } from "./pesquisa/MotorDePesquisas";
import { Ic } from "./Icones";

/** O evento que o botão do cabeçalho envia para abrir o assistente. */
export const EVENTO_ASSISTENTE = "painel:assistente";

/** A resposta de um documento da memória: o começo do texto, sem passar de 420 caracteres. */
const resumoDe = (texto: string) => {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > 420 ? `${limpo.slice(0, 420).replace(/\s\S*$/, "")}…` : limpo;
};

/** O texto sem acentos, maiúsculas nem pontuação: para saber se duas perguntas são a mesma. */
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function AssistentePainel() {
  const router = useRouter();
  const pathname = usePathname();
  const { funcao } = useApp();
  const controlos = useControlosIA();
  const { itens: memoria } = useArmazem<DocumentoDeMemoria>("memoria");
  const { faq } = useFaq();
  const emUso = useEmUso("assistente");
  const { porAcabar } = useTrabalhos();
  const [contextoAberto, setContextoAberto] = useState(false);
  const catalogo = useMemo(() => catalogoDoPainel(funcao), [funcao]);

  // o nome, a primeira mensagem, os pills e a memória ativa vêm dos controlos e da FAQ
  const dados = useMemo(
    () => ({
      ...ASSISTENTE.conteudo,
      nome: controlos.nome || ASSISTENTE.conteudo.nome,
      abertura: [controlos.boasVindas || ASSISTENTE.conteudo.abertura[0]],
      // as perguntas prontas (os pills) e as respostas oficiais vêm do painel (Conteúdo > Editor de FAQ): sem IA, respondem às perguntas escritas
      perguntas: [...faqAtivas(faq).map((f) => ({ pergunta: f.pergunta.trim(), resposta: f.resposta.trim(), semSugestao: !f.sugerida })), ...memoria.filter((d) => d.ativo).slice(0, 8).map((d) => ({ pergunta: `O que diz «${d.nome}»?`, resposta: resumoDe(d.texto), semSugestao: true }))],
    }),
    [controlos, memoria, faq],
  );
  const paginas = useMemo(() => ["/", ...AREAS.filter((a) => a.id !== "inicio").flatMap((a) => a.modulos.map((m) => caminho(a.id, m.id)))], []);

  // o transporte lê o estado mais recente a cada pergunta, sem se refazer
  const vivo = useRef({ controlos, memoria, faq, funcao, pathname, catalogo });
  vivo.current = { controlos, memoria, faq, funcao, pathname, catalogo };
  const transporte = useMemo(
    () =>
      PROJETO.urlIa
        ? criarTransporteDoPainel({
            urlIa: PROJETO.urlIa,
            catalogo: () => vivo.current.catalogo,
            abrirPagina: (href) => router.push(href),
            respostaOficial: (pergunta) => {
              const q = normalizar(pergunta);
              const oficial = faqAtivas(vivo.current.faq).find((x) => normalizar(x.pergunta) === q);
              return oficial ? oficial.resposta.trim() : null;
            },
            sistema: (pergunta) => {
              const { controlos: c, memoria: m, faq: f, funcao: fn, pathname: p } = vivo.current;
              const passagens = procurar([...faqComoDocumentos(f), ...m], pergunta, 3);
              return [
                instrucoesFinais(c, m, faqAtivas(f).length),
                "Podes agir no painel como uma pessoa, com as ferramentas (procurar páginas, abrir uma página, ver o ecrã, clicar, escrever, escolher, premir teclas, ler e acrescentar perguntas à FAQ). Para ir a uma página usa procurar_paginas e depois abrir_pagina; só vês o ecrã quando precisas de clicar ou escrever. Se o pedido era só abrir ou explicar, responde logo, sem mais passos. Nunca inventes dados do painel. Cada ação que muda alguma coisa precisa da licença de quem fala contigo (o painel pede-a). Responde curto, em português de Portugal.",
                `Quem fala contigo tem a função «${fn.rotulo}» e está na página ${p}.`,
                (() => {
                  const ctx = consumirContexto();
                  return ctx ? textoDoContexto(ctx) : "";
                })(),
                passagens.length ? `O que a equipa deixou escrito e se aproxima desta pergunta (usa-o tal como está quando responderes):\n${passagens.map((x) => `[${x.documento}]\n${x.texto.slice(0, 500)}`).join("\n\n")}` : "",
              ]
                .filter(Boolean)
                .join("\n\n");
            },
          })
        : undefined,
    [router],
  );

  useEffect(() => {
    const abrir = () => {
      const botao = document.querySelector<HTMLButtonElement>(".aia-botao");
      if (botao && botao.getAttribute("aria-expanded") !== "true") botao.click();
    };
    window.addEventListener(EVENTO_ASSISTENTE, abrir);
    return () => window.removeEventListener(EVENTO_ASSISTENTE, abrir);
  }, []);

  const itensDoMenu = useMemo(
    () => [
      { id: "pesquisa-em-curso", rotulo: porAcabar > 0 ? `Pesquisa em curso (${porAcabar})` : "Pesquisa em curso", icone: <Ic nome="pulso" tamanho={16} />, aoClicar: () => abrirPesquisas() },
      { id: "contexto", rotulo: "Contexto e utilização", icone: <Ic nome="serie" tamanho={16} />, aoClicar: () => setContextoAberto(true) },
      { id: "historico-uso", rotulo: "Histórico de utilização", icone: <Ic nome="recentes" tamanho={16} />, aoClicar: () => router.push(caminho("ia", "uso")) },
      { id: "perguntas", rotulo: "Editar as perguntas prontas", icone: <Ic nome="ajuda" tamanho={16} />, aoClicar: () => router.push(caminho("conteudo", "faq")) },
    ],
    [router, porAcabar],
  );

  return (
    <>
      <AssistenteIA
        dados={dados}
        endpoint={ASSISTENTE.endpoint}
        paginas={paginas}
        Ligacao={NextLink}
        seletorDaHero={false}
        atrasoMs={0}
        chaveDeSessao={ASSISTENTE.chaveDeSessao}
        transporte={transporte}
        itensDoMenu={itensDoMenu}
        cartao={(c) => {
          const tipo = typeof c === "object" && c !== null ? (c as { tipo?: string }).tipo : undefined;
          if (tipo === "aprovacao") return <CartaoDeAprovacao id={String((c as { id?: string }).id)} descricao={String((c as { descricao?: string }).descricao)} />;
          if (tipo === "pesquisa-pronta") return <CartaoDePesquisaPronta id={String((c as { id?: string }).id)} />;
          return null;
        }}
        Lateral={PROJETO.urlIa ? <AnelDeContexto origem="assistente" ativo={emUso} tamanho={22} /> : undefined}
      />
      <ContextoDaIa aberto={contextoAberto} aoMudar={setContextoAberto} origemInicial="assistente" />
    </>
  );
}
