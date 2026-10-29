// Da escolha do utilizador (dados/aparencia.ts) às variáveis CSS do Kumo: a paleta de cada tema, as cores derivadas (as nuances que ninguém escolhe à mão) e as letras. Funções puras, sem DOM.
import { CORES, TIPOS_DE_LETRA, type Aparencia, type CorId, type LetraId, type Modo } from "@/dados/aparencia";

export type Paleta = Record<CorId, string>;

export const hexValido = (v: string) => /^#[0-9a-f]{6}$/i.test(v.trim());

const canais = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const paraHex = (c: [number, number, number]) => `#${c.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0")).join("")}`;

/** Mistura duas cores: `parte` (0 a 1) da segunda sobre a primeira. */
export function misturar(a: string, b: string, parte: number): string {
  const [ra, ga, ba] = canais(a);
  const [rb, gb, bb] = canais(b);
  return paraHex([ra + (rb - ra) * parte, ga + (gb - ga) * parte, ba + (bb - ba) * parte]);
}

const luminancia = (hex: string) => {
  const [r, g, b] = canais(hex).map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** A razão de contraste entre duas cores (1 a 21); 4,5 é o mínimo para texto corrente. */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** A paleta completa de um tema: a de origem com as cores que o utilizador mudou por cima. */
export function paleta(modo: Modo, a?: Aparencia): Paleta {
  const mudadas = a?.[modo] ?? {};
  return Object.fromEntries(CORES.map((c) => [c.id, hexValido(mudadas[c.id] ?? "") ? mudadas[c.id]! : c[modo]])) as Paleta;
}

/** Se o utilizador mudou alguma cor deste tema. */
export const temCores = (modo: Modo, a?: Aparencia) => Object.keys(a?.[modo] ?? {}).length > 0;

/** As variáveis CSS do Kumo para uma paleta: as escolhidas e as que se derivam delas (nuances, realces e fundos suaves). Com `mudadas`, só as que dependem de alguma das cores mudadas: o resto fica como o Kumo o desenhou. */
export function variaveisDe(p: Paleta, mudadas?: readonly CorId[]): Record<string, string> {
  const { fundo, superficies, texto, textoSecundario: sec, linhas, acento, sucesso, pendente, erro } = p;
  const todas: [string, string, CorId[]][] = [
    ["--color-kumo-canvas", fundo, ["fundo"]],
    ["--color-kumo-base", superficies, ["superficies"]],
    ["--color-kumo-control", superficies, ["superficies"]],
    ["--color-kumo-elevated", misturar(superficies, texto, 0.03), ["superficies", "texto"]],
    ["--color-kumo-recessed", misturar(fundo, texto, 0.045), ["fundo", "texto"]],
    ["--color-kumo-tint", misturar(fundo, texto, 0.06), ["fundo", "texto"]],
    ["--color-kumo-fill", misturar(fundo, texto, 0.1), ["fundo", "texto"]],
    ["--color-kumo-fill-hover", misturar(fundo, texto, 0.14), ["fundo", "texto"]],
    ["--color-kumo-line", linhas, ["linhas"]],
    ["--color-kumo-hairline", misturar(linhas, fundo, 0.45), ["linhas", "fundo"]],
    ["--color-kumo-interact", misturar(linhas, texto, 0.35), ["linhas", "texto"]],
    ["--color-kumo-contrast", texto, ["texto"]],
    ["--text-color-kumo-default", texto, ["texto"]],
    ["--text-color-kumo-strong", texto, ["texto"]],
    ["--text-color-kumo-subtle", sec, ["textoSecundario"]],
    ["--text-color-kumo-inactive", misturar(sec, fundo, 0.45), ["textoSecundario", "fundo"]],
    ["--text-color-kumo-placeholder", misturar(sec, fundo, 0.25), ["textoSecundario", "fundo"]],
    ["--color-kumo-brand", acento, ["acento"]],
    ["--color-kumo-brand-hover", misturar(acento, texto, 0.14), ["acento", "texto"]],
    ["--text-color-kumo-brand", acento, ["acento"]],
    ["--color-kumo-focus", acento, ["acento"]],
    ["--color-kumo-success", sucesso, ["sucesso"]],
    ["--text-color-kumo-success", sucesso, ["sucesso"]],
    ["--color-kumo-success-tint", misturar(fundo, sucesso, 0.14), ["fundo", "sucesso"]],
    ["--color-kumo-warning", pendente, ["pendente"]],
    ["--text-color-kumo-warning", pendente, ["pendente"]],
    ["--color-kumo-warning-tint", misturar(fundo, pendente, 0.14), ["fundo", "pendente"]],
    ["--color-kumo-danger", erro, ["erro"]],
    ["--text-color-kumo-danger", erro, ["erro"]],
    ["--color-kumo-danger-tint", misturar(fundo, erro, 0.12), ["fundo", "erro"]],
  ];
  return Object.fromEntries(todas.filter(([, , deps]) => !mudadas || deps.some((d) => mudadas.includes(d))).map(([nome, valor]) => [nome, valor]));
}

/** A pilha de letras de uma escolha: uma das do painel ou «pers:Nome», uma letra instalada no aparelho que a pessoa escreveu (com a do painel como reserva). */
export const pilhaDe = (id: string | undefined, reserva = "inter"): string =>
  id?.startsWith("pers:") ? `"${id.slice(5).replace(/["\\]/g, "")}", ${pilhaDe(reserva)}` : (TIPOS_DE_LETRA.find((t) => t.id === id) ?? TIPOS_DE_LETRA.find((t) => t.id === reserva)!).pilha;

/** As variáveis das letras que o utilizador mudou (as que não mudou ficam com a letra do painel). */
export function variaveisDeLetras(letras?: Partial<Record<LetraId, string>>): Record<string, string> {
  const v: Record<string, string> = {};
  if (letras?.corpo) v["--font-sans"] = pilhaDe(letras.corpo);
  if (letras?.titulos) v["--fonte-titulos"] = pilhaDe(letras.titulos);
  if (letras?.numeros) v["--fonte-numeros"] = pilhaDe(letras.numeros);
  return v;
}

/** Tudo o que a aparência do utilizador muda num tema (vazio se ele não mudou nada). */
export function variaveisDoTema(modo: Modo, a?: Aparencia): Record<string, string> {
  return { ...(temCores(modo, a) ? variaveisDe(paleta(modo, a), Object.keys(a?.[modo] ?? {}) as CorId[]) : {}), ...variaveisDeLetras(a?.letras) };
}
