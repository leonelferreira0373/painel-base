// As notas adesivas de um sítio (um KPI, uma janela, uma página): ler as que lá estão, deixar uma, mudar ou apagar as suas. Abre-se por «Deixar nota» nos três pontos de um cartão ou pelo botão de nota de uma janela. As notas com palavra-passe pedem-na antes de se verem; as que expiraram vão para a reciclagem; as que são para outros membros só esses as veem.
"use client";

import { Button, Dialog, DropdownMenu, Input, Tooltip } from "@cloudflare/kumo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/styles/notas.css";
import { copiarEstruturado, estruturaDeRegisto } from "@/lib/copiar-dados";
import { useApp } from "@/lib/estado";
import { useConta } from "@/lib/conta";
import { EVENTO_FECHAR_FLUTUANTES, perguntarAIa } from "@/lib/ia-contexto";
import { decifrarConteudo, EVENTO_ABRIR_NOTA, euSou, haTempo, notaVisivel, notasDoSitio, removerNota, textoDaExpiracao, useNotas, type AlvoDeNota, type AnexoDaNota, type Nota, type Quem } from "@/lib/notas";
import { Confirmar } from "../conta/Pecas";
import { MenuCartao, SeparadorDeMenu } from "../Flutuantes";
import { Ic, ICONES } from "../Icones";
import { useSessao } from "@/lib/auth";
import { EditorDeNota, resolverAnexos } from "./EditorDeNota";
import { sanitizarHtml } from "@/lib/notas";

interface Aberta {
  corpo: string;
  anexos: AnexoDaNota[];
  chave?: CryptoKey;
  senha?: string;
}

/** O texto de uma nota, com os ficheiros à vista. */
function CorpoDaNota({ html, chave }: { html: string; chave?: CryptoKey }) {
  const ref = useRef<HTMLDivElement>(null);
  const limpo = useMemo(() => sanitizarHtml(html), [html]);
  const marcado = useMemo(() => ({ __html: limpo }), [limpo]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let urls: string[] = [];
    void resolverAnexos(el, chave).then((u) => (urls = u));
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [limpo, chave]);
  return <div ref={ref} className="nota-corpo" dangerouslySetInnerHTML={marcado} />;
}

export function NotasDoSitio() {
  const { funcao } = useApp();
  const { conta } = useConta();
  const { sessao } = useSessao();
  const { notas } = useNotas();
  const [alvo, setAlvo] = useState<AlvoDeNota | null>(null);
  const [aEscrever, setAEscrever] = useState<Nota | "nova" | null>(null);
  const [abertas, setAbertas] = useState<Record<string, Aberta>>({});
  const [senhas, setSenhas] = useState<Record<string, string>>({});
  const [errosDeSenha, setErrosDeSenha] = useState<Record<string, string>>({});
  const [apagar, setApagar] = useState<Nota | null>(null);
  const quem: Quem = useMemo(() => ({ nome: sessao?.nome ?? funcao.pessoa, email: conta.email, funcao: funcao.rotulo }), [sessao?.nome, funcao.pessoa, funcao.rotulo, conta.email]);

  useEffect(() => {
    const abrir = (e: Event) => {
      const a = (e as CustomEvent<{ alvo: AlvoDeNota }>).detail.alvo;
      setAlvo(a);
      setAbertas({});
      setSenhas({});
      setErrosDeSenha({});
      // sem notas à vista vai-se logo escrever
      setAEscrever(notasDoSitio(notas, a.chave).some((n) => notaVisivel(n, quem, new Date())) ? null : "nova");
    };
    window.addEventListener(EVENTO_ABRIR_NOTA, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_NOTA, abrir);
  }, [notas, quem]);

  const visiveis = useMemo(() => (alvo ? notasDoSitio(notas, alvo.chave).filter((n) => notaVisivel(n, quem, new Date())) : []), [notas, alvo, quem]);
  const fechar = useCallback(() => {
    setAlvo(null);
    setAEscrever(null);
  }, []);
  // perguntar à IA a partir de uma nota fecha a janela das notas (o chat abre por cima)
  useEffect(() => {
    window.addEventListener(EVENTO_FECHAR_FLUTUANTES, fechar);
    return () => window.removeEventListener(EVENTO_FECHAR_FLUTUANTES, fechar);
  }, [fechar]);

  const abrirComSenha = async (n: Nota) => {
    if (!n.cifra) return;
    const r = await decifrarConteudo(n.cifra, senhas[n.id] ?? "");
    if (!r) return setErrosDeSenha((e) => ({ ...e, [n.id]: "Palavra-passe errada." }));
    setAbertas((a) => ({ ...a, [n.id]: { corpo: r.conteudo.corpo, anexos: r.conteudo.anexos, chave: r.chave, senha: senhas[n.id] } }));
    setErrosDeSenha((e) => ({ ...e, [n.id]: "" }));
  };
  const conteudoDe = (n: Nota): Aberta | null => (n.cifra ? (abertas[n.id] ?? null) : { corpo: n.corpo, anexos: n.anexos });

  const editar = (n: Nota) => {
    if (n.cifra && !abertas[n.id]) return;
    setAEscrever(n);
  };
  const editorInicial = aEscrever && aEscrever !== "nova" ? { nota: aEscrever, ...(conteudoDe(aEscrever) as Aberta) } : undefined;

  return (
    <>
    <Dialog.Root open={!!alvo} onOpenChange={(v) => !v && fechar()}>
      <Dialog size="lg" className="flex max-h-[90dvh] flex-col overflow-hidden p-0" data-sem-nota>
        {alvo && (
          <>
            {/* o título fica sempre à vista: só o que está por baixo rola (antes rolava tudo e o título saía por cima do ecrã) */}
            <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
              <Dialog.Title className="min-w-0 text-lg font-semibold">
                <span className="block truncate">Notas · {alvo.rotulo}</span>
              </Dialog.Title>
              <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
            </div>
            <div className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 sm:px-6 ${aEscrever ? "pb-5 sm:pb-6" : "pb-3"}`}>
            {aEscrever ? (
              <EditorDeNota
                alvo={alvo}
                quem={quem}
                inicial={editorInicial}
                aoGuardar={() => {
                  setAEscrever(null);
                  setAbertas({});
                }}
                aoCancelar={() => (visiveis.length ? setAEscrever(null) : fechar())}
              />
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {visiveis.map((n) => {
                    const c = conteudoDe(n);
                    const minha = euSou(n, quem);
                    return (
                      <article
                        key={n.id}
                        className={`nota-papel flex flex-col gap-2 rounded-xl p-3.5 shadow-xs ring ring-black/10 dark:ring-white/15 ${minha && c ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
                        data-cor={n.cor}
                        tabIndex={minha && c ? 0 : undefined}
                        aria-label={minha && c ? "Abrir a nota para editar" : undefined}
                        // clicar na nota abre-a para editar (as dos outros só se leem); botões, menus, ligações e campos fazem o seu trabalho
                        onClick={(e) => {
                          if (!minha || !c || (e.target as Element).closest("button, a, input, form, audio, video, [role=menu], [role=menuitem]")) return;
                          editar(n);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.target === e.currentTarget && minha && c) editar(n);
                        }}
                      >
                        <header className="flex items-start justify-between gap-2">
                          <div className="min-w-0 text-xs">
                            <div className="font-semibold">{n.autor}</div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 opacity-75">
                              <span>{haTempo(n.atualizada)}</span>
                              {n.cifra && (
                                <span className="inline-flex items-center gap-1">
                                  <Ic nome="cadeado" tamanho={11} />
                                  Com palavra-passe
                                </span>
                              )}
                              {n.expira && <span>{textoDaExpiracao(n.expira)}</span>}
                              {n.para.length > 0 && <span>Para {n.para.join(", ")}</span>}
                              {n.lembretes.length > 0 && minha && (
                                <span>
                                  {n.lembretes.length} {n.lembretes.length === 1 ? "lembrete" : "lembretes"}
                                </span>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <Tooltip content="Opções da nota" render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="xs" icon={ICONES.mais3} aria-label="Opções da nota" className="-mr-1.5 -mt-1 text-current" />} />} />
                            <MenuCartao>
                              <DropdownMenu.Item icon={<Ic nome="copiar" />} disabled={!c} onClick={() => c && void copiarEstruturado(estruturaDeRegisto(`Nota em ${n.alvo.rotulo}`, { autor: n.autor, para: n.para, criada: n.criada, atualizada: n.atualizada, expira: n.expira ?? null, texto: c.corpo.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(), ficheiros: c.anexos.map((a) => a.nome) }, n.alvo.pagina))}>
                                Copiar a nota
                              </DropdownMenu.Item>
                              <DropdownMenu.Item icon={<Ic nome="ia" />} disabled={!c} onClick={() => c && perguntarAIa("Resumir esta nota", { contexto: { titulo: `uma nota em ${n.alvo.rotulo}`, dados: { autor: n.autor, texto: c.corpo.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() } } })}>
                                Perguntar à IA
                              </DropdownMenu.Item>
                              {minha && <SeparadorDeMenu />}
                              {minha && (
                                <DropdownMenu.Item icon={<Ic nome="artigo" />} disabled={!c} onClick={() => editar(n)}>
                                  Editar
                                </DropdownMenu.Item>
                              )}
                              {(minha || funcao.id === "master") && (
                                <DropdownMenu.Item icon={<Ic nome="lixo" />} variant="danger" onClick={() => setApagar(n)}>
                                  Apagar
                                </DropdownMenu.Item>
                              )}
                            </MenuCartao>
                          </DropdownMenu>
                        </header>
                        {c ? (
                          <CorpoDaNota html={c.corpo} chave={c.chave} />
                        ) : (
                          <form
                            className="flex flex-col gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void abrirComSenha(n);
                            }}
                          >
                            <p className="text-sm">Esta nota tem palavra-passe.</p>
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <Input aria-label="Palavra-passe da nota" type="password" value={senhas[n.id] ?? ""} onChange={(e) => setSenhas((s) => ({ ...s, [n.id]: e.target.value }))} autoComplete="off" className="w-full" />
                              </div>
                              <Button type="submit" size="sm" variant="primary" disabled={!senhas[n.id]}>
                                Abrir
                              </Button>
                            </div>
                            {errosDeSenha[n.id] && <p className="text-sm font-medium">{errosDeSenha[n.id]}</p>}
                          </form>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
            </div>
            {!aEscrever && (
              <div className="flex shrink-0 justify-end px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                <Button variant="primary" icon={ICONES.mais} onClick={() => setAEscrever("nova")}>
                  Nova nota
                </Button>
              </div>
            )}
          </>
        )}
      </Dialog>
    </Dialog.Root>
    <Confirmar
      aberto={!!apagar}
      aoMudar={(v) => !v && setApagar(null)}
      titulo="Apagar a nota"
      perigo
      texto={apagar ? `A nota de ${apagar.autor} em «${apagar.alvo.rotulo}» vai para a reciclagem e pode ser restaurada durante o prazo definido pelo Master Admin.` : ""}
      rotuloAcao="Apagar"
      aoConfirmar={() => apagar && void removerNota(apagar)}
    />
    </>
  );
}
