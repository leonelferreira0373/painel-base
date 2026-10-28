// Painéis à medida (módulos do tipo «painel»): cada um é um componente registado em `PAINEIS`, no fim do ficheiro, pelo id do módulo.
// Aqui, as ligações a sistemas externos; para outro painel, escreva o componente com `Pagina`, `Titulo` e `Painel` (ver docs/ADICIONAR-MODULO.md).
"use client";

import { Badge, Button, LayerCard, Table } from "@cloudflare/kumo";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { INTEGRACOES } from "@/dados/paineis";
import { T } from "@/dados/textos";
import { useApp } from "@/lib/estado";
import { Dica } from "./Dica";
import { Esbatido } from "./Estados";
import { ICONES } from "./Icones";
import { Pagina, Painel, Titulo } from "./ui";

export function Integracao({ id }: { id: string }) {
  const info = INTEGRACOES[id];
  const { funcao, avisar } = useApp();
  const [aSincronizar, setASincronizar] = useState(false);
  const [momento, setMomento] = useState("28/10/2026 06:00");
  const [registo, setRegisto] = useState(() => info.entidades.map((e) => ({ hora: "06:00", texto: `${e.nome}: ${e.registos} registos sincronizados` })));
  const temporizador = useRef(0);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);
  const permitido = funcao.id === "administrador";
  const sincronizar = () => {
    setASincronizar(true);
    temporizador.current = window.setTimeout(() => {
      const agora = new Date();
      const hora = agora.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
      setMomento(`${agora.toLocaleDateString("pt-PT")} ${hora}`);
      setRegisto((r) => [...info.entidades.map((e) => ({ hora, texto: `${e.nome}: ${e.registos} registos sincronizados` })), ...r].slice(0, 40));
      setASincronizar(false);
      avisar(`${info.sistema}: sincronização concluída`);
    }, 1800);
  };
  return (
    <Pagina>
      <Titulo titulo={`Ligação a ${info.sistema}`}>
        <Dica conteudo={permitido ? `Atualizar agora os dados trocados com o sistema: ${info.troca}.` : "Só o Administrador pode sincronizar."}><Button variant="primary" icon={ICONES.atualizar} loading={aSincronizar} disabled={!permitido} onClick={sincronizar} title={permitido ? undefined : T.geral.semPermissao}>
          {aSincronizar ? T.integracao.aSincronizar : T.integracao.sincronizar}
        </Button></Dica>
      </Titulo>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <LayerCard className="pleno overflow-hidden p-0">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>{T.integracao.entidades}</Table.Head>
                <Table.Head>Sentido</Table.Head>
                <Table.Head className="text-right">Registos</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {info.entidades.map((e) => (
                <Table.Row key={e.nome}>
                  <Table.Cell>{e.nome}</Table.Cell>
                  <Table.Cell className="text-kumo-subtle">{e.sentido}</Table.Cell>
                  <Table.Cell className="text-right tabular-nums">{e.registos}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </LayerCard>
        <div className="flex flex-col gap-4">
          <Painel titulo={T.integracao.estado}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-kumo-subtle">Estado</dt>
              <dd>
                <Dica conteudo="A ligação responde e a última sincronização terminou sem erros."><Badge variant="success" appearance="dot">
                  {T.integracao.ligado}
                </Badge></Dica>
              </dd>
              <dt className="text-kumo-subtle">{T.integracao.ultima}</dt>
              <dd className="tabular-nums">{momento}</dd>
              <dt className="text-kumo-subtle">{T.integracao.ambiente}</dt>
              <dd>
                {info.ambiente} · {info.versao}
              </dd>
            </dl>
          </Painel>
          <Painel titulo={T.integracao.registo}>
            <Esbatido className="sem-barra flex max-h-[260px] flex-col overflow-y-auto">
              {registo.map((r, i) => (
                <div key={`${r.hora}-${i}`} className="flex items-start justify-between gap-3 border-b border-kumo-hairline py-2 text-sm last:border-b-0">
                  <span>{r.texto}</span>
                  <span className="shrink-0 tabular-nums text-kumo-subtle">{r.hora}</span>
                </div>
              ))}
            </Esbatido>
          </Painel>
        </div>
      </div>
    </Pagina>
  );
}

/** Os painéis à medida, pelo id do módulo (o mesmo `id` de `estrutura.ts`, com `tipo: "painel"`). */
export const PAINEIS: Record<string, ComponentType> = {
  erp: () => <Integracao id="erp" />,
  faturacao: () => <Integracao id="faturacao" />,
};
