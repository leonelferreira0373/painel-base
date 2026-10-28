// Módulos abertos há pouco e módulos fixados no menu, guardados só neste navegador.
const CHAVE = "painel.recentes";
const CHAVE_FIXOS = "painel.fixados";

function ler(chave: string): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(chave) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function gravar(chave: string, valor: string[]): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
    window.dispatchEvent(new CustomEvent("painel:menu"));
  } catch {
    /* sem armazenamento */
  }
}

export const lerRecentes = () => ler(CHAVE);
export const lerFixados = () => ler(CHAVE_FIXOS);

export function registarRecente(caminho: string): void {
  if (caminho === "/") return;
  gravar(CHAVE, [caminho, ...lerRecentes().filter((c) => c !== caminho)].slice(0, 6));
}

export function alternarFixado(caminho: string): void {
  const atuais = lerFixados();
  gravar(CHAVE_FIXOS, atuais.includes(caminho) ? atuais.filter((c) => c !== caminho) : [...atuais, caminho]);
}
