// Escolher imagens da biblioteca (a mesma da galeria e do gestor de ficheiros): as do local do campo primeiro e depois todas, ou carregar novas ali mesmo (o botão «Carregar» está sempre à vista; também se largam imagens na janela). Escolhe-se uma imagem (a janela fecha) ou várias (marcam-se e confirma-se).
"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import type { IdDeLocal } from "@/dados/locais";
import { eImagem, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { imagensDoLocal, localPorId } from "@/lib/locais";
import { Ic, ICONES } from "../Icones";
import { Separadores } from "../ui";
import { useUrlsDeImagens, Vazio, ZonaDeUpload } from "./ConteudoPecas";
import { useCarregarFicheiros } from "./useCarregarFicheiros";

export function EscolherImagem({ aberto, aoMudar, aoEscolher, local, multiplo = false, jaEscolhidas = [] }: { aberto: boolean; aoMudar: (v: boolean) => void; aoEscolher: (ids: string[]) => void; local?: IdDeLocal; multiplo?: boolean; jaEscolhidas?: string[] }) {
  const { itens } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const carregar = useCarregarFicheiros();
  const imagens = useMemo(() => itens.filter(eImagem).sort((a, b) => b.criado.localeCompare(a.criado)), [itens]);
  const doLocal = useMemo(() => (local ? imagensDoLocal(itens, local) : []), [itens, local]);
  const urls = useUrlsDeImagens(imagens);
  const [aba, setAba] = useState<"local" | "todas">("todas");
  const [marcadas, setMarcadas] = useState<string[]>([]);
  useEffect(() => {
    if (!aberto) return;
    setMarcadas([]);
    setAba(doLocal.length > 0 ? "local" : "todas");
    // só ao abrir: as imagens que chegam a seguir não mudam a aba escolhida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);
  const visiveis = aba === "local" ? doLocal : imagens;
  const nomeDoLocal = local ? (localPorId(local)?.rotulo ?? "") : "";
  const alternar = (id: string) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  /** As imagens carregadas aqui ficam na biblioteca, ligadas ao local do campo, e já escolhidas. */
  const aoCarregar = async (ficheiros: File[]) => {
    const ids = await carregar(
      ficheiros.filter((f) => f.type.startsWith("image/")),
      local,
    );
    if (ids.length === 0) return;
    if (multiplo) {
      setAba("todas");
      setMarcadas((m) => [...new Set([...m, ...ids])]);
    } else {
      aoEscolher(ids.slice(0, 1));
      aoMudar(false);
    }
  };
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="lg" className="p-6">
        <ZonaDeUpload aceitar="image/*" multiplo={multiplo} aoEscolher={aoCarregar}>
          {(abrir) => (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Dialog.Title className="text-lg font-semibold">{multiplo ? "Escolher imagens" : "Escolher uma imagem"}</Dialog.Title>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" icon={ICONES.enviar} onClick={abrir}>
                    Carregar
                  </Button>
                  <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
                </div>
              </div>
              {local && imagens.length > 0 && (
                <div className="mb-3">
                  <Separadores
                    itens={[
                      { id: "local", rotulo: `${nomeDoLocal} (${doLocal.length})` },
                      { id: "todas", rotulo: `Todas (${imagens.length})` },
                    ]}
                    valor={aba}
                    aoMudar={(id) => setAba(id as "local" | "todas")}
                  />
                </div>
              )}
              {imagens.length === 0 ? (
                <Vazio icone="galeria" titulo="A biblioteca não tem imagens" texto="Carregue imagens aqui ou largue-as nesta janela." />
              ) : visiveis.length === 0 ? (
                <Vazio icone="galeria" titulo="Nenhuma imagem neste local" texto="Veja «Todas», ou carregue imagens aqui." />
              ) : (
                <ul className="grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                  {visiveis.map((i) => {
                    const marcada = marcadas.includes(i.id);
                    const usada = jaEscolhidas.includes(i.id);
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => (multiplo ? alternar(i.id) : (aoEscolher([i.id]), aoMudar(false)))}
                          aria-label={`${marcada ? "Tirar" : "Usar"} ${i.nome}`}
                          aria-pressed={multiplo ? marcada : undefined}
                          className={`relative block aspect-square w-full overflow-hidden rounded-lg ring transition-shadow ${marcada ? "ring-2 ring-kumo-brand" : "ring-kumo-line hover:ring-kumo-interact"}`}
                        >
                          {urls.get(i.id) && <img src={urls.get(i.id)} alt={i.alt ?? i.nome} className={`size-full object-cover transition-opacity ${usada && !marcada ? "opacity-50" : ""}`} loading="lazy" />}
                          {(marcada || usada) && (
                            <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-md bg-kumo-base/90 text-kumo-default">
                              <Ic nome="certo" tamanho={12} />
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {multiplo && (
                <div className="mt-4 flex justify-end gap-2">
                  <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
                  <Button variant="primary" disabled={marcadas.length === 0} onClick={() => (aoEscolher(marcadas), aoMudar(false))}>
                    {marcadas.length > 1 ? `Usar ${marcadas.length} imagens` : "Usar a imagem"}
                  </Button>
                </div>
              )}
            </>
          )}
        </ZonaDeUpload>
      </Dialog>
    </Dialog.Root>
  );
}
