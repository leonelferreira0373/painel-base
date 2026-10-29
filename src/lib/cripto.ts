// As contas de criptografia do painel (notas com palavra-passe, tokens da API, códigos de uso único). Usam a Web Crypto do navegador, que só existe em ligações seguras (https ou localhost); quando não existe (o painel aberto por http numa rede local, por exemplo) usam uma versão em JavaScript puro (@noble) que dá exatamente os mesmos resultados, por isso uma nota cifrada num sítio abre-se no outro.
import { gcm } from "@noble/ciphers/aes.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha1 } from "@noble/hashes/legacy.js";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

const subtle = (): SubtleCrypto | null => (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle ? globalThis.crypto.subtle : null);

/** A Web Crypto está disponível (ligação segura)? Sem ela, os cálculos fazem-se em JavaScript e demoram mais. */
export const temWebCrypto = (): boolean => !!subtle();

const codificador = new TextEncoder();

export const paraHex = (b: Uint8Array): string => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Bytes aleatórios de uma fonte criptográfica (existe em qualquer ligação). */
export const aleatorios = (n: number): Uint8Array => globalThis.crypto.getRandomValues(new Uint8Array(n));

export async function sha256Bytes(dados: Uint8Array): Promise<Uint8Array> {
  const s = subtle();
  return s ? new Uint8Array(await s.digest("SHA-256", dados as BufferSource)) : sha256(dados);
}

export const sha256Hex = async (texto: string): Promise<string> => paraHex(await sha256Bytes(codificador.encode(texto)));

/** HMAC-SHA1 (é o que os códigos de aplicações como o Google Authenticator usam). */
export async function hmacSha1(chave: Uint8Array, dados: Uint8Array): Promise<Uint8Array> {
  const s = subtle();
  if (!s) return hmac(sha1, chave, dados);
  const k = await s.importKey("raw", chave as BufferSource, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return new Uint8Array(await s.sign("HMAC", k, dados as BufferSource));
}

/** Uma chave AES-256: a do navegador (não se deixa ler) ou, sem Web Crypto, os bytes em JavaScript. */
export type ChaveAes = CryptoKey | { js: Uint8Array };

/** A chave AES derivada de uma palavra-passe (PBKDF2 com SHA-256) e de um sal. */
export async function derivarChaveAes(senha: string, sal: Uint8Array, voltas: number): Promise<ChaveAes> {
  const s = subtle();
  if (s) {
    const base = await s.importKey("raw", codificador.encode(senha), "PBKDF2", false, ["deriveKey"]);
    return s.deriveKey({ name: "PBKDF2", salt: sal as BufferSource, iterations: voltas, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  return { js: await pbkdf2Async(sha256, codificador.encode(senha), sal, { c: voltas, dkLen: 32, asyncTick: 20 }) };
}

const dosBytes = (b: Uint8Array): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

/** Cifra com AES-GCM (o resultado leva a etiqueta de autenticação no fim, como na Web Crypto). */
export async function cifrarAes(chave: ChaveAes, iv: Uint8Array, dados: Uint8Array): Promise<ArrayBuffer> {
  if ("js" in chave) return dosBytes(gcm(chave.js, iv).encrypt(dados));
  return globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, chave, dados as BufferSource);
}

/** Decifra com AES-GCM; lança se a chave está errada ou os dados foram alterados. */
export async function decifrarAes(chave: ChaveAes, iv: Uint8Array, dados: Uint8Array): Promise<ArrayBuffer> {
  if ("js" in chave) return dosBytes(gcm(chave.js, iv).decrypt(dados));
  return globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, chave, dados as BufferSource);
}
