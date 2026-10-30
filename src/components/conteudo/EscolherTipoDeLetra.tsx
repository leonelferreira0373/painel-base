// O seletor de tipo de letra: mais de duzentas famílias já disponíveis (cada nome aparece na sua própria letra) com procura e filtros, as fontes que a pessoa carregou («Minhas») e o botão para carregar mais (TTF, OTF, WOFF, WOFF2 ou ZIP). Vale para o texto e para o título do artigo.
"use client";

import { Button, Input } from "@cloudflare/kumo";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/estado";
import { EXTENSOES_DE_FONTE, familiaCss, FONTES, ROTULO_DA_CATEGORIA, type CategoriaDeFonte } from "@/lib/blog-fontes";
import { ICONES } from "../Icones";
import { carregarFonteGoogle, useFontesCarregadas } from "./useFontes";

type Filtro = "todas" | "minhas" | CategoriaDeFonte;
const FILTROS: { id: Filtro; rotulo: string }[] = [{ id: "todas", rotulo: "Todas" }, { id: "minhas", rotulo: "Minhas" }, ...(Object.entries(ROTULO_DA_CATEGORIA) as [CategoriaDeFonte, string][]).map(([id, rotulo]) => ({ id, rotulo }))];

/** Uma linha da lista: o nome na própria letra (a letra só se pede ao Google quando a linha aparece). */
function Linha({ nome, familia, ativa, sistema, aoEscolher }: { nome: string; familia: string; ativa: boolean; sistema: boolean; aoEscolher: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || sistema || typeof IntersectionObserver === "undefined") return;
    const o = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        carregarFonteGoogle(nome, true);
        o.disconnect();
      }
    });
    o.observe(el);
    return () => o.disconnect();
  }, [nome, sistema]);
  return (
    <button ref={ref} type="button" aria-pressed={ativa} onClick={aoEscolher} className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-base text-kumo-default transition-colors hover:bg-kumo-tint ${ativa ? "bg-black/[0.07] dark:bg-white/10" : ""}`} style={{ fontFamily: familia }}>
      <span className="truncate">{nome}</span>
      {ativa && <span aria-hidden className="size-2 shrink-0 rounded-[2px] bg-kumo-brand" />}
    </button>
  );
}

export function EscolherTipoDeLetra({ valor, aoEscolher }: { valor: string | null; aoEscolher: (familia: string | null) => void }) {
  const { avisar } = useApp();
  const { familias, carregar } = useFontesCarregadas();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const entrada = useRef<HTMLInputElement>(null);
  const [aCarregar, setACarregar] = useState(false);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const minhas = familias.map((nome) => ({ nome, familia: familiaCss(nome, "carregada"), sistema: true }));
    const doCatalogo = FONTES.map((f) => ({ nome: f.nome, familia: familiaCss(f.nome, f.categoria), sistema: f.categoria === "sistema", categoria: f.categoria }));
    const base = filtro === "minhas" ? minhas : filtro === "todas" ? [...minhas, ...doCatalogo] : doCatalogo.filter((f) => f.categoria === filtro);
    return q ? base.filter((f) => f.nome.toLowerCase().includes(q)) : base;
  }, [busca, filtro, familias]);

  const aoCarregar = async (ficheiros: FileList | null) => {
    if (!ficheiros?.length) return;
    setACarregar(true);
    try {
      const n = await carregar([...ficheiros]);
      avisar(n > 0 ? `${n} ${n === 1 ? "tipo de letra carregado" : "tipos de letra carregados"}` : `Só se carregam ficheiros ${EXTENSOES_DE_FONTE.join(", ").toUpperCase()} ou um ZIP com eles`);
      if (n > 0) setFiltro("minhas");
    } catch {
      avisar("Não foi possível ler esse ficheiro");
    }
    setACarregar(false);
    if (entrada.current) entrada.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <Input aria-label="Procurar um tipo de letra" placeholder="Procurar" size="sm" value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="off" />
      <div className="sem-barra flex gap-1 overflow-x-auto [&>*]:shrink-0" role="group" aria-label="Tipos de letra por categoria">
        {FILTROS.map((f) => (
          <Button key={f.id} size="sm" variant="ghost" aria-pressed={filtro === f.id} className={filtro === f.id ? "!bg-black/[0.09] dark:!bg-white/15" : ""} onClick={() => setFiltro(f.id)}>
            {f.rotulo}
          </Button>
        ))}
      </div>
      <div className="flex max-h-72 flex-col overflow-y-auto">
        <button type="button" aria-pressed={valor === null} onClick={() => aoEscolher(null)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-base text-kumo-default hover:bg-kumo-tint ${valor === null ? "bg-black/[0.07] dark:bg-white/10" : ""}`}>
          Padrão do painel
          {valor === null && <span aria-hidden className="size-2 shrink-0 rounded-[2px] bg-kumo-brand" />}
        </button>
        {lista.map((f) => (
          <Linha key={`${f.nome}-${f.familia}`} nome={f.nome} familia={f.familia} sistema={f.sistema} ativa={valor === f.familia} aoEscolher={() => (carregarFonteGoogle(f.nome), aoEscolher(f.familia))} />
        ))}
        {lista.length === 0 && <span className="px-2.5 py-3 text-sm text-kumo-subtle">{filtro === "minhas" ? "Ainda não carregou nenhum tipo de letra." : "Nenhum tipo de letra corresponde."}</span>}
      </div>
      <Button variant="secondary" size="sm" icon={ICONES.enviar} loading={aCarregar} onClick={() => entrada.current?.click()}>
        Carregar tipo de letra
      </Button>
      <input ref={entrada} type="file" hidden multiple accept={[...EXTENSOES_DE_FONTE.map((e) => `.${e}`), ".zip"].join(",")} onChange={(e) => void aoCarregar(e.target.files)} />
    </div>
  );
}
