// Escolher um áudio, um vídeo ou um documento da biblioteca para pôr no texto do blog, ou carregar um novo ali mesmo (também se larga o ficheiro na janela). Uma escolha e a janela fecha.
"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { FileText, Film, Music } from "lucide-react";
import { useMemo } from "react";
import { formatarTamanho, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { PASTA_DAS_FONTES } from "@/lib/blog-fontes";
import { ICONES } from "../Icones";
import { GravadorDeAudio } from "./GravadorDeAudio";
import { Vazio, ZonaDeUpload } from "./ConteudoPecas";
import { tipoDoFicheiro, type TipoDeFicheiro } from "./FicheiroDoBlog";
import { useCarregarFicheiros } from "./useCarregarFicheiros";

const TEXTOS: Record<TipoDeFicheiro, { titulo: string; vazio: string; aceitar: string }> = {
  audio: { titulo: "Escolher um áudio", vazio: "Ainda não há áudios", aceitar: "audio/*" },
  video: { titulo: "Escolher um vídeo", vazio: "Ainda não há vídeos", aceitar: "video/*" },
  documento: { titulo: "Escolher um documento", vazio: "Ainda não há documentos", aceitar: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.odt,.ods,.epub" },
};
const ICONE = { audio: Music, video: Film, documento: FileText };

export function EscolherDaBiblioteca({ aberto, aoMudar, tipo, aoEscolher }: { aberto: boolean; aoMudar: (v: boolean) => void; tipo: TipoDeFicheiro; aoEscolher: (item: ItemDaBiblioteca) => void }) {
  const { itens } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const carregar = useCarregarFicheiros();
  const lista = useMemo(
    () =>
      itens
        .filter((i) => i.blob && !i.tipo.startsWith("image/") && i.pasta !== PASTA_DAS_FONTES && tipoDoFicheiro(i.tipo) === tipo)
        .sort((a, b) => b.criado.localeCompare(a.criado)),
    [itens, tipo],
  );
  const Icone = ICONE[tipo];
  const aoCarregar = async (ficheiros: File[]) => {
    const ids = await carregar(ficheiros.filter((f) => tipoDoFicheiro(f.type) === tipo || tipo === "documento"));
    const novo = itens.find((i) => i.id === ids[0]);
    // o item acabado de guardar ainda pode não estar na lista: escolhe-se com o que se sabe do ficheiro
    const ficheiro = ficheiros[0];
    if (ids[0] && ficheiro) {
      aoEscolher(novo ?? { id: ids[0], nome: ficheiro.name, tipo: ficheiro.type || "application/octet-stream", tamanho: ficheiro.size, criado: new Date().toISOString(), pasta: "", blob: ficheiro });
      aoMudar(false);
    }
  };
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="lg" className="p-6">
        <ZonaDeUpload aceitar={TEXTOS[tipo].aceitar} multiplo={false} aoEscolher={aoCarregar}>
          {(abrir) => (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Dialog.Title className="text-lg font-semibold">{TEXTOS[tipo].titulo}</Dialog.Title>
                <div className="flex items-center gap-2">
                  {tipo === "audio" && <GravadorDeAudio aoGravar={(f) => void aoCarregar([f])} />}
                  <Button variant="secondary" size="sm" icon={ICONES.enviar} onClick={abrir}>
                    Carregar
                  </Button>
                  <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
                </div>
              </div>
              {lista.length === 0 ? (
                <Vazio icone="ficheiro" titulo={TEXTOS[tipo].vazio} texto="Carregue um ficheiro aqui ou largue-o nesta janela." />
              ) : (
                <ul className="flex max-h-[55vh] flex-col overflow-y-auto">
                  {lista.map((i) => (
                    <li key={i.id}>
                      <button type="button" onClick={() => (aoEscolher(i), aoMudar(false))} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-kumo-tint">
                        <Icone className="size-5 shrink-0 stroke-[1.75] text-kumo-default" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-kumo-default">{i.nome}</span>
                        <span className="shrink-0 text-sm tabular-nums text-kumo-subtle">{formatarTamanho(i.tamanho)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </ZonaDeUpload>
      </Dialog>
    </Dialog.Root>
  );
}
