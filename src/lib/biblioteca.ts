// A biblioteca de ficheiros do painel: o que se guarda de cada ficheiro ou pasta e as funções puras que o gestor de ficheiros e a galeria partilham (nomes, tamanhos, pastas). As pastas são itens do tipo «pasta»; `pasta` é o caminho da pasta onde o item está («» é a raiz, «Faturas/2026» é uma subpasta).

export interface ItemDaBiblioteca {
  id: string;
  nome: string;
  /** O tipo MIME do ficheiro, ou «pasta». */
  tipo: string;
  tamanho: number;
  criado: string;
  /** O caminho da pasta onde está: «» na raiz, «Faturas/2026» numa subpasta. */
  pasta: string;
  /** O texto alternativo de uma imagem. */
  alt?: string;
  /** O conteúdo (só nos ficheiros). */
  blob?: Blob;
}

export const TIPO_PASTA = "pasta";
export const eImagem = (i: ItemDaBiblioteca) => i.tipo.startsWith("image/");
export const ePasta = (i: ItemDaBiblioteca) => i.tipo === TIPO_PASTA;

/** «1,2 MB», «830 KB», «12 B». */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const un = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < un.length - 1) (v /= 1024, i++);
  return `${v.toLocaleString("pt-PT", { maximumFractionDigits: v < 10 ? 1 : 0 })} ${un[i]}`;
}

/** O caminho completo de um item. */
export const caminhoDe = (i: Pick<ItemDaBiblioteca, "pasta" | "nome">) => (i.pasta ? `${i.pasta}/${i.nome}` : i.nome);

/** Os caminhos de todas as pastas, a raiz primeiro (para escolher para onde mover). */
export function todasAsPastas(itens: ItemDaBiblioteca[]): string[] {
  return ["", ...itens.filter(ePasta).map(caminhoDe).sort((a, b) => a.localeCompare(b, "pt"))];
}

/** Um nome que ainda não existe na pasta: «foto.png» → «foto (2).png». */
export function nomeUnico(itens: ItemDaBiblioteca[], pasta: string, nome: string, ignorar?: string): string {
  const usados = new Set(itens.filter((i) => i.pasta === pasta && i.id !== ignorar).map((i) => i.nome.toLowerCase()));
  if (!usados.has(nome.toLowerCase())) return nome;
  const ponto = nome.lastIndexOf(".");
  const base = ponto > 0 ? nome.slice(0, ponto) : nome;
  const ext = ponto > 0 ? nome.slice(ponto) : "";
  for (let n = 2; ; n++) {
    const candidato = `${base} (${n})${ext}`;
    if (!usados.has(candidato.toLowerCase())) return candidato;
  }
}

/** Quando se muda uma pasta de sítio ou de nome, tudo o que está dentro dela acompanha: devolve os itens que mudaram de caminho. */
export function acompanharPasta(itens: ItemDaBiblioteca[], antigo: string, novo: string): ItemDaBiblioteca[] {
  return itens.filter((i) => i.pasta === antigo || i.pasta.startsWith(`${antigo}/`)).map((i) => ({ ...i, pasta: novo + i.pasta.slice(antigo.length) }));
}

/** Os itens de uma pasta: as pastas primeiro, depois os ficheiros, cada grupo por nome. */
export function daPasta(itens: ItemDaBiblioteca[], pasta: string): ItemDaBiblioteca[] {
  return itens.filter((i) => i.pasta === pasta).sort((a, b) => Number(ePasta(b)) - Number(ePasta(a)) || a.nome.localeCompare(b.nome, "pt"));
}

/** As migalhas de uma pasta: «Faturas/2026» → [{nome: «Faturas», caminho: «Faturas»}, {nome: «2026», caminho: «Faturas/2026»}]. */
export function migalhas(pasta: string): { nome: string; caminho: string }[] {
  const partes = pasta.split("/").filter(Boolean);
  return partes.map((nome, i) => ({ nome, caminho: partes.slice(0, i + 1).join("/") }));
}

/** O nome de uma pasta ou de um ficheiro é aceitável? Sem barras nem nomes vazios. */
export const nomeValido = (nome: string) => nome.trim().length > 0 && nome.trim().length <= 120 && !/[\\/:*?"<>|]/.test(nome);
