// O catálogo das páginas do painel que uma pessoa pode abrir: os módulos que a função vê e as definições da conta, cada um com o nome, a área, para que serve e os outros nomes. É o que a pesquisa (por texto e com IA) e o assistente usam para saber para onde levar.
import { AREAS, caminho } from "@/dados/estrutura";
import { caminhoConta, SECOES_CONTA } from "@/dados/conta";
import { podeVer, type Funcao } from "@/dados/rbac";
import type { Icone } from "@/components/Icones";
import type { PaginaPesquisavel } from "./pesquisa-ia";

export type PaginaDoCatalogo = PaginaPesquisavel & { icone: Icone; href: string };

export function catalogoDoPainel(funcao: Funcao): PaginaDoCatalogo[] {
  return [
    ...AREAS.filter((a) => podeVer(funcao, a.id)).flatMap((a) =>
      a.modulos.filter((m) => podeVer(funcao, a.id, m.id)).map((m) => ({ id: `${a.id}/${m.id}`, rotulo: m.rotulo, area: a.rotulo, descricao: m.descricao, palavras: m.palavras, icone: m.icone, href: caminho(a.id, m.id) })),
    ),
    ...SECOES_CONTA.map((c) => ({ id: `conta/${c.id}`, rotulo: c.rotulo, area: "Definições da conta", descricao: c.descricao, palavras: c.palavras, icone: c.icone, href: caminhoConta(c.id) })),
  ];
}
