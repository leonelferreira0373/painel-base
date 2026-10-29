// Recuperar a palavra-passe de uma nota. Ao proteger uma nota, a palavra-passe fica também cifrada com uma chave de recuperação aleatória (que nunca sai do cofre): quem esquece a palavra-passe pede um código, que só vai para o e-mail da própria conta, e com o código certo o cofre devolve a chave e a nota abre-se. Em modo simulado o cofre vive neste navegador; em modo ligado é o servidor que o guarda e o entrega depois do código.
import { aleatorios, cifrarAes, decifrarAes } from "./cripto";
import { deBase64, paraBase64 } from "./notas";

export interface Recuperacao {
  /** Base64. */
  iv: string;
  dados: string;
}

/** Cifra a palavra-passe com uma chave de recuperação nova. A cifra fica na nota; a chave vai para o cofre. */
export async function criarRecuperacao(senha: string): Promise<{ recuperacao: Recuperacao; chave: string }> {
  const chave = aleatorios(32);
  const iv = aleatorios(12);
  const dados = await cifrarAes({ js: chave }, iv, new TextEncoder().encode(senha));
  return { recuperacao: { iv: paraBase64(iv), dados: paraBase64(dados) }, chave: paraBase64(chave) };
}

/** A palavra-passe de volta, ou `null` se a chave não é a desta nota. */
export async function senhaRecuperada(r: Recuperacao, chave: string): Promise<string | null> {
  try {
    return new TextDecoder().decode(await decifrarAes({ js: deBase64(chave) }, deBase64(r.iv), deBase64(r.dados)));
  } catch {
    return null;
  }
}

/** Um código de seis dígitos, de uma fonte criptográfica. */
export function gerarCodigo(): string {
  const b = aleatorios(4);
  const n = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
  return String(100000 + (n % 900000));
}

// ---------- o cofre (neste navegador, enquanto não há servidor) ----------

const COFRE = "painel.notas.cofre";

function lerCofre(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(COFRE) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
function guardarCofre(c: Record<string, string>): void {
  try {
    window.localStorage.setItem(COFRE, JSON.stringify(c));
  } catch {
    /* sem armazenamento */
  }
}

export const guardarNoCofre = (notaId: string, chave: string): void => guardarCofre({ ...lerCofre(), [notaId]: chave });
export const lerDoCofre = (notaId: string): string | null => lerCofre()[notaId] ?? null;
export function tirarDoCofre(notaId: string): void {
  const { [notaId]: _tirada, ...resto } = lerCofre();
  guardarCofre(resto);
}

/** O e-mail com o código: só vai para o endereço da conta de quem escreveu a nota. */
export function textoDoEmailDeRecuperacao(rotuloDoSitio: string, codigo: string): { assunto: string; corpo: string } {
  return {
    assunto: "Código para recuperar a palavra-passe de uma nota",
    corpo: `Olá,\n\nPediu para recuperar a palavra-passe de uma nota em «${rotuloDoSitio}».\n\nO código é ${codigo.slice(0, 3)} ${codigo.slice(3)}. Vale 10 minutos e só funciona neste pedido.\n\nSe não foi você, ignore este e-mail: a nota continua protegida.`,
  };
}
