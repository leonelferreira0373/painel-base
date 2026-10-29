// As predefinições de um clique do Master Admin: cada uma escolhe um pacote de negócio, pode acrescentar exceções (áreas ligadas ou desligadas) e dá ao painel uma aparência (acento e letras dos títulos). Quem tem a sua própria aparência (Definições da conta) mantém-na.
import type { Icone } from "@/components/Icones";
import type { Aparencia } from "./aparencia";

export interface Predefinicao {
  id: string;
  rotulo: string;
  icone: Icone;
  /** O pacote de que parte (dados/pacotes.ts). */
  pacote: string;
  /** As exceções ao pacote («area» ou «area/modulo» → ligado ou desligado). */
  ligados?: Record<string, boolean>;
  aparencia?: Aparencia;
  /** A cor de acento, para o ponto ao lado do nome. */
  cor: string;
}

export const PREDEFINICOES: Predefinicao[] = [
  { id: "completo", rotulo: "Completo", icone: "camiao", pacote: "personalizado", cor: "#155dfc" },
  { id: "hotel", rotulo: "Hotel clássico", icone: "casa", pacote: "hotel", cor: "#9a6b2f", aparencia: { claro: { acento: "#9a6b2f" }, escuro: { acento: "#d4a35a" }, letras: { titulos: "serifada" } } },
  { id: "taxi", rotulo: "Táxi urbano", icone: "carro", pacote: "taxi", cor: "#d97706", aparencia: { claro: { acento: "#d97706" }, escuro: { acento: "#fbbf24" } } },
  { id: "loja", rotulo: "Loja", icone: "produto", pacote: "loja", cor: "#0f766e", aparencia: { claro: { acento: "#0f766e" }, escuro: { acento: "#2dd4bf" } } },
  {
    id: "essencial",
    rotulo: "Só o essencial",
    icone: "campos",
    pacote: "personalizado",
    cor: "#525252",
    // tudo desligado menos a análise, os clientes, os pagamentos e a administração
    ligados: { conteudo: false, ia: false, vendas: false, hotel: false, taxi: false, loja: false, marketing: false, dev: false },
  },
];

export const predefinicaoPorId = (id: string): Predefinicao | undefined => PREDEFINICOES.find((p) => p.id === id);
