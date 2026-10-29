// IBAN: limpar, validar (comprimento do país e dígitos de controlo, módulo 97) e escrever em grupos de quatro. Funções puras, usadas pelo ecrã de contas e IBANs.

/** Os comprimentos do IBAN de alguns países (o resto valida só o módulo 97 e o comprimento mínimo). */
export const COMPRIMENTO_DO_IBAN: Record<string, number> = { AO: 25, PT: 25, BR: 29, MZ: 25, CV: 25, ST: 25, GW: 25, ES: 24, FR: 27, DE: 22, GB: 22, IE: 22, IT: 27, NL: 18, BE: 16, CH: 21, LU: 20 };

/** «ao78 0000 0000…» → «AO780000000…» (sem espaços nem hífenes, em maiúsculas). */
export const limparIban = (iban: string) => iban.replace(/[\s-]/g, "").toUpperCase();

/** Em grupos de quatro, para ler: «AO78 0000 0000 1234 5678 1017 2». */
export const formatarIban = (iban: string) => limparIban(iban).replace(/(.{4})/g, "$1 ").trim();

/** O resto da divisão por 97 do IBAN reordenado, calculado por partes para não perder precisão. */
function modulo97(iban: string): number {
  const reordenado = iban.slice(4) + iban.slice(0, 4);
  const numerico = reordenado.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let resto = 0;
  for (const d of numerico) resto = (resto * 10 + Number(d)) % 97;
  return resto;
}

/** Mensagem de erro para um IBAN, ou null se serve. */
export function erroDoIban(escrito: string): string | null {
  const iban = limparIban(escrito);
  if (iban.length === 0) return "Escreva o IBAN.";
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return "O IBAN começa por duas letras do país e dois dígitos de controlo.";
  const esperado = COMPRIMENTO_DO_IBAN[iban.slice(0, 2)];
  if (esperado && iban.length !== esperado) return `O IBAN de ${iban.slice(0, 2)} tem ${esperado} caracteres; este tem ${iban.length}.`;
  if (iban.length < 15 || iban.length > 34) return "O IBAN tem entre 15 e 34 caracteres.";
  return modulo97(iban) === 1 ? null : "Os dígitos de controlo não batem certo: confira o IBAN.";
}

/** Gera um IBAN válido de um país a partir de um número de conta (para os dados de demonstração). */
export function gerarIban(pais: string, conta: string): string {
  const total = COMPRIMENTO_DO_IBAN[pais] ?? 25;
  const base = conta.replace(/\D/g, "").padStart(total - 4, "0").slice(-(total - 4));
  const sem = `${pais}00${base}`;
  const controlo = String(98 - modulo97(sem)).padStart(2, "0");
  return `${pais}${controlo}${base}`;
}
