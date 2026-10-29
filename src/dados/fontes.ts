// As letras que a pessoa carrega para o painel: o que se guarda de cada uma e os limites. Os ficheiros ficam no navegador (ver lib/fontes.ts); na conta fica só esta descrição.

export interface FonteCarregada {
  id: string;
  /** O nome da família, o mesmo que se usa em CSS e que aparece nos seletores. */
  nome: string;
  origem: "ficheiro" | "ligacao";
  /** A ligação (só quando a origem é «ligacao»): um ficheiro de letra ou uma folha de estilos como a do Google Fonts. */
  url?: string;
  criada: string;
}

/** Os formatos de ficheiro de letra que o navegador lê. */
export const FORMATOS_DE_LETRA = [".ttf", ".otf", ".woff", ".woff2"] as const;

/** O maior ficheiro de letra aceite: mais do que isto torna o painel lento a abrir. */
export const TAMANHO_MAXIMO_DA_LETRA = 5 * 1024 * 1024;
