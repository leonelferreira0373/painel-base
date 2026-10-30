// O blog do painel: a lista de artigos (rascunho ou publicado) e o editor visual — uma folha em branco com as ferramentas em cima e, nos três pontos, as opções do artigo (capa, cabeçalho, SEO, pré-visualizar, exportar em HTML e em PDF); o botão «Publicar» está sempre à vista. O SEO faz-se sozinho a partir do título, do texto e da capa; quem quiser escreve por cima. Os artigos ficam no navegador; exportam-se em HTML.
"use client";

import { Badge, Button, Dialog, DropdownMenu, Tooltip } from "@cloudflare/kumo";
import type { Editor as EditorTipTap } from "@tiptap/react";
import { ChevronLeft, EllipsisVertical } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { artigoNovo, slugDe, tempoDeLeitura, type Artigo } from "@/lib/blog";
import { modeloPorOmissao, type ModeloDeColagem } from "@/lib/blog-colagem";
import { htmlDoArtigo, textoDoHtml } from "@/lib/blog-html";
import { seoAoVivo } from "@/lib/blog-seo";
import { alinharDoTitulo, estiloDoTitulo } from "@/lib/blog-titulo";
import { corValida } from "@/lib/cores-graficos";
import { eImagem, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { identificador } from "@/lib/conta";
import { estiloDoEnquadramento } from "@/lib/enquadramento";
import { BarraDeGuardar } from "../BarraDeGuardar";
import { Cartao, Confirmar, Linha } from "../conta/Pecas";
import { MenuCartao } from "../Flutuantes";
import { Ic, ICONES } from "../Icones";
import { BotaoIcone, Pagina, Titulo } from "../ui";
import { AreaDoTitulo } from "./AreaDeTexto";
import { useUrlsDeImagens, Vazio } from "./ConteudoPecas";
import { EditorDeTexto } from "./EditorDeTexto";
import { EscolherDaBiblioteca } from "./EscolherDaBiblioteca";
import { EscolherImagem } from "./EscolherImagem";
import { EscolherTipoDeLetra } from "./EscolherTipoDeLetra";
import { exportarHtml, exportarPdf } from "./exportarArtigo";
import { PreviaDoArtigo } from "./PreviaDoArtigo";
import { SeoDoArtigo } from "./SeoDoArtigo";
import { useFontesCarregadas, useFontesDoArtigo } from "./useFontes";
import type { TipoDeFicheiro } from "./FicheiroDoBlog";
import { VisualizadorDeImagem } from "./VisualizadorDeImagem";

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

type Janela = "capa" | "imagem" | "colagem" | "ficheiro" | "fonte" | "previa" | "seo" | null;

function Editor({ inicial, outros, aoSair, aoAbrir }: { inicial: Artigo; outros: Artigo[]; aoSair: () => void; aoAbrir: (a: Artigo) => void }) {
  const { guardar } = useArmazem<Artigo>("artigos");
  const { itens: ficheiros } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const imagens = useMemo(() => ficheiros.filter(eImagem), [ficheiros]);
  const htmlInicial = useMemo(() => htmlDoArtigo(inicial), [inicial]);
  const [a, setA] = useState<Artigo>(inicial);
  // o áudio, o vídeo e os documentos que o texto usa também precisam do seu endereço
  const usados = useMemo(() => new Set([...(a.html ?? htmlInicial).matchAll(/data-id="([^"]+)"/g)].map((m) => m[1])), [a.html, htmlInicial]);
  const doArtigo = useMemo(() => ficheiros.filter((f) => eImagem(f) || usados.has(f.id)), [ficheiros, usados]);
  const urls = useUrlsDeImagens(doArtigo, true);
  useFontesCarregadas();
  useFontesDoArtigo(a.html ?? htmlInicial, a.cabecalho?.fonte);
  const [editor, setEditor] = useState<EditorTipTap | null>(null);
  const [janela, setJanela] = useState<Janela>(null);
  const [verCapa, setVerCapa] = useState(false);
  const [sujo, setSujo] = useState(false);
  /** Sair do editor, ou abrir outro artigo, com alterações por guardar. */
  const [saida, setSaida] = useState<"sair" | Artigo | null>(null);
  const titulo = useRef<HTMLTextAreaElement>(null);
  const mudar = (p: Partial<Artigo>) => (setA((x) => ({ ...x, ...p })), setSujo(true));
  const seo = seoAoVivo(a);
  const cab = a.cabecalho;
  const palavras = a.conteudo.trim().split(/\s+/).filter(Boolean).length;
  const podeGuardar = a.titulo.trim().length > 0;

  const subtitulo = useRef<HTMLTextAreaElement>(null);
  /** Que pedido de colagem está aberto: uma colagem nova, ou mais imagens para a escolhida. */
  const modoDaColagem = useRef<"nova" | "mais">("nova");
  const modeloDaColagem = useRef<ModeloDeColagem | undefined>(undefined);
  const tipoDeFicheiro = useRef<TipoDeFicheiro>("documento");
  // o título e o subtítulo crescem com o que se escreve
  useEffect(() => {
    for (const campo of [titulo.current, subtitulo.current]) {
      if (!campo) continue;
      campo.style.height = "auto";
      campo.style.height = `${campo.scrollHeight}px`;
    }
  }, [a.titulo, a.cabecalho?.subtitulo, a.cabecalho?.centrado]);

  const gravar = async (estado: Artigo["estado"]) => {
    const agora = new Date().toISOString();
    // um artigo antigo (Markdown) fica em HTML a partir daqui
    const html = a.html ?? htmlInicial;
    const final: Artigo = { ...a, html, conteudo: a.html ? a.conteudo : textoDoHtml(html), slug: a.slug.trim() || slugDe(a.titulo), estado, atualizado: agora, publicado: estado === "publicado" ? (a.publicado ?? agora) : a.publicado };
    await guardar(final);
    setSujo(false);
    setA(final);
  };
  const abrirOutro = (o: Artigo) => (sujo ? setSaida(o) : aoAbrir(o));
  const desfazer = () => {
    setA(inicial);
    editor?.commands.setContent(htmlInicial, { emitUpdate: false });
    setSujo(false);
  };

  const menu = (
    <DropdownMenu>
      <Tooltip content="Opções do artigo" render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="base" icon={EllipsisVertical} aria-label="Opções do artigo" className="[&_svg]:size-5 [&_svg]:stroke-[1.75] transition-transform active:scale-90 data-[popup-open]:!bg-black/[0.09] dark:data-[popup-open]:!bg-white/15" />} />} />
      <MenuCartao>
        <DropdownMenu.Group>
          <DropdownMenu.Label>{`${a.estado === "publicado" ? "Publicado" : "Rascunho"} · ${palavras} ${palavras === 1 ? "palavra" : "palavras"} · ${tempoDeLeitura(a.conteudo)} min`}</DropdownMenu.Label>
        </DropdownMenu.Group>
        <DropdownMenu.Item icon={<Ic nome="olho" />} onClick={() => setJanela("previa")}>
          Pré-visualizar
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="imagem" />} onClick={() => setJanela("capa")}>
          Imagem de capa
        </DropdownMenu.Item>
        {a.capa && (
          <DropdownMenu.Item icon={<Ic nome="ampliar" />} onClick={() => setVerCapa(true)}>
            Ajustar a capa
          </DropdownMenu.Item>
        )}
        {a.capa && (
          <DropdownMenu.Item icon={<Ic nome="lixo" />} onClick={() => mudar({ capa: undefined, capaEnquadramento: undefined })}>
            Tirar a capa
          </DropdownMenu.Item>
        )}
        <DropdownMenu.CheckboxItem checked={!!cab?.linhas} onCheckedChange={(v) => mudar({ cabecalho: { ...cab, linhas: v } })}>
          Linhas à volta do título
        </DropdownMenu.CheckboxItem>
        <DropdownMenu.CheckboxItem checked={cab?.subtitulo !== undefined} onCheckedChange={(v) => mudar({ cabecalho: { ...cab, subtitulo: v ? "" : undefined } })}>
          Subtítulo
        </DropdownMenu.CheckboxItem>
        <DropdownMenu.Item icon={<Ic nome="tamanhoDoTexto" />} onClick={() => setJanela("fonte")}>
          Tipo de letra do título
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="globo" />} onClick={() => setJanela("seo")}>
          <span className="flex w-full items-center justify-between gap-6">
            SEO
            <span className="tabular-nums text-kumo-subtle">{seo.resultado.pontos}</span>
          </span>
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="transferir" />} onClick={() => void exportarPdf({ ...a, html: a.html ?? htmlInicial }, ficheiros)}>
          Exportar em PDF
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="transferir" />} onClick={() => void exportarHtml({ ...a, html: a.html ?? htmlInicial }, ficheiros)}>
          Exportar em HTML
        </DropdownMenu.Item>
      </MenuCartao>
    </DropdownMenu>
  );

  /** O botão de publicar está sempre à vista, ao lado dos três pontos. */
  const extras = (
    <div className="flex items-center gap-1">
      {a.estado === "publicado" ? (
        <Button variant="secondary" size="sm" disabled={!podeGuardar} onClick={() => void gravar("rascunho")}>
          Despublicar
        </Button>
      ) : (
        <Button variant="primary" size="sm" disabled={!podeGuardar} onClick={() => void gravar("publicado")}>
          Publicar
        </Button>
      )}
      {menu}
    </div>
  );

  const alinhado = alinharDoTitulo(cab);
  const corDoTitulo = corValida(cab?.cor) ? cab?.cor : undefined;
  const topo = (
    <div className="flex flex-col gap-5 pb-4 pt-8">
      {a.capa && urls.get(a.capa) && (
        <button type="button" onClick={() => setVerCapa(true)} aria-label="Ajustar a imagem de capa" className="block aspect-[16/7] w-full cursor-zoom-in overflow-hidden rounded-xl bg-kumo-tint">
          <img src={urls.get(a.capa)} alt="" className="size-full" style={estiloDoEnquadramento(a.capaEnquadramento)} />
        </button>
      )}
      <AreaDoTitulo aspeto={cab} aoMudar={(parcial) => mudar({ cabecalho: { ...cab, ...parcial } })} className={`flex flex-col gap-3 ${cab?.linhas ? "border-y border-kumo-line py-5" : ""}`}>
        <textarea
          ref={titulo}
          aria-label="Título do artigo"
          rows={1}
          value={a.titulo}
          placeholder="Título"
          onChange={(e) => mudar({ titulo: e.target.value.replace(/\n/g, " ") })}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), subtitulo.current ? subtitulo.current.focus() : (editor?.chain().setTextSelection(1).run(), editor?.view.focus()))}
          className="w-full resize-none overflow-hidden bg-transparent leading-tight text-kumo-default outline-none placeholder:text-kumo-subtle/50"
          style={estiloDoTitulo(cab)}
        />
        {cab?.subtitulo !== undefined && (
          <textarea
            ref={subtitulo}
            aria-label="Subtítulo do artigo"
            rows={1}
            value={cab.subtitulo}
            placeholder="Subtítulo"
            onChange={(e) => mudar({ cabecalho: { ...cab, subtitulo: e.target.value.replace(/\n/g, " ") } })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), editor?.chain().setTextSelection(1).run(), editor?.view.focus())}
            className="w-full resize-none overflow-hidden bg-transparent text-xl leading-snug text-kumo-default outline-none placeholder:text-kumo-subtle/50"
            style={{ fontFamily: a.cabecalho?.fonte ?? "Georgia, Cambria, serif", textAlign: alinhado, color: corDoTitulo }}
          />
        )}
      </AreaDoTitulo>
    </div>
  );

  return (
    <Pagina largo>
      <EditorDeTexto
        html={htmlInicial}
        aoMudar={(html, texto) => mudar({ html, conteudo: texto })}
        urls={urls}
        inicio={<BotaoIcone dica="Voltar aos artigos" icone={ChevronLeft} tamanho="base" className="[&_svg]:size-5 [&_svg]:stroke-[1.75]" aoClicar={() => (sujo ? setSaida("sair") : aoSair())} />}
        extras={extras}
        topo={topo}
        aoPedirImagem={() => setJanela("imagem")}
        aoPedirColagem={(modo, modelo) => ((modoDaColagem.current = modo), (modeloDaColagem.current = modelo), setJanela("colagem"))}
        aoPedirFicheiro={(tipo) => ((tipoDeFicheiro.current = tipo), setJanela("ficheiro"))}
        aoCriar={setEditor}
      />

      {outros.length > 0 && (
        <section aria-label="Outros blogs já escritos" className="mx-auto flex w-full min-w-0 max-w-[46rem] flex-col gap-2">
          <h3 className="px-1 text-sm font-medium text-kumo-default">Outros blogs já escritos</h3>
          <ul className="sem-barra m-0 flex list-none gap-3 overflow-x-auto p-1 [&>*]:shrink-0">
            {outros.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => abrirOutro(o)} aria-label={`Abrir «${o.titulo || "Sem título"}»`} className="relative block size-28 cursor-pointer overflow-hidden rounded-xl bg-kumo-tint ring ring-kumo-line transition-shadow hover:ring-kumo-interact">
                  {o.capa && urls.get(o.capa) ? (
                    <img src={urls.get(o.capa)} alt="" className="size-full" style={estiloDoEnquadramento(o.capaEnquadramento)} />
                  ) : (
                    <span className="grid size-full place-items-center text-kumo-subtle">
                      <Ic nome="artigo" tamanho={28} />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-kumo-base/90 px-2 py-1 text-left text-xs font-medium text-kumo-default">{o.titulo || "Sem título"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BarraDeGuardar sujo={sujo} desativadoGuardar={!podeGuardar} aoDesfazer={desfazer} aoGuardar={() => gravar(a.estado)} />

      <EscolherImagem aberto={janela === "capa"} aoMudar={(v) => !v && setJanela(null)} local="blog-capa" aoEscolher={(ids) => ids[0] && mudar({ capa: ids[0], capaEnquadramento: undefined })} />
      <EscolherImagem
        aberto={janela === "imagem"}
        aoMudar={(v) => !v && setJanela(null)}
        local="blog-corpo"
        aoEscolher={(ids) => {
          const i = imagens.find((x) => x.id === ids[0]);
          if (i) editor?.chain().focus().insertContent({ type: "imagemDoBlog", attrs: { id: i.id, alt: i.alt ?? "" } }).run();
        }}
      />
      <EscolherImagem
        aberto={janela === "colagem"}
        aoMudar={(v) => !v && setJanela(null)}
        local="blog-corpo"
        multiplo
        aoEscolher={(ids) => {
          if (!editor || ids.length === 0) return;
          if (modoDaColagem.current === "nova") editor.chain().focus().insertContent({ type: "colagemDoBlog", attrs: { ids, modelo: modeloDaColagem.current ?? modeloPorOmissao(ids.length), alt: "", legenda: "" } }).run();
          else editor.chain().focus().updateAttributes("colagemDoBlog", { ids: [...new Set([...(editor.getAttributes("colagemDoBlog").ids as string[]), ...ids])] }).run();
        }}
      />
      <VisualizadorDeImagem aberto={verCapa} aoMudar={setVerCapa} src={a.capa ? urls.get(a.capa) : undefined} proporcao={16 / 7} valor={a.capaEnquadramento} aoGuardar={(e) => mudar({ capaEnquadramento: e })} />

      <EscolherDaBiblioteca
        aberto={janela === "ficheiro"}
        aoMudar={(v) => !v && setJanela(null)}
        tipo={tipoDeFicheiro.current}
        aoEscolher={(i) => editor?.chain().focus().insertContent({ type: "ficheiroDoBlog", attrs: { tipo: tipoDeFicheiro.current, id: i.id, nome: i.nome, tamanho: i.tamanho, legenda: "" } }).run()}
      />
      <Dialog.Root open={janela === "fonte"} onOpenChange={(v) => !v && setJanela(null)}>
        <Dialog size="sm" className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold">Tipo de letra do título</Dialog.Title>
            <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
          <EscolherTipoDeLetra valor={cab?.fonte ?? null} aoEscolher={(f) => mudar({ cabecalho: { ...cab, fonte: f ?? undefined } })} />
        </Dialog>
      </Dialog.Root>
      <PreviaDoArtigo aberto={janela === "previa"} aoMudar={(v) => !v && setJanela(null)} a={{ ...a, html: a.html ?? htmlInicial }} urls={urls} ficheiros={ficheiros} aoPdf={() => void exportarPdf({ ...a, html: a.html ?? htmlInicial }, ficheiros)} />
      <SeoDoArtigo aberto={janela === "seo"} aoMudar={(v) => !v && setJanela(null)} a={a} aoAlterar={mudar} />

      <Confirmar aberto={!!saida} aoMudar={(v) => !v && setSaida(null)} titulo="Sair sem guardar?" texto="As alterações a este artigo ainda não foram guardadas." rotuloAcao="Sair sem guardar" perigo aoConfirmar={() => (saida === "sair" ? aoSair() : saida && aoAbrir(saida))} />
    </Pagina>
  );
}

export function Blog() {
  const { itens, pronto, guardar, remover } = useArmazem<Artigo>("artigos");
  const { itens: ficheiros } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const [aEditar, setAEditar] = useState<Artigo | null>(null);
  const [apagar, setApagar] = useState<Artigo | null>(null);
  const ordenados = useMemo(() => [...itens].sort((a, b) => b.atualizado.localeCompare(a.atualizado)), [itens]);
  if (aEditar) return <Editor key={aEditar.id} inicial={aEditar} outros={ordenados.filter((x) => x.id !== aEditar.id)} aoSair={() => setAEditar(null)} aoAbrir={setAEditar} />;
  return (
    <Pagina>
      <Titulo titulo="Blog">
        <Button variant="primary" icon={ICONES.mais} onClick={() => setAEditar(artigoNovo(identificador()))}>
          Novo artigo
        </Button>
      </Titulo>
      <Cartao titulo={`Artigos${itens.length ? ` (${itens.length})` : ""}`}>
        {!pronto ? (
          <div className="p-6 text-sm text-kumo-subtle">A abrir o blog…</div>
        ) : ordenados.length === 0 ? (
          <Vazio icone="artigo" titulo="Ainda não há artigos" texto="Escreva o primeiro: fica como rascunho até o publicar." />
        ) : (
          ordenados.map((a) => (
            <Linha
              key={a.id}
              titulo={
                <button type="button" onClick={() => setAEditar(a)} className="inline-flex min-w-0 items-center gap-2 text-left font-medium hover:underline">
                  <span className="truncate">{a.titulo || "Sem título"}</span>
                  <Badge variant={a.estado === "publicado" ? "success" : "warning"}>{a.estado === "publicado" ? "Publicado" : "Rascunho"}</Badge>
                </button>
              }
              estado={`${data(a.atualizado)} · ${tempoDeLeitura(a.conteudo)} min de leitura${a.etiquetas.length ? ` · ${a.etiquetas.join(", ")}` : ""}`}
            >
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setAEditar(a)}>
                  Editar
                </Button>
                <BotaoIcone dica={`Exportar «${a.titulo || "Sem título"}» em HTML`} icone="transferir" tamanho="sm" aoClicar={() => void exportarHtml(a, ficheiros)} />
                <Button variant="ghost" size="sm" onClick={() => guardar({ ...a, estado: a.estado === "publicado" ? "rascunho" : "publicado", publicado: a.publicado ?? new Date().toISOString(), atualizado: new Date().toISOString() })}>
                  {a.estado === "publicado" ? "Despublicar" : "Publicar"}
                </Button>
                <BotaoIcone dica={`Remover «${a.titulo || "Sem título"}»`} icone="lixo" tamanho="sm" aoClicar={() => setApagar(a)} />
              </div>
            </Linha>
          ))
        )}
      </Cartao>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover o artigo" texto={apagar ? `«${apagar.titulo || "Sem título"}» vai ser removido. Não se pode desfazer.` : ""} rotuloAcao="Remover" perigo aoConfirmar={() => apagar && remover(apagar.id)} />
    </Pagina>
  );
}
