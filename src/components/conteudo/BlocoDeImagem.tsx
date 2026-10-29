// O bloco de um campo com imagens: a imagem grande (ou a zona onde se largam ficheiros), as miniaturas, «Enviar» (guarda na galeria já ligada ao local do campo) e «Da galeria» (as imagens deste local primeiro). É o único sítio onde um campo de imagem se desenha; o local vem de `dados/locais.ts` e é o que a galeria mostra como botão.
"use client";

import { Button } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import type { IdDeLocal } from "@/dados/locais";
import { eImagem, nomeUnico, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { identificador } from "@/lib/conta";
import { comLocal, semRepetidas, tornarPrincipal } from "@/lib/locais";
import { Ic, ICONES } from "../Icones";
import { EscolherImagem } from "./EscolherImagem";
import { useUrlsDeImagens, ZonaDeUpload } from "./ConteudoPecas";

export const PASTA_DAS_IMAGENS = "Galeria";

/** `ids` são as imagens deste campo (a primeira é a principal); `varias` diz se o campo aceita mais do que uma. */
export function BlocoDeImagem({ local, ids, aoMudar, varias = false, vazio = "Sem imagem", proporcao = "aspect-[4/3]" }: { local: IdDeLocal; ids: string[]; aoMudar: (ids: string[]) => void; varias?: boolean; vazio?: string; /** As classes da proporção (e da altura máxima) da imagem grande. */ proporcao?: string }) {
  const { itens, guardar } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const imagens = useMemo(() => itens.filter(eImagem), [itens]);
  const urls = useUrlsDeImagens(imagens);
  const [escolher, setEscolher] = useState(false);
  const [vista, setVista] = useState(0);
  const existentes = ids.filter((id) => imagens.some((i) => i.id === id));
  const atual = existentes[Math.min(vista, Math.max(0, existentes.length - 1))];
  const item = imagens.find((i) => i.id === atual);

  const usar = (novas: string[]) => {
    const todas = varias ? semRepetidas([...ids, ...novas]) : novas.slice(0, 1);
    aoMudar(todas);
    setVista(varias ? todas.length - 1 : 0);
  };
  const carregar = async (ficheiros: File[]) => {
    const atuais = [...itens];
    const novas: string[] = [];
    for (const f of ficheiros.filter((x) => x.type.startsWith("image/"))) {
      const novo = comLocal({ id: identificador(), nome: nomeUnico(atuais, PASTA_DAS_IMAGENS, f.name), tipo: f.type, tamanho: f.size, criado: new Date().toISOString(), pasta: PASTA_DAS_IMAGENS, blob: f }, local, true);
      atuais.push(novo);
      await guardar(novo);
      novas.push(novo.id);
    }
    if (novas.length) usar(novas);
  };
  const tirar = (id: string) => {
    aoMudar(ids.filter((x) => x !== id));
    setVista(0);
  };

  return (
    <ZonaDeUpload aceitar="image/*" multiplo={varias} aoEscolher={carregar} className="flex min-w-0 flex-col gap-3 p-4">
      {(abrir, aArrastar) => (
        <>
          <div className={`relative grid ${proporcao} w-full place-items-center overflow-hidden rounded-xl bg-kumo-tint ring transition-colors ${aArrastar ? "ring-kumo-brand" : "ring-kumo-line"}`}>
            {item && urls.get(item.id) ? (
              <img src={urls.get(item.id)} alt={item.alt ?? item.nome} className="size-full object-contain" />
            ) : (
              <button type="button" onClick={abrir} className="flex size-full flex-col items-center justify-center gap-2 text-sm text-kumo-subtle" aria-label="Enviar imagens">
                <Ic nome="imagem" tamanho={32} />
                {vazio}
              </button>
            )}
          </div>
          {varias && existentes.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto" aria-label="Imagens">
              {existentes.map((id, n) => (
                <li key={id} className="shrink-0">
                  <button type="button" onClick={() => setVista(n)} aria-label={`Ver a imagem ${n + 1}${n === 0 ? " (principal)" : ""}`} aria-pressed={id === atual} className={`block size-14 overflow-hidden rounded-lg ring transition-shadow ${id === atual ? "ring-2 ring-kumo-brand" : "ring-kumo-line hover:ring-kumo-interact"}`}>
                    {urls.get(id) && <img src={urls.get(id)} alt="" className="size-full object-cover" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={ICONES.enviar} onClick={abrir}>
              Enviar
            </Button>
            <Button variant="secondary" icon={<Ic nome="imagem" />} onClick={() => setEscolher(true)}>
              Da galeria
            </Button>
            {varias && item && existentes.length > 1 && existentes[0] !== item.id && (
              <Button variant="ghost" onClick={() => (aoMudar(tornarPrincipal(ids, item.id)), setVista(0))}>
                Tornar principal
              </Button>
            )}
            {item && (
              <Button variant="ghost" icon={ICONES.lixo} onClick={() => tirar(item.id)}>
                Tirar
              </Button>
            )}
          </div>
          <EscolherImagem aberto={escolher} aoMudar={setEscolher} aoEscolher={usar} local={local} multiplo={varias} jaEscolhidas={ids} />
        </>
      )}
    </ZonaDeUpload>
  );
}
