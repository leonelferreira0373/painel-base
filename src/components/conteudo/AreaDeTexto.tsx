// As ferramentas de um texto solto (o título do artigo, a legenda de uma figura): ao passar o rato (ou com o cursor lá) aparece um cartão flutuante com o alinhamento, o tamanho (que se escreve), o tipo de letra, a cor, o negrito, o itálico e as maiúsculas. O cartão segue o alinhamento do texto (à esquerda, ao centro ou à direita) e fica à vista enquanto um menu dele estiver aberto.
"use client";

import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, CaseUpper, Italic, Minus, Plus, Type } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { alinharDoTitulo, tamanhoDoTitulo, tamanhoVizinho, TAMANHOS_DO_TITULO, type AspetoDoTitulo } from "@/lib/blog-titulo";
import { CORES_DE_GRAFICO } from "@/lib/cores-graficos";
import { EscolherCor } from "../EscolherCor";
import { CartaoFlutuante } from "../Flutuantes";
import { BotaoIcone, CartaoDeIcone, type IconeDeBotao } from "../ui";
import { EscolherTipoDeLetra } from "./EscolherTipoDeLetra";
import { CampoDeTamanho, PEQUENO } from "./PecasDoTexto";

/** O aspeto de um texto solto (o do título e o da legenda têm os mesmos campos). */
export interface AspetoDeTexto {
  alinhar?: "left" | "center" | "right" | "justify";
  tamanho?: number;
  cor?: string;
  negrito?: boolean;
  italico?: boolean;
  maiusculas?: boolean;
  fonte?: string;
}

const ALINHAMENTOS: Record<string, { rotulo: string; icone: IconeDeBotao }> = {
  left: { rotulo: "Alinhar à esquerda", icone: AlignLeft },
  center: { rotulo: "Centrar", icone: AlignCenter },
  right: { rotulo: "Alinhar à direita", icone: AlignRight },
  justify: { rotulo: "Justificar", icone: AlignJustify },
};

/** Diz aos nós do editor que o que acontece dentro das ferramentas (cliques, teclas) não é para o texto do artigo. */
export const eventoDasFerramentas = ({ event }: { event: Event }) => !!(event.target as HTMLElement | null)?.closest?.("[data-nao-pm]");

export function AreaDeTexto({
  nome,
  artigo,
  aspeto,
  alinhar,
  tamanho,
  negrito,
  alinhamentos,
  tamanhos,
  minimo,
  maximo,
  aoMudar,
  lado = "cima",
  className = "",
  children,
}: {
  /** O que é («título», «legenda»), para as dicas. */
  nome: string;
  /** «o» ou «a». */
  artigo: "o" | "a";
  aspeto: AspetoDeTexto | undefined;
  /** O alinhamento, o tamanho e o negrito que valem agora (com os de partida já postos). */
  alinhar: string;
  tamanho: number;
  negrito: boolean;
  alinhamentos: ("left" | "center" | "right" | "justify")[];
  tamanhos: number[];
  minimo: number;
  maximo: number;
  aoMudar: (parcial: Partial<AspetoDeTexto>) => void;
  /** O cartão fica por cima do texto ou por baixo. */
  lado?: "cima" | "baixo";
  className?: string;
  children: ReactNode;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);
  const dentro = useRef(false);

  // o cartão esconde-se quando o rato saiu, o foco saiu e nenhum menu dele está aberto
  useEffect(() => {
    if (!visivel) return;
    const t = window.setInterval(() => {
      const aberto = !!raiz.current?.querySelector("[data-popup-open]");
      if (!dentro.current && !aberto && !raiz.current?.contains(document.activeElement)) setVisivel(false);
    }, 500);
    return () => window.clearInterval(t);
  }, [visivel]);

  const entrar = () => {
    dentro.current = true;
    setVisivel(true);
  };
  const posicao = alinhar === "center" ? "left-1/2 -translate-x-1/2" : alinhar === "right" ? "right-0" : "left-0";
  const de = `d${artigo} ${nome}`;

  return (
    <div ref={raiz} className={`relative ${className}`} onPointerEnter={entrar} onPointerLeave={() => void (dentro.current = false)} onFocusCapture={entrar}>
      <CartaoFlutuante
        role="toolbar"
        aria-label={`Ferramentas ${de}`}
        data-nao-pm=""
        // os botões não tiram o cursor do texto (os campos de escrever sim, para se poder escrever neles)
        onMouseDown={(ev) => {
          if (!(ev.target instanceof HTMLInputElement)) ev.preventDefault();
        }}
        className={`sem-barra absolute z-30 flex max-w-full items-center gap-0.5 overflow-x-auto p-1 transition-opacity duration-150 ${lado === "cima" ? "bottom-full mb-2" : "top-full mt-2"} ${posicao} ${visivel ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {alinhamentos.map((id) => (
          <BotaoIcone key={id} dica={ALINHAMENTOS[id].rotulo} icone={ALINHAMENTOS[id].icone} tamanho="sm" className={PEQUENO} ligado={alinhar === id} aoClicar={() => aoMudar({ alinhar: id })} />
        ))}
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-kumo-line" />
        <BotaoIcone dica={`Diminuir ${artigo} ${nome}`} icone={Minus} tamanho="sm" className={PEQUENO} desativado={tamanhoVizinho(tamanho, -1, tamanhos) === tamanho} aoClicar={() => aoMudar({ tamanho: tamanhoVizinho(tamanho, -1, tamanhos) })} />
        <CampoDeTamanho rotulo={`Tamanho ${de}`} valor={tamanho} aoMudar={(n) => aoMudar({ tamanho: Math.round(n) })} passos={tamanhos} minimo={minimo} maximo={maximo} pequeno />
        <BotaoIcone dica={`Aumentar ${artigo} ${nome}`} icone={Plus} tamanho="sm" className={PEQUENO} desativado={tamanhoVizinho(tamanho, 1, tamanhos) === tamanho} aoClicar={() => aoMudar({ tamanho: tamanhoVizinho(tamanho, 1, tamanhos) })} />
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-kumo-line" />
        <CartaoDeIcone dica={`Tipo de letra ${de}`} icone={Type} tamanho="sm" className={PEQUENO} ativo={!!aspeto?.fonte} largura="w-[min(340px,calc(100vw-2rem))]">
          <EscolherTipoDeLetra valor={aspeto?.fonte ?? null} aoEscolher={(f) => aoMudar({ fonte: f ?? undefined })} />
        </CartaoDeIcone>
        <CartaoDeIcone dica={`Cor ${de}`} icone={Baseline} tamanho="sm" className={PEQUENO} ativo={!!aspeto?.cor}>
          <EscolherCor alternar cor={aspeto?.cor ?? null} aoMudar={(hex) => aoMudar({ cor: hex ?? undefined })} cores={CORES_DE_GRAFICO} padrao="#171717" rotuloDeVoltar="Cor original" />
        </CartaoDeIcone>
        <BotaoIcone dica="Negrito" icone={Bold} tamanho="sm" className={PEQUENO} ligado={negrito} aoClicar={() => aoMudar({ negrito: !negrito })} />
        <BotaoIcone dica="Itálico" icone={Italic} tamanho="sm" className={PEQUENO} ligado={!!aspeto?.italico} aoClicar={() => aoMudar({ italico: !aspeto?.italico })} />
        <BotaoIcone dica="Maiúsculas" icone={CaseUpper} tamanho="sm" className={PEQUENO} ligado={!!aspeto?.maiusculas} aoClicar={() => aoMudar({ maiusculas: !aspeto?.maiusculas })} />
      </CartaoFlutuante>
      {children}
    </div>
  );
}

/** O título do artigo com as suas ferramentas (por cima, a seguir ao alinhamento do título). */
export function AreaDoTitulo({ aspeto, aoMudar, className = "", children }: { aspeto: AspetoDoTitulo | undefined; aoMudar: (parcial: Partial<AspetoDoTitulo>) => void; className?: string; children: ReactNode }) {
  return (
    <AreaDeTexto
      nome="título"
      artigo="o"
      aspeto={aspeto}
      alinhar={alinharDoTitulo(aspeto)}
      tamanho={tamanhoDoTitulo(aspeto)}
      negrito={aspeto?.negrito !== false}
      alinhamentos={["left", "center", "right"]}
      tamanhos={TAMANHOS_DO_TITULO}
      minimo={12}
      maximo={200}
      // o alinhamento escolhido substitui o antigo «título ao centro»
      aoMudar={({ alinhar, ...resto }) => aoMudar({ ...resto, ...(alinhar ? { alinhar: alinhar === "justify" ? "left" : alinhar, centrado: undefined } : {}) })}
      className={className}
    >
      {children}
    </AreaDeTexto>
  );
}
