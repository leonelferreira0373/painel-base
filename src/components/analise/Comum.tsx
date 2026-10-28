// Peças comuns às quatro páginas de análise de dados: cabeçalho, escolha da tabela e estado vazio.
"use client";

import { Empty, Select, Tabs } from "@cloudflare/kumo";
import { usePathname, useRouter } from "next/navigation";
import { AREAS, caminho } from "@/dados/estrutura";
import { podeVer } from "@/dados/rbac";
import { T } from "@/dados/textos";
import { useApp } from "@/lib/estado";
import { Esbatido } from "../Estados";
import { Ic } from "../Icones";
import Link from "next/link";

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2).replace(".", ",")} GB`;
}

/** Separadores no topo da página, como nas páginas com várias vistas da Cloudflare. */
export function AbasAnalise() {
  const router = useRouter();
  const pathname = usePathname();
  const { funcao } = useApp();
  const area = AREAS.find((a) => a.id === "analise")!;
  const modulos = area.modulos.filter((m) => podeVer(funcao, area.id, m.id));
  const atual = modulos.find((m) => pathname.startsWith(caminho(area.id, m.id)))?.id ?? modulos[0]?.id;
  return (
    <Esbatido className="sem-barra -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <Tabs variant="segmented" tabs={modulos.map((m) => ({ value: m.id, label: m.rotulo }))} value={atual} onValueChange={(v: string) => router.push(caminho(area.id, v))} />
    </Esbatido>
  );
}

export function SeletorTabela() {
  const { ficheiros, tabelaAtiva, escolherTabela } = useApp();
  const opcoes = ficheiros.flatMap((f) => f.tabelas.map((t) => ({ id: t.id, rotulo: f.tabelas.length > 1 || ficheiros.length > 1 ? `${f.nome} · ${t.nome}` : t.nome })));
  if (opcoes.length === 0) return null;
  return (
    <Select value={tabelaAtiva?.id ?? ""} onValueChange={(v) => escolherTabela(String(v))} aria-label="Tabela" className="w-full sm:w-72" items={Object.fromEntries(opcoes.map((o) => [o.id, o.rotulo]))} />
  );
}

export function SemDados() {
  return (
    <Empty
      icon={<Ic nome="ficheiro" tamanho={40} />}
      title={T.analise.vazio}
      contents={
        <Link href={caminho("analise", "ficheiros")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-kumo-brand px-3 text-sm font-medium text-white hover:bg-kumo-brand-hover">
          <Ic nome="enviar" tamanho={16} />
          {T.analise.ficheiros.titulo}
        </Link>
      }
    />
  );
}
