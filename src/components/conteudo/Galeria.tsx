// A galeria de imagens do painel: carregar várias imagens de uma vez (também a arrastar), ver em grelha, abrir uma a grande com setas, escrever o texto alternativo, transferir e remover (uma ou várias). Usa a mesma biblioteca do gestor de ficheiros: as imagens que se carregam aqui aparecem lá, na pasta «Galeria».
"use client";

import { Button, Checkbox, Dialog, Input, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { eImagem, formatarTamanho, nomeUnico, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useArmazem } from "@/lib/armazem";
import { identificador } from "@/lib/conta";
import { Confirmar } from "../conta/Pecas";
import { Ic, ICONES } from "../Icones";
import { Pagina, Titulo } from "../ui";
import { useUrlsDeImagens, Vazio, ZonaDeUpload } from "./ConteudoPecas";
import { descarregarBlob } from "./GestorDeFicheiros";

export const PASTA_DA_GALERIA = "Galeria";
const TODAS = "__todas__";

export function Galeria() {
  const { itens, pronto, guardar, remover } = useArmazem<ItemDaBiblioteca>("ficheiros");
  const imagens = useMemo(() => itens.filter(eImagem).sort((a, b) => b.criado.localeCompare(a.criado)), [itens]);
  const [album, setAlbum] = useState(TODAS);
  const albuns = useMemo(() => Array.from(new Set(imagens.map((i) => i.pasta))).sort((a, b) => a.localeCompare(b, "pt")), [imagens]);
  const visiveis = album === TODAS ? imagens : imagens.filter((i) => i.pasta === album);
  const urls = useUrlsDeImagens(imagens);
  const [escolhidas, setEscolhidas] = useState<Set<string>>(new Set());
  const [aberta, setAberta] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [apagar, setApagar] = useState<string[] | null>(null);
  const atual = aberta ? visiveis.find((i) => i.id === aberta) : undefined;
  const posicao = atual ? visiveis.indexOf(atual) : -1;

  useEffect(() => setAlt(atual?.alt ?? ""), [atual?.id, atual?.alt]);
  useEffect(() => {
    if (!atual) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && posicao < visiveis.length - 1) setAberta(visiveis[posicao + 1].id);
      if (e.key === "ArrowLeft" && posicao > 0) setAberta(visiveis[posicao - 1].id);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [atual, posicao, visiveis]);

  const carregar = async (ficheiros: File[]) => {
    const atuais = [...itens];
    for (const f of ficheiros.filter((x) => x.type.startsWith("image/"))) {
      const pasta = album !== TODAS ? album : PASTA_DA_GALERIA;
      const item: ItemDaBiblioteca = { id: identificador(), nome: nomeUnico(atuais, pasta, f.name), tipo: f.type, tamanho: f.size, criado: new Date().toISOString(), pasta, blob: f };
      atuais.push(item);
      await guardar(item);
    }
  };
  const alternar = (id: string) => setEscolhidas((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));
  const removerEscolhidas = async () => {
    for (const id of apagar ?? []) await remover(id);
    setEscolhidas(new Set());
    setAberta(null);
  };

  return (
    <Pagina>
      <Titulo titulo="Galeria de imagens">
        {escolhidas.size > 0 && (
          <Button variant="secondary" icon={ICONES.lixo} onClick={() => setApagar([...escolhidas])}>
            Remover {escolhidas.size}
          </Button>
        )}
        <ZonaDeUpload aceitar="image/*" aoEscolher={carregar} className="contents">
          {(abrir) => (
            <Button variant="primary" icon={ICONES.enviar} onClick={abrir}>
              Carregar imagens
            </Button>
          )}
        </ZonaDeUpload>
      </Titulo>
      {albuns.length > 1 && (
        <div className="max-w-xs">
          <Select label="Álbum" value={album} onValueChange={(v) => setAlbum(String(v))} items={{ [TODAS]: "Todas as imagens", ...Object.fromEntries(albuns.map((a) => [a, a || "Raiz"])) }} />
        </div>
      )}
      <ZonaDeUpload aceitar="image/*" aoEscolher={carregar} className="min-w-0">
        {(abrir) =>
          !pronto ? (
            <div className="p-6 text-sm text-kumo-subtle">A abrir a galeria…</div>
          ) : visiveis.length === 0 ? (
            <Vazio
              icone="galeria"
              titulo="Ainda não há imagens"
              texto="Largue imagens aqui ou use «Carregar imagens». Ficam guardadas neste navegador."
              acao={
                <Button variant="secondary" icon={ICONES.enviar} onClick={abrir}>
                  Escolher imagens
                </Button>
              }
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {visiveis.map((i) => (
                <li key={i.id} className="group/imagem relative aspect-square overflow-hidden rounded-xl bg-kumo-tint ring ring-kumo-line">
                  <button type="button" onClick={() => setAberta(i.id)} aria-label={`Abrir ${i.nome}`} className="absolute inset-0">
                    {urls.get(i.id) && <img src={urls.get(i.id)} alt={i.alt ?? i.nome} className="size-full object-cover transition-transform duration-200 group-hover/imagem:scale-105" loading="lazy" />}
                  </button>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-kumo-base/90 px-2 py-1 text-xs text-kumo-default opacity-0 transition-opacity group-hover/imagem:opacity-100 max-sm:opacity-100">{i.nome}</span>
                  <span className={`absolute left-2 top-2 rounded-md bg-kumo-base/90 p-1 transition-opacity ${escolhidas.has(i.id) ? "opacity-100" : "opacity-0 group-hover/imagem:opacity-100 max-sm:opacity-100"}`}>
                    <Checkbox checked={escolhidas.has(i.id)} onCheckedChange={() => alternar(i.id)} aria-label={`Escolher ${i.nome}`} />
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      </ZonaDeUpload>

      <Dialog.Root open={!!atual} onOpenChange={(v) => !v && setAberta(null)}>
        <Dialog size="lg" className="p-6">
          {atual && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <Dialog.Title className="min-w-0 truncate text-lg font-semibold">{atual.nome}</Dialog.Title>
                <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
              </div>
              <div className="relative">
                {urls.get(atual.id) && <img src={urls.get(atual.id)} alt={atual.alt ?? atual.nome} className="max-h-[55vh] w-full rounded-lg object-contain" />}
                {posicao > 0 && (
                  <Button variant="secondary" shape="square" icon={ICONES.anterior} aria-label="Imagem anterior" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setAberta(visiveis[posicao - 1].id)} />
                )}
                {posicao < visiveis.length - 1 && (
                  <Button variant="secondary" shape="square" icon={ICONES.seta} aria-label="Imagem seguinte" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setAberta(visiveis[posicao + 1].id)} />
                )}
              </div>
              <Input label="Texto alternativo" description="Descreve a imagem para quem não a vê (leitores de ecrã) e para o blog." value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={() => alt !== (atual.alt ?? "") && guardar({ ...atual, alt })} />
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-kumo-subtle">
                <span>
                  {formatarTamanho(atual.tamanho)} · {posicao + 1} de {visiveis.length}
                </span>
                <span className="flex gap-2">
                  <Button variant="secondary" icon={ICONES.transferir} onClick={() => atual.blob && descarregarBlob(atual.nome, atual.blob)}>
                    Transferir
                  </Button>
                  <Button variant="secondary" icon={ICONES.lixo} onClick={() => setApagar([atual.id])}>
                    Remover
                  </Button>
                </span>
              </div>
            </div>
          )}
        </Dialog>
      </Dialog.Root>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover imagens" texto={`${apagar?.length ?? 0} ${apagar?.length === 1 ? "imagem vai ser removida" : "imagens vão ser removidas"} da biblioteca. Não se pode desfazer.`} rotuloAcao="Remover" perigo aoConfirmar={removerEscolhidas} />
      <p className="flex items-center gap-1.5 text-xs text-kumo-subtle">
        <Ic nome="info" tamanho={13} />
        As imagens ficam guardadas neste navegador e também aparecem no gestor de ficheiros.
      </p>
    </Pagina>
  );
}
