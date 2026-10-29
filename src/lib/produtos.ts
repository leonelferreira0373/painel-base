// Os produtos do painel: o que se guarda de cada um e as funções puras do editor (ler o preço e o stock escritos, validar, escolher a imagem principal). Ficam no navegador; as imagens são da biblioteca (a mesma da galeria) e cada produto guarda só os seus identificadores.
import { useGuardado } from "./guardado";

export type EstadoDeProduto = "rascunho" | "publicado" | "arquivado";

export const ESTADOS_DE_PRODUTO: Record<EstadoDeProduto, string> = { rascunho: "Rascunho", publicado: "Publicado", arquivado: "Arquivado" };

export interface Produto {
  id: string;
  nome: string;
  /** Uma das categorias fixas ou o texto escrito pela pessoa. */
  categoria: string;
  descricao: string;
  preco: number;
  moeda: string;
  stock: number;
  estado: EstadoDeProduto;
  /** Os identificadores das imagens da biblioteca; a primeira é a principal. */
  imagens: string[];
  criado: string;
  atualizado: string;
}

/** Um produto novo e vazio. */
export const produtoNovo = (id: string, agora = new Date().toISOString()): Produto => ({ id, nome: "", categoria: "servicos", descricao: "", preco: 0, moeda: "AOA", stock: 0, estado: "rascunho", imagens: [], criado: agora, atualizado: agora });

/** «12 500,50», «12500.5» ou «12.500,50» → 12500.5; null se não é um valor com no máximo duas casas decimais. Um só separador seguido de três dígitos («12.500») conta como milhares. */
export function lerPreco(texto: string): number | null {
  const t = texto.trim().replace(/[\s ]/g, "");
  if (!t) return null;
  if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ""));
  // o separador decimal é o último que aparece; o outro separa milhares
  const decimal = Math.max(t.lastIndexOf(","), t.lastIndexOf("."));
  const inteiro = (decimal >= 0 ? t.slice(0, decimal) : t).replace(/[.,]/g, "");
  const casas = decimal >= 0 ? t.slice(decimal + 1) : "";
  if (!/^\d+$/.test(inteiro) || (decimal >= 0 && !/^\d{1,2}$/.test(casas))) return null;
  // o mesmo separador não serve de milhares e de decimais («12,345,6», «1.2.3»)
  if (decimal >= 0 && t.slice(0, decimal).includes(t[decimal])) return null;
  return Number(`${inteiro}${casas ? `.${casas}` : ""}`);
}

export function erroDoPreco(texto: string): string | null {
  if (!texto.trim()) return "Escreva o preço.";
  return lerPreco(texto) === null ? "Use só números, com vírgula ou ponto para os cêntimos (12 500,50)." : null;
}

/** «120» → 120; null se não é um número inteiro, zero ou mais. */
export function lerStock(texto: string): number | null {
  const t = texto.trim().replace(/[\s .]/g, "");
  return /^\d{1,9}$/.test(t) ? Number(t) : null;
}

export function erroDoStock(texto: string): string | null {
  if (!texto.trim()) return "Escreva o stock (0 se não há).";
  return lerStock(texto) === null ? "O stock é um número inteiro, zero ou mais." : null;
}

/** O preço para o campo de edição: 12500.5 → «12 500,5»; 12500 → «12 500». */
export const precoParaTexto = (preco: number) => preco.toLocaleString("pt-PT", { maximumFractionDigits: 2 });

/** «12 500 Kz» ou «€ 12 500,50», conforme a moeda. */
export const formatarPreco = (preco: number, moeda: string) => preco.toLocaleString("pt-PT", { style: "currency", currency: moeda, maximumFractionDigits: 2 });

/** O que falta para guardar o produto, ou null se está pronto. */
export function erroDoProduto(p: Pick<Produto, "nome">, preco: string, stock: string): string | null {
  if (!p.nome.trim()) return "O produto precisa de um nome.";
  return erroDoPreco(preco) ?? erroDoStock(stock);
}

/** Os produtos guardados no navegador (chave `painel.produtos`). */
export function useProdutos() {
  const [produtos, definir, pronto] = useGuardado<Produto[]>("produtos", []);
  return {
    produtos,
    pronto,
    guardar: (p: Produto) => definir((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [p, ...l])),
    remover: (id: string) => {
      const p = produtos.find((x) => x.id === id);
      if (p) void import("./reciclagem").then((r) => r.reciclar({ tipo: "Produto", dados: p, origem: { kind: "colecao", chave: "produtos" } }));
      definir((l) => l.filter((x) => x.id !== id));
    },
  };
}
