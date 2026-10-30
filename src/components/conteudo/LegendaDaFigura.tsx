// A legenda por baixo de uma figura (imagem, colagem, áudio, vídeo ou incorporação), como nos livros de texto: uma linha pequena que explica o que se vê, com as suas ferramentas (alinhamento, tamanho, tipo de letra, cor, negrito, itálico e maiúsculas). No editor só aparece quando já tem texto ou quando a figura está escolhida; no ficheiro exportado fica num «figcaption».
"use client";

import { escreverAspetoDaLegenda, estiloDaLegenda, lerAspetoDaLegenda, TAMANHO_DA_LEGENDA, TAMANHOS_DA_LEGENDA, type AspetoDaLegenda } from "@/lib/blog-legenda";
import { AreaDeTexto } from "./AreaDeTexto";

export function LegendaDaFigura({ valor, aoMudar, estilo, aoMudarEstilo, selecionada }: { valor: string; aoMudar: (v: string) => void; /** O aspeto guardado na figura. */ estilo: string; aoMudarEstilo: (v: string) => void; selecionada: boolean }) {
  if (!valor && !selecionada) return null;
  const aspeto = lerAspetoDaLegenda(estilo);
  return (
    <AreaDeTexto
      nome="legenda"
      artigo="a"
      aspeto={aspeto}
      alinhar={aspeto.alinhar ?? "center"}
      tamanho={aspeto.tamanho ?? TAMANHO_DA_LEGENDA}
      negrito={!!aspeto.negrito}
      alinhamentos={["left", "center", "right", "justify"]}
      tamanhos={TAMANHOS_DA_LEGENDA}
      minimo={8}
      maximo={120}
      lado="baixo"
      aoMudar={(parcial) => aoMudarEstilo(escreverAspetoDaLegenda({ ...aspeto, ...parcial } as AspetoDaLegenda))}
    >
      <textarea
        aria-label="Legenda"
        rows={1}
        value={valor}
        placeholder="Escreva a legenda"
        onChange={(e) => aoMudar(e.target.value.replace(/\n/g, " "))}
        style={estiloDaLegenda(aspeto)}
        className="mt-1.5 block w-full resize-none overflow-hidden bg-transparent leading-snug text-kumo-subtle outline-none [field-sizing:content] placeholder:text-kumo-subtle/60"
      />
    </AreaDeTexto>
  );
}
