// O campo do número de telefone, com a mesma ideia do campo do IBAN: o indicativo do país vem escrito e fixo à esquerda (escolhe-se de uma lista com pesquisa) e quem preenche só escreve o número nacional. Se escrever ou colar o número com «+» ou «00» à frente («+351 912 345 678»), o país é reconhecido sozinho e o indicativo passa para a esquerda.
"use client";

import { Popover, Tooltip } from "@cloudflare/kumo";
import { useEffect, useId, useRef, useState } from "react";
import { erroDoTelefone, escreverTelefone, exemploDeTelefone, formatarCorpoDoTelefone, indicativoDe, lerTelefone, limparCorpoDoTelefone, PAISES_FREQUENTES, pesquisarPaises, reconhecerPais, telefoneDe, type PaisTelefone } from "@/lib/telefone";
import { CampoDePesquisa } from "./CampoDePesquisa";
import { PopupCartao } from "./Flutuantes";
import { Ic } from "./Icones";

interface Props {
  rotulo: string;
  /** O número guardado («+244 923 000 000»), ou vazio. */
  valor: string;
  /** Devolve o número já escrito por inteiro («+244 923 000 000», vazio se não há dígitos) e o erro, se o número não serve. */
  aoMudar: (valor: string, erro: string | null) => void;
  /** O país escolhido enquanto o campo está vazio (o do fuso da conta). */
  paisPorOmissao: PaisTelefone;
  autoFocus?: boolean;
}

export function CampoDeTelefone({ rotulo, valor, aoMudar, paisPorOmissao, autoFocus }: Props) {
  const id = useId();
  const inicial = lerTelefone(valor, paisPorOmissao);
  const [pais, setPais] = useState<PaisTelefone>(inicial.pais);
  const [corpo, setCorpo] = useState(inicial.corpo);
  /** O que se escreveu com «+» ou «00» e ainda não é um indicativo completo («+2», «+24»): mostra-se tal e qual até o país ser reconhecido. */
  const [bruto, setBruto] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const emitido = useRef(valor);

  // se o número muda por fora (guardar, repor), o campo acompanha; o que o próprio campo emitiu não conta
  useEffect(() => {
    if (valor === emitido.current) return;
    emitido.current = valor;
    const l = lerTelefone(valor, paisPorOmissao);
    setPais(l.pais);
    setCorpo(l.corpo);
    setBruto(null);
    setTocado(false);
  }, [valor, paisPorOmissao]);
  useEffect(() => {
    if (!aberto) setQ("");
  }, [aberto]);

  const brutoSemIndicativo = bruto !== null && bruto.replace(/\D/g, "").replace(/^00/, "").length >= 4;
  const erro = bruto !== null ? (brutoSemIndicativo ? "Esse indicativo não existe." : null) : tocado ? erroDoTelefone(pais, corpo) : null;

  const emitir = (p: PaisTelefone, c: string, b: string | null) => {
    const v = b !== null ? "" : telefoneDe(p, c);
    emitido.current = v;
    aoMudar(v, b !== null ? (b.replace(/\D/g, "").replace(/^00/, "").length >= 4 ? "Esse indicativo não existe." : null) : erroDoTelefone(p, c));
  };

  const escreveu = (texto: string) => {
    if (/^\s*(\+|00)/.test(texto) && !reconhecerPais(texto)) {
      const b = texto.slice(0, 10);
      setBruto(b);
      emitir(pais, "", b);
      return;
    }
    const r = escreverTelefone(texto, pais);
    setBruto(null);
    setPais(r.pais);
    setCorpo(r.corpo);
    emitir(r.pais, r.corpo, null);
  };

  const escolher = (p: PaisTelefone) => {
    const c = limparCorpoDoTelefone(corpo, p);
    setPais(p);
    setCorpo(c);
    setBruto(null);
    setAberto(false);
    emitir(p, c, null);
  };

  const visiveis = pesquisarPaises(q);
  const separar = q.trim() === "";
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="m-0 select-none text-base font-medium text-kumo-default">
        {rotulo}
      </label>
      <div className={`flex h-10 w-full items-center rounded-lg border-0 bg-kumo-control text-base text-kumo-default ring focus-within:ring-[1.5px] focus-within:ring-kumo-focus/50 ${erro ? "ring-kumo-danger" : "ring-kumo-line"}`}>
        <Popover.Root open={aberto} onOpenChange={setAberto}>
          <Tooltip
            content={`Indicativo do país: ${pais.nome} (${indicativoDe(pais)})`}
            render={
              <Popover.Trigger
                render={
                  <button type="button" aria-label={`Indicativo do país: ${pais.nome} ${indicativoDe(pais)}. Mudar`} className="flex h-full shrink-0 items-center gap-1.5 rounded-l-lg border-r border-kumo-hairline pl-3 pr-2 transition-colors hover:bg-kumo-tint data-[popup-open]:bg-kumo-tint">
                    <span className="text-xs font-medium text-kumo-subtle">{pais.iso}</span>
                    <span className="font-medium tabular-nums">{indicativoDe(pais)}</span>
                    <Ic nome="seletor" tamanho={14} className="text-kumo-subtle" />
                  </button>
                }
              />
            }
          />
          <PopupCartao modalNoTelemovel aoFechar={() => setAberto(false)} className="w-[min(360px,calc(100vw-24px))]">
            <div
              onKeyDown={(e) => {
                if (e.key === "Enter" && visiveis[0]) {
                  e.preventDefault();
                  escolher(visiveis[0]);
                }
              }}
              className="flex items-center border-b border-kumo-line pl-3 pr-3"
            >
              <Ic nome="lupa" tamanho={14} className="shrink-0 text-kumo-subtle" />
              <CampoDePesquisa valor={q} aoMudar={setQ} rotulo="Pesquisar países" placeholder="Pesquisar país ou indicativo…" idLista={`${id}-paises`} />
            </div>
            <div id={`${id}-paises`} role="listbox" data-incorporado aria-label="Países" className="flex max-h-[min(60dvh,340px)] flex-col overflow-y-auto p-1.5">
              {visiveis.length === 0 && <div className="px-2.5 py-2 text-sm text-kumo-subtle">Sem resultados</div>}
              {visiveis.map((p, i) => (
                <div key={p.iso} className="contents">
                  {separar && i === PAISES_FREQUENTES.length && <div className="-mx-1.5 my-1.5 border-t border-kumo-line" />}
                  <button type="button" role="option" aria-selected={p.iso === pais.iso} onClick={() => escolher(p)} className={`flex h-10 w-full shrink-0 items-center gap-2 rounded-md px-2.5 text-left text-sm text-kumo-default transition-colors hover:bg-kumo-tint ${p.iso === pais.iso ? "bg-kumo-tint" : ""}`}>
                    <span className="w-6 shrink-0 text-xs font-medium text-kumo-subtle">{p.iso}</span>
                    <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                    {p.iso === pais.iso && <Ic nome="certo" tamanho={14} className="shrink-0" />}
                    <span className="shrink-0 tabular-nums text-kumo-subtle">{indicativoDe(p)}</span>
                  </button>
                </div>
              ))}
            </div>
          </PopupCartao>
        </Popover.Root>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          value={bruto ?? formatarCorpoDoTelefone(corpo, pais)}
          onChange={(e) => escreveu(e.target.value)}
          onBlur={() => setTocado(true)}
          placeholder={exemploDeTelefone(pais)}
          aria-label={`${rotulo}, depois do indicativo ${indicativoDe(pais)}`}
          aria-invalid={erro ? true : undefined}
          className="h-full min-w-0 grow rounded-none border-0 bg-transparent px-3 text-base tabular-nums outline-none"
        />
      </div>
      {erro && <span className="text-[13px] text-kumo-danger">{erro}</span>}
    </div>
  );
}
