// Rota /<conta>/<área>/<módulo>/: uma página estática por módulo do menu (dados/estrutura.ts). O primeiro segmento (chamado «area» porque o Next exige o mesmo nome que a rota antiga /<área>/<módulo>/) é o identificador da conta.
import { notFound } from "next/navigation";
import { Modulo } from "@/components/Modulo";
import { AREAS, moduloPorIds } from "@/dados/estrutura";
import { PROJETO } from "@/dados/projeto";

export const dynamicParams = false;

export function generateStaticParams() {
  return AREAS.filter((a) => a.id !== "inicio").flatMap((a) => a.modulos.map((m) => ({ area: PROJETO.contaId, modulo: a.id, pagina: m.id })));
}

export default async function Pagina({ params }: { params: Promise<{ area: string; modulo: string; pagina: string }> }) {
  const { area: conta, modulo: a, pagina: b } = await params;
  if (conta !== PROJETO.contaId || !moduloPorIds(a, b)) notFound();
  return <Modulo areaId={a} moduloId={b} />;
}
