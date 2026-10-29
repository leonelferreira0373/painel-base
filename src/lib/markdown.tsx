// Markdown simples para o editor de blog: títulos, parágrafos, listas, citações, código, linhas, negrito, itálico, código em linha, ligações e imagens. Desenha elementos React (nunca HTML escrito à mão), por isso o texto de um artigo não consegue injetar nada. As imagens da biblioteca escrevem-se «![texto](biblioteca:ID)».
import type { ReactNode } from "react";

/** Só estas ligações são seguras: https, http, e-mail e endereços do próprio painel. */
export const ligacaoSegura = (url: string) => /^(https?:\/\/|mailto:|\/)/i.test(url.trim());

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g;

/** O endereço de uma imagem: «biblioteca:ID» pede o endereço guardado à biblioteca; os https servem como estão. */
type UrlDe = (id: string) => string | undefined;

function inline(texto: string, urlDe: UrlDe | undefined, chave: string): ReactNode[] {
  return texto.split(INLINE).map((p, i) => {
    const k = `${chave}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={k}>{p.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(p)) return <em key={k}>{p.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(p)) return <code key={k} className="rounded bg-kumo-tint px-1 py-0.5 text-[0.9em]">{p.slice(1, -1)}</code>;
    const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(p);
    if (img) {
      const alvo = img[2].trim();
      const src = alvo.startsWith("biblioteca:") ? urlDe?.(alvo.slice(11)) : /^https:\/\//i.test(alvo) ? alvo : undefined;
      return src ? <img key={k} src={src} alt={img[1]} className="my-2 max-h-96 max-w-full rounded-lg" /> : <span key={k} className="text-kumo-subtle">[imagem em falta]</span>;
    }
    const lig = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
    if (lig) return ligacaoSegura(lig[2]) ? <a key={k} href={lig[2].trim()} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{lig[1]}</a> : <span key={k}>{lig[1]}</span>;
    return p;
  });
}

export function Markdown({ texto, urlDe }: { texto: string; urlDe?: UrlDe }) {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  const blocos: ReactNode[] = [];
  let i = 0;
  let n = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    const k = `b${n++}`;
    if (l.trim() === "") {
      i++;
    } else if (l.startsWith("```")) {
      const codigo: string[] = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith("```")) codigo.push(linhas[i++]);
      i++;
      blocos.push(<pre key={k} className="my-3 overflow-x-auto rounded-lg bg-kumo-tint p-3 text-sm"><code>{codigo.join("\n")}</code></pre>);
    } else if (/^#{1,3}\s/.test(l)) {
      const nivel = /^#+/.exec(l)![0].length;
      const conteudo = inline(l.replace(/^#+\s*/, ""), urlDe, k);
      blocos.push(nivel === 1 ? <h2 key={k} className="mb-2 mt-5 text-2xl font-semibold">{conteudo}</h2> : nivel === 2 ? <h3 key={k} className="mb-2 mt-4 text-xl font-semibold">{conteudo}</h3> : <h4 key={k} className="mb-1 mt-3 text-lg font-semibold">{conteudo}</h4>);
      i++;
    } else if (/^---+$/.test(l.trim())) {
      blocos.push(<hr key={k} className="my-4 border-kumo-hairline" />);
      i++;
    } else if (l.startsWith(">")) {
      const citacao: string[] = [];
      while (i < linhas.length && linhas[i].startsWith(">")) citacao.push(linhas[i++].replace(/^>\s?/, ""));
      blocos.push(<blockquote key={k} className="my-3 border-l-2 border-kumo-line pl-3 text-kumo-subtle">{inline(citacao.join(" "), urlDe, k)}</blockquote>);
    } else if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ordenada = /^\s*\d+\./.test(l);
      const itens: string[] = [];
      while (i < linhas.length && /^\s*([-*]|\d+\.)\s/.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const filhos = itens.map((t, j) => <li key={`${k}-${j}`}>{inline(t, urlDe, `${k}-${j}`)}</li>);
      blocos.push(ordenada ? <ol key={k} className="my-2 list-decimal pl-6">{filhos}</ol> : <ul key={k} className="my-2 list-disc pl-6">{filhos}</ul>);
    } else {
      const par: string[] = [];
      while (i < linhas.length && linhas[i].trim() !== "" && !/^(#{1,3}\s|```|>|---+$|\s*([-*]|\d+\.)\s)/.test(linhas[i])) par.push(linhas[i++]);
      blocos.push(<p key={k} className="my-2 leading-7">{inline(par.join(" "), urlDe, k)}</p>);
    }
  }
  return <div className="text-sm text-kumo-default">{blocos}</div>;
}
