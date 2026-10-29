// Quem pode enviar e receber ficheiros pelo painel (o SnapShare por WebRTC): cada função tem os seus dois interruptores, e o que chega pode ser recusado por ser demasiado grande ou por ser um programa. O que passa fica guardado no painel, na pasta «Recebidos» do gestor de ficheiros. Funções puras; o ecrã guarda a política e aplica-a.
import { FUNCOES, podeEditar, podeVer } from "@/dados/rbac";

export interface PoliticaDePartilha {
  /** Os identificadores das funções que podem enviar ficheiros. */
  enviar: string[];
  /** Os identificadores das funções que podem receber (e guardar) ficheiros. */
  receber: string[];
  /** O que chega guarda-se no gestor de ficheiros do painel. */
  guardarNaBiblioteca: boolean;
  /** A pasta do gestor de ficheiros onde fica o que chega («Recebidos»). */
  pasta: string;
  /** O tamanho máximo de cada ficheiro, em MB; 0 é sem limite. */
  tamanhoMaximoMb: number;
  /** Recusar programas e scripts (.exe, .bat, .sh, .apk…). */
  recusarProgramas: boolean;
}

export const EXTENSOES_DE_PROGRAMAS = [".exe", ".bat", ".cmd", ".com", ".scr", ".msi", ".js", ".vbs", ".ps1", ".sh", ".apk", ".jar", ".dll", ".app", ".dmg"];

/** De origem, enviam as funções que podem alterar o módulo e recebem as que o podem ver. */
export const POLITICA_DE_ORIGEM: PoliticaDePartilha = {
  enviar: FUNCOES.filter((f) => podeEditar(f, "conteudo", "partilha")).map((f) => f.id),
  receber: FUNCOES.filter((f) => podeVer(f, "conteudo", "partilha")).map((f) => f.id),
  guardarNaBiblioteca: true,
  pasta: "Recebidos",
  tamanhoMaximoMb: 0,
  recusarProgramas: true,
};

export const podeEnviar = (p: PoliticaDePartilha, funcaoId: string): boolean => p.enviar.includes(funcaoId);
export const podeReceber = (p: PoliticaDePartilha, funcaoId: string): boolean => p.receber.includes(funcaoId);

/** Liga ou desliga uma função num dos dois sentidos. */
export function alternarFuncao(p: PoliticaDePartilha, sentido: "enviar" | "receber", funcaoId: string, ligado: boolean): PoliticaDePartilha {
  const sem = p[sentido].filter((x) => x !== funcaoId);
  return { ...p, [sentido]: ligado ? [...sem, funcaoId] : sem };
}

export const eProgramaOuScript = (nome: string): boolean => EXTENSOES_DE_PROGRAMAS.some((e) => nome.toLowerCase().endsWith(e));

/** Por que razão um ficheiro que chega não se aceita, ou null se pode entrar. */
export function motivoDeRecusa(p: PoliticaDePartilha, funcaoId: string, f: { nome: string; tamanho: number }): string | null {
  if (!podeReceber(p, funcaoId)) return "Esta função não pode receber ficheiros.";
  if (p.recusarProgramas && eProgramaOuScript(f.nome)) return "Os programas e os scripts estão recusados.";
  if (p.tamanhoMaximoMb > 0 && f.tamanho > p.tamanhoMaximoMb * 1024 * 1024) return `O ficheiro passa do limite de ${p.tamanhoMaximoMb} MB.`;
  return null;
}

/** O nome de uma pasta de destino aceitável: sem barras nem nomes vazios (uma pasta só, na raiz do gestor de ficheiros). */
export const pastaValida = (nome: string): boolean => nome.trim().length > 0 && nome.trim().length <= 60 && !/[\\/:*?"<>|]/.test(nome);

/** A política guardada pode ter funções que já não existem, ou nada: reduz-se ao que serve. */
export function politicaValida(p: Partial<PoliticaDePartilha> | null | undefined): PoliticaDePartilha {
  const ids = new Set(FUNCOES.map((f) => f.id));
  const base = POLITICA_DE_ORIGEM;
  return {
    enviar: Array.isArray(p?.enviar) ? p.enviar.filter((x) => ids.has(x)) : base.enviar,
    receber: Array.isArray(p?.receber) ? p.receber.filter((x) => ids.has(x)) : base.receber,
    guardarNaBiblioteca: p?.guardarNaBiblioteca ?? base.guardarNaBiblioteca,
    pasta: p?.pasta && pastaValida(p.pasta) ? p.pasta.trim() : base.pasta,
    tamanhoMaximoMb: typeof p?.tamanhoMaximoMb === "number" && p.tamanhoMaximoMb >= 0 ? p.tamanhoMaximoMb : base.tamanhoMaximoMb,
    recusarProgramas: p?.recusarProgramas ?? base.recusarProgramas,
  };
}
