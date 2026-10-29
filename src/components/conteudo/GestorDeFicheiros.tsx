// O gestor de ficheiros do painel: pastas e ficheiros guardados no navegador, com carregar (também a arrastar), pesquisar, pré-visualizar, transferir, renomear, mover e remover. A biblioteca é a mesma da galeria e do blog.
"use client";

import { Button, Dialog, DropdownMenu, Input, LayerCard, Select, Tooltip } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { acompanharPasta, caminhoDe, daPasta, ePasta, eImagem, formatarTamanho, migalhas, nomeUnico, nomeValido, TIPO_PASTA, todasAsPastas, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { identificador } from "@/lib/conta";
import { Confirmar } from "../conta/Pecas";
import { MenuCartao, SeparadorDeMenu } from "../Flutuantes";
import { Ic, ICONES, type Icone } from "../Icones";
import { Pagina, Titulo } from "../ui";
import { Vazio, ZonaDeUpload } from "./ConteudoPecas";

export const iconeDe = (i: ItemDaBiblioteca): Icone => (ePasta(i) ? "pasta" : eImagem(i) ? "imagem" : i.tipo === "application/pdf" ? "pdf" : /sheet|excel|csv/.test(i.tipo) ? "tabela" : "ficheiro");

/** A chave da raiz nos seletores (um valor vazio não se escolhe). */
const RAIZ = "__raiz__";

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

export function descarregarBlob(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A janela de pré-visualização: imagem, PDF ou texto; para o resto, só a transferência. */
export function PreVisualizar({ item, aoFechar }: { item: ItemDaBiblioteca | null; aoFechar: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [texto, setTexto] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    setTexto(null);
    if (!item?.blob) return;
    const u = URL.createObjectURL(item.blob);
    setUrl(u);
    if (item.tipo.startsWith("text/") || /json|csv|xml/.test(item.tipo)) item.blob.text().then((t) => setTexto(t.slice(0, 20000)));
    return () => URL.revokeObjectURL(u);
  }, [item]);
  return (
    <Dialog.Root open={!!item} onOpenChange={(v) => !v && aoFechar()}>
      <Dialog size="lg" className="p-6">
        {item && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="min-w-0 truncate text-lg font-semibold">{item.nome}</Dialog.Title>
              <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
            </div>
            {eImagem(item) && url && (
              <div className="h-[min(55dvh,26rem)] overflow-hidden rounded-lg bg-kumo-tint">
                <img src={url} alt={item.alt ?? item.nome} className="size-full object-contain" />
              </div>
            )}
            {item.tipo === "application/pdf" && url && <iframe src={url} title={item.nome} className="h-[60vh] w-full rounded-lg ring ring-kumo-line" />}
            {texto !== null && <pre className="max-h-[60vh] overflow-auto rounded-lg bg-kumo-tint p-3 text-xs">{texto}</pre>}
            {!eImagem(item) && item.tipo !== "application/pdf" && texto === null && <Vazio icone={iconeDe(item)} titulo="Sem pré-visualização" texto="Este tipo de ficheiro abre-se na aplicação certa depois de transferido." />}
            <div className="flex items-center justify-between gap-3 text-sm text-kumo-subtle">
              <span>
                {formatarTamanho(item.tamanho)} · {data(item.criado)}
              </span>
              <Button variant="secondary" icon={ICONES.transferir} onClick={() => item.blob && descarregarBlob(item.nome, item.blob)}>
                Transferir
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Dialog.Root>
  );
}

export function GestorDeFicheiros() {
  const { itens, pronto, guardar, remover } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const [pasta, setPasta] = useState("");
  const [procura, setProcura] = useState("");
  const [ver, setVer] = useState<ItemDaBiblioteca | null>(null);
  const [novaPasta, setNovaPasta] = useState(false);
  const [nome, setNome] = useState("");
  const [renomear, setRenomear] = useState<ItemDaBiblioteca | null>(null);
  const [mover, setMover] = useState<ItemDaBiblioteca | null>(null);
  const [destino, setDestino] = useState("");
  const [apagar, setApagar] = useState<ItemDaBiblioteca | null>(null);

  const lista = useMemo(() => (procura.trim() ? itens.filter((i) => i.nome.toLowerCase().includes(procura.trim().toLowerCase())).sort((a, b) => a.nome.localeCompare(b.nome, "pt")) : daPasta(itens, pasta)), [itens, pasta, procura]);
  const usado = itens.reduce((s, i) => s + (ePasta(i) ? 0 : i.tamanho), 0);
  const nomeErro = (atual: string, ignorar?: string) => (!nomeValido(atual) ? "Escreva um nome sem barras nem dois pontos." : itens.some((i) => i.pasta === (renomear?.pasta ?? pasta) && i.id !== ignorar && i.nome.toLowerCase() === atual.trim().toLowerCase()) ? "Já existe um item com este nome nesta pasta." : null);

  const carregar = async (ficheiros: File[]) => {
    const atuais = [...itens];
    for (const f of ficheiros) {
      const item: ItemDaBiblioteca = { id: identificador(), nome: nomeUnico(atuais, pasta, f.name), tipo: f.type || "application/octet-stream", tamanho: f.size, criado: new Date().toISOString(), pasta, blob: f };
      atuais.push(item);
      await guardar(item);
    }
  };
  const criarPasta = () => guardar({ id: identificador(), nome: nome.trim(), tipo: TIPO_PASTA, tamanho: 0, criado: new Date().toISOString(), pasta });
  const aplicarNome = async () => {
    if (!renomear) return;
    const novo = nome.trim();
    if (ePasta(renomear)) {
      const antigo = caminhoDe(renomear);
      const novoCaminho = renomear.pasta ? `${renomear.pasta}/${novo}` : novo;
      for (const i of acompanharPasta(itens, antigo, novoCaminho)) await guardar(i);
    }
    await guardar({ ...renomear, nome: novo });
  };
  const aplicarMover = async () => {
    if (!mover) return;
    if (ePasta(mover)) {
      const antigo = caminhoDe(mover);
      const novoCaminho = destino ? `${destino}/${mover.nome}` : mover.nome;
      for (const i of acompanharPasta(itens, antigo, novoCaminho)) await guardar(i);
    }
    await guardar({ ...mover, pasta: destino, nome: nomeUnico(itens, destino, mover.nome, mover.id) });
  };
  const aplicarRemover = async () => {
    if (!apagar) return;
    const caminho = caminhoDe(apagar);
    const dentro = ePasta(apagar) ? itens.filter((i) => i.pasta === caminho || i.pasta.startsWith(`${caminho}/`)) : [];
    for (const i of [...dentro, apagar]) await remover(i.id);
  };
  const abrir = (i: ItemDaBiblioteca) => (ePasta(i) ? (setPasta(caminhoDe(i)), setProcura("")) : setVer(i));
  const destinosPossiveis = mover ? todasAsPastas(itens).filter((p) => !ePasta(mover) || (p !== caminhoDe(mover) && !p.startsWith(`${caminhoDe(mover)}/`))) : [];

  return (
    <Pagina>
      <Titulo titulo="Gestor de ficheiros">
        <Button variant="secondary" icon={ICONES.mais} onClick={() => (setNome(""), setNovaPasta(true))}>
          Nova pasta
        </Button>
        <ZonaDeUpload aoEscolher={carregar} className="contents">
          {(abrirSeletor) => (
            <Button variant="primary" icon={ICONES.enviar} onClick={abrirSeletor}>
              Carregar ficheiros
            </Button>
          )}
        </ZonaDeUpload>
      </Titulo>
      <ZonaDeUpload aoEscolher={carregar} className="min-w-0">
        {() => (
          <LayerCard className="pleno min-w-0">
            <LayerCard.Secondary className="flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Pasta atual" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
                <button type="button" onClick={() => (setPasta(""), setProcura(""))} className={`rounded-md px-1.5 py-0.5 hover:bg-kumo-tint ${pasta === "" ? "font-semibold text-kumo-default" : ""}`}>
                  Ficheiros
                </button>
                {migalhas(pasta).map((m) => (
                  <span key={m.caminho} className="inline-flex items-center gap-1">
                    <Ic nome="seta" tamanho={12} />
                    <button type="button" onClick={() => setPasta(m.caminho)} className={`rounded-md px-1.5 py-0.5 hover:bg-kumo-tint ${m.caminho === pasta ? "font-semibold text-kumo-default" : ""}`}>
                      {m.nome}
                    </button>
                  </span>
                ))}
              </nav>
              <div className="relative w-full sm:w-64">
                <Ic nome="lupa" tamanho={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-kumo-subtle" />
                <Input aria-label="Pesquisar ficheiros" placeholder="Pesquisar em todas as pastas" value={procura} onChange={(e) => setProcura(e.target.value)} className="w-full pl-9" />
              </div>
            </LayerCard.Secondary>
            <LayerCard.Primary className="p-0">
              {!pronto ? (
                <div className="p-6 text-sm text-kumo-subtle">A abrir a biblioteca…</div>
              ) : lista.length === 0 ? (
                <Vazio icone="pasta" titulo={procura.trim() ? "Nada encontrado" : "Esta pasta está vazia"} texto={procura.trim() ? "Tente outro nome." : "Largue ficheiros aqui ou use «Carregar ficheiros»."} />
              ) : (
                <ul className="divide-y divide-kumo-hairline">
                  {lista.map((i) => (
                    <li key={i.id} className="group/linha flex items-center gap-3 px-4 py-2.5 hover:bg-kumo-tint/60">
                      <button type="button" onClick={() => abrir(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-kumo-tint text-kumo-default">
                          <Ic nome={iconeDe(i)} tamanho={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-kumo-default">{i.nome}</span>
                          <span className="block truncate text-xs text-kumo-subtle">
                            {ePasta(i) ? "Pasta" : formatarTamanho(i.tamanho)} · {data(i.criado)}
                            {procura.trim() && i.pasta ? ` · ${i.pasta}` : ""}
                          </span>
                        </span>
                      </button>
                      <DropdownMenu>
                        <Tooltip content="Opções" render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="sm" icon={ICONES.mais3} aria-label={`Opções de ${i.nome}`} />} />} />
                        <MenuCartao>
                          <DropdownMenu.Item icon={<Ic nome="olho" />} onClick={() => abrir(i)}>
                            {ePasta(i) ? "Abrir" : "Pré-visualizar"}
                          </DropdownMenu.Item>
                          {!ePasta(i) && (
                            <DropdownMenu.Item icon={<Ic nome="transferir" />} onClick={() => i.blob && descarregarBlob(i.nome, i.blob)}>
                              Transferir
                            </DropdownMenu.Item>
                          )}
                          <DropdownMenu.Item icon={<Ic nome="engrenagem" />} onClick={() => (setNome(i.nome), setRenomear(i))}>
                            Renomear
                          </DropdownMenu.Item>
                          <DropdownMenu.Item icon={<Ic nome="pasta" />} onClick={() => (setDestino(i.pasta), setMover(i))}>
                            Mover para…
                          </DropdownMenu.Item>
                          <SeparadorDeMenu />
                          <DropdownMenu.Item icon={<Ic nome="lixo" />} variant="danger" onClick={() => setApagar(i)}>
                            Remover
                          </DropdownMenu.Item>
                        </MenuCartao>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              )}
            </LayerCard.Primary>
          </LayerCard>
        )}
      </ZonaDeUpload>
      <p className="text-xs text-kumo-subtle">
        {itens.filter((i) => !ePasta(i)).length} ficheiros · {formatarTamanho(usado)} guardados neste navegador. Nada sai do seu aparelho.
      </p>

      <PreVisualizar item={ver} aoFechar={() => setVer(null)} />
      <Confirmar aberto={novaPasta} aoMudar={setNovaPasta} titulo="Nova pasta" texto={pasta ? `Cria uma pasta dentro de «${pasta}».` : "Cria uma pasta na raiz."} rotuloAcao="Criar" aoConfirmar={criarPasta} desativado={!!nomeErro(nome)}>
        <Input label="Nome da pasta" value={nome} onChange={(e) => setNome(e.target.value)} error={nome.trim() ? (nomeErro(nome) ?? undefined) : undefined} autoFocus />
      </Confirmar>
      <Confirmar aberto={!!renomear} aoMudar={(v) => !v && setRenomear(null)} titulo="Renomear" texto={renomear ? `«${renomear.nome}»` : ""} rotuloAcao="Renomear" aoConfirmar={aplicarNome} desativado={!!nomeErro(nome, renomear?.id)}>
        <Input label="Novo nome" value={nome} onChange={(e) => setNome(e.target.value)} error={nome.trim() ? (nomeErro(nome, renomear?.id) ?? undefined) : undefined} autoFocus />
      </Confirmar>
      <Confirmar aberto={!!mover} aoMudar={(v) => !v && setMover(null)} titulo="Mover para" texto={mover ? `«${mover.nome}»` : ""} rotuloAcao="Mover" aoConfirmar={aplicarMover}>
        <Select label="Pasta de destino" value={destino || RAIZ} onValueChange={(v) => setDestino(String(v) === RAIZ ? "" : String(v))} items={Object.fromEntries(destinosPossiveis.map((p) => [p || RAIZ, p || "Ficheiros (raiz)"]))} />
      </Confirmar>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover" texto={apagar ? (ePasta(apagar) ? `A pasta «${apagar.nome}» e tudo o que tem dentro vão ser removidos. Não se pode desfazer.` : `O ficheiro «${apagar.nome}» vai ser removido. Não se pode desfazer.`) : ""} rotuloAcao="Remover" perigo aoConfirmar={aplicarRemover} />
    </Pagina>
  );
}
