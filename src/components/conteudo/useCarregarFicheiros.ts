// Carregar ficheiros para a biblioteca (a mesma da galeria e do gestor de ficheiros) a partir de qualquer janela de escolha: cada um vai para a pasta do seu tipo («Galeria», «Áudios», «Vídeos», «Documentos») e, se for uma imagem, fica ligado ao local do campo.
"use client";

import { useCallback } from "react";
import type { IdDeLocal } from "@/dados/locais";
import { nomeUnico, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { identificador } from "@/lib/conta";
import { comLocal } from "@/lib/locais";

export const pastaDoTipo = (mime: string): string => (mime.startsWith("image/") ? "Galeria" : mime.startsWith("audio/") ? "Áudios" : mime.startsWith("video/") ? "Vídeos" : "Documentos");

/** A função que guarda ficheiros na biblioteca e devolve os identificadores novos. */
export function useCarregarFicheiros() {
  const { itens, guardar } = useArmazem<ItemDaBiblioteca>("ficheiros");
  return useCallback(
    async (ficheiros: File[], local?: IdDeLocal): Promise<string[]> => {
      const atuais = [...itens];
      const ids: string[] = [];
      for (const f of ficheiros) {
        const tipo = f.type || "application/octet-stream";
        const pasta = pastaDoTipo(tipo);
        const base: ItemDaBiblioteca = { id: identificador(), nome: nomeUnico(atuais, pasta, f.name), tipo, tamanho: f.size, criado: new Date().toISOString(), pasta, blob: f };
        const novo = local && tipo.startsWith("image/") ? comLocal(base, local, true) : base;
        atuais.push(novo);
        await guardar(novo);
        ids.push(novo.id);
      }
      return ids;
    },
    [itens, guardar],
  );
}
