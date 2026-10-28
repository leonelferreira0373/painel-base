// Rota /conta/<secção>/: uma página estática por secção das definições da conta (dados/conta.ts).
import { notFound } from "next/navigation";
import { Conta } from "@/components/conta/Conta";
import { SECOES_CONTA } from "@/dados/conta";

export const dynamicParams = false;

export function generateStaticParams() {
  return SECOES_CONTA.map((s) => ({ secao: s.id }));
}

export default async function Pagina({ params }: { params: Promise<{ secao: string }> }) {
  const { secao } = await params;
  if (!SECOES_CONTA.some((s) => s.id === secao)) notFound();
  return <Conta secao={secao} />;
}
