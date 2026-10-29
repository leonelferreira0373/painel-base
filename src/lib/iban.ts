// IBAN: limpar, validar (comprimento do país e dígitos de controlo, módulo 97) e escrever em grupos de quatro. Funções puras, usadas pelo ecrã de contas e IBANs. A moeda decide o país e o prefixo («AO06», «PT50»), que o painel escreve sozinho.

/** Os comprimentos do IBAN de alguns países (o resto valida só o módulo 97 e o comprimento mínimo). */
export const COMPRIMENTO_DO_IBAN: Record<string, number> = { AO: 25, PT: 25, BR: 29, MZ: 25, CV: 25, ST: 25, GW: 25, ES: 24, FR: 27, DE: 22, GB: 22, IE: 22, IT: 27, NL: 18, BE: 16, CH: 21, LU: 20 };

/** Os países cujo IBAN leva sempre os mesmos dígitos de controlo (os dois últimos dígitos da conta é que os acertam). */
export const CONTROLO_FIXO: Record<string, string> = { AO: "06", PT: "50" };

/** A moeda decide o país do IBAN: kwanzas e dólares são de contas angolanas, euros de contas portuguesas. */
export const PAIS_DA_MOEDA: Record<string, string> = { AOA: "AO", USD: "AO", EUR: "PT" };

/** As moedas que o painel conhece, com o nome que se mostra nos seletores. */
export const MOEDAS: Record<string, string> = { AOA: "Kwanza (AOA)", EUR: "Euro (EUR)", USD: "Dólar (USD)" };

/** Quantos dígitos escreve quem preenche: o IBAN tem 25 caracteres e os quatro primeiros vêm do prefixo. */
export const DIGITOS_DO_IBAN = 21;

/** «ao78 0000 0000…» → «AO780000000…» (sem espaços nem hífenes, em maiúsculas). */
export const limparIban = (iban: string) => iban.replace(/[\s-]/g, "").toUpperCase();

/** Em grupos de quatro, para ler: «AO06 0040 0000 1234 5678 1014 2». */
export const formatarIban = (iban: string) => limparIban(iban).replace(/(.{4})/g, "$1 ").trim();

/** O prefixo que o painel escreve para uma moeda: «AO06» para kwanzas e dólares, «PT50» para euros; vazio se a moeda não for conhecida. */
export function prefixoDaMoeda(moeda: string): string {
  const pais = PAIS_DA_MOEDA[moeda];
  return pais ? pais + CONTROLO_FIXO[pais] : "";
}

/** Os dígitos que a pessoa escreve: tira o prefixo (ou as quatro primeiras posições de um IBAN colado inteiro) e deixa só os dígitos, até ao máximo. */
export function corpoDoIban(escrito: string, moeda: string): string {
  const prefixo = prefixoDaMoeda(moeda);
  let texto = limparIban(escrito);
  if (prefixo && texto.startsWith(prefixo)) texto = texto.slice(prefixo.length);
  else if (/^[A-Z]{2}\d{2}/.test(texto)) texto = texto.slice(4);
  return texto.replace(/\D/g, "").slice(0, DIGITOS_DO_IBAN);
}

/** Os dígitos em grupos de quatro, para mostrar no campo: «0040 0000 1234 5678 1014 2». */
export const formatarCorpo = (corpo: string) => corpo.replace(/(.{4})/g, "$1 ").trim();

/** O IBAN inteiro de uma moeda e dos dígitos escritos; vazio se ainda não há dígitos. */
export const ibanDoCorpo = (moeda: string, corpo: string) => (corpo ? prefixoDaMoeda(moeda) + corpo : "");

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

/** Mensagem de erro para os dígitos escritos depois do prefixo da moeda, ou null se o IBAN serve. */
export function erroDoCorpo(moeda: string, corpo: string): string | null {
  if (!prefixoDaMoeda(moeda)) return "Escolha a moeda da conta.";
  if (corpo.length === 0) return "Escreva o IBAN.";
  if (corpo.length < DIGITOS_DO_IBAN) {
    const faltam = DIGITOS_DO_IBAN - corpo.length;
    return `Faltam ${faltam} ${faltam === 1 ? "dígito" : "dígitos"}.`;
  }
  return erroDoIban(ibanDoCorpo(moeda, corpo));
}

/**
 * Gera um IBAN válido de um país a partir do início de uma conta (para os dados de demonstração). Em Angola e em Portugal os dígitos de controlo são sempre os mesmos («06», «50»):
 * a conta tem 19 dígitos (banco, balcão e número) e os dois últimos são calculados para o IBAN bater certo.
 */
export function gerarIban(pais: string, conta: string): string {
  const total = COMPRIMENTO_DO_IBAN[pais] ?? 25;
  const fixo = CONTROLO_FIXO[pais];
  if (fixo) {
    const base = conta.replace(/\D/g, "").padStart(total - 6, "0").slice(-(total - 6));
    for (let c = 0; c < 100; c++) {
      const iban = `${pais}${fixo}${base}${String(c).padStart(2, "0")}`;
      if (modulo97(iban) === 1) return iban;
    }
  }
  const base = conta.replace(/\D/g, "").padStart(total - 4, "0").slice(-(total - 4));
  const sem = `${pais}00${base}`;
  const controlo = String(98 - modulo97(sem)).padStart(2, "0");
  return `${pais}${controlo}${base}`;
}
