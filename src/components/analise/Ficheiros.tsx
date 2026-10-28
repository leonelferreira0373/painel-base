// Entrada de dados: arrastar, escolher, colar ou importar por endereço; lista do que foi extraído e a grelha com os dados reais.
"use client";

import { Button, Empty, Input, LayerCard } from "@cloudflare/kumo";
import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "@/dados/textos";
import { useApp } from "@/lib/estado";
import { DICA_FICHEIROS } from "@/dados/dicas";
import { CorpoDica, Dica } from "../Dica";
import { GrelhaDados } from "../Grelhas";
import { Ic, ICONES } from "../Icones";
import { Pagina, Titulo } from "../ui";
import { AbasAnalise, tamanhoLegivel } from "./Comum";

async function lerEntrada(entrada: FileSystemEntry, saida: File[]): Promise<void> {
  if (entrada.isFile) {
    saida.push(await new Promise<File>((res, rej) => (entrada as FileSystemFileEntry).file(res, rej)));
  } else if (entrada.isDirectory) {
    const leitor = (entrada as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const lote = await new Promise<FileSystemEntry[]>((res, rej) => leitor.readEntries(res, rej));
      if (lote.length === 0) break;
      for (const e of lote) await lerEntrada(e, saida);
    }
  }
}

/** Ficheiros largados, incluindo pastas inteiras. */
async function ficheirosDoDrop(dt: DataTransfer): Promise<File[]> {
  const itens = Array.from(dt.items ?? []);
  const entradas = itens.map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
  if (entradas.length === 0) return Array.from(dt.files);
  const saida: File[] = [];
  for (const e of entradas) await lerEntrada(e, saida);
  return saida;
}

/**
 * Entrada global: largar ou colar ficheiros funciona em qualquer ecrã a que a função tenha acesso.
 * Quem não está na análise é levado para lá, onde o resultado aparece.
 */
export function useEntradaGlobal(aceita: boolean, aoReceber: () => void) {
  const { adicionar, adicionarTexto } = useApp();
  useEffect(() => {
    const ficheiro = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const sobre = (e: DragEvent) => {
      if (ficheiro(e)) e.preventDefault();
    };
    const larga = async (e: DragEvent) => {
      if (!ficheiro(e)) return;
      e.preventDefault();
      if (!aceita || !e.dataTransfer) return;
      const fs = await ficheirosDoDrop(e.dataTransfer);
      if (fs.length > 0) {
        aoReceber();
        await adicionar(fs);
      }
    };
    const cola = (e: ClipboardEvent) => {
      if (!aceita) return;
      const fs = Array.from(e.clipboardData?.files ?? []);
      if (fs.length > 0) {
        e.preventDefault();
        aoReceber();
        void adicionar(fs);
        return;
      }
      const texto = e.clipboardData?.getData("text") ?? "";
      if (texto.trim() !== "" && !(e.target as HTMLElement | null)?.closest("input, textarea, select")) {
        e.preventDefault();
        aoReceber();
        void adicionarTexto("colado.txt", texto);
      }
    };
    document.addEventListener("dragover", sobre);
    document.addEventListener("drop", larga);
    document.addEventListener("paste", cola);
    return () => {
      document.removeEventListener("dragover", sobre);
      document.removeEventListener("drop", larga);
      document.removeEventListener("paste", cola);
    };
  }, [aceita, aoReceber, adicionar, adicionarTexto]);
}

function Envio({ grande }: { grande: boolean }) {
  const { adicionar, adicionarUrl, progresso } = useApp();
  const [sobre, setSobre] = useState(false);
  const [url, setUrl] = useState("");
  const entrada = useRef<HTMLInputElement>(null);
  const niveis = useRef(0);

  // Só o realce visual: a leitura dos ficheiros largados é feita pela entrada global.
  useEffect(() => {
    const entra = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      niveis.current++;
      setSobre(true);
    };
    const sai = () => {
      niveis.current = Math.max(0, niveis.current - 1);
      if (niveis.current === 0) setSobre(false);
    };
    const larga = () => {
      niveis.current = 0;
      setSobre(false);
    };
    document.addEventListener("dragenter", entra);
    document.addEventListener("dragleave", sai);
    document.addEventListener("drop", larga);
    return () => {
      document.removeEventListener("dragenter", entra);
      document.removeEventListener("dragleave", sai);
      document.removeEventListener("drop", larga);
    };
  }, []);

  return (
    <div className={`pleno rounded-xl border border-dashed transition-colors ${sobre ? "border-kumo-brand bg-kumo-info-tint" : "border-kumo-line bg-kumo-base"}`}>
      {progresso ? (
        <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-kumo-subtle" role="status">
          <i className="size-4 animate-spin rounded-full border-2 border-kumo-fill border-t-kumo-brand" />
          {progresso}
        </div>
      ) : (
        <Empty
          size={grande ? "lg" : "sm"}
          icon={<Ic nome="enviar" tamanho={grande ? 40 : 28} />}
          title={sobre ? T.analise.ficheiros.sobre : T.analise.ficheiros.arraste}
          description={grande ? T.analise.ficheiros.colar : undefined}
          contents={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <input ref={entrada} type="file" multiple hidden onChange={(e) => e.target.files && adicionar(Array.from(e.target.files)).then(() => (e.target.value = ""))} />
              <Dica conteudo={DICA_FICHEIROS.escolher}><Button variant="primary" icon={ICONES.ficheiro} onClick={() => entrada.current?.click()}>
                {T.geral.escolher}
              </Button></Dica>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (url.trim()) {
                    void adicionarUrl(url.trim());
                    setUrl("");
                  }
                }}
              >
                <Dica linha conteudo={DICA_FICHEIROS.endereco}><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={T.analise.ficheiros.urlPlaceholder} aria-label={T.analise.ficheiros.urlPlaceholder} inputMode="url" className="w-full sm:w-72" /></Dica>
                <Dica conteudo={DICA_FICHEIROS.importar}><Button type="submit" variant="secondary" shape="square" icon={ICONES.seta} aria-label={T.analise.ficheiros.importar} disabled={!url.trim()} /></Dica>
              </form>
            </div>
          }
        />
      )}
    </div>
  );
}

export function Ficheiros() {
  const { ficheiros, tabelaAtiva, escolherTabela, removerFicheiro, limparAnalise, perfil } = useApp();
  const [textoDe, setTextoDe] = useState<string | null>(null);
  const tipos = useMemo(() => perfil?.colunas.map((c) => c.tipo) ?? [], [perfil]);
  const ficheiroTexto = ficheiros.find((f) => f.id === textoDe);

  return (
    <Pagina>
      <AbasAnalise />
      <Titulo titulo={T.analise.ficheiros.titulo}>
        {ficheiros.length > 0 && (
          <Dica conteudo={DICA_FICHEIROS.limpar}><Button variant="secondary" icon={ICONES.lixo} onClick={limparAnalise}>
            {T.analise.ficheiros.limpar}
          </Button></Dica>
        )}
      </Titulo>
      <Envio grande={ficheiros.length === 0} />
      {ficheiros.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <LayerCard className="pleno p-0">
            <LayerCard.Secondary className="text-sm font-medium">{T.analise.ficheiros.tabelas}</LayerCard.Secondary>
            <LayerCard.Primary className="sem-barra flex max-h-[560px] flex-col gap-3 overflow-y-auto p-3">
              {ficheiros.map((f) => (
                <div key={f.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Ic nome="ficheiro" tamanho={16} className="shrink-0 text-kumo-subtle" />
                    <b className="min-w-0 flex-1 truncate text-sm font-medium" title={f.dentroDe ? `${f.dentroDe} › ${f.nome}` : f.nome}>
                      {f.nome}
                    </b>
                    <Dica conteudo={DICA_FICHEIROS.remover}><Button variant="ghost" shape="square" size="xs" icon={ICONES.fechar} aria-label={`${T.geral.remover} ${f.nome}`} onClick={() => removerFicheiro(f.id)} /></Dica>
                  </div>
                  <div className="pl-6 text-xs text-kumo-subtle">
                    {f.formato} · {tamanhoLegivel(f.tamanho)} · {f.duracaoMs} ms
                  </div>
                  {f.avisos.map((a) => (
                    <div key={a} className="pl-6 text-xs text-kumo-warning">
                      {a}
                    </div>
                  ))}
                  {f.tabelas.map((t) => {
                    const ativa = tabelaAtiva?.id === t.id && !textoDe;
                    return (
<Dica key={t.id} linha lado="right" conteudo={<CorpoDica titulo={t.nome} linhas={[{ rotulo: "Origem", valor: t.origem }, { rotulo: "Tamanho", valor: `${t.linhas.length.toLocaleString("pt-PT")} linhas × ${t.colunas.length} colunas` }, ...(t.confianca !== undefined ? [{ rotulo: "Confiança da leitura", valor: `${Math.round(t.confianca * 100)} %` }] : [])]} />}>                      <button
                        key={t.id}
                        aria-current={ativa}
                        onClick={() => {
                          setTextoDe(null);
                          escolherTabela(t.id);
                        }}
                        className={`ml-4 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${ativa ? "bg-kumo-tint font-medium text-kumo-default" : "text-kumo-subtle hover:bg-kumo-tint"}`}
                      >
                        <Ic nome="tabela" tamanho={14} />
                        <span className="min-w-0 flex-1 truncate">{t.nome}</span>
                        <span className="text-xs tabular-nums">
                          {t.linhas.length.toLocaleString("pt-PT")} × {t.colunas.length}
                        </span>
                      </button></Dica>
                    );
                  })}
                  {f.texto !== "" && (
                    <Dica linha lado="right" conteudo={DICA_FICHEIROS.texto}><button onClick={() => setTextoDe(f.id)} aria-current={textoDe === f.id} className={`ml-4 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${textoDe === f.id ? "bg-kumo-tint font-medium text-kumo-default" : "text-kumo-subtle hover:bg-kumo-tint"}`}>
                      <Ic nome="ficheiro" tamanho={14} />
                      {T.analise.ficheiros.texto}
                    </button></Dica>
                  )}
                  {f.tabelas.length === 0 && f.texto === "" && <div className="pl-6 text-xs text-kumo-subtle">{T.analise.ficheiros.semTabelas}</div>}
                </div>
              ))}
            </LayerCard.Primary>
          </LayerCard>
          <div className="flex min-w-0 flex-col gap-3">
            {ficheiroTexto ? (
              <>
                <h2 className="text-base font-semibold">{ficheiroTexto.nome}</h2>
                <LayerCard className="p-0">
                  <pre className="sem-barra m-0 max-h-[520px] overflow-auto whitespace-pre-wrap p-4 font-sans text-sm">{ficheiroTexto.texto}</pre>
                </LayerCard>
              </>
            ) : tabelaAtiva ? (
              <>
                <div>
                  <h2 className="text-base font-semibold">{tabelaAtiva.nome}</h2>
                  <span className="text-sm text-kumo-subtle">
                    {tabelaAtiva.origem}
                    {tabelaAtiva.confianca !== undefined && ` · ${T.analise.ficheiros.confianca}: ${Math.round(tabelaAtiva.confianca * 100)} %`}
                  </span>
                </div>
                <GrelhaDados colunas={tabelaAtiva.colunas} linhas={tabelaAtiva.linhas} tipos={tipos} />
              </>
            ) : null}
          </div>
        </div>
      )}
    </Pagina>
  );
}
