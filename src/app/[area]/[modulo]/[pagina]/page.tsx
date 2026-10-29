// Rota /<conta>/<área>/<módulo>/ (módulos do menu) e /<conta>/<cliente>/<página>/ (páginas de um cliente). O primeiro segmento é o identificador da conta; os nomes dos segmentos coincidem com os da rota /<área>/<módulo>/ porque o Next o exige.
import { notFound } from "next/navigation";
import { PaginaCliente } from "@/components/cliente/PaginaCliente";
import { Modulo } from "@/components/Modulo";
import { CONTEXTO, entidadesDe, paginaDoContexto } from "@/dados/contexto";
import { AREAS, moduloPorIds } from "@/dados/estrutura";
import { REGISTOS } from "@/dados/modulos";
import { PROJETO } from "@/dados/projeto";

export const dynamicParams = false;

const entidades = () => entidadesDe(REGISTOS[CONTEXTO.registos].semente());

export function generateStaticParams() {
  const modulos = AREAS.filter((a) => a.id !== "inicio").flatMap((a) => a.modulos.map((m) => ({ area: PROJETO.contaId, modulo: a.id, pagina: m.id })));
  const paginas = entidades().flatMap((e) => CONTEXTO.paginas.map((p) => ({ area: PROJETO.contaId, modulo: e.slug, pagina: p.id })));
  return [...modulos, ...paginas];
}

export default async function Pagina({ params }: { params: Promise<{ area: string; modulo: string; pagina: string }> }) {
  const { area: conta, modulo: a, pagina: b } = await params;
  if (conta !== PROJETO.contaId) notFound();
  if (moduloPorIds(a, b)) return <Modulo areaId={a} moduloId={b} />;
  if (entidades().some((e) => e.slug === a) && paginaDoContexto(b)) return <PaginaCliente slug={a} pagina={b} />;
  notFound();
}
