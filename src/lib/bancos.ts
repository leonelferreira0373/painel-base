// Os bancos pelo código de quatro dígitos que vem logo a seguir às letras e aos dígitos de controlo do IBAN («AO06 0040…» é o BAI, «PT50 0035…» é a Caixa). Só entram códigos confirmados num diretório SWIFT; um banco que falte escreve-se à mão no campo «Banco».
import { limparIban, PAIS_DA_MOEDA } from "./iban";

export const BANCOS_POR_PAIS: Record<string, Record<string, string>> = {
  AO: {
    "0004": "Caixa Geral Angola",
    "0005": "BCI",
    "0006": "BFA",
    "0010": "BPC",
    "0040": "BAI",
    "0044": "Banco Sol",
    "0045": "Banco Económico",
    "0051": "BIC",
    "0052": "BNI",
    "0055": "Millennium Atlântico",
    "0060": "Standard Bank",
  },
  PT: {
    "0007": "Novo Banco",
    "0010": "BPI",
    "0018": "Santander Totta",
    "0023": "ActivoBank",
    "0033": "Millennium bcp",
    "0035": "Caixa Geral de Depósitos",
    "0036": "Montepio",
    "0045": "Crédito Agrícola",
    "0065": "Banco Best",
    "0170": "ABANCA",
    "0193": "Banco CTT",
    "0269": "Bankinter",
  },
};

/** O banco de um país pelo código de quatro dígitos, ou null se não está na tabela. */
export const bancoDoCodigo = (pais: string, codigo: string): string | null => BANCOS_POR_PAIS[pais]?.[codigo] ?? null;

/** O banco de um IBAN inteiro, pelo país e pelo código; null se o IBAN é curto ou o banco não está na tabela. */
export function bancoDoIban(iban: string): string | null {
  const limpo = limparIban(iban);
  return limpo.length >= 8 ? bancoDoCodigo(limpo.slice(0, 2), limpo.slice(4, 8)) : null;
}

/** O banco dos dígitos escritos para uma moeda (a moeda decide o país); null enquanto faltam os quatro primeiros dígitos ou se o banco não está na tabela. */
export function bancoDoCorpo(moeda: string, corpo: string): string | null {
  const pais = PAIS_DA_MOEDA[moeda];
  return pais && corpo.length >= 4 ? bancoDoCodigo(pais, corpo.slice(0, 4)) : null;
}
