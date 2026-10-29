// Controlo de acesso simulado: funções, o que cada uma vê e o que cada uma pode alterar. Nada disto é segurança real — é só a demonstração do modelo.
// Num produto a sério, estas regras têm de ser aplicadas também no servidor.

export type Permissao = "ver" | "editar";

export interface Funcao {
  id: string;
  rotulo: string;
  pessoa: string;
  /** Áreas visíveis e se podem alterar. */
  areas: Record<string, Permissao[]>;
  /** Módulos individuais que ficam fechados mesmo dentro de uma área visível. */
  fechados?: string[];
}

const TUDO: Permissao[] = ["ver", "editar"];
const VER: Permissao[] = ["ver"];

export const FUNCOES: Funcao[] = [
  {
    id: "administrador",
    rotulo: "Administrador",
    pessoa: "Ana Costa",
    areas: { inicio: TUDO, analise: TUDO, vendas: TUDO, clientes: TUDO, conteudo: TUDO, ia: TUDO, pagamentos: TUDO, marketing: TUDO, dev: TUDO, hotel: TUDO, taxi: TUDO, loja: TUDO, admin: TUDO },
  },
  {
    id: "master",
    rotulo: "Master Admin",
    pessoa: "Ricardo Matos",
    // a única função que vê o painel de módulos e predefinições: decide o que os outros têm ligado
    areas: { inicio: TUDO, analise: TUDO, vendas: TUDO, clientes: TUDO, conteudo: TUDO, ia: TUDO, pagamentos: TUDO, marketing: TUDO, dev: TUDO, hotel: TUDO, taxi: TUDO, loja: TUDO, admin: TUDO, painel: TUDO },
  },
  {
    id: "gestor",
    rotulo: "Gestor de vendas",
    pessoa: "Bruno Ferreira",
    areas: { inicio: VER, analise: VER, vendas: TUDO, clientes: TUDO },
  },
  {
    id: "analista",
    rotulo: "Analista de dados",
    pessoa: "Carla Pereira",
    areas: { inicio: VER, analise: TUDO, vendas: VER, clientes: VER, conteudo: TUDO, ia: TUDO, pagamentos: VER, marketing: TUDO, dev: VER, hotel: VER, taxi: VER, loja: VER },
  },
  {
    id: "apoio",
    rotulo: "Apoio ao cliente",
    pessoa: "Diogo Santos",
    areas: { inicio: VER, vendas: TUDO, clientes: TUDO },
    fechados: ["produtos"],
  },
  {
    id: "leitor",
    rotulo: "Leitor",
    pessoa: "Eduarda Lopes",
    areas: { inicio: VER, vendas: VER, admin: VER },
    fechados: ["utilizadores", "erp", "faturacao", "atividade", "reciclagem"],
  },
];

// As funções personalizadas (as dos convites com interruptores) guardam-se neste navegador e existem depois de o convite ser aceite.
const CHAVE_PERSONALIZADAS = "painel.funcoes-personalizadas";

export function lerFuncoesPersonalizadas(): Funcao[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(CHAVE_PERSONALIZADAS) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as Funcao[]).filter((f) => f && typeof f.id === "string" && f.areas && typeof f.areas === "object") : [];
  } catch {
    return [];
  }
}

export function guardarFuncaoPersonalizada(f: Funcao): void {
  const outras = lerFuncoesPersonalizadas().filter((x) => x.id !== f.id);
  try {
    window.localStorage.setItem(CHAVE_PERSONALIZADAS, JSON.stringify([...outras, f]));
  } catch {
    /* sem armazenamento */
  }
}

export function funcaoPorId(id: string): Funcao {
  return FUNCOES.find((f) => f.id === id) ?? lerFuncoesPersonalizadas().find((f) => f.id === id) ?? FUNCOES[0];
}

export function podeVer(f: Funcao, areaId: string, moduloId?: string): boolean {
  if (!f.areas[areaId]?.includes("ver")) return false;
  return !(moduloId && f.fechados?.includes(moduloId));
}

export function podeEditar(f: Funcao, areaId: string, moduloId?: string): boolean {
  return podeVer(f, areaId, moduloId) && !!f.areas[areaId]?.includes("editar");
}

const semAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O e-mail de demonstração de cada conta: nome.apelido@empresa.exemplo. */
export function emailDe(f: Funcao): string {
  const partes = semAcentos(f.pessoa)
    .split(/\s+/)
    .filter((p) => !["de", "do", "da", "dos", "das"].includes(p));
  return `${partes.slice(0, 2).join(".").replace(/[^a-z0-9.]/g, "")}@empresa.exemplo`;
}
