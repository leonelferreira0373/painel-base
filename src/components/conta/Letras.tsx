// Definições da conta → Aparência → Letra: carregar letras próprias, por ficheiro (TTF, OTF, WOFF ou WOFF2) ou por ligação (um ficheiro de letra ou uma folha de estilos como a do Google Fonts), e vê-las e removê-las. Os ficheiros ficam só neste navegador; nada vai para um servidor.
"use client";

import { Button, Input } from "@cloudflare/kumo";
import { useEffect, useRef, useState } from "react";
import { FORMATOS_DE_LETRA, TAMANHO_MAXIMO_DA_LETRA, type FonteCarregada } from "@/dados/fontes";
import { erroDaLigacao, familiaDaLigacao, letraValida, nomeDoFicheiro } from "@/lib/fontes";
import { identificador } from "@/lib/conta";
import { ICONES } from "../Icones";
import { Separadores } from "../ui";
import { Confirmar, Linha } from "./Pecas";

const NOME_VALIDO = /^[\p{L}\p{N} .\-]{2,40}$/u;

/** A janela para acrescentar uma letra: por ficheiro ou por ligação. */
export function AdicionarLetra({ aberto, aoMudar, aoAdicionar }: { aberto: boolean; aoMudar: (v: boolean) => void; aoAdicionar: (f: FonteCarregada, ficheiro?: File) => void }) {
  const [via, setVia] = useState<"ficheiro" | "ligacao">("ficheiro");
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [lida, setLida] = useState<boolean | null>(null);
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto) return;
    setVia("ficheiro");
    setFicheiro(null);
    setLida(null);
    setNome("");
    setUrl("");
  }, [aberto]);

  const escolher = async (f: File) => {
    setFicheiro(f);
    setLida(null);
    setNome((n) => n || nomeDoFicheiro(f.name));
    setLida(f.size <= TAMANHO_MAXIMO_DA_LETRA && (await letraValida(f)));
  };
  const erroFicheiro = !ficheiro ? null : ficheiro.size > TAMANHO_MAXIMO_DA_LETRA ? `O ficheiro tem mais de ${TAMANHO_MAXIMO_DA_LETRA / 1024 / 1024} MB.` : lida === false ? "Este ficheiro não é uma letra que o navegador consiga ler." : null;
  const erroUrl = url.trim() ? erroDaLigacao(url) : null;
  const nomeBom = NOME_VALIDO.test(nome.trim());
  const pode = nomeBom && (via === "ficheiro" ? !!ficheiro && lida === true : !!url.trim() && !erroUrl);

  return (
    <Confirmar
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Adicionar letra"
      texto="Carregue um ficheiro de letra ou use uma ligação. Depois escolha-a nos seletores de letra."
      rotuloAcao="Adicionar"
      desativado={!pode}
      aoConfirmar={() => aoAdicionar({ id: identificador(), nome: nome.trim(), origem: via, url: via === "ligacao" ? url.trim() : undefined, criada: new Date().toISOString() }, via === "ficheiro" ? (ficheiro ?? undefined) : undefined)}
    >
      <div className="flex flex-col gap-4">
        <Separadores
          itens={[
            { id: "ficheiro", rotulo: "Ficheiro" },
            { id: "ligacao", rotulo: "Ligação" },
          ]}
          valor={via}
          aoMudar={(id) => setVia(id as "ficheiro" | "ligacao")}
        />
        {via === "ficheiro" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Button variant="secondary" icon={ICONES.enviar} onClick={() => entrada.current?.click()}>
                Escolher o ficheiro
              </Button>
              <span className="min-w-0 truncate text-sm text-kumo-subtle">{ficheiro ? ficheiro.name : `${FORMATOS_DE_LETRA.map((f) => f.slice(1).toUpperCase()).join(", ")} · até ${TAMANHO_MAXIMO_DA_LETRA / 1024 / 1024} MB`}</span>
            </div>
            <input ref={entrada} type="file" accept={FORMATOS_DE_LETRA.join(",")} className="hidden" onChange={(e) => e.target.files?.[0] && escolher(e.target.files[0])} />
            {erroFicheiro && <span className="text-xs text-kumo-danger">{erroFicheiro}</span>}
          </div>
        ) : (
          <Input
            label="Ligação"
            placeholder="https://fonts.googleapis.com/css2?family=Roboto"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              const familia = familiaDaLigacao(e.target.value);
              if (familia && !nome) setNome(familia);
            }}
            error={erroUrl ?? undefined}
            description="Um ficheiro de letra (.woff2, .woff, .ttf, .otf) ou uma folha de estilos, como a do Google Fonts."
          />
        )}
        <Input label="Nome da letra" placeholder="Roboto" value={nome} onChange={(e) => setNome(e.target.value)} error={nome.trim() && !nomeBom ? "Use só letras, números, espaços, pontos e hífenes (2 a 40)." : undefined} description={via === "ligacao" ? "Tem de ser o nome da família que a ligação define." : undefined} />
      </div>
    </Confirmar>
  );
}

/** As letras que a pessoa carregou, cada uma com o seu «Remover». */
export function ListaDeLetras({ fontes, aoRemover }: { fontes: FonteCarregada[]; aoRemover: (f: FonteCarregada) => void }) {
  if (fontes.length === 0) return null;
  return (
    <div className="border-t border-kumo-hairline">
      <h4 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-kumo-subtle">Letras adicionadas</h4>
      {fontes.map((f) => (
        <Linha key={f.id} titulo={<span style={{ fontFamily: `"${f.nome}", var(--font-sans)` }}>{f.nome}</span>} estado={f.origem === "ficheiro" ? "Ficheiro neste navegador" : f.url}>
          <Button variant="ghost" icon={ICONES.lixo} aria-label={`Remover a letra ${f.nome}`} onClick={() => aoRemover(f)}>
            Remover
          </Button>
        </Linha>
      ))}
    </div>
  );
}
