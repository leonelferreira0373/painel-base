// Os ficheiros das notas (qualquer formato: imagens, áudio, vídeo, documentos), guardados no navegador. Numa nota com palavra-passe cada ficheiro guarda-se cifrado com a mesma chave do texto. Um áudio gravado no momento também entra aqui.
"use client";

import { guardar, remover, todos } from "./armazem";
import { cifrarBytes, decifrarBytes, novoIdDeNota, type AnexoDaNota } from "./notas";

export interface RegistoDeAnexo extends AnexoDaNota {
  blob?: Blob;
  cifrado?: { iv: string; dados: ArrayBuffer };
}

/** Guarda um ficheiro (cifrado, se há chave) e devolve o que a nota guarda dele. */
export async function guardarAnexo(ficheiro: Blob, nome: string, chave?: CryptoKey): Promise<AnexoDaNota> {
  const meta: AnexoDaNota = { id: `a${novoIdDeNota()}`, nome: nome.slice(0, 160), tipo: ficheiro.type || "application/octet-stream", tamanho: ficheiro.size };
  const registo: RegistoDeAnexo = chave ? { ...meta, cifrado: await cifrarBytes(chave, await ficheiro.arrayBuffer()) } : { ...meta, blob: ficheiro };
  await guardar<RegistoDeAnexo>("anexos", registo);
  return meta;
}

/** O ficheiro guardado; `null` se não existe ou se a chave não o abre. */
export async function lerAnexo(id: string, chave?: CryptoKey): Promise<Blob | null> {
  const r = (await todos<RegistoDeAnexo>("anexos")).find((x) => x.id === id);
  if (!r) return null;
  if (r.blob) return r.blob;
  if (!r.cifrado || !chave) return null;
  const bytes = await decifrarBytes(chave, r.cifrado.iv, r.cifrado.dados);
  return bytes ? new Blob([bytes], { type: r.tipo }) : null;
}

/** Põe um ficheiro às claras ou cifrado (quando a nota ganha ou perde a palavra-passe). */
export async function mudarProtecao(id: string, de?: CryptoKey, para?: CryptoKey): Promise<void> {
  const r = (await todos<RegistoDeAnexo>("anexos")).find((x) => x.id === id);
  if (!r) return;
  const blob = await lerAnexo(id, de);
  if (!blob) return;
  await guardar<RegistoDeAnexo>("anexos", para ? { id: r.id, nome: r.nome, tipo: r.tipo, tamanho: r.tamanho, cifrado: await cifrarBytes(para, await blob.arrayBuffer()) } : { id: r.id, nome: r.nome, tipo: r.tipo, tamanho: r.tamanho, blob });
}

export const removerAnexo = (id: string): Promise<void> => remover("anexos", id);

/** O tamanho em palavras («1,2 MB»). */
export function tamanhoEmPalavras(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} MB`;
}
