// As notas adesivas de um sítio (um KPI, uma janela, uma página): ler as que lá estão, deixar uma, mudar ou apagar as suas. Abre-se por «Deixar nota» nos três pontos de um cartão ou pelo botão de nota de uma janela. As notas com palavra-passe pedem-na antes de se verem; as que expiraram vão para a reciclagem; as que são para outros membros só esses as veem.
"use client";

import { Button, Dialog, DropdownMenu, Input, Tooltip } from "@cloudflare/kumo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/styles/notas.css";
import { copiarEstruturado, estruturaDeRegisto } from "@/lib/copiar-dados";
import { useApp } from "@/lib/estado";
import { useConta } from "@/lib/conta";
import { EVENTO_FECHAR_FLUTUANTES, perguntarAIa } from "@/lib/ia-contexto";
import { emailNovo, enviarEmail } from "@/lib/email";
import { gerarCodigo, lerDoCofre, senhaRecuperada, textoDoEmailDeRecuperacao } from "@/lib/notas-recuperacao";
import { registar } from "@/lib/atividade";
import { lerDias } from "@/lib/reciclagem";
import { decifrarConteudo, EVENTO_ABRIR_NOTA, euSou, guardarNota, haTempo, notaVisivel, notasDoSitio, removerNota, textoDaExpiracao, useNotas, type AlvoDeNota, type AnexoDaNota, type ChaveDeNota, type Nota, type Quem } from "@/lib/notas";
import { CodigoDialog } from "../conta/CodigoDialog";
import { Confirmar, mascarar } from "../conta/Pecas";
import { useEmails } from "../super/EmailPecas";
import { MenuCartao, SeparadorDeMenu } from "../Flutuantes";
import { Ic, ICONES } from "../Icones";
import { useSessao } from "@/lib/auth";
import { EditorDeNota, resolverAnexos } from "./EditorDeNota";
import { sanitizarHtml } from "@/lib/notas";

interface Aberta {
  titulo?: string;
  corpo: string;
  anexos: AnexoDaNota[];
  chave?: ChaveDeNota;
  senha?: string;
}

/** O texto de uma nota, com os ficheiros à vista. */
function CorpoDaNota({ html, chave }: { html: string; chave?: ChaveDeNota }) {
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
  const { funcao, avisar } = useApp();
  const { conta } = useConta();
  const emails = useEmails();
  const { sessao } = useSessao();
  const { notas } = useNotas();
  const [alvo, setAlvo] = useState<AlvoDeNota | null>(null);
  const [aEscrever, setAEscrever] = useState<Nota | "nova" | null>(null);
  const [abertas, setAbertas] = useState<Record<string, Aberta>>({});
  const [senhas, setSenhas] = useState<Record<string, string>>({});
  const [errosDeSenha, setErrosDeSenha] = useState<Record<string, string>>({});
  const [apagar, setApagar] = useState<Nota | null>(null);
  /** As notas ocultas em que a pessoa carregou no olho (só nesta janela). */
  const [reveladas, setReveladas] = useState<Record<string, boolean>>({});
  const [recuperar, setRecuperar] = useState<{ nota: Nota; codigo: string } | null>(null);
  /** Em que notas trancadas a pessoa já carregou no cadeado (para escrever a palavra-passe). */
  const [pedirSenha, setPedirSenha] = useState<Record<string, boolean>>({});
  /** O título da nota que se está a escrever: vive no cabeçalho da janela. */
  const [titulo, setTitulo] = useState("");
  const [apagarComSenha, setApagarComSenha] = useState<Nota | null>(null);
  const [senhaDeApagar, setSenhaDeApagar] = useState("");
  const [erroDeApagar, setErroDeApagar] = useState("");
  const quem: Quem = useMemo(() => ({ nome: sessao?.nome ?? funcao.pessoa, email: conta.email, funcao: funcao.rotulo }), [sessao?.nome, funcao.pessoa, funcao.rotulo, conta.email]);

  useEffect(() => {
    const abrir = (e: Event) => {
      const a = (e as CustomEvent<{ alvo: AlvoDeNota }>).detail.alvo;
      setAlvo(a);
      setAbertas({});
      setSenhas({});
      setErrosDeSenha({});
      setReveladas({});
      setPedirSenha({});
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
    setAbertas((a) => ({ ...a, [n.id]: { titulo: r.conteudo.titulo, corpo: r.conteudo.corpo, anexos: r.conteudo.anexos, chave: r.chave, senha: senhas[n.id] } }));
    setErrosDeSenha((e) => ({ ...e, [n.id]: "" }));
  };
  const conteudoDe = (n: Nota): Aberta | null => (n.cifra ? (abertas[n.id] ?? null) : { titulo: n.titulo, corpo: n.corpo, anexos: n.anexos });

  /** Manda o código para o e-mail da conta (e só para ele) e abre a janela do código. */
  const pedirRecuperacao = (n: Nota, codigo = gerarCodigo()) => {
    const agora = new Date();
    const { assunto, corpo } = textoDoEmailDeRecuperacao(n.alvo.rotulo, codigo);
    void emails.guardar(enviarEmail(emailNovo(`em-nota-codigo-${n.id}-${agora.getTime().toString(36)}`, { de: "Painel <nao-responder@painel.exemplo.com>", para: conta.email, assunto, corpo }, agora), agora));
    setRecuperar({ nota: n, codigo });
  };
  const concluirRecuperacao = async () => {
    const n = recuperar?.nota;
    if (!n?.cifra || !n.recuperacao) return;
    const chave = lerDoCofre(n.id);
    const senha = chave ? await senhaRecuperada(n.recuperacao, chave) : null;
    const r = senha ? await decifrarConteudo(n.cifra, senha) : null;
    if (!senha || !r) return avisar("Não foi possível recuperar: a chave de recuperação desta nota não está neste navegador.");
    setAbertas((a) => ({ ...a, [n.id]: { titulo: r.conteudo.titulo, corpo: r.conteudo.corpo, anexos: r.conteudo.anexos, chave: r.chave, senha } }));
    setErrosDeSenha((e) => ({ ...e, [n.id]: "" }));
    registar("nota", `Recuperou a palavra-passe de uma nota em «${n.alvo.rotulo}» com um código enviado para o e-mail da conta`);
    avisar("Nota aberta. Para mudar a palavra-passe, edite a nota.");
  };

  const editar = (n: Nota) => {
    if (n.cifra && !abertas[n.id]) return;
    setAEscrever(n);
  };
  const editorInicial = aEscrever && aEscrever !== "nova" ? { nota: aEscrever, ...(conteudoDe(aEscrever) as Aberta) } : undefined;
  const ocultar = (id: string, v: boolean) => setReveladas((r) => ({ ...r, [id]: v }));
  // ao abrir o editor o título é o da nota (ou vazio, numa nota nova)
  useEffect(() => {
    if (aEscrever === "nova") setTitulo("");
    else if (aEscrever) setTitulo(conteudoDe(aEscrever)?.titulo ?? aEscrever.titulo ?? "");
  }, [aEscrever]); // eslint-disable-line react-hooks/exhaustive-deps
  const textoDeApagar = `Vai para a reciclagem e tem ${lerDias()} dias para a recuperar.`;
  /** Uma nota com palavra-passe não se apaga sem a palavra-passe (a menos que já esteja aberta). */
  const pedirParaApagar = (n: Nota) => (n.cifra && !abertas[n.id] ? (setSenhaDeApagar(""), setErroDeApagar(""), setApagarComSenha(n)) : setApagar(n));
  const apagarDepoisDaSenha = async () => {
    const n = apagarComSenha;
    if (!n?.cifra) return;
    if (!(await decifrarConteudo(n.cifra, senhaDeApagar))) return setErroDeApagar("Palavra-passe errada.");
    setApagarComSenha(null);
    void removerNota(n);
  };

  return (
    <>
    <Dialog.Root open={!!alvo} onOpenChange={(v) => !v && fechar()}>
      <Dialog size="lg" className="flex max-h-[90dvh] flex-col overflow-hidden p-0" data-sem-nota>
        {alvo && (
          <>
            {/* o título fica sempre à vista: só o que está por baixo rola (antes rolava tudo e o título saía por cima do ecrã) */}
            <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
              {aEscrever ? (
                <>
                  <Dialog.Title className="sr-only">Notas · {alvo.rotulo}</Dialog.Title>
                  <div className="min-w-0 flex-1">
                    <Input aria-label="Título da nota" placeholder={`Notas · ${alvo.rotulo}`} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} autoComplete="off" autoFocus className="w-full" />
                  </div>
                </>
              ) : (
                <Dialog.Title className="min-w-0 text-lg font-semibold">
                  <span className="block truncate">Notas · {alvo.rotulo}</span>
                </Dialog.Title>
              )}
              <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
            </div>
            <div className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 sm:px-6 ${aEscrever ? "pb-5 sm:pb-6" : "pb-3"}`}>
            {aEscrever ? (
              <EditorDeNota
                alvo={alvo}
                quem={quem}
                inicial={editorInicial}
                titulo={titulo}
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
                              {n.expira && <span>{textoDaExpiracao(n.expira)}</span>}
                              {n.para.length > 0 && <span>Para {n.para.join(", ")}</span>}
                              {n.lembretes.length > 0 && minha && (
                                <span>
                                  {n.lembretes.length} {n.lembretes.length === 1 ? "lembrete" : "lembretes"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="-mr-1.5 -mt-1 flex items-center">
                          {n.afixada && <Ic nome="fixar" tamanho={13} className="mr-1 opacity-70" />}
                          {n.oculta && c && reveladas[n.id] && (
                            <Tooltip content="Ocultar o conteúdo" render={<Button variant="ghost" shape="square" size="xs" icon={<Ic nome="esconder" tamanho={16} />} aria-label="Ocultar o conteúdo" onClick={() => ocultar(n.id, false)} className="text-current" />} />
                          )}
                          <DropdownMenu>
                            <Tooltip content="Opções da nota" render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="xs" icon={ICONES.mais3} aria-label="Opções da nota" className="text-current" />} />} />
                            <MenuCartao>
                              <DropdownMenu.Item icon={<Ic nome="copiar" />} disabled={!c} onClick={() => c && void copiarEstruturado(estruturaDeRegisto(`Nota em ${n.alvo.rotulo}`, { autor: n.autor, para: n.para, criada: n.criada, atualizada: n.atualizada, expira: n.expira ?? null, texto: c.corpo.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(), ficheiros: c.anexos.map((a) => a.nome) }, n.alvo.pagina))}>
                                Copiar a nota
                              </DropdownMenu.Item>
                              <DropdownMenu.Item icon={<Ic nome="ia" />} disabled={!c} onClick={() => c && perguntarAIa("Resumir esta nota", { contexto: { titulo: `uma nota em ${n.alvo.rotulo}`, dados: { autor: n.autor, texto: c.corpo.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() } } })}>
                                Perguntar à IA
                              </DropdownMenu.Item>
                              {minha && <SeparadorDeMenu />}
                              {minha && (
                                <DropdownMenu.Item icon={<Ic nome={n.afixada ? "desafixar" : "fixar"} />} onClick={() => void guardarNota({ ...n, afixada: !n.afixada })}>
                                  {n.afixada ? "Desafixar" : "Afixar"}
                                </DropdownMenu.Item>
                              )}
                              {minha && (
                                <DropdownMenu.Item icon={<Ic nome="artigo" />} disabled={!c} onClick={() => editar(n)}>
                                  Editar
                                </DropdownMenu.Item>
                              )}
                              {(minha || funcao.id === "master") && (
                                <DropdownMenu.Item icon={<Ic nome="lixo" />} variant="danger" onClick={() => pedirParaApagar(n)}>
                                  Apagar
                                </DropdownMenu.Item>
                              )}
                            </MenuCartao>
                          </DropdownMenu>
                          </div>
                        </header>
                        {c?.titulo && <h4 className="text-sm font-semibold">{c.titulo}</h4>}
                        {c && n.oculta && !reveladas[n.id] ? (
                          // o texto nem chega ao ecrã enquanto está oculto: só barras e o olho
                          <div className="relative flex items-center justify-center py-2">
                            <div aria-hidden className="absolute inset-x-0 flex select-none flex-col gap-2 opacity-40 blur-[2px]">
                              <span className="block h-2.5 w-11/12 rounded-full bg-current/30" />
                              <span className="block h-2.5 w-3/4 rounded-full bg-current/30" />
                              <span className="block h-2.5 w-5/6 rounded-full bg-current/30" />
                            </div>
                            <Tooltip content="Mostrar o conteúdo" render={<Button variant="secondary" shape="square" icon={<Ic nome="olho" tamanho={18} />} aria-label="Mostrar o conteúdo da nota" onClick={() => ocultar(n.id, true)} className="relative" />} />
                          </div>
                        ) : c ? (
                          <CorpoDaNota html={c.corpo} chave={c.chave} />
                        ) : !pedirSenha[n.id] ? (
                          // trancada: só o cadeado; a palavra-passe pede-se quando se carrega nele
                          <div className="flex justify-center py-3">
                            <Tooltip content="Abrir a nota" render={<Button variant="secondary" shape="square" icon={<Ic nome="cadeado" tamanho={20} />} aria-label="Abrir a nota" onClick={() => setPedirSenha((p) => ({ ...p, [n.id]: true }))} />} />
                          </div>
                        ) : (
                          <form
                            className="flex flex-col gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void abrirComSenha(n);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <Input aria-label="Palavra-passe da nota" type="password" placeholder="Palavra-passe" autoFocus value={senhas[n.id] ?? ""} onChange={(e) => setSenhas((s) => ({ ...s, [n.id]: e.target.value }))} autoComplete="off" className="w-full" />
                              </div>
                              <Button type="submit" size="sm" variant="primary" disabled={!senhas[n.id]}>
                                Abrir
                              </Button>
                            </div>
                            {errosDeSenha[n.id] && <p className="text-sm font-medium">{errosDeSenha[n.id]}</p>}
                            {minha && n.recuperacao && (
                              <div>
                                <Button type="button" size="sm" variant="ghost" onClick={() => pedirRecuperacao(n)}>
                                  Esqueci-me da palavra-passe
                                </Button>
                              </div>
                            )}
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
    <CodigoDialog
      aberto={!!recuperar}
      aoMudar={(v) => !v && setRecuperar(null)}
      titulo="Recuperar a palavra-passe"
      texto={<>Enviámos um código para <b>{mascarar(conta.email)}</b>, o e-mail da sua conta: só ele recebe o código.</>}
      codigo={recuperar?.codigo ?? "000000"}
      chave={recuperar ? `nota-recuperar:${recuperar.nota.id}` : "nota-recuperar"}
      aoReenviar={() => recuperar && pedirRecuperacao(recuperar.nota)}
      aoConfirmar={() => void concluirRecuperacao()}
      rotuloAcao="Abrir a nota"
    />
    <Dialog.Root open={!!apagarComSenha} onOpenChange={(v) => !v && setApagarComSenha(null)}>
      <Dialog size="base" className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void apagarDepoisDaSenha();
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">Apagar a nota</Dialog.Title>
            <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
          <Input label="Palavra-passe da nota" type="password" autoFocus value={senhaDeApagar} onChange={(e) => (setSenhaDeApagar(e.target.value), setErroDeApagar(""))} error={erroDeApagar || undefined} autoComplete="off" />
          <p className="mt-3 text-sm text-kumo-default">{textoDeApagar}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close render={(p) => <Button {...p} variant="secondary">Cancelar</Button>} />
            <Button type="submit" variant="destructive" disabled={!senhaDeApagar}>
              Apagar
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
    <Confirmar
      aberto={!!apagar}
      aoMudar={(v) => !v && setApagar(null)}
      titulo="Apagar a nota"
      perigo
      texto={textoDeApagar}
      rotuloAcao="Apagar"
      aoConfirmar={() => apagar && void removerNota(apagar)}
    />
    </>
  );
}
