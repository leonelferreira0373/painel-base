// O que um token da API pode fazer, em interruptores: para cada área do painel, se lê e se edita, e dentro dela cada módulo à parte. Ligar um interruptor muda as permissões do token; o que ficar desligado, o token não consegue fazer (nem a IA que o usa). Os atalhos de cima põem tudo de uma vez.
"use client";

import { Button } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { AREAS } from "@/dados/estrutura";
import { chaveDoNivel, mudarEditar, mudarLer, modulosDoRecurso, niveisDasPermissoes, permissoesDosNiveis, permissoesForaDosInterruptores, RECURSOS, resumoDaArea, todosOsNiveis, type PermissaoDeToken } from "@/lib/tokens";
import { Interruptor } from "../conta/Pecas";
import { Ic } from "../Icones";

export function InterruptoresDoToken({ permissoes, aoMudar }: { permissoes: PermissaoDeToken[]; aoMudar: (p: PermissaoDeToken[]) => void }) {
  const niveis = useMemo(() => niveisDasPermissoes(permissoes), [permissoes]);
  const extras = useMemo(() => permissoesForaDosInterruptores(permissoes), [permissoes]);
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const mudar = (n: typeof niveis) => aoMudar(permissoesDosNiveis(n, extras));

  return (
    <section aria-label="Permissões do token" className="flex shrink-0 flex-col overflow-hidden rounded-xl ring ring-kumo-line">
      <div className="flex items-center justify-between gap-3 bg-kumo-recessed/60 px-4 py-2.5">
        <h3 className="min-w-0 truncate text-sm font-medium">O que o token pode fazer</h3>
        {/* uma linha com desvanecimento e scroll na horizontal, em vez de cortar os atalhos no telemóvel */}
        <span className="sem-barra -my-1 flex min-w-0 items-center gap-1 overflow-x-auto py-1 [&>*]:shrink-0">
          <Button variant="ghost" size="sm" onClick={() => mudar(todosOsNiveis("ler"))}>
            Só ler
          </Button>
          <Button variant="ghost" size="sm" onClick={() => mudar(todosOsNiveis("editar"))}>
            Editar tudo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => mudar(todosOsNiveis("nada"))}>
            Nada
          </Button>
        </span>
      </div>
      {RECURSOS.map((r) => {
        const modulos = modulosDoRecurso(r);
        const resumo = resumoDaArea(niveis, r);
        const expandida = !!abertas[r.area];
        const icone = AREAS.find((a) => a.id === r.area)?.icone;
        const expansivel = modulos.length > 1;
        return (
          <div key={r.area} className="border-t border-kumo-hairline first:border-t-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
              <button type="button" aria-expanded={expandida} disabled={!expansivel} onClick={() => setAbertas((x) => ({ ...x, [r.area]: !x[r.area] }))} className="flex min-w-0 flex-1 basis-full cursor-pointer items-center gap-2 text-left text-sm font-medium disabled:cursor-default sm:basis-0">
                <Ic nome="seta" tamanho={13} className={`shrink-0 text-kumo-subtle transition-transform duration-200 ${!expansivel ? "opacity-0" : expandida ? "rotate-90" : ""}`} />
                {icone && <Ic nome={icone} tamanho={15} className="shrink-0 text-kumo-subtle" />}
                <span className="min-w-0 break-words">{r.rotuloDaArea}</span>
                {expansivel && resumo.podeLer > 0 && (
                  <span className="shrink-0 text-xs font-normal tabular-nums text-kumo-subtle">
                    {resumo.podeLer} de {resumo.total}
                  </span>
                )}
              </button>
              <label className="inline-flex items-center gap-2 text-sm text-kumo-subtle">
                Ler
                <Interruptor marcado={resumo.podeLer === resumo.total} aoMudar={(v) => mudar(mudarLer(niveis, r.area, null, v))} rotulo={`${r.rotuloDaArea}: ler`} />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-kumo-subtle">
                Editar
                <Interruptor marcado={resumo.podeEditar === resumo.total} aoMudar={(v) => mudar(mudarEditar(niveis, r.area, null, v))} rotulo={`${r.rotuloDaArea}: editar`} />
              </label>
            </div>
            {expandida && expansivel && (
              <ul className="m-0 flex list-none flex-col gap-0.5 bg-kumo-recessed/40 px-4 py-2 pl-11">
                {modulos.map((m) => {
                  const nivel = niveis[chaveDoNivel(r.area, m.id)] ?? "nada";
                  return (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1 text-sm">
                      <span className="min-w-0 flex-1 basis-full truncate sm:basis-0">{m.rotulo}</span>
                      <label className="inline-flex items-center gap-2 text-kumo-subtle">
                        Ler
                        <Interruptor marcado={nivel !== "nada"} aoMudar={(v) => mudar(mudarLer(niveis, r.area, m.id, v))} rotulo={`${m.rotulo}: ler`} />
                      </label>
                      <label className="inline-flex items-center gap-2 text-kumo-subtle">
                        Editar
                        <Interruptor marcado={nivel === "editar"} aoMudar={(v) => mudar(mudarEditar(niveis, r.area, m.id, v))} rotulo={`${m.rotulo}: editar`} />
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
