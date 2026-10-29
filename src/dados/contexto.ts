// O «contexto» da navegação: a entidade que se abre dentro da conta. Na Cloudflare é o domínio; aqui é o cliente. Ao entrar num cliente, o cabeçalho mostra o seu nome e o seu estado em tempo real, a barra lateral ganha «Voltar a Clientes» e as páginas passam a ser as dele.
import type { Icone } from "@/components/Icones";
import { PROJETO } from "./projeto";
import type { Linha } from "./tipos";

export interface PaginaContexto {
  id: string;
  rotulo: string;
  icone: Icone;
  descricao: string;
  /** Módulo de registos que a página mostra, filtrado pela entidade (sem isto, é a página de análise). */
  registos?: string;
  /** Coluna do módulo de registos onde está o nome da entidade. */
  filtro?: string;
}

export const CONTEXTO = {
  rotulo: "Cliente",
  rotuloPlural: "Clientes",
  /** Módulo de registos onde estão as entidades, e as suas colunas de nome e de estado. */
  registos: "carteira",
  chaveNome: "cliente",
  chaveEstado: "estado",
  /** Para onde vai «Voltar a Clientes». */
  voltar: { area: "clientes", modulo: "carteira" },
  /** As páginas de cada entidade, pela ordem da barra lateral; a primeira é a de abertura. */
  paginas: [
    { id: "analise", rotulo: "Análise", icone: "grafico", descricao: "Métricas, gráficos e mapa das encomendas deste cliente." },
    { id: "encomendas", rotulo: "Encomendas", icone: "camiao", descricao: "As encomendas deste cliente.", registos: "encomendas", filtro: "cliente" },
    { id: "devolucoes", rotulo: "Devoluções", icone: "atualizar", descricao: "As devoluções pedidas por este cliente.", registos: "devolucoes", filtro: "cliente" },
  ] satisfies PaginaContexto[],
} as const;

export interface EntidadeContexto {
  nome: string;
  slug: string;
  estado: string;
}

/** O nome de uma entidade como segmento de endereço: «Atlas Comércio» → «atlas-comercio». */
export const slugDe = (nome: string) =>
  nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** O endereço de uma página de uma entidade: /<conta>/<entidade>/<página>/. */
export const caminhoContexto = (nome: string, pagina: string = CONTEXTO.paginas[0].id) => `/${PROJETO.contaId}/${slugDe(nome)}/${pagina}/`;

export const paginaDoContexto = (id: string) => CONTEXTO.paginas.find((p) => p.id === id);

/** As entidades de uma lista de linhas do módulo de registos do contexto. */
export const entidadesDe = (linhas: Linha[]): EntidadeContexto[] => linhas.map((l) => ({ nome: String(l[CONTEXTO.chaveNome]), slug: slugDe(String(l[CONTEXTO.chaveNome])), estado: String(l[CONTEXTO.chaveEstado] ?? "") }));
