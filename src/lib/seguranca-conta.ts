// A segurança de cada conta, em contas puras: o código das aplicações autenticadoras (TOTP, RFC 6238), os códigos de uso único que se mandam por e-mail ou SMS, os contactos de recuperação (que também recebem esses códigos) e o modo de entrada de cada pessoa (palavra-passe, ou só um código). A chave segura do navegador está em chave-do-navegador.ts.
import { hmac } from "@noble/hashes/hmac.js";
import { sha1 } from "@noble/hashes/legacy.js";
import { aleatorios } from "./cripto";

// ---------- base32 (o formato dos segredos das aplicações autenticadoras) ----------

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function paraBase32(bytes: Uint8Array): string {
  let bits = 0;
  let valor = 0;
  let saida = "";
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      saida += B32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += B32[(valor << (5 - bits)) & 31];
  return saida;
}

export function deBase32(texto: string): Uint8Array {
  const limpo = texto.toUpperCase().replace(/[\s=-]/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let valor = 0;
  for (const c of limpo) {
    const i = B32.indexOf(c);
    if (i < 0) throw new Error("Segredo inválido.");
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

/** Um segredo guardado por este painel: letras maiúsculas e algarismos de 2 a 7, sem espaços (o das contas antigas da simulação tem minúsculas e hífenes). */
export const eBase32 = (t: string): boolean => /^[A-Z2-7]{16,}=*$/.test(t);

/** Um segredo novo para uma aplicação autenticadora: 20 bytes aleatórios em base32 (32 letras). */
export const gerarSegredoTotp = (): string => paraBase32(aleatorios(20));

/** O segredo em grupos de quatro, para ler e escrever à mão. */
export const segredoEmGrupos = (s: string): string => s.replace(/\s/g, "").match(/.{1,4}/g)?.join(" ") ?? s;

// ---------- o código temporal (TOTP) ----------

/** Os bytes de um segredo: base32, ou, nas contas antigas da simulação, o próprio texto. */
const bytesDoSegredo = (segredo: string): Uint8Array => (eBase32(segredo) ? deBase32(segredo) : new TextEncoder().encode(segredo));

/** O código de `digitos` dígitos para o instante `agora` (milissegundos), como o de uma aplicação autenticadora (HMAC-SHA1, passos de 30 s). */
export function codigoTotp(segredo: string, agora = Date.now(), passo = 30, digitos = 6): string {
  const contador = Math.floor(agora / 1000 / passo);
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setUint32(4, contador >>> 0);
  new DataView(msg.buffer).setUint32(0, Math.floor(contador / 2 ** 32));
  const h = hmac(sha1, bytesDoSegredo(segredo), msg);
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digitos).padStart(digitos, "0");
}

/** O código serve? Aceita o passo anterior e o seguinte (os relógios nunca estão certinhos). */
export function verificarTotp(segredo: string, codigo: string, agora = Date.now(), janela = 1): boolean {
  const c = codigo.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return false;
  for (let i = -janela; i <= janela; i++) if (codigoTotp(segredo, agora + i * 30_000) === c) return true;
  return false;
}

/** O endereço otpauth:// que as aplicações autenticadoras leem (o QR code leva isto). */
export const urlOtpAuth = (emissor: string, conta: string, segredo: string): string => `otpauth://totp/${encodeURIComponent(`${emissor}:${conta}`)}?secret=${segredo.replace(/\s/g, "")}&issuer=${encodeURIComponent(emissor)}&algorithm=SHA1&digits=6&period=30`;

// ---------- os códigos de uso único ----------

/** Um código de seis dígitos, de uma fonte criptográfica. */
export function gerarCodigoDeUso(): string {
  const b = aleatorios(4);
  const n = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
  return String(100000 + (n % 900000));
}

/** Quanto tempo vale um código de uso único. */
export const VALIDADE_DO_CODIGO_MS = 10 * 60_000;

// ---------- os contactos de recuperação ----------

export type TipoDeContacto = "email" | "telefone";

export interface ContactoDeRecuperacao {
  id: string;
  tipo: TipoDeContacto;
  /** O e-mail ou o número com indicativo («+244 923 000 000»). */
  valor: string;
  verificado: boolean;
}

const emailValido = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.trim());
const soDigitos = (t: string) => t.replace(/\D/g, "");

/** O que está mal num contacto de recuperação novo (formato, repetido, igual ao e-mail da conta), ou null. */
export function erroDoContacto(tipo: TipoDeContacto, valor: string, existentes: ContactoDeRecuperacao[], emailDaConta: string): string | null {
  const v = valor.trim();
  if (!v) return tipo === "email" ? "Escreva o e-mail." : "Escreva o número.";
  if (tipo === "email") {
    if (!emailValido(v)) return "Esse e-mail não parece certo.";
    if (v.toLowerCase() === emailDaConta.trim().toLowerCase()) return "Tem de ser diferente do e-mail da conta.";
    if (existentes.some((c) => c.tipo === "email" && c.valor.toLowerCase() === v.toLowerCase())) return "Esse e-mail já está na lista.";
    return null;
  }
  const d = soDigitos(v);
  if (d.length < 8 || d.length > 15) return "O número tem de ter entre 8 e 15 algarismos, com o indicativo.";
  if (existentes.some((c) => c.tipo === "telefone" && soDigitos(c.valor) === d)) return "Esse número já está na lista.";
  return null;
}

/** «m•••@empresa.pt» ou «+244 ••• ••• 000». */
export function mascararContacto(tipo: TipoDeContacto, valor: string): string {
  if (tipo === "email") {
    const [a, b] = valor.split("@");
    return b ? `${a[0]}${"•".repeat(Math.max(2, a.length - 1))}@${b}` : valor;
  }
  const d = soDigitos(valor);
  return d.length <= 4 ? valor : `+${d.slice(0, d.length > 9 ? d.length - 9 : 0) || ""}${d.length > 9 ? " " : ""}••• ••• ${d.slice(-3)}`.trim();
}

export interface DestinoDoCodigo {
  tipo: TipoDeContacto;
  valor: string;
  mascara: string;
  /** «conta» é o e-mail da conta; os outros são contactos de recuperação. */
  origem: "conta" | "recuperacao";
}

/** Para onde vai um código de uso único: o e-mail da conta e, se a pessoa deixou, o e-mail e o telefone de recuperação e os contactos verificados que juntou. */
export function destinosDoCodigo(c: { email: string; emailRecuperacao?: string; telefone?: string; telefoneVerificado?: boolean; recuperacao?: ContactoDeRecuperacao[]; codigosTambemParaRecuperacao?: boolean }): DestinoDoCodigo[] {
  const saida: DestinoDoCodigo[] = [{ tipo: "email", valor: c.email, mascara: mascararContacto("email", c.email), origem: "conta" }];
  if (c.codigosTambemParaRecuperacao === false) return saida;
  const extra: { tipo: TipoDeContacto; valor: string }[] = [];
  if (c.emailRecuperacao) extra.push({ tipo: "email", valor: c.emailRecuperacao });
  if (c.telefone && c.telefoneVerificado) extra.push({ tipo: "telefone", valor: c.telefone });
  for (const r of c.recuperacao ?? []) if (r.verificado) extra.push({ tipo: r.tipo, valor: r.valor });
  const vistos = new Set(saida.map((d) => `${d.tipo}:${d.tipo === "telefone" ? soDigitos(d.valor) : d.valor.toLowerCase()}`));
  for (const e of extra) {
    const k = `${e.tipo}:${e.tipo === "telefone" ? soDigitos(e.valor) : e.valor.toLowerCase()}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    saida.push({ ...e, mascara: mascararContacto(e.tipo, e.valor), origem: "recuperacao" });
  }
  return saida;
}

// ---------- como a pessoa entra ----------

/** «senha»: e-mail e palavra-passe (e, se estiver ligado, o código da aplicação). «so-codigo»: sem palavra-passe, só um código de uso único enviado para os contactos da conta. */
export type ModoDeEntrada = "senha" | "so-codigo";
