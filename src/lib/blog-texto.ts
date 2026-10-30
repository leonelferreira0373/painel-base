// O que o editor de blog precisa de saber sobre o texto, sem depender do editor: mudar as maiúsculas e minúsculas, contar palavras e o tempo de leitura, e os valores de espaçamento, avanço e caixas que se oferecem.

export type ModoDeCaixa = "maiusculas" | "minusculas" | "titulo" | "frase";

export const MODOS_DE_CAIXA: { id: ModoDeCaixa; rotulo: string }[] = [
  { id: "maiusculas", rotulo: "MAIÚSCULAS" },
  { id: "minusculas", rotulo: "minúsculas" },
  { id: "titulo", rotulo: "Cada Palavra Em Maiúscula" },
  { id: "frase", rotulo: "Só a primeira letra da frase" },
];

/** As palavras que num título ficam em minúsculas (menos à cabeça). */
const PALAVRAS_PEQUENAS = new Set(["a", "as", "o", "os", "um", "uma", "de", "da", "das", "do", "dos", "e", "em", "na", "nas", "no", "nos", "ao", "aos", "à", "às", "para", "por", "com", "ou"]);

/** O texto com as maiúsculas e minúsculas mudadas (em português: «Cada Palavra» deixa «de», «da», «e»… em minúsculas, menos na primeira). */
export function aplicarCaixa(texto: string, modo: ModoDeCaixa): string {
  const baixo = texto.toLocaleLowerCase("pt-PT");
  if (modo === "maiusculas") return texto.toLocaleUpperCase("pt-PT");
  if (modo === "minusculas") return baixo;
  if (modo === "frase") return baixo.replace(/(^|[.!?]\s+)(\p{L})/gu, (_, antes: string, letra: string) => antes + letra.toLocaleUpperCase("pt-PT"));
  let primeira = true;
  return baixo.replace(/\p{L}[\p{L}\p{M}'’-]*/gu, (palavra) => {
    const fica = !primeira && PALAVRAS_PEQUENAS.has(palavra);
    primeira = false;
    return fica ? palavra : palavra.charAt(0).toLocaleUpperCase("pt-PT") + palavra.slice(1);
  });
}

export interface ContagemDoTexto {
  palavras: number;
  caracteres: number;
  semEspacos: number;
  /** Minutos de leitura a 200 palavras por minuto (pelo menos 1 se houver texto). */
  minutos: number;
}

export function contarTexto(texto: string): ContagemDoTexto {
  const t = texto.trim();
  const palavras = t ? t.split(/\s+/).length : 0;
  return { palavras, caracteres: texto.length, semEspacos: texto.replace(/\s/g, "").length, minutos: palavras ? Math.max(1, Math.round(palavras / 200)) : 0 };
}

/** O espaço entre as linhas de um parágrafo: o de partida do artigo e os que se escolhem (o valor é a altura da linha). */
export const ESPACAMENTOS_DE_LINHA: { valor: number | null; rotulo: string }[] = [
  { valor: null, rotulo: "Normal" },
  { valor: 1.2, rotulo: "Simples" },
  { valor: 1.5, rotulo: "1,5" },
  { valor: 2, rotulo: "Duplo" },
];

/** O espaço antes de um parágrafo (em «em»): o de partida e os que se escolhem. */
export const ESPACOS_ANTES: { valor: number | null; rotulo: string }[] = [
  { valor: null, rotulo: "Normal" },
  { valor: 0, rotulo: "Nenhum" },
  { valor: 0.4, rotulo: "Pequeno" },
  { valor: 1.8, rotulo: "Grande" },
];

export const AVANCO_MAXIMO = 8;

/** O avanço (níveis de 2 rem) dentro do que se permite. */
export const limitarAvanco = (n: number): number => Math.max(0, Math.min(AVANCO_MAXIMO, Math.round(Number.isFinite(n) ? n : 0)));

/** As caixas de destaque: o que se vê no menu e o tom (a folha de estilo do artigo desenha cada um). */
export const TONS_DE_CAIXA = [
  { id: "info", rotulo: "Informação" },
  { id: "aviso", rotulo: "Atenção" },
  { id: "sucesso", rotulo: "Sucesso" },
  { id: "perigo", rotulo: "Perigo" },
  { id: "nota", rotulo: "Nota" },
] as const;

export type TomDeCaixa = (typeof TONS_DE_CAIXA)[number]["id"];

export const tomDeCaixa = (valor: unknown): TomDeCaixa => TONS_DE_CAIXA.find((t) => t.id === valor)?.id ?? "info";
