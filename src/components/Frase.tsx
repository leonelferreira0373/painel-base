// Uma frase do painel. Os mesmos dados têm sempre o mesmo aspeto, em todo o lado, e quem os mostra é este ficheiro: um termo que se escreve ou se lê como valor («conta») sai como pill cinzento de informação, sem aspas; um caminho entre ecrãs (Definições da conta > Atalhos) sai com chevrons SVG, nunca com o glifo «→». Nenhum componente desenha isto à mão: o texto escreve-se com «termo» e " > " e passa por <Frase> (as dicas, a pesquisa e os diálogos já o fazem).
import type { ReactNode } from "react";
import { eRota, frasaDaRota, textoDaRota } from "@/lib/rotas";
import { Ic } from "./Icones";
import { Pilula } from "./Pilula";

/** O destaque cinzento de um termo dentro de uma frase (ver Pilula.tsx): um quadrado de cantos suaves que se clica para o explicar. */
export { Pilula };

/** O separador de um caminho entre ecrãs: um chevron SVG. */
export function SetaDeCaminho() {
  return <Ic nome="seta" tamanho={12} className="mx-1 inline-block align-[-1px]" />;
}

const PARTES = /(«[^»]+»| > )/;

/** Escreve uma frase: «termo» vira pill e " > " vira chevron. */
export function Frase({ children, inverso = false, contexto }: { children: string; inverso?: boolean; contexto?: string }) {
  return (
    <>
      {children.split(PARTES).map((p, i) => {
        if (p === " > ") return <SetaDeCaminho key={i} />;
        if (p.startsWith("«") && p.endsWith("»")) {
          return (
            <Pilula key={i} inverso={inverso} contexto={contexto}>
              {p.slice(1, -1)}
            </Pilula>
          );
        }
        return p;
      })}
    </>
  );
}

/** Uma rota do site como o painel a mostra: o nome da página, um pill por pedaço e um chevron entre eles («/compras/homens» → «Compras» > «Homens»). Os endereços técnicos (/api/…, ficheiros) ficam como código, para quem programa. */
export function Rota({ caminho }: { caminho: string }) {
  if (!eRota(caminho)) return <code className="text-xs">{caminho}</code>;
  return <Frase contexto={textoDaRota(caminho)}>{frasaDaRota(caminho)}</Frase>;
}

/** A mesma frase como texto simples, para o que não aceita elementos (aria-label, título): sem as aspas dos termos e com «, » no lugar dos chevrons. */
export function semMarcas(frase: string): string {
  return frase.replace(/ > /g, ", ").replace(/[«»]/g, "");
}
