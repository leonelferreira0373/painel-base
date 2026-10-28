// Estados do painel que a Cloudflare usa em todo o lado: pontas que se desvanecem, gráfico sem dados e esqueletos de carregamento.
"use client";

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

/** Marca nos atributos da área quais das quatro pontas têm mais conteúdo para lá delas; o CSS desvanece essas pontas. */
function medir(el: HTMLElement) {
  const margem = 2;
  el.dataset.ini = el.scrollLeft > margem ? "1" : "0";
  el.dataset.fim = el.scrollLeft + el.clientWidth < el.scrollWidth - margem ? "1" : "0";
  el.dataset.cima = el.scrollTop > margem ? "1" : "0";
  el.dataset.baixo = el.scrollTop + el.clientHeight < el.scrollHeight - margem ? "1" : "0";
}

/** Área com scroll cujas pontas se desvanecem enquanto houver mais conteúdo para lá delas (em cima, em baixo e aos lados). */
export function Esbatido({ className = "", children, ...resto }: { className?: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const aoMedir = () => medir(el);
    aoMedir();
    el.addEventListener("scroll", aoMedir, { passive: true });
    const observador = new ResizeObserver(aoMedir);
    observador.observe(el);
    for (const filho of Array.from(el.children)) observador.observe(filho);
    return () => {
      el.removeEventListener("scroll", aoMedir);
      observador.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className={`esbatido ${className}`} {...resto}>
      {children}
    </div>
  );
}

const ROLAVEIS = '[class*="overflow-y-auto"],[class*="overflow-x-auto"],[class*="overflow-auto"],[class*="overflow-y-scroll"],[class*="overflow-x-scroll"],[class*="overflow-scroll"]';

/**
 * Aplica o desvanecimento a toda a área com scroll da página, também às dos componentes do Kumo (menus, listas, pesquisa, barra lateral) e à própria página.
 * Quem precisar de uma área sem desvanecimento põe `data-sem-esbatido`.
 */
export function EsbatidoGlobal() {
  useEffect(() => {
    const seguidas = new WeakSet<Element>();
    const donoDe = new WeakMap<Element, HTMLElement>();
    const observador = new ResizeObserver((entradas) =>
      entradas.forEach((e) => {
        const alvo = donoDe.get(e.target) ?? (e.target instanceof HTMLElement ? e.target : null);
        if (alvo?.isConnected) medir(alvo);
      }),
    );
    const aoRolar = (e: Event) => e.currentTarget instanceof HTMLElement && medir(e.currentTarget);
    const seguir = (el: HTMLElement) => {
      if (seguidas.has(el) || el.dataset.semEsbatido !== undefined || el.classList.contains("esbatido")) return;
      seguidas.add(el);
      el.classList.add("esbatido");
      el.addEventListener("scroll", aoRolar, { passive: true });
      observador.observe(el);
      for (const filho of Array.from(el.children)) {
        donoDe.set(filho, el);
        observador.observe(filho);
      }
      medir(el);
    };
    const varrer = (no: Node) => {
      if (!(no instanceof HTMLElement)) return;
      if (no.matches(ROLAVEIS)) seguir(no);
      no.querySelectorAll<HTMLElement>(ROLAVEIS).forEach(seguir);
    };
    varrer(document.body);
    const mutacoes = new MutationObserver((lista) => {
      for (const m of lista) {
        if (m.type === "attributes") {
          const alvo = m.target as HTMLElement;
          // O React repõe o atributo class quando a área muda de classes: volta a pôr a marca.
          if (seguidas.has(alvo) && !alvo.classList.contains("esbatido")) alvo.classList.add("esbatido");
          else if (alvo.matches(ROLAVEIS)) seguir(alvo);
        } else m.addedNodes.forEach(varrer);
      }
    });
    mutacoes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => {
      mutacoes.disconnect();
      observador.disconnect();
    };
  }, []);
  return null;
}

/** Gráfico sem dados: uma onda esmaecida ao fundo e a etiqueta «Sem dados» ao centro. */
export function SemDadosGrafico({ altura = 110, rotulo = "Sem dados" }: { altura?: number; rotulo?: string }) {
  return (
    <div className="relative w-full select-none" style={{ height: altura }} role="img" aria-label={rotulo}>
      <svg className="absolute inset-0 h-full w-full text-kumo-line" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0 64 C 22 58, 38 72, 60 62 S 96 32, 118 30 S 152 60, 178 63 S 216 46, 240 55 S 282 74, 300 60 L300 100 L0 100 Z" fill="currentColor" opacity="0.1" />
        <path d="M0 64 C 22 58, 38 72, 60 62 S 96 32, 118 30 S 152 60, 178 63 S 216 46, 240 55 S 282 74, 300 60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.75" />
      </svg>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-kumo-hairline bg-kumo-base px-3 py-0.5 text-xs font-medium text-kumo-subtle shadow-xs">{rotulo}</span>
    </div>
  );
}

const Barra = ({ l, a = 10, className = "" }: { l: string; a?: number; className?: string }) => <span className={`esq ${className}`} style={{ width: l, height: a }} />;

/** Corpo de um cartão a carregar: o número, uma linha curta e a área do gráfico. */
export function EsqueletoCartao({ altura = 110, anel = false }: { altura?: number; anel?: boolean }) {
  if (anel) {
    return (
      <div className="flex items-center gap-4 pt-2" aria-busy="true" aria-label="A carregar">
        <span className="esq h-[84px] w-[84px] shrink-0 !rounded-full" />
        <div className="flex flex-1 flex-col gap-2.5">
          <Barra l="88%" />
          <Barra l="64%" />
          <Barra l="76%" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 pt-1" aria-busy="true" aria-label="A carregar">
      <Barra l="38%" a={26} />
      <span className="esq block w-full" style={{ height: altura }} />
    </div>
  );
}

const LARGURAS = [["52%", "70%", "58%", "40%"], ["68%", "46%", "72%", "52%"], ["44%", "62%", "50%", "66%"], ["60%", "54%", "64%", "36%"], ["48%", "72%", "42%", "58%"]];

/** Linhas de tabela a carregar, com o cabeçalho já visível como no painel da Cloudflare. */
export function EsqueletoTabela({ colunas = 4, linhas = 5 }: { colunas?: number; linhas?: number }) {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="A carregar">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-kumo-hairline px-4 py-[18px] last:border-b-0">
          {Array.from({ length: colunas }, (_, c) => (
            <div key={c} className="min-w-0 flex-1">
              <Barra l={LARGURAS[i % LARGURAS.length][c % 4]} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
