// O bloco de um campo com imagens: a imagem principal grande (ou a zona onde se largam ficheiros), as outras em miniaturas, «Enviar» (guarda na galeria já ligada ao local do campo) e «Da galeria» (as imagens deste local primeiro). Tocar na imagem abre-a quase em ecrã cheio para ver como fica e ajustar o enquadramento. É o único sítio onde um campo de imagem se desenha; o local vem de `dados/locais.ts` e é o que a galeria mostra como botão.
"use client";

import { Button } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import type { IdDeLocal } from "@/dados/locais";
import { eImagem, nomeUnico, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { identificador } from "@/lib/conta";
import { estiloDoEnquadramento, type Enquadramento } from "@/lib/enquadramento";
import { comLocal, semRepetidas, tornarPrincipal } from "@/lib/locais";
import { Ic, ICONES } from "../Icones";
import { BotaoIcone } from "../ui";
import { EscolherImagem } from "./EscolherImagem";
import { useUrlsDeImagens, ZonaDeUpload } from "./ConteudoPecas";
import { VisualizadorDeImagem } from "./VisualizadorDeImagem";

export const PASTA_DAS_IMAGENS = "Galeria";

interface Propriedades {
  local: IdDeLocal;
  /** As imagens deste campo: a primeira é a principal. */
  ids: string[];
  aoMudar: (ids: string[]) => void;
  /** O campo aceita mais do que uma imagem. */
  varias?: boolean;
  vazio?: string;
  /** As classes da proporção (e da altura máxima) da imagem grande. */
  proporcao?: string;
  /** Largura / altura da moldura onde a imagem principal vai aparecer (para o ajuste). */
  moldura?: number;
  /** O enquadramento de cada imagem (pelo identificador) e o que fazer quando se ajusta. */
  enquadramentos?: Record<string, Enquadramento>;
  aoEnquadrar?: (id: string, e: Enquadramento) => void;
}

export function BlocoDeImagem({ local, ids, aoMudar, varias = false, vazio = "Sem imagem", proporcao = "aspect-[4/3]", moldura = 4 / 3, enquadramentos, aoEnquadrar }: Propriedades) {
  const { itens, guardar } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const imagens = useMemo(() => itens.filter(eImagem), [itens]);
  const urls = useUrlsDeImagens(imagens);
  const [escolher, setEscolher] = useState(false);
  const [ver, setVer] = useState(false);
  const existentes = ids.filter((id) => imagens.some((i) => i.id === id));
  const item = imagens.find((i) => i.id === existentes[0]);
  // a principal é a grande; as miniaturas são só as outras
  const outras = existentes.slice(1);

  const usar = (novas: string[]) => aoMudar(varias ? semRepetidas([...ids, ...novas]) : novas.slice(0, 1));
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

  return (
    <ZonaDeUpload aceitar="image/*" multiplo={varias} aoEscolher={carregar} className="flex min-w-0 flex-col gap-3 p-4">
      {(abrir, aArrastar) => (
        <>
          <div className={`relative grid ${proporcao} w-full place-items-center overflow-hidden rounded-xl bg-kumo-tint ring transition-colors ${aArrastar ? "ring-kumo-brand" : "ring-kumo-line"}`}>
            {item && urls.get(item.id) ? (
              <>
                <img src={urls.get(item.id)} alt={item.alt ?? item.nome} className="size-full" style={estiloDoEnquadramento(enquadramentos?.[item.id])} />
                <button type="button" onClick={() => setVer(true)} aria-label="Ver e ajustar a imagem" className="absolute inset-0 cursor-zoom-in" />
                <span className="absolute right-2 top-2">
                  <BotaoIcone dica="Ver e ajustar a imagem" icone="ampliar" tamanho="sm" variante="secondary" aoClicar={() => setVer(true)} />
                </span>
              </>
            ) : (
              <button type="button" onClick={abrir} className="flex size-full flex-col items-center justify-center gap-2 text-sm text-kumo-subtle" aria-label="Enviar imagens">
                <Ic nome="imagem" tamanho={32} />
                {vazio}
              </button>
            )}
          </div>
          {varias && outras.length > 0 && (
            <ul className="sem-barra flex gap-2 overflow-x-auto" aria-label="Outras imagens">
              {outras.map((id, n) => (
                <li key={id} className="shrink-0">
                  <button type="button" onClick={() => aoMudar(tornarPrincipal(ids, id))} aria-label={`Tornar principal a imagem ${n + 2}`} className="block size-14 overflow-hidden rounded-lg ring ring-kumo-line transition-shadow hover:ring-kumo-interact">
                    {urls.get(id) && <img src={urls.get(id)} alt="" className="size-full" style={estiloDoEnquadramento(enquadramentos?.[id])} />}
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
            {item && (
              <Button variant="ghost" icon={ICONES.lixo} onClick={() => aoMudar(ids.filter((x) => x !== item.id))}>
                Tirar
              </Button>
            )}
          </div>
          <EscolherImagem aberto={escolher} aoMudar={setEscolher} aoEscolher={usar} local={local} multiplo={varias} jaEscolhidas={ids} />
          {item && <VisualizadorDeImagem aberto={ver} aoMudar={setVer} src={urls.get(item.id)} alt={item.alt ?? item.nome} proporcao={moldura} valor={enquadramentos?.[item.id]} aoGuardar={(e) => aoEnquadrar?.(item.id, e)} />}
        </>
      )}
    </ZonaDeUpload>
  );
}
