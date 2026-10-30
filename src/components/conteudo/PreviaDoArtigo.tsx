// A pré-visualização de um artigo: o ficheiro que se exporta, aberto numa janela à parte («iframe») com a largura do aparelho que se escolhe (telemóvel, tablet ou computador). Assim vê-se o que sai mesmo: as regras de ecrã estreito (as colunas passam a uma), as letras, as colagens, as etiquetas ao passar o rato e a página clara de quem lê, sem o tema do painel por cima. Com o botão para exportar em PDF.
"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { FileDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ItemDaBiblioteca } from "@/lib/biblioteca";
import type { Artigo } from "@/lib/blog";
import { PASTA_DAS_FONTES } from "@/lib/blog-fontes";
import { paraHtml } from "@/lib/blog-html";
import { ICONES } from "../Icones";
import { Separadores } from "../ui";
import { fontesParaExportar } from "./useFontes";

type Aparelho = "telemovel" | "tablet" | "computador";
const LARGURAS: Record<Aparelho, number> = { telemovel: 390, tablet: 768, computador: 1120 };

export function PreviaDoArtigo({ aberto, aoMudar, a, urls, ficheiros, aoPdf }: { aberto: boolean; aoMudar: (v: boolean) => void; a: Artigo; urls: Map<string, string>; ficheiros: ItemDaBiblioteca[]; aoPdf: () => void }) {
  const [aparelho, setAparelho] = useState<Aparelho>("telemovel");
  const [fontes, setFontes] = useState({ links: "", css: "" });
  const fontesDaPessoa = useMemo(() => ficheiros.filter((f) => f.pasta === PASTA_DAS_FONTES), [ficheiros]);
  // as fontes carregadas pela pessoa vão dentro do documento (a janela da pré-visualização não vê as do painel)
  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    void fontesParaExportar(a.html ?? "", a.cabecalho?.fonte, fontesDaPessoa).then((f) => vivo && setFontes(f));
    return () => {
      vivo = false;
    };
  }, [aberto, a.html, a.cabecalho?.fonte, fontesDaPessoa]);
  const documento = useMemo(() => (aberto ? paraHtml(a, (id) => urls.get(id), undefined, fontes) : ""), [aberto, a, urls, fontes]);
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="xl" className="flex h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] flex-col overflow-hidden p-0 sm:h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-5rem)]">
        <div className="flex items-center justify-between gap-3 border-b border-kumo-hairline px-4 py-3 sm:px-5">
          <Dialog.Title className="text-lg font-semibold">Pré-visualizar</Dialog.Title>
          <div className="flex items-center gap-2">
            <Separadores
              itens={[
                { id: "telemovel", rotulo: "Telemóvel" },
                { id: "tablet", rotulo: "Tablet" },
                { id: "computador", rotulo: "Computador" },
              ]}
              valor={aparelho}
              aoMudar={(id) => setAparelho(id as Aparelho)}
            />
            <Button variant="secondary" size="sm" icon={<FileDown className="size-4" />} onClick={aoPdf}>
              Exportar em PDF
            </Button>
            <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-kumo-tint p-3 sm:p-6">
          {aberto && <iframe key={aparelho} title="Pré-visualização do artigo" srcDoc={documento} sandbox="allow-same-origin allow-popups" className="mx-auto block h-full min-h-[24rem] rounded-md bg-white ring ring-kumo-line" style={{ width: LARGURAS[aparelho], maxWidth: "100%" }} />}
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
