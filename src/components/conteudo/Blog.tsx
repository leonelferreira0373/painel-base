// O editor de blog do painel: a lista de artigos (rascunho ou publicado) e o editor, com a barra de formatação, a pré-visualização, o endereço, o resumo, as etiquetas e a imagem de capa da biblioteca. Os artigos ficam no navegador; exportam-se em Markdown.
"use client";

import { Badge, Button, Input, InputArea } from "@cloudflare/kumo";
import { useMemo, useRef, useState } from "react";
import { artigoNovo, lerEtiquetas, paraMarkdown, slugDe, tempoDeLeitura, type Artigo } from "@/lib/blog";
import { eImagem, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { identificador } from "@/lib/conta";
import { Markdown } from "@/lib/markdown";
import { Cartao, Confirmar, Linha } from "../conta/Pecas";
import { Ic, ICONES, type Icone } from "../Icones";
import { Pagina, Separadores, Titulo } from "../ui";
import { BlocoDeImagem } from "./BlocoDeImagem";
import { useUrlsDeImagens, Vazio } from "./ConteudoPecas";
import { EscolherImagem } from "./EscolherImagem";
import { descarregarBlob } from "./GestorDeFicheiros";

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

const FERRAMENTAS: { id: string; icone: Icone; rotulo: string; antes: string; depois: string; exemplo: string }[] = [
  { id: "negrito", icone: "negrito", rotulo: "Negrito", antes: "**", depois: "**", exemplo: "texto" },
  { id: "italico", icone: "italico", rotulo: "Itálico", antes: "*", depois: "*", exemplo: "texto" },
  { id: "titulo", icone: "titulo", rotulo: "Título", antes: "\n## ", depois: "", exemplo: "Título" },
  { id: "lista", icone: "lista", rotulo: "Lista", antes: "\n- ", depois: "", exemplo: "item" },
  { id: "citacao", icone: "citacao", rotulo: "Citação", antes: "\n> ", depois: "", exemplo: "citação" },
  { id: "codigo", icone: "codigo", rotulo: "Código", antes: "`", depois: "`", exemplo: "código" },
  { id: "ligacao", icone: "link", rotulo: "Ligação", antes: "[", depois: "](https://)", exemplo: "texto" },
];

function Editor({ inicial, aoSair }: { inicial: Artigo; aoSair: () => void }) {
  const { guardar } = useArmazem<Artigo>("artigos");
  const { itens: ficheiros } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const imagens = useMemo(() => ficheiros.filter(eImagem), [ficheiros]);
  const urls = useUrlsDeImagens(imagens);
  const [a, setA] = useState<Artigo>(inicial);
  const [etiquetas, setEtiquetas] = useState(inicial.etiquetas.join(", "));
  const [aba, setAba] = useState<"escrever" | "previsao">("escrever");
  const [imagemNoTexto, setImagemNoTexto] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [saida, setSaida] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const mudar = (p: Partial<Artigo>) => (setA((x) => ({ ...x, ...p })), setSujo(true));
  const slug = a.slug || slugDe(a.titulo);

  const inserir = (antes: string, depois: string, exemplo: string) => {
    const t = area.current;
    const ini = t?.selectionStart ?? a.conteudo.length;
    const fim = t?.selectionEnd ?? a.conteudo.length;
    const escolhido = a.conteudo.slice(ini, fim) || exemplo;
    const novo = `${a.conteudo.slice(0, ini)}${antes}${escolhido}${depois}${a.conteudo.slice(fim)}`;
    mudar({ conteudo: novo });
    requestAnimationFrame(() => {
      t?.focus();
      t?.setSelectionRange(ini + antes.length, ini + antes.length + escolhido.length);
    });
  };
  const gravar = async (estado: Artigo["estado"]) => {
    const agora = new Date().toISOString();
    await guardar({ ...a, slug, etiquetas: lerEtiquetas(etiquetas), estado, atualizado: agora, publicado: estado === "publicado" ? (a.publicado ?? agora) : a.publicado });
    setSujo(false);
    setA((x) => ({ ...x, slug, estado, atualizado: agora }));
  };
  const podeGuardar = a.titulo.trim().length > 0;

  return (
    <Pagina largo>
      <Titulo titulo={a.titulo.trim() || "Artigo novo"}>
        <Button variant="ghost" icon={ICONES.anterior} onClick={() => (sujo ? setSaida(true) : aoSair())}>
          Artigos
        </Button>
        <Button variant="secondary" disabled={!podeGuardar || !sujo} onClick={() => gravar(a.estado)}>
          Guardar
        </Button>
        {a.estado === "publicado" ? (
          <Button variant="secondary" disabled={!podeGuardar} onClick={() => gravar("rascunho")}>
            Passar a rascunho
          </Button>
        ) : (
          <Button variant="primary" disabled={!podeGuardar} onClick={() => gravar("publicado")}>
            Publicar
          </Button>
        )}
      </Titulo>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Cartao titulo="Artigo">
            <div className="flex flex-col gap-4 p-4">
              <Input label="Título" value={a.titulo} onChange={(e) => mudar({ titulo: e.target.value })} placeholder="O título do artigo" />
              <InputArea label="Resumo" value={a.resumo} onValueChange={(v) => mudar({ resumo: v })} minRows={2} autoResize placeholder="Duas frases que aparecem na lista e nas partilhas" />
            </div>
          </Cartao>
          <Cartao titulo="Texto" acoes={<Separadores itens={[{ id: "escrever", rotulo: "Escrever" }, { id: "previsao", rotulo: "Pré-visualizar" }]} valor={aba} aoMudar={(id) => setAba(id as "escrever" | "previsao")} />}>
            {aba === "escrever" ? (
              <div className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Formatação">
                  {FERRAMENTAS.map((f) => (
                    <Button key={f.id} variant="ghost" size="sm" shape="square" icon={<Ic nome={f.icone} />} aria-label={f.rotulo} title={f.rotulo} onClick={() => inserir(f.antes, f.depois, f.exemplo)} />
                  ))}
                  <Button variant="ghost" size="sm" icon={<Ic nome="imagem" />} onClick={() => setImagemNoTexto(true)}>
                    Imagem
                  </Button>
                </div>
                <InputArea ref={area} aria-label="Texto do artigo" value={a.conteudo} onValueChange={(v) => mudar({ conteudo: v })} minRows={16} autoResize placeholder="Escreva em Markdown: ## título, **negrito**, *itálico*, - lista, [texto](https://ligação)…" />
                <span className="text-xs text-kumo-subtle">
                  {a.conteudo.trim().split(/\s+/).filter(Boolean).length} palavras · {tempoDeLeitura(a.conteudo)} min de leitura
                </span>
              </div>
            ) : (
              <div className="min-h-64 p-4">{a.conteudo.trim() ? <Markdown texto={a.conteudo} urlDe={(id) => urls.get(id)} /> : <span className="text-sm text-kumo-subtle">Ainda não há texto.</span>}</div>
            )}
          </Cartao>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Cartao titulo="Publicação">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-kumo-subtle">Estado</span>
                <Badge variant={a.estado === "publicado" ? "success" : "warning"}>{a.estado === "publicado" ? "Publicado" : "Rascunho"}</Badge>
              </div>
              <Input label="Endereço" description={`/blog/${slug || "…"}`} value={a.slug} placeholder={slugDe(a.titulo)} onChange={(e) => mudar({ slug: slugDe(e.target.value) })} />
              <Input label="Etiquetas" description="Separe por vírgulas." value={etiquetas} onChange={(e) => (setEtiquetas(e.target.value), setSujo(true))} placeholder="notícias, transportes" />
            </div>
          </Cartao>
          <Cartao titulo="Imagem de capa">
            <BlocoDeImagem local="blog-capa" ids={a.capa ? [a.capa] : []} aoMudar={(ids) => mudar({ capa: ids[0] })} vazio="Sem capa" />
          </Cartao>
        </div>
      </div>
      <EscolherImagem
        aberto={imagemNoTexto}
        aoMudar={setImagemNoTexto}
        local="blog-corpo"
        aoEscolher={(ids) => {
          const i = imagens.find((x) => x.id === ids[0]);
          if (i) inserir("![", `](biblioteca:${i.id})`, i.alt ?? i.nome);
        }}
      />
      <Confirmar aberto={saida} aoMudar={setSaida} titulo="Sair sem guardar?" texto="As alterações a este artigo ainda não foram guardadas." rotuloAcao="Sair sem guardar" perigo aoConfirmar={aoSair} />
    </Pagina>
  );
}

export function Blog() {
  const { itens, pronto, guardar, remover } = useArmazem<Artigo>("artigos");
  const [aEditar, setAEditar] = useState<Artigo | null>(null);
  const [apagar, setApagar] = useState<Artigo | null>(null);
  const ordenados = useMemo(() => [...itens].sort((a, b) => b.atualizado.localeCompare(a.atualizado)), [itens]);
  if (aEditar) return <Editor key={aEditar.id} inicial={aEditar} aoSair={() => setAEditar(null)} />;
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
