// O seletor da entidade aberta (o cliente), no cabeçalho, como o do domínio na Cloudflare: estrela de favorito, nome, estado em tempo real e um popup para trocar de cliente.
"use client";

import { Popover } from "@cloudflare/kumo";
import { PopupCartao } from "../Flutuantes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CONTEXTO, caminhoContexto, entidadesDe } from "@/dados/contexto";
import { caminho } from "@/dados/estrutura";
import { useApp } from "@/lib/estado";
import { Dica } from "../Dica";
import { Estado } from "../Estado";
import { Ic } from "../Icones";
import { CampoDePesquisa } from "../CampoDePesquisa";

const CHAVE = "painel.favoritos";

function lerFavoritos(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function SeletorCliente({ slug, pagina }: { slug: string; pagina: string }) {
  const { registos } = useApp();
  const router = useRouter();
  const lista = useMemo(() => entidadesDe(registos[CONTEXTO.registos] ?? []), [registos]);
  const atual = lista.find((e) => e.slug === slug);
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [soFavoritos, setSoFavoritos] = useState(false);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  useEffect(() => setFavoritos(lerFavoritos()), []);
  useEffect(() => {
    if (!aberto) {
      setQ("");
      setSoFavoritos(false);
    }
  }, [aberto]);
  const alternar = (s: string) => {
    const novos = favoritos.includes(s) ? favoritos.filter((f) => f !== s) : [...favoritos, s];
    setFavoritos(novos);
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(novos));
    } catch {
      /* sem armazenamento */
    }
  };
  const termo = q.trim().toLowerCase();
  const visiveis = lista.filter((e) => e.nome.toLowerCase().includes(termo) && (!soFavoritos || favoritos.includes(e.slug)));
  if (!atual) return null;
  const favorito = favoritos.includes(slug);
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Dica conteudo={favorito ? `Tirar «${atual.nome}» dos favoritos` : `Marcar «${atual.nome}» como favorito`}>
        <button type="button" aria-label={favorito ? "Tirar dos favoritos" : "Marcar como favorito"} aria-pressed={favorito} onClick={() => alternar(slug)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-kumo-subtle transition-colors hover:bg-kumo-tint">
          <Ic nome="estrela" tamanho={16} peso={favorito ? "fill" : "regular"} className={favorito ? "text-amber-500" : ""} />
        </button>
      </Dica>
      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Popover.Trigger
          render={
            <button type="button" aria-label={`${CONTEXTO.rotulo}: ${atual.nome}. Trocar de ${CONTEXTO.rotulo.toLowerCase()}`} className="flex h-9 min-w-0 items-center gap-2 rounded-lg px-2 text-left transition-colors hover:bg-kumo-tint data-[popup-open]:bg-kumo-tint">
              <span className="truncate text-sm font-medium text-kumo-default">{atual.nome}</span>
              <span className="hidden shrink-0 sm:inline-flex">
                <Estado valor={atual.estado} modulo={CONTEXTO.registos} />
              </span>
              <Ic nome="seletor" tamanho={14} className="shrink-0 text-kumo-subtle" />
            </button>
          }
        />
        <PopupCartao modalNoTelemovel className="w-[min(440px,calc(100vw-24px))]">
              <div className="flex items-center border-b border-kumo-line pr-3">
                <Dica conteudo={soFavoritos ? "Mostrar todos" : "Mostrar só os favoritos"}>
                  <button type="button" aria-label="Só favoritos" aria-pressed={soFavoritos} onClick={() => setSoFavoritos((v) => !v)} className="ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-md text-kumo-subtle hover:bg-kumo-tint">
                    <Ic nome="estrela" tamanho={16} peso={soFavoritos ? "fill" : "regular"} className={soFavoritos ? "text-amber-500" : ""} />
                  </button>
                </Dica>
                <CampoDePesquisa valor={q} aoMudar={setQ} rotulo={`Pesquisar ${CONTEXTO.rotuloPlural.toLowerCase()}`} placeholder={`Pesquisar nomes de ${CONTEXTO.rotuloPlural.toLowerCase()}…`} idLista="lista-contexto" />
                <Ic nome="lupa" tamanho={14} className="shrink-0 text-kumo-subtle" />
              </div>
              <div id="lista-contexto" role="listbox" data-incorporado aria-label={CONTEXTO.rotuloPlural} className="flex max-h-[260px] flex-col gap-1 overflow-y-auto p-1.5">
                {visiveis.length === 0 && <div className="px-2.5 py-2 text-sm text-kumo-subtle">Sem resultados</div>}
                {visiveis.map((e) => (
                  <button
                    key={e.slug}
                    type="button"
                    role="option"
                    aria-selected={e.slug === slug}
                    onClick={() => {
                      setAberto(false);
                      if (e.slug !== slug) router.push(caminhoContexto(e.nome, pagina));
                    }}
                    className={`flex h-10 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm text-kumo-default transition-colors hover:bg-kumo-tint ${e.slug === slug ? "bg-kumo-tint" : ""}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{e.nome}</span>
                    {e.slug === slug && <Ic nome="certo" tamanho={14} className="shrink-0" />}
                    {favoritos.includes(e.slug) && <Ic nome="estrela" tamanho={13} peso="fill" className="shrink-0 text-amber-500" />}
                    <Estado valor={e.estado} modulo={CONTEXTO.registos} />
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-kumo-line px-3 py-2.5 text-sm">
                <span className="text-kumo-subtle">
                  {lista.length} {CONTEXTO.rotuloPlural.toLowerCase()}
                </span>
                <Link href={caminho(CONTEXTO.voltar.area, CONTEXTO.voltar.modulo)} onClick={() => setAberto(false)} className="inline-flex items-center gap-1.5 text-kumo-default hover:underline">
                  Ir para todos os {CONTEXTO.rotuloPlural.toLowerCase()}
                  <Ic nome="seta" tamanho={14} />
                </Link>
              </div>
            </PopupCartao>
      </Popover.Root>
    </div>
  );
}
