// Pedido de gráfico feito a partir do menu de uma coluna da tabela: fica guardado até a página de gráficos o ler.
export type TipoPedido = "linha" | "barras" | "histograma" | "rosca";

export interface PedidoGrafico {
  coluna: number;
  tipo: TipoPedido;
  /** Instante do pedido; um pedido com mais de 15 segundos já não vale. */
  em?: number;
}

const CHAVE = "painel.grafico.pedido";

export function guardarPedido(pedido: PedidoGrafico): void {
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify({ ...pedido, em: Date.now() }));
  } catch {
    /* sem armazenamento */
  }
}

/** Lê o pedido sem o apagar (o React em desenvolvimento corre os efeitos duas vezes); quem o aplicar chama `limparPedido`. */
export function lerPedido(): PedidoGrafico | null {
  try {
    const texto = window.sessionStorage.getItem(CHAVE);
    if (!texto) return null;
    const p = JSON.parse(texto) as PedidoGrafico;
    const valido = typeof p.coluna === "number" && ["linha", "barras", "histograma", "rosca"].includes(p.tipo) && Date.now() - (p.em ?? 0) < 15_000;
    return valido ? p : null;
  } catch {
    return null;
  }
}

export function limparPedido(): void {
  try {
    window.sessionStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
}
