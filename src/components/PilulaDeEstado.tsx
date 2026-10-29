// A etiqueta de estado de um contacto de e-mail (urgente, quente, lead, atendido, visto, frio, novo, automático): a mesma forma da etiqueta cinzenta do painel, mas com a cor do estado no fundo, no anel e no ponto (o texto continua preto ou branco). Com uma dica que diz porquê.
"use client";

import { ESTADOS_DE_CONTACTO, type CorDoEstado, type EstadoDeContacto } from "@/lib/email-contactos";
import { CorpoDica, Dica } from "./Dica";

const COR: Record<CorDoEstado, { fundo: string; ponto: string }> = {
  vermelho: { fundo: "bg-red-500/10 ring-red-500/35", ponto: "bg-red-500" },
  laranja: { fundo: "bg-orange-500/10 ring-orange-500/35", ponto: "bg-orange-500" },
  azul: { fundo: "bg-blue-500/10 ring-blue-500/35", ponto: "bg-blue-500" },
  verde: { fundo: "bg-emerald-500/10 ring-emerald-500/35", ponto: "bg-emerald-500" },
  cinza: { fundo: "bg-neutral-500/10 ring-neutral-500/25", ponto: "bg-neutral-400" },
  ceu: { fundo: "bg-sky-500/10 ring-sky-500/35", ponto: "bg-sky-500" },
  violeta: { fundo: "bg-violet-500/10 ring-violet-500/35", ponto: "bg-violet-500" },
};

export function PilulaDeEstado({ estado, motivo, semDica = false }: { estado: EstadoDeContacto; motivo?: string; semDica?: boolean }) {
  const { rotulo, cor, significado } = ESTADOS_DE_CONTACTO[estado];
  const etiqueta = (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-px text-xs font-medium text-kumo-default ring ${COR[cor].fundo}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${COR[cor].ponto}`} />
      {rotulo}
    </span>
  );
  if (semDica) return etiqueta;
  return <Dica conteudo={<CorpoDica titulo={rotulo} texto={motivo ?? significado} />}>{etiqueta}</Dica>;
}
