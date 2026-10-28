// Gerador de dados fictícios mas verosímeis (nomes, empresas, produtos), determinístico: o mesmo resultado em cada carregamento.

const BASE = Date.UTC(2026, 9, 28);

export function prng(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sorteio {
  private r: () => number;
  constructor(semente: number) {
    this.r = prng(semente);
  }
  entre(a: number, b: number): number {
    return a + Math.floor(this.r() * (b - a + 1));
  }
  de<T>(lista: readonly T[]): T {
    return lista[Math.floor(this.r() * lista.length)];
  }
  /** Escolha com pesos: a primeira opção é a mais provável. */
  pesada<T>(lista: readonly T[], pesos: readonly number[]): T {
    const total = pesos.reduce((s, p) => s + p, 0);
    let x = this.r() * total;
    for (let i = 0; i < lista.length; i++) {
      x -= pesos[i];
      if (x <= 0) return lista[i];
    }
    return lista[lista.length - 1];
  }
  dia(deslocamento: number): string {
    return new Date(BASE + deslocamento * 86_400_000).toISOString().slice(0, 10);
  }
  hora(): string {
    return `${String(this.entre(7, 20)).padStart(2, "0")}:${this.de(["00", "15", "30", "45"])}`;
  }
  nome(): string {
    return `${this.de(NOMES)} ${this.de(APELIDOS)}`;
  }
  /** Código de processo com prefixo, como «EN-02607». */
  processo(prefixo: string, n: number): string {
    return `${prefixo}-${String(2600 + n).padStart(5, "0")}`;
  }
}

export const NOMES = ["Ana", "Bruno", "Carla", "Diogo", "Eduarda", "Fábio", "Graça", "Hugo", "Inês", "João", "Kátia", "Luís", "Mariana", "Nuno", "Olívia", "Paulo", "Rita", "Rui", "Sara", "Tomás", "Vera", "Xavier"] as const;
export const APELIDOS = ["Silva", "Costa", "Ferreira", "Pereira", "Santos", "Oliveira", "Rodrigues", "Martins", "Gomes", "Lopes", "Carvalho", "Almeida", "Ribeiro", "Mendes", "Teixeira", "Moreira"] as const;

/** Empresas fictícias. */
export const CLIENTES = ["Atlas Comércio", "Boreal Retalho", "Cerne Distribuição", "Delta Serviços", "Estrela do Sul", "Fénix Materiais"] as const;
export const SETORES = ["Retalho", "Distribuição", "Serviços", "Indústria"] as const;
export const PRODUTOS = [
  { nome: "Cadeira ergonómica", categoria: "Mobiliário", preco: 189 },
  { nome: "Secretária regulável", categoria: "Mobiliário", preco: 349 },
  { nome: "Monitor 27 polegadas", categoria: "Informática", preco: 229 },
  { nome: "Teclado mecânico", categoria: "Informática", preco: 89 },
  { nome: "Candeeiro de leitura", categoria: "Iluminação", preco: 39 },
  { nome: "Auscultadores sem fios", categoria: "Áudio", preco: 129 },
  { nome: "Dock USB-C", categoria: "Informática", preco: 99 },
  { nome: "Estante modular", categoria: "Mobiliário", preco: 159 },
] as const;
export const CATEGORIAS = ["Mobiliário", "Informática", "Iluminação", "Áudio"] as const;
