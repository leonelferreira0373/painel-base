// Rota /<área>/<módulo>/: uma página estática por módulo do menu (dados/estrutura.ts).
import { notFound } from "next/navigation";
import { Modulo } from "@/components/Modulo";
import { AREAS, moduloPorIds } from "@/dados/estrutura";

export const dynamicParams = false;

export function generateStaticParams() {
  return AREAS.filter((a) => a.id !== "inicio").flatMap((a) => a.modulos.map((m) => ({ area: a.id, modulo: m.id })));
}

export default async function Pagina({ params }: { params: Promise<{ area: string; modulo: string }> }) {
  const { area, modulo } = await params;
  if (!moduloPorIds(area, modulo)) notFound();
  return <Modulo areaId={area} moduloId={modulo} />;
}
