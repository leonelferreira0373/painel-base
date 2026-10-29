// Guardar um ficheiro na biblioteca do painel (o gestor de ficheiros, em Conteúdo): numa pasta da raiz, que se cria se ainda não existe, com um nome que não repete nenhum que lá esteja. É por aqui que passa o que chega pelo SnapShare.
import { guardar, todos } from "./armazem";
import { nomeUnico, TIPO_PASTA, type ItemDaBiblioteca } from "./biblioteca";

const idNovo = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Guarda o ficheiro em `pasta` (na raiz da biblioteca) e devolve o nome com que ficou. */
export async function guardarNaBiblioteca(blob: Blob, nome: string, pasta: string, tipo?: string): Promise<{ pasta: string; nome: string }> {
  const itens = await todos<ItemDaBiblioteca>("ficheiros");
  const agora = new Date().toISOString();
  if (!itens.some((i) => i.tipo === TIPO_PASTA && i.nome === pasta && i.pasta === "")) await guardar<ItemDaBiblioteca>("ficheiros", { id: idNovo(), nome: pasta, tipo: TIPO_PASTA, tamanho: 0, criado: agora, pasta: "" });
  const final = nomeUnico(itens, pasta, nome);
  await guardar<ItemDaBiblioteca>("ficheiros", { id: idNovo(), nome: final, tipo: tipo || blob.type || "application/octet-stream", tamanho: blob.size, criado: agora, pasta, blob });
  return { pasta, nome: final };
}
