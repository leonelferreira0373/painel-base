// Descodificação de texto, deteção do separador e leitura de CSV (RFC 4180). Funções puras, testáveis em Node.
import type { Celula } from "@/lib/tipos";

export function descodificar(bytes: Uint8Array): { texto: string; codificacao: string } {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { texto: new TextDecoder("utf-8").decode(bytes.subarray(3)), codificacao: "UTF-8" };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { texto: new TextDecoder("utf-16le").decode(bytes.subarray(2)), codificacao: "UTF-16 LE" };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { texto: new TextDecoder("utf-16be").decode(bytes.subarray(2)), codificacao: "UTF-16 BE" };
  }
  try {
    return { texto: new TextDecoder("utf-8", { fatal: true }).decode(bytes), codificacao: "UTF-8" };
  } catch {
    return { texto: new TextDecoder("windows-1252").decode(bytes), codificacao: "Windows-1252" };
  }
}

const SEPARADORES = [",", ";", "\t", "|"];

/** O separador é o que dá o mesmo número de colunas (maior que 1) no maior número de linhas das primeiras 30. */
export function detetarSeparador(texto: string): string {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "").slice(0, 30);
  let melhor = ",";
  let melhorPontos = 0;
  for (const sep of SEPARADORES) {
    const contagens = linhas.map((l) => contarForaDeAspas(l, sep));
    const moda = modaDe(contagens);
    if (moda === 0) continue;
    const iguais = contagens.filter((c) => c === moda).length;
    const pontos = iguais * (moda + 1);
    if (pontos > melhorPontos) {
      melhorPontos = pontos;
      melhor = sep;
    }
  }
  return melhor;
}

function contarForaDeAspas(linha: string, sep: string): number {
  let dentro = false;
  let n = 0;
  for (const c of linha) {
    if (c === '"') dentro = !dentro;
    else if (c === sep && !dentro) n++;
  }
  return n;
}

function modaDe(valores: number[]): number {
  const mapa = new Map<number, number>();
  for (const v of valores) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  let moda = 0;
  let maior = 0;
  for (const [v, n] of mapa) {
    if (n > maior || (n === maior && v > moda)) {
      maior = n;
      moda = v;
    }
  }
  return moda;
}

export function analisarCsv(texto: string, sep: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentro = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentro) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentro = false;
      } else campo += c;
    } else if (c === '"' && campo === "") dentro = true;
    else if (c === sep) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      campo = "";
      if (linha.length > 1 || linha[0] !== "") linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    if (linha.length > 1 || linha[0] !== "") linhas.push(linha);
  }
  return linhas;
}

const SO_NUMERO = /^[-+]?[\d\s.,]+%?$/;
const PARECE_DATA = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/;

/** A primeira linha é cabeçalho quando todas as células têm texto, são únicas e nenhuma é número ou data. */
export function temCabecalho(primeira: Celula[]): boolean {
  const nomes = primeira.map((c) => String(c ?? "").trim());
  if (nomes.some((n) => n === "")) return false;
  if (new Set(nomes.map((n) => n.toLowerCase())).size !== nomes.length) return false;
  return !nomes.some((n) => SO_NUMERO.test(n) || PARECE_DATA.test(n));
}

export function aTabela(matriz: Celula[][]): { colunas: string[]; linhas: Celula[][] } {
  const largura = matriz.reduce((m, l) => Math.max(m, l.length), 0);
  const normal = matriz.map((l) => {
    const copia = l.slice();
    while (copia.length < largura) copia.push(null);
    return copia;
  });
  if (normal.length === 0) return { colunas: [], linhas: [] };
  if (normal.length > 1 && temCabecalho(normal[0])) {
    return { colunas: normal[0].map((c) => String(c).trim()), linhas: normal.slice(1) };
  }
  return { colunas: Array.from({ length: largura }, (_, i) => `Coluna ${i + 1}`), linhas: normal };
}

const ASCII = (b: number | undefined) => b !== undefined && b >= 32 && b < 127;
const LETRA = (b: number | undefined) => b !== undefined && ((b >= 65 && b <= 90) || (b >= 97 && b <= 122));

/** Texto imprimível de um ficheiro binário: sequências de pelo menos 6 caracteres em ASCII, UTF-8 latino, Latin-1 dentro de palavras e UTF-16 (usado nos Office antigos). */
export function textoImprimivel(bytes: Uint8Array, limite = 4000): string[] {
  const saida: string[] = [];
  let atual = "";
  const fecha = () => {
    if (atual.length >= 6) saida.push(atual);
    atual = "";
  };
  for (let i = 0; i < bytes.length && saida.length < limite; i++) {
    const b = bytes[i];
    if (ASCII(b)) atual += String.fromCharCode(b);
    else if (b === 0xc3 && bytes[i + 1] !== undefined && bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xbf) {
      atual += String.fromCharCode(0xc0 + (bytes[i + 1] - 0x80));
      i++;
    } else if (b >= 0xc0 && LETRA(bytes[i - 1]) && LETRA(bytes[i + 1])) atual += String.fromCharCode(b);
    else fecha();
  }
  fecha();
  // UTF-16 little-endian: carácter seguido de um byte nulo
  atual = "";
  for (let i = 0; i + 1 < bytes.length && saida.length < limite; i += 1) {
    if (ASCII(bytes[i]) && bytes[i + 1] === 0) {
      atual += String.fromCharCode(bytes[i]);
      i++;
    } else if (atual !== "") fecha();
  }
  fecha();
  return saida;
}
