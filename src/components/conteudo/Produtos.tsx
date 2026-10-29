// O editor de produtos do painel: a lista de produtos (rascunho, publicado ou arquivado) e o editor. No telemóvel a zona das imagens fica em cima e os campos por baixo; no PC as imagens ficam à esquerda, fixas, e só os campos da direita rolam. Os produtos ficam no navegador e as imagens são da biblioteca (a galeria).
"use client";

import { Badge, Button, Input, InputArea, Select } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { CATEGORIA_DE_PRODUTO } from "@/dados/personalizados";
import { eImagem, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { identificador } from "@/lib/conta";
import { MOEDAS } from "@/lib/iban";
import { ESTADOS_DE_PRODUTO, erroDoPreco, erroDoProduto, erroDoStock, formatarPreco, lerPreco, lerStock, precoParaTexto, produtoNovo, useProdutos, type EstadoDeProduto, type Produto } from "@/lib/produtos";
import { Cartao, Confirmar, Linha } from "../conta/Pecas";
import { Ic, ICONES } from "../Icones";
import { SeletorPersonalizavel } from "../SeletorPersonalizavel";
import { Pagina, Titulo } from "../ui";
import { BlocoDeImagem } from "./BlocoDeImagem";
import { useUrlsDeImagens, Vazio } from "./ConteudoPecas";

const COR_DO_ESTADO: Record<EstadoDeProduto, "success" | "warning" | "secondary"> = { publicado: "success", rascunho: "warning", arquivado: "secondary" };
const nomeDaCategoria = (c: string) => CATEGORIA_DE_PRODUTO.opcoes[c] ?? c;

function Editor({ inicial, aoGuardar, aoSair }: { inicial: Produto; aoGuardar: (p: Produto) => void; aoSair: () => void }) {
  const [p, setP] = useState<Produto>(inicial);
  const [preco, setPreco] = useState(precoParaTexto(inicial.preco));
  const [stock, setStock] = useState(String(inicial.stock));
  const [sujo, setSujo] = useState(false);
  const [saida, setSaida] = useState(false);
  const mudar = (parcial: Partial<Produto>) => (setP((x) => ({ ...x, ...parcial })), setSujo(true));
  const erro = erroDoProduto(p, preco, stock);

  const gravar = () => {
    if (erro) return;
    const novo: Produto = { ...p, nome: p.nome.trim(), preco: lerPreco(preco) ?? 0, stock: lerStock(stock) ?? 0, atualizado: new Date().toISOString() };
    aoGuardar(novo);
    setP(novo);
    setSujo(false);
  };

  return (
    <Pagina largo>
      <Titulo titulo={p.nome.trim() || "Produto novo"}>
        <Button variant="ghost" icon={ICONES.anterior} onClick={() => (sujo ? setSaida(true) : aoSair())}>
          Produtos
        </Button>
        <Button variant="primary" disabled={!!erro || !sujo} onClick={gravar}>
          Guardar
        </Button>
      </Titulo>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        {/* no PC as imagens ficam fixas à esquerda enquanto os campos rolam; no telemóvel vêm primeiro */}
        <div className="min-w-0 lg:sticky lg:top-4">
          <Cartao titulo="Imagens">
            <BlocoDeImagem local="produtos" varias ids={p.imagens} aoMudar={(ids) => mudar({ imagens: ids })} vazio="Sem imagens" />
          </Cartao>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Cartao titulo="Produto">
            <div className="flex flex-col gap-4 p-4">
              <Input label="Nome" value={p.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="O nome do produto" autoComplete="off" />
              <SeletorPersonalizavel label="Categoria" valor={p.categoria} opcoes={CATEGORIA_DE_PRODUTO.opcoes} personalizado={CATEGORIA_DE_PRODUTO.personalizado} aoMudar={(v) => mudar({ categoria: v })} />
              <InputArea label="Descrição" value={p.descricao} onValueChange={(v) => mudar({ descricao: v })} minRows={5} autoResize placeholder="O que é, para que serve e o que inclui" />
            </div>
          </Cartao>
          <Cartao titulo="Preço e stock">
            <div className="grid gap-4 p-4 sm:grid-cols-3">
              <Input label="Preço" inputMode="decimal" value={preco} onChange={(e) => (setPreco(e.target.value), setSujo(true))} error={preco.trim() ? (erroDoPreco(preco) ?? undefined) : undefined} placeholder="12 500,50" autoComplete="off" />
              <Select label="Moeda" value={p.moeda} onValueChange={(v) => mudar({ moeda: String(v) })} items={MOEDAS} />
              <Input label="Stock" inputMode="numeric" value={stock} onChange={(e) => (setStock(e.target.value), setSujo(true))} error={stock.trim() ? (erroDoStock(stock) ?? undefined) : undefined} placeholder="0" autoComplete="off" />
            </div>
          </Cartao>
          <Cartao titulo="Publicação">
            <div className="flex flex-col gap-4 p-4">
              <Select label="Estado" value={p.estado} onValueChange={(v) => mudar({ estado: String(v) as EstadoDeProduto })} items={ESTADOS_DE_PRODUTO} />
            </div>
          </Cartao>
        </div>
      </div>
      <Confirmar aberto={saida} aoMudar={setSaida} titulo="Sair sem guardar?" texto="As alterações a este produto ainda não foram guardadas." rotuloAcao="Sair sem guardar" perigo aoConfirmar={aoSair} />
    </Pagina>
  );
}

export function Produtos() {
  const { produtos, pronto, guardar, remover } = useProdutos();
  const { itens } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const imagens = useMemo(() => itens.filter(eImagem), [itens]);
  const urls = useUrlsDeImagens(imagens);
  const [aEditar, setAEditar] = useState<Produto | null>(null);
  const [apagar, setApagar] = useState<Produto | null>(null);
  const ordenados = useMemo(() => [...produtos].sort((a, b) => b.atualizado.localeCompare(a.atualizado)), [produtos]);
  if (aEditar) return <Editor key={aEditar.id} inicial={aEditar} aoGuardar={guardar} aoSair={() => setAEditar(null)} />;
  return (
    <Pagina>
      <Titulo titulo="Produtos">
        <Button variant="primary" icon={ICONES.mais} onClick={() => setAEditar(produtoNovo(identificador()))}>
          Novo produto
        </Button>
      </Titulo>
      <Cartao titulo={`Produtos${produtos.length ? ` (${produtos.length})` : ""}`}>
        {!pronto ? (
          <div className="p-6 text-sm text-kumo-subtle">A abrir os produtos…</div>
        ) : ordenados.length === 0 ? (
          <Vazio icone="produto" titulo="Ainda não há produtos" texto="Crie o primeiro: fica como rascunho até o publicar." />
        ) : (
          ordenados.map((x) => {
            const capa = x.imagens.map((id) => urls.get(id)).find(Boolean);
            return (
              <Linha
                key={x.id}
                titulo={
                  <button type="button" onClick={() => setAEditar(x)} className="inline-flex min-w-0 items-center gap-3 text-left font-medium hover:underline">
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-kumo-tint ring ring-kumo-line">{capa ? <img src={capa} alt="" className="size-full object-cover" /> : <Ic nome="produto" tamanho={20} />}</span>
                    <span className="truncate">{x.nome || "Sem nome"}</span>
                    <Badge variant={COR_DO_ESTADO[x.estado]}>{ESTADOS_DE_PRODUTO[x.estado]}</Badge>
                  </button>
                }
                estado={`${nomeDaCategoria(x.categoria)} · ${formatarPreco(x.preco, x.moeda)} · ${x.stock.toLocaleString("pt-PT")} em stock`}
              >
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setAEditar(x)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => guardar({ ...x, estado: x.estado === "publicado" ? "arquivado" : "publicado", atualizado: new Date().toISOString() })}>
                    {x.estado === "publicado" ? "Arquivar" : "Publicar"}
                  </Button>
                  <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Remover ${x.nome || "o produto"}`} onClick={() => setApagar(x)} />
                </div>
              </Linha>
            );
          })
        )}
      </Cartao>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover o produto" texto={apagar ? `«${apagar.nome || "Sem nome"}» vai ser removido. As imagens ficam na galeria.` : ""} rotuloAcao="Remover" perigo aoConfirmar={() => apagar && remover(apagar.id)} />
    </Pagina>
  );
}
