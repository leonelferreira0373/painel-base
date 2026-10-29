// Rede de segurança: nenhuma dica do navegador (o atributo `title`) chega a aparecer. Ao passar o rato ou focar um elemento com `title`, o texto passa para uma dica do painel (a mesma do Kumo que `Dica` usa, com a seta e o estilo de todas as outras) e o atributo sai de cena para o navegador não mostrar a dele. O nome acessível mantém-se (um botão só com ícone fica com `aria-label`). O que se escreve de novo deve usar `Dica`; isto apanha o que escapar.
"use client";

import { Tooltip } from "@cloudflare/kumo";
import { useEffect, useState } from "react";

const ATRASO_MS = 350;

interface Alvo {
  texto: string;
  caixa: { left: number; top: number; width: number; height: number };
}

/** O texto da dica de um elemento; guarda-o em `data-dica-texto` e tira o `title` (o navegador não chega a mostrar a dele). */
function textoDe(el: Element): string | null {
  const titulo = el.getAttribute("title");
  if (titulo !== null) {
    el.removeAttribute("title");
    const texto = titulo.trim();
    if (!texto) return null;
    el.setAttribute("data-dica-texto", texto);
    if (!el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !(el.textContent ?? "").trim()) el.setAttribute("aria-label", texto);
  }
  return el.getAttribute("data-dica-texto");
}

export function TitulosEmDicas() {
  const [alvo, setAlvo] = useState<Alvo | null>(null);

  useEffect(() => {
    let atual: Element | null = null;
    let cronometro = 0;
    const fechar = () => {
      window.clearTimeout(cronometro);
      atual = null;
      setAlvo(null);
    };
    const abrir = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const el = t.closest("[title], [data-dica-texto]");
      if (!el || el.closest("svg, [role=\"menu\"]") || el === atual) return;
      const texto = textoDe(el);
      if (!texto) return;
      fechar();
      atual = el;
      cronometro = window.setTimeout(() => {
        if (!atual || !atual.isConnected) return;
        const r = atual.getBoundingClientRect();
        setAlvo({ texto, caixa: { left: r.left, top: r.top, width: r.width, height: r.height } });
      }, e.type === "focusin" ? 0 : ATRASO_MS);
    };
    const sair = (e: Event) => {
      if (!atual) return;
      const para = (e as PointerEvent).relatedTarget;
      if (para instanceof Node && atual.contains(para)) return;
      fechar();
    };
    document.addEventListener("pointerover", abrir, true);
    document.addEventListener("focusin", abrir, true);
    document.addEventListener("pointerout", sair, true);
    document.addEventListener("focusout", fechar, true);
    document.addEventListener("pointerdown", fechar, true);
    document.addEventListener("keydown", fechar, true);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      fechar();
      document.removeEventListener("pointerover", abrir, true);
      document.removeEventListener("focusin", abrir, true);
      document.removeEventListener("pointerout", sair, true);
      document.removeEventListener("focusout", fechar, true);
      document.removeEventListener("pointerdown", fechar, true);
      document.removeEventListener("keydown", fechar, true);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, []);

  if (!alvo) return null;
  // o gatilho é uma caixa invisível por cima do elemento: a dica abre ao lado dela, como em qualquer outra
  return (
    <Tooltip
      open
      side="top"
      content={<span className="block max-w-[280px] text-left text-[13px] leading-snug whitespace-normal">{alvo.texto}</span>}
      render={<span aria-hidden style={{ position: "fixed", left: alvo.caixa.left, top: alvo.caixa.top, width: alvo.caixa.width, height: alvo.caixa.height, pointerEvents: "none" }} />}
    />
  );
}
