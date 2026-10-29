// O editor de blog do painel: a lista de artigos (rascunho ou publicado) e o editor, com a barra de formatação, a pré-visualização, o endereço, o resumo, as etiquetas e a imagem de capa da biblioteca. Os artigos ficam no navegador; exportam-se em Markdown.
"use client";

import { Badge, Button, Input, InputArea, Tooltip } from "@cloudflare/kumo";
import { useMemo, useRef, useState } from "react";
import { alternarFormato, type FerramentaDeFormato } from "@/lib/blog-formatar";
import { artigoNovo, lerEtiquetas, paraMarkdown, slugDe, tempoDeLeitura, type Artigo } from "@/lib/blog";
import { eImagem, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { identificador } from "@/lib/conta";
import { Markdown } from "@/lib/markdown";
import { BarraDeGuardar } from "../BarraDeGuardar";
import { Cartao, Confirmar, Linha } from "../conta/Pecas";
import { Ic, ICONES, type Icone } from "../Icones";
import { Pagina, Separadores, Titulo } from "../ui";
import { BlocoDeImagem } from "./BlocoDeImagem";
import { useUrlsDeImagens, Vazio } from "./ConteudoPecas";
import { EscolherImagem } from "./EscolherImagem";
import { descarregarBlob } from "./GestorDeFicheiros";

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

const FERRAMENTAS: (FerramentaDeFormato & { icone: Icone; rotulo: string })[] = [
  { id: "negrito", tipo: "inline", icone: "negrito", rotulo: "Negrito", antes: "**", depois: "**", exemplo: "texto" },
  { id: "italico", tipo: "inline", icone: "italico", rotulo: "Itálico", antes: "*", depois: "*", exemplo: "texto" },
  { id: "titulo", tipo: "linha", icone: "titulo", rotulo: "Título", antes: "\n## ", depois: "", exemplo: "Título" },
  { id: "lista", tipo: "linha", icone: "lista", rotulo: "Lista", antes: "\n- ", depois: "", exemplo: "item" },
  { id: "citacao", tipo: "linha", icone: "citacao", rotulo: "Citação", antes: "\n> ", depois: "", exemplo: "citação" },
  { id: "codigo", tipo: "inline", icone: "codigo", rotulo: "Código", antes: "`", depois: "`", exemplo: "código" },
  { id: "ligacao", tipo: "inline", icone: "link", rotulo: "Ligação", antes: "[", depois: "](https://)", exemplo: "texto" },
];

function Editor({ inicial, outros, aoSair, aoAbrir }: { inicial: Artigo; outros: Artigo[]; aoSair: () => void; aoAbrir: (a: Artigo) => void }) {
  const { guardar } = useArmazem<Artigo>("artigos");
  const { itens: ficheiros } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const imagens = useMemo(() => ficheiros.filter(eImagem), [ficheiros]);
  const urls = useUrlsDeImagens(imagens);
  const [a, setA] = useState<Artigo>(inicial);
  const [etiquetas, setEtiquetas] = useState(inicial.etiquetas.join(", "));
  const [aba, setAba] = useState<"escrever" | "previsao">("escrever");
  const [imagemNoTexto, setImagemNoTexto] = useState(false);
  const [sujo, setSujo] = useState(false);
  /** Sair do editor, ou abrir outro artigo, com alterações por guardar. */
  const [saida, setSaida] = useState<"sair" | Artigo | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const mudar = (p: Partial<Artigo>) => (setA((x) => ({ ...x, ...p })), setSujo(true));
  const slug = a.slug || slugDe(a.titulo);

  /** Põe o texto novo e a seleção onde a formatação a deixou. */
  const aplicar = (r: { texto: string; inicio: number; fim: number }) => {
    const t = area.current;
    mudar({ conteudo: r.texto });
    requestAnimationFrame(() => {
      t?.focus();
      t?.setSelectionRange(r.inicio, r.fim);
    });
  };
  /** Cada botão liga e desliga: carregar outra vez tira a formatação. */
  const formatar = (f: FerramentaDeFormato) => {
    const t = area.current;
    aplicar(alternarFormato(a.conteudo, t?.selectionStart ?? a.conteudo.length, t?.selectionEnd ?? a.conteudo.length, f));
  };
  const inserir = (antes: string, depois: string, exemplo: string) => {
    const t = area.current;
    const ini = t?.selectionStart ?? a.conteudo.length;
    const fim = t?.selectionEnd ?? a.conteudo.length;
    const escolhido = a.conteudo.slice(ini, fim) || exemplo;
    aplicar({ texto: `${a.conteudo.slice(0, ini)}${antes}${escolhido}${depois}${a.conteudo.slice(fim)}`, inicio: ini + antes.length, fim: ini + antes.length + escolhido.length });
  };
  const gravar = async (estado: Artigo["estado"]) => {
    const agora = new Date().toISOString();
    await guardar({ ...a, slug, etiquetas: lerEtiquetas(etiquetas), estado, atualizado: agora, publicado: estado === "publicado" ? (a.publicado ?? agora) : a.publicado });
    setSujo(false);
    setA((x) => ({ ...x, slug, estado, atualizado: agora }));
  };
  const podeGuardar = a.titulo.trim().length > 0;
  const abrirOutro = (o: Artigo) => (sujo ? setSaida(o) : aoAbrir(o));

  return (
    <Pagina largo>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* começa logo no editor: a barra de formatação em cima (numa só linha, com scroll), a capa, o título e o texto */}
          <div className="pleno min-w-0 overflow-hidden rounded-xl bg-kumo-base ring ring-kumo-line">
            <div className="sem-barra flex items-center gap-1 overflow-x-auto border-b border-kumo-hairline p-2 [&>*]:shrink-0" role="toolbar" aria-label="Formatação">
              <Tooltip content="Voltar aos artigos" render={<Button variant="ghost" size="sm" shape="square" icon={ICONES.anterior} aria-label="Voltar aos artigos" onClick={() => (sujo ? setSaida("sair") : aoSair())} />} />
              {FERRAMENTAS.map((f) => (
                <Tooltip key={f.id} content={f.rotulo} render={<Button variant="ghost" size="sm" shape="square" icon={<Ic nome={f.icone} />} aria-label={f.rotulo} disabled={aba !== "escrever"} onMouseDown={(e) => e.preventDefault()} onClick={() => formatar(f)} />} />
              ))}
              <Tooltip content="Imagem" render={<Button variant="ghost" size="sm" shape="square" icon={<Ic nome="imagem" />} aria-label="Imagem" disabled={aba !== "escrever"} onMouseDown={(e) => e.preventDefault()} onClick={() => setImagemNoTexto(true)} />} />
              <span className="ml-auto pl-2">
                <Separadores itens={[{ id: "escrever", rotulo: "Escrever" }, { id: "previsao", rotulo: "Pré-visualizar" }]} valor={aba} aoMudar={(id) => setAba(id as "escrever" | "previsao")} />
              </span>
            </div>
            {aba === "escrever" ? (
              <div className="flex flex-col">
                <BlocoDeImagem local="blog-capa" ids={a.capa ? [a.capa] : []} aoMudar={(ids) => mudar({ capa: ids[0] })} vazio="Imagem de capa" proporcao="aspect-[16/7]" />
                <div className="flex flex-col gap-3 px-4 pb-4">
                  <Input aria-label="Título do artigo" size="lg" value={a.titulo} onChange={(e) => mudar({ titulo: e.target.value })} placeholder="Título" autoComplete="off" className="w-full" />
                  <InputArea ref={area} aria-label="Texto do artigo" value={a.conteudo} onValueChange={(v) => mudar({ conteudo: v })} minRows={16} autoResize placeholder="Escreva em Markdown: ## título, **negrito**, *itálico*, - lista, [texto](https://ligação)…" />
                  <span className="text-xs text-kumo-subtle">
                    {a.conteudo.trim().split(/\s+/).filter(Boolean).length} palavras · {tempoDeLeitura(a.conteudo)} min de leitura
                  </span>
                </div>
              </div>
            ) : (
              <div className="min-h-64 p-4">
                {a.capa && urls.get(a.capa) && <img src={urls.get(a.capa)} alt="" className="mb-4 aspect-[16/7] w-full rounded-xl object-cover" />}
                {a.titulo.trim() && <h1 className="mb-3 text-2xl font-semibold text-kumo-default">{a.titulo}</h1>}
                {a.conteudo.trim() ? <Markdown texto={a.conteudo} urlDe={(id) => urls.get(id)} /> : <span className="text-sm text-kumo-subtle">Ainda não há texto.</span>}
              </div>
            )}
          </div>

          {outros.length > 0 && (
            <section aria-label="Outros blogs já escritos" className="flex min-w-0 flex-col gap-2">
              <h3 className="px-1 text-sm font-medium text-kumo-default">Outros blogs já escritos</h3>
              <ul className="sem-barra m-0 flex list-none gap-3 overflow-x-auto p-1 [&>*]:shrink-0">
                {outros.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => abrirOutro(o)} aria-label={`Abrir «${o.titulo || "Sem título"}»`} className="relative block size-28 cursor-pointer overflow-hidden rounded-xl bg-kumo-tint ring ring-kumo-line transition-shadow hover:ring-kumo-interact">
                      {o.capa && urls.get(o.capa) ? (
                        <img src={urls.get(o.capa)} alt="" className="size-full object-cover" />
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
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Cartao titulo="Publicação">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-kumo-subtle">Estado</span>
                <Badge variant={a.estado === "publicado" ? "success" : "warning"}>{a.estado === "publicado" ? "Publicado" : "Rascunho"}</Badge>
              </div>
              <InputArea label="Resumo" value={a.resumo} onValueChange={(v) => mudar({ resumo: v })} minRows={2} autoResize placeholder="Duas frases que aparecem na lista e nas partilhas" />
              <Input label="Endereço" description={`/blog/${slug || "…"}`} value={a.slug} placeholder={slugDe(a.titulo)} onChange={(e) => mudar({ slug: slugDe(e.target.value) })} />
              <Input label="Etiquetas" description="Separe por vírgulas." value={etiquetas} onChange={(e) => (setEtiquetas(e.target.value), setSujo(true))} placeholder="notícias, transportes" />
              <div className="flex flex-wrap gap-2">
                {a.estado === "publicado" ? (
                  <Button variant="secondary" disabled={!podeGuardar} onClick={() => gravar("rascunho")}>
                    Passar a rascunho
                  </Button>
                ) : (
                  <Button variant="primary" disabled={!podeGuardar} onClick={() => gravar("publicado")}>
                    Publicar
                  </Button>
                )}
              </div>
            </div>
          </Cartao>
        </div>
      </div>
      <BarraDeGuardar sujo={sujo} desativadoGuardar={!podeGuardar} aoDesfazer={() => (setA(inicial), setEtiquetas(inicial.etiquetas.join(", ")), setSujo(false))} aoGuardar={() => gravar(a.estado)} />
      <EscolherImagem
        aberto={imagemNoTexto}
        aoMudar={setImagemNoTexto}
        local="blog-corpo"
        aoEscolher={(ids) => {
          const i = imagens.find((x) => x.id === ids[0]);
          if (i) inserir("![", `](biblioteca:${i.id})`, i.alt ?? i.nome);
        }}
      />
      <Confirmar aberto={!!saida} aoMudar={(v) => !v && setSaida(null)} titulo="Sair sem guardar?" texto="As alterações a este artigo ainda não foram guardadas." rotuloAcao="Sair sem guardar" perigo aoConfirmar={() => (saida === "sair" ? aoSair() : saida && aoAbrir(saida))} />
    </Pagina>
  );
}

export function Blog() {
  const { itens, pronto, guardar, remover } = useArmazem<Artigo>("artigos");
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
                <Button variant="ghost" size="sm" shape="square" icon={ICONES.transferir} aria-label={`Exportar ${a.titulo} em Markdown`} onClick={() => descarregarBlob(`${a.slug || slugDe(a.titulo) || "artigo"}.md`, new Blob([paraMarkdown(a)], { type: "text/markdown" }))} />
                <Button variant="ghost" size="sm" onClick={() => guardar({ ...a, estado: a.estado === "publicado" ? "rascunho" : "publicado", publicado: a.publicado ?? new Date().toISOString(), atualizado: new Date().toISOString() })}>
                  {a.estado === "publicado" ? "Despublicar" : "Publicar"}
                </Button>
                <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Remover ${a.titulo}`} onClick={() => setApagar(a)} />
              </div>
            </Linha>
          ))
        )}
      </Cartao>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover o artigo" texto={apagar ? `«${apagar.titulo || "Sem título"}» vai ser removido. Não se pode desfazer.` : ""} rotuloAcao="Remover" perigo aoConfirmar={() => apagar && remover(apagar.id)} />
    </Pagina>
  );
}
