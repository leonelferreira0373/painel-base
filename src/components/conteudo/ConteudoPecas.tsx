// Peças comuns dos módulos de conteúdo (ficheiros, galeria, blog e IA): a zona onde se largam ficheiros, os endereços temporários das imagens guardadas e o estado vazio.
"use client";

import { Empty } from "@cloudflare/kumo";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ItemDaBiblioteca } from "@/lib/biblioteca";
import { Frase } from "../Frase";
import { Ic, type Icone } from "../Icones";

/** Uma zona que aceita ficheiros largados e um botão para os escolher: `abrir` abre o seletor de ficheiros do navegador (o campo escondido é a única forma de o fazer). */
export function ZonaDeUpload({ aceitar, multiplo = true, aoEscolher, className = "", children }: { aceitar?: string; multiplo?: boolean; aoEscolher: (ficheiros: File[]) => void; className?: string; children: (abrir: () => void, aArrastar: boolean) => ReactNode }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);
  return (
    <div
      className={`${className} ${sobre ? "ring-2 ring-kumo-brand" : ""} rounded-xl transition-shadow`}
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        // a entrada global de ficheiros (no document, depois do React) leva para a análise: aqui os ficheiros ficam nesta zona
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        setSobre(false);
        const f = Array.from(e.dataTransfer.files);
        if (f.length) aoEscolher(multiplo ? f : f.slice(0, 1));
      }}
    >
      <input
        ref={entrada}
        type="file"
        multiple={multiplo}
        accept={aceitar}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) aoEscolher(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      {children(() => entrada.current?.click(), sobre)}
    </div>
  );
}

/** Endereços temporários (blob:) para mostrar as imagens guardadas (com `todos`, também o áudio, o vídeo e os documentos); libertam-se quando já não servem. */
export function useUrlsDeImagens(itens: ItemDaBiblioteca[], todos = false): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const novos = new Map<string, string>();
    for (const i of itens) if (i.blob && (todos || i.tipo.startsWith("image/"))) novos.set(i.id, URL.createObjectURL(i.blob));
    setUrls(novos);
    return () => novos.forEach((u) => URL.revokeObjectURL(u));
  }, [itens]);
  return urls;
}

export function Vazio({ icone, titulo, texto, acao }: { icone: Icone; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <Empty
      size="sm"
      className="rounded-none border-0 bg-transparent"
      icon={<Ic nome={icone} tamanho={32} />}
      title={titulo}
      contents={
        <>
          {texto && (
            <p className="max-w-sm text-balance text-center text-sm text-kumo-subtle">
              <Frase>{texto}</Frase>
            </p>
          )}
          {acao}
        </>
      }
    />
  );
}
