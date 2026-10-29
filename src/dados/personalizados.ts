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

/** Quantos pedidos por segundo gera a simulação do tempo real. */
export const RITMO_DE_PEDIDOS = {
  opcoes: { "1": "1 por segundo", "2": "2 por segundo", "5": "5 por segundo" } as Record<string, string>,
  personalizado: { chave: "ritmoDePedidos", omissao: "2", rotulo: "Pedidos por segundo", tipo: "numero", unidade: "por segundo", min: 1, max: 50, exemplo: "10", mostrar: (v: string) => `${v} por segundo` } satisfies EspecificacaoPersonalizada,
};

/** A idade, em dias, a partir da qual se apagam dados (linhas de uma tabela, ficheiros temporários, logs…). */
export const DIAS_DE_DADOS = {
  opcoes: { "7": "7 dias", "30": "30 dias", "90": "90 dias", "365": "1 ano" } as Record<string, string>,
  personalizado: { chave: "diasDeDados", omissao: "90", rotulo: "Dias", tipo: "numero", unidade: "dias", min: 1, max: 3650, exemplo: "45", mostrar: (v: string) => plural(Number(v), "dia", "dias") } satisfies EspecificacaoPersonalizada,
};

/** O limite de pedidos por minuto, por visitante, do firewall. */
export const LIMITE_POR_MINUTO = {
  opcoes: { "60": "60 por minuto", "120": "120 por minuto", "300": "300 por minuto", "600": "600 por minuto" } as Record<string, string>,
  personalizado: { chave: "limitePorMinuto", omissao: "120", rotulo: "Pedidos por minuto", tipo: "numero", unidade: "por minuto", min: 1, max: 100000, exemplo: "200", mostrar: (v: string) => `${Number(v).toLocaleString("pt-PT")} por minuto` } satisfies EspecificacaoPersonalizada,
};

/** De quantas em quantas horas se faz uma cópia de segurança. */
export const FREQUENCIA_DE_COPIA = {
  opcoes: { "6": "De 6 em 6 horas", "12": "De 12 em 12 horas", "24": "Todos os dias", "168": "Todas as semanas" } as Record<string, string>,
  personalizado: { chave: "frequenciaDeCopia", omissao: "24", rotulo: "Horas entre cópias", tipo: "numero", unidade: "horas", min: 1, max: 720, exemplo: "8", mostrar: (v: string) => `De ${v} em ${v} horas` } satisfies EspecificacaoPersonalizada,
};

/** Durante quantos dias se guardam as cópias de segurança antes de se apagarem. */
export const RETENCAO_DE_COPIAS = {
  opcoes: { "7": "7 dias", "14": "14 dias", "30": "30 dias", "90": "90 dias" } as Record<string, string>,
  personalizado: { chave: "retencaoDeCopias", omissao: "14", rotulo: "Dias", tipo: "numero", unidade: "dias", min: 1, max: 3650, exemplo: "21", mostrar: (v: string) => plural(Number(v), "dia", "dias") } satisfies EspecificacaoPersonalizada,
};

/** A porta do servidor de e-mail (SMTP). */
export const PORTA_SMTP = {
  opcoes: { "25": "25 (sem cifra)", "465": "465 (SSL)", "587": "587 (STARTTLS)", "2525": "2525 (alternativa)" } as Record<string, string>,
  personalizado: { chave: "portaSmtp", omissao: "587", rotulo: "Porta", tipo: "numero", min: 1, max: 65535, exemplo: "2587", mostrar: (v: string) => v } satisfies EspecificacaoPersonalizada,
};

export const CATEGORIA_DE_PRODUTO = {
  opcoes: { servicos: "Serviços", equipamento: "Equipamento", consumiveis: "Consumíveis", pecas: "Peças" } as Record<string, string>,
  personalizado: { chave: "categoriaDeProduto", omissao: "servicos", rotulo: "Nome da categoria", tipo: "texto", exemplo: "Embalagens", mostrar: (v: string) => v } satisfies EspecificacaoPersonalizada,
};

export const TRAFEGO_PARA_B = {
  opcoes: { "5": "5 %", "10": "10 %", "25": "25 %", "50": "50 %" } as Record<string, string>,
  personalizado: { chave: "trafegoParaB", omissao: "10", rotulo: "Percentagem do tráfego", tipo: "numero", unidade: "%", min: 1, max: 99, exemplo: "15", mostrar: (v: string) => `${v} %` } satisfies EspecificacaoPersonalizada,
};
