// Uma frase do painel. Os mesmos dados têm sempre o mesmo aspeto, em todo o lado, e quem os mostra é este ficheiro: um termo que se escreve ou se lê como valor («conta») sai como pill cinzento de informação, sem aspas; um caminho entre ecrãs (Definições da conta > Atalhos) sai com chevrons SVG, nunca com o glifo «→». Nenhum componente desenha isto à mão: o texto escreve-se com «termo» e " > " e passa por <Frase> (as dicas, a pesquisa e os diálogos já o fazem).
import type { ReactNode } from "react";
import { Ic } from "./Icones";

/** O destaque cinzento de um termo dentro de uma frase: texto preto ou branco (a cor principal do tema) sobre um cinzento suave com anel, feitos da própria cor do texto. `inverso` é para fundos invertidos (as dicas), onde o texto já vem da cor do contexto. */
export function Pilula({ children, inverso = false }: { children: ReactNode; inverso?: boolean }) {
  return <span className={`mx-0.5 inline-flex items-center rounded-full bg-current/10 px-2 py-px text-xs font-medium ring ring-current/15 ${inverso ? "text-inherit" : "text-kumo-default"}`}>{children}</span>;
}

/** O separador de um caminho entre ecrãs: um chevron SVG. */
export function SetaDeCaminho() {
  return <Ic nome="seta" tamanho={12} className="mx-1 inline-block align-[-1px]" />;
}

const PARTES = /(«[^»]+»| > )/;

/** Escreve uma frase: «termo» vira pill e " > " vira chevron. */
export function Frase({ children, inverso = false }: { children: string; inverso?: boolean }) {
  return (
    <>
      {children.split(PARTES).map((p, i) => {
        if (p === " > ") return <SetaDeCaminho key={i} />;
        if (p.startsWith("«") && p.endsWith("»")) {
          return (
            <Pilula key={i} inverso={inverso}>
              {p.slice(1, -1)}
            </Pilula>
          );
        }
        return p;
      })}
    </>
  );
}

/** A mesma frase como texto simples, para o que não aceita elementos (aria-label, título): sem as aspas dos termos e com «, » no lugar dos chevrons. */
export function semMarcas(frase: string): string {
  return frase.replace(/ > /g, ", ").replace(/[«»]/g, "");
}
