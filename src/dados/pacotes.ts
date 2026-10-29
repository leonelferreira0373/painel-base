// Os pacotes de negócio do painel: cada um liga as áreas de um tipo de negócio (hotel, táxi, loja, vendas). O Master Admin escolhe um pacote e depois liga ou desliga áreas e módulos à mão (o pacote «Personalizado»). Um id de área que o painel não tem (por exemplo «operacoes» na base) conta como desligado e não faz mal estar na lista.
import type { Icone } from "@/components/Icones";

export interface Pacote {
  id: string;
  rotulo: string;
  icone: Icone;
  /** As áreas ligadas. */
  areas: string[];
  /** Módulos desligados dentro das áreas ligadas («area/modulo»). */
  modulosFora?: string[];
}

/** As áreas que nunca se desligam: o início e o painel do Master Admin (senão ninguém conseguia voltar a ligar nada). */
export const AREAS_ESSENCIAIS = ["inicio", "painel"];

const COMUM = ["inicio", "analise", "clientes", "pagamentos", "marketing", "dev", "admin", "painel"];

export const PACOTES: Pacote[] = [
  { id: "vendas", rotulo: "Vendas e encomendas", icone: "camiao", areas: [...COMUM, "vendas", "conteudo", "ia"] },
  { id: "hotel", rotulo: "Hotel", icone: "casa", areas: [...COMUM, "hotel", "conteudo", "ia"] },
  { id: "taxi", rotulo: "Táxi", icone: "carro", areas: [...COMUM, "taxi"] },
  { id: "loja", rotulo: "Loja", icone: "produto", areas: [...COMUM, "loja", "conteudo", "ia"] },
  { id: "personalizado", rotulo: "Personalizado", icone: "campos", areas: [...COMUM, "vendas", "conteudo", "ia", "hotel", "taxi", "loja"] },
];

/** O pacote de origem: o que o painel traz antes de o Master Admin escolher. */
export const PACOTE_DE_ORIGEM = "personalizado";

export const pacotePorId = (id: string): Pacote | undefined => PACOTES.find((p) => p.id === id);
