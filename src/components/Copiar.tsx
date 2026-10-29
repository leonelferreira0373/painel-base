// Copiar para a área de transferência: a função e o único botão de copiar do painel. Sem avisos flutuantes, como na Cloudflare: o próprio botão passa a visto (copiou) ou a triângulo de aviso (não conseguiu) durante dois segundos, com uma transição (nada muda de repente), e a dica explica.
"use client";

import { Button } from "@cloudflare/kumo";
import { useEffect, useState } from "react";
import { Dica } from "./Dica";
import { Ic, type Icone } from "./Icones";

/** Copia para a área de transferência, se o navegador deixar. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export type EstadoDeCopia = "ocioso" | "ok" | "erro";

/** O resultado de uma ação que dura dois segundos e volta ao repouso («ok» ou «erro»). */
export function useResultadoTemporario(ms = 2200): [EstadoDeCopia, (r: "ok" | "erro") => void] {
  const [resultado, definir] = useState<"ok" | "erro" | null>(null);
  useEffect(() => {
    if (!resultado) return;
    const t = window.setTimeout(() => definir(null), ms);
    return () => window.clearTimeout(t);
  }, [resultado, ms]);
  return [resultado ?? "ocioso", definir];
}

/** O ícone de um botão que mostra o resultado: o de repouso, o visto e o aviso empilhados; o do estado atual esbate-se para dentro (escala e desfoque) enquanto o anterior sai. Nada muda de repente. */
export function IconeMorfico({ estado, repouso, tamanho }: { estado: EstadoDeCopia; repouso: Icone; tamanho: number }) {
  const camada = (e: EstadoDeCopia, nome: Icone) => (
    <span aria-hidden className={`absolute inset-0 grid place-items-center transition-[opacity,transform,filter] duration-200 ease-out motion-reduce:transition-none ${estado === e ? "scale-100 opacity-100 blur-0" : "scale-50 opacity-0 blur-[2px]"}`}>
      <Ic nome={nome} tamanho={tamanho} />
    </span>
  );
  return (
    <span className="relative inline-block shrink-0" style={{ width: tamanho, height: tamanho }}>
      {camada("ocioso", repouso)}
      {camada("ok", "certo")}
      {camada("erro", "aviso")}
    </span>
  );
}

/** Botão de copiar. `tamanho="xs"` é o compacto das linhas de dados (ver `LinhaOrdenada`). */
export function BotaoCopiar({ texto, rotulo, dica = "Copiar", tamanho = "base", variante = "secondary", quadrado = false }: { texto: string; rotulo?: string; dica?: string; tamanho?: "xs" | "sm" | "base"; variante?: "ghost" | "secondary"; quadrado?: boolean }) {
  const [estado, definir] = useResultadoTemporario();
  const icone = <IconeMorfico estado={estado} repouso="copiar" tamanho={tamanho === "xs" ? 14 : 16} />;
  const copiarTexto = async () => definir((await copiar(texto)) ? "ok" : "erro");
  const mensagem = estado === "ok" ? "Copiado" : estado === "erro" ? "Não foi possível copiar para a área de transferência" : dica;
  return (
    <Dica conteudo={mensagem}>
      {quadrado ? (
        <Button variant={variante} size={tamanho} shape="square" icon={icone} aria-label={mensagem} onClick={copiarTexto} />
      ) : (
        <Button variant={variante} size={tamanho} icon={icone} aria-label={rotulo ? undefined : mensagem} onClick={copiarTexto}>
          {rotulo}
        </Button>
      )}
    </Dica>
  );
}
