// O SEO de um artigo, como o do WordPress mas sem palavras difíceis: uma nota de 0 a 100 que muda ao vivo enquanto se escreve, o que melhorar em frases simples e, por baixo, escolhas já prontas (o tema do artigo, o aspeto na pesquisa, as etiquetas) que se tocam; quem sabe o que faz carrega em «Personalizar». O endereço faz-se sozinho a partir do título e não se mostra.
"use client";

import { Button, Dialog, Input, InputArea } from "@cloudflare/kumo";
import { useState } from "react";
import type { Artigo } from "@/lib/blog";
import { seoAoVivo } from "@/lib/blog-seo";
import { ROTULO_DO_NIVEL, type EstadoDaVerificacao, type NivelDoSeo } from "@/lib/seo-pontuacao";
import { EscolhaDeOpcoes, ListaDeInterruptores, Seccao } from "../conta/Pecas";
import { Estado } from "../Estado";
import { Frase } from "../Frase";
import { ICONES } from "../Icones";

const PONTO: Record<EstadoDaVerificacao, string> = { bom: "bg-kumo-success", melhorar: "bg-kumo-warning", fraco: "bg-kumo-danger" };
const BARRA: Record<NivelDoSeo, string> = { bom: "bg-kumo-success", melhorar: "bg-kumo-warning", fraco: "bg-kumo-danger" };
const VARIANTE: Record<NivelDoSeo, "success" | "warning" | "error"> = { bom: "success", melhorar: "warning", fraco: "error" };

export function SeoDoArtigo({ aberto, aoMudar, a, aoAlterar }: { aberto: boolean; aoMudar: (v: boolean) => void; a: Artigo; aoAlterar: (parcial: Partial<Artigo>) => void }) {
  const seo = seoAoVivo(a);
  const { pontos, nivel, verificacoes } = seo.resultado;
  const porMelhorar = verificacoes.filter((v) => v.estado !== "bom");
  const boas = verificacoes.filter((v) => v.estado === "bom");
  const [verBoas, setVerBoas] = useState(false);
  const [personalizar, setPersonalizar] = useState(false);

  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="base" className="max-h-[90dvh] overflow-y-auto p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">SEO</Dialog.Title>
            <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>

          <div className="flex items-center gap-4" role="group" aria-label={`Nota de SEO: ${pontos} em 100`}>
            <span className="min-w-[3ch] text-4xl font-semibold tabular-nums text-kumo-default">{pontos}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span>
                <Estado valor={ROTULO_DO_NIVEL[nivel]} variante={VARIANTE[nivel]} />
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-[3px] bg-kumo-tint">
                <div className={`h-full rounded-[3px] transition-[width] duration-300 ${BARRA[nivel]}`} style={{ width: `${pontos}%` }} />
              </div>
            </div>
          </div>

          <Seccao titulo="O que melhorar">
            {porMelhorar.length === 0 ? (
              <p className="text-sm text-kumo-subtle">Nada a melhorar.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {porMelhorar.map((v) => (
                  <li key={v.id} className="flex items-start gap-2.5 text-sm text-kumo-default">
                    <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-[2px] ${PONTO[v.estado]}`} />
                    <Frase>{v.mensagem}</Frase>
                  </li>
                ))}
              </ul>
            )}
            {boas.length > 0 && (
              <div className="flex flex-col gap-2">
                <span>
                  <Button variant="ghost" size="sm" onClick={() => setVerBoas((v) => !v)} aria-expanded={verBoas}>
                    {verBoas ? "Esconder o que está bom" : `Ver o que está bom (${boas.length})`}
                  </Button>
                </span>
                {verBoas && (
                  <ul className="flex flex-col gap-2">
                    {boas.map((v) => (
                      <li key={v.id} className="flex items-start gap-2.5 text-sm text-kumo-subtle">
                        <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-[2px] ${PONTO.bom}`} />
                        <Frase>{v.mensagem}</Frase>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Seccao>

          <Seccao titulo="Tema do artigo">
            <EscolhaDeOpcoes rotulo="Tema do artigo" opcoes={seo.temas} valor={seo.tema ? [seo.tema] : []} aoMudar={(v) => aoAlterar({ seo: { ...a.seo, tema: v[0] ?? "" } })} />
          </Seccao>

          <Seccao titulo="Como aparece na pesquisa">
            <div className="rounded-lg bg-kumo-tint p-3">
              <div className="truncate text-base font-medium text-kumo-default">{seo.titulo || "Sem título"}</div>
              <div className="line-clamp-2 text-sm text-kumo-subtle">{seo.descricao || "Sem descrição"}</div>
            </div>
            {personalizar ? (
              <div className="flex flex-col gap-3">
                <Input label="Título" value={a.seo?.titulo ?? ""} placeholder={seo.titulo} onChange={(e) => aoAlterar({ seo: { ...a.seo, titulo: e.target.value || undefined } })} autoComplete="off" />
                <InputArea label="Descrição" value={a.resumo} placeholder={seo.descricao} onValueChange={(v) => aoAlterar({ resumo: v })} minRows={3} autoResize />
              </div>
            ) : (
              <span>
                <Button variant="ghost" size="sm" icon={ICONES.engrenagem} onClick={() => setPersonalizar(true)}>
                  Personalizar
                </Button>
              </span>
            )}
          </Seccao>

          <Seccao titulo="Etiquetas">
            <EscolhaDeOpcoes rotulo="Etiquetas" varias opcoes={seo.temas} valor={a.etiquetas} aoMudar={(etiquetas) => aoAlterar({ etiquetas })} />
          </Seccao>

          <div className="-mx-2.5 flex flex-col">
            <ListaDeInterruptores itens={[{ id: "indexar", rotulo: "Aparecer nos motores de pesquisa" }]} escolhidos={seo.indexar ? ["indexar"] : []} rotulo="SEO" aoMudar={(_, v) => aoAlterar({ seo: { ...a.seo, indexar: v ? undefined : false } })} />
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
