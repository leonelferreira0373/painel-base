// A variação de um indicador face ao período anterior, num só sítio: se subiu, uma seta oblíqua para cima (↗) com a percentagem de crescimento; se desceu, uma seta oblíqua para baixo (↘) com a percentagem de descida; se ficou igual, sem seta e a cinzento. A cor diz se foi bom ou mau (`pior` marca os indicadores em que subir é mau: pagamentos pendentes, erros), a seta diz sempre o que aconteceu.
import type { ReactNode } from "react";
import { Ic } from "./Icones";

import { sentidoDe, textoDaVariacao, type Sentido } from "@/lib/variacao";

const FRASE: Record<Sentido, string> = { subiu: "Subiu", desceu: "Desceu", igual: "Sem variação" };

export function IndicadorDeVariacao({ variacao, pior = false, tamanho = "text-[13px]", valor }: { variacao: number; pior?: boolean; tamanho?: string; /** Desenha o número de outra maneira (por exemplo, a rodar); por omissão é texto. */ valor?: (texto: string) => ReactNode }) {
  const sentido = sentidoDe(variacao);
  const bom = sentido === "subiu" ? !pior : sentido === "desceu" ? pior : null;
  const cor = bom === null ? "text-kumo-subtle" : bom ? "text-kumo-success" : "text-kumo-danger";
  const texto = textoDaVariacao(variacao);
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${tamanho} ${cor}`} role="img" aria-label={sentido === "igual" ? FRASE.igual : `${FRASE[sentido]} ${texto}`}>
      {sentido !== "igual" && <Ic nome={sentido === "subiu" ? "subida" : "descida"} tamanho={13} />}
      {valor ? valor(texto) : texto}
    </span>
  );
}
