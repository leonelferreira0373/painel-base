// Etiqueta de estado de um registo, com a cor certa e uma dica com o significado e o passo seguinte.
"use client";

import { Badge } from "@cloudflare/kumo";
import { significadoDoEstado } from "@/dados/dicas";
import { REGISTOS } from "@/dados/modulos";
import { passosSeguintes } from "@/lib/dicas-estado";
import { useApp } from "@/lib/estado";
import { CorpoDica, Dica } from "./Dica";

// Cor de cada estado: o nome do estado decide a variante. Os que não estão em nenhum grupo ficam neutros.
const CONCLUIDO = new Set(["Entregue", "Concluída", "Aprovada", "Ativo", "Em stock", "Enviado", "Saudável", "Validado", "Resolvido", "Ativa", "Permitido", "Confirmado"]);
const NEGATIVO = new Set(["Cancelada", "Recusada", "Falhou", "Bloqueado", "Suspenso", "Esgotado", "Recusado", "Parado", "Rejeitado", "Fatal", "Desativada", "Em falta"]);
const ATENCAO = new Set(["Stock baixo", "Pendente", "Pedida", "Em fila", "A arrancar", "Por validar", "Novo", "Fila", "A rever", "Em manutenção"]);

/** A cor do ponto de cada variante (a pill é sempre branca no tema claro e escura no escuro). */
const PONTO = { success: "bg-kumo-success", error: "bg-kumo-danger", warning: "bg-kumo-warning", neutral: "bg-neutral-400 dark:bg-neutral-500" } as const;

/** Estado de um registo, com a mesma etiqueta com ponto que a Cloudflare usa para «Active», e uma dica com o significado e o passo seguinte. */
export function Estado({ valor, modulo, variante: forcada }: { valor: string; modulo?: string; variante?: keyof typeof PONTO }) {
  const { funcao } = useApp();
  const variante = forcada ?? (CONCLUIDO.has(valor) ? "success" : NEGATIVO.has(valor) ? "error" : ATENCAO.has(valor) ? "warning" : "neutral");
  const significado = modulo ? significadoDoEstado(modulo, valor) : significadoDoEstado("*", valor);
  const temFluxo = !!(modulo && REGISTOS[modulo]?.transicoes);
  const passos = modulo && temFluxo ? passosSeguintes(modulo, valor, funcao) : [];
  const etiqueta = (
    <Badge variant="outline" className="inline-flex items-center gap-1.5 border-0 bg-white shadow-xs ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/20">
      <span aria-hidden className={`size-1.5 rounded-full ${PONTO[variante]}`} />
      {valor}
    </Badge>
  );
  if (!significado && passos.length === 0) return etiqueta;
  const linhas =
    passos.length > 0
      ? passos.map((p) => ({ rotulo: "Passo seguinte", valor: `${p.rotulo} · ${p.quem}${p.permitido ? " (a sua função pode)" : " (a sua função não pode)"}` }))
      : temFluxo
        ? [{ rotulo: "Passo seguinte", valor: "Nenhum: é um estado final." }]
        : [];
  return <Dica conteudo={<CorpoDica titulo={valor} texto={significado ?? undefined} linhas={linhas} />}>{etiqueta}</Dica>;
}
