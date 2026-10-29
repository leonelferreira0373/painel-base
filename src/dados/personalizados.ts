// As opções fixas dos seletores que aceitam também um valor personalizado («Personalizado…»), cada uma com a especificação que a pessoa pode escrever. Um seletor novo com opções fixas acrescenta aqui a sua e usa <SeletorPersonalizavel>.
import type { EspecificacaoPersonalizada } from "@/components/SeletorPersonalizavel";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** «45» → «Após 45 minutos»; «90» → «Após 1 h 30 min»; «nunca» → «Nunca». */
export function mostrarMinutos(valor: string): string {
  if (valor === "nunca") return "Nunca";
  const n = Number(valor);
  if (n < 60) return `Após ${plural(n, "minuto", "minutos")}`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `Após ${plural(h, "hora", "horas")}` : `Após ${h} h ${m} min`;
}

export const TEMPO_LIMITE = {
  opcoes: { "15": "Após 15 minutos", "60": "Após 1 hora", "480": "Após 8 horas", nunca: "Nunca" } as Record<string, string>,
  personalizado: { chave: "tempoLimite", omissao: "60", rotulo: "Minutos", tipo: "numero", unidade: "minutos", min: 1, max: 10080, exemplo: "45", mostrar: mostrarMinutos } satisfies EspecificacaoPersonalizada,
};

export const VALIDADE = {
  opcoes: { "30": "30 dias", "90": "90 dias", "365": "1 ano", nunca: "Sem validade" } as Record<string, string>,
  personalizado: { chave: "validade", omissao: "90", rotulo: "Dias", tipo: "numero", unidade: "dias", min: 1, max: 3650, exemplo: "180", mostrar: (v: string) => plural(Number(v), "dia", "dias") } satisfies EspecificacaoPersonalizada,
};

const aCada = (v: string) => `De ${Number(v.replace("cada-", ""))} em ${Number(v.replace("cada-", ""))} dias`;
const dias = { chave: "intervaloEmDias", omissao: "", rotulo: "Dias entre cada um", tipo: "numero", unidade: "dias", min: 1, max: 365, exemplo: "3", mostrar: aCada, guardar: (e: string) => `cada-${Number(e)}`, escrito: (v: string) => v.replace("cada-", "") } satisfies EspecificacaoPersonalizada;

export const RESUMO = {
  opcoes: { nunca: "Nunca", diario: "Todos os dias", semanal: "Todas as semanas" } as Record<string, string>,
  personalizado: { ...dias, chave: "resumo", omissao: "diario" },
};

export const REPETICAO = {
  opcoes: { nao: "Não repetir", diario: "Todos os dias", semanal: "Todas as semanas", mensal: "Todos os meses" } as Record<string, string>,
  personalizado: { ...dias, chave: "repetir", omissao: "nao" },
};

/** Um nome de fuso horário que o navegador conhece (por exemplo «America/Sao_Paulo»). */
const fusoValido = (nome: string): string | null => {
  try {
    new Intl.DateTimeFormat("pt-PT", { timeZone: nome });
    return null;
  } catch {
    return "Este fuso não existe. Use o formato Região/Cidade, por exemplo America/Sao_Paulo.";
  }
};

export const FUSO = {
  personalizado: { chave: "fuso", omissao: "Africa/Luanda", rotulo: "Nome do fuso", tipo: "texto", exemplo: "America/Sao_Paulo", mostrar: (v: string) => v, validar: fusoValido } satisfies EspecificacaoPersonalizada,
};

/** Escreve uma data com um padrão como «dd.MM.yyyy» (dd = dia, MM = mês, yyyy = ano de quatro dígitos, yy = de dois). */
export function formatarPadrao(padrao: string, data = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return padrao.replace(/yyyy/g, String(data.getFullYear())).replace(/yy/g, p(data.getFullYear() % 100)).replace(/MM/g, p(data.getMonth() + 1)).replace(/dd/g, p(data.getDate()));
}

export const FORMATO_DATA = {
  personalizado: {
    chave: "formatoData",
    omissao: "curta",
    rotulo: "Formato",
    tipo: "formatoData",
    mostrar: (v: string) => formatarPadrao(v),
  } satisfies EspecificacaoPersonalizada,
};

/** Uma letra que já está instalada no aparelho, escrita pelo nome (fica guardada como «pers:Nome»). */
export const LETRA = {
  personalizado: {
    chave: "letra",
    omissao: "inter",
    rotulo: "Nome da letra",
    tipo: "texto",
    exemplo: "Georgia",
    mostrar: (v: string) => `${v.replace("pers:", "")} (a sua)`,
    guardar: (e: string) => `pers:${e}`,
    escrito: (v: string) => v.replace("pers:", ""),
    validar: (e: string) => (/^[\p{L}\p{N} .\-]{2,40}$/u.test(e) ? null : "Escreva só o nome da letra, por exemplo Georgia."),
  } satisfies EspecificacaoPersonalizada,
};
