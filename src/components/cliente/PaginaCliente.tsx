// Uma página de uma entidade (o cliente): a análise ou um módulo de registos filtrado por ela. O cabeçalho (SeletorCliente) e a barra lateral já estão no Shell.
"use client";

import { Button, Empty } from "@cloudflare/kumo";
import Link from "next/link";
import { useMemo } from "react";
import { CONTEXTO, entidadesDe, paginaDoContexto } from "@/dados/contexto";
import { caminho } from "@/dados/estrutura";
import { podeVer } from "@/dados/rbac";
import { useApp } from "@/lib/estado";
import { Ic } from "../Icones";
import { Registos } from "../Registos";
import { Pagina } from "../ui";
import { AnaliseCliente } from "./AnaliseCliente";

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Pagina>
      <Empty
        icon={<Ic nome="cadeado" tamanho={40} />}
        title={titulo}
        description={texto}
        contents={
          <Link href={caminho(CONTEXTO.voltar.area, CONTEXTO.voltar.modulo)}>
            <Button variant="primary">Voltar a {CONTEXTO.rotuloPlural}</Button>
          </Link>
        }
      />
    </Pagina>
  );
}

export function PaginaCliente({ slug, pagina }: { slug: string; pagina: string }) {
  const { registos, funcao } = useApp();
  const entidade = useMemo(() => entidadesDe(registos[CONTEXTO.registos] ?? []).find((e) => e.slug === slug), [registos, slug]);
  const def = paginaDoContexto(pagina);
  if (!podeVer(funcao, CONTEXTO.voltar.area, CONTEXTO.voltar.modulo)) return <Vazio titulo="Sem acesso" texto="A função atual não tem permissão para ver esta página." />;
  if (!entidade || !def) return <Vazio titulo={`${CONTEXTO.rotulo} não encontrado`} texto="Este endereço não corresponde a nenhum registo." />;
  if (def.registos && def.filtro) return <Registos moduloId={def.registos} filtro={{ chave: def.filtro, valor: entidade.nome }} titulo={`${def.rotulo} · ${entidade.nome}`} />;
  return <AnaliseCliente cliente={entidade.nome} />;
}
