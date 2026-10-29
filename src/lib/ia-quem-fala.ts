// O que a IA do painel sabe de quem lhe fala: onde está (o painel de administração) e quem é (a sessão). Puro, para o chat e para os testes.
import { AREAS } from "@/dados/estrutura";
import type { Sessao } from "./atividade";

/**
 * Quem fala com a IA e onde: o painel é a área de administração da empresa (não o site público nem o portal do cliente) e quem escreve é uma pessoa da equipa com sessão iniciada.
 * Sem isto a IA respondia como a um cliente. Leva o que a sessão sabe (nome, e-mail, função, o identificador da sessão, o aparelho e o sítio) e o que a função pode ver.
 */
export function quemFala(fn: { rotulo: string; areas: Record<string, unknown>; fechados?: string[] }, sessao: { nome: string; email: string } | null, pagina: string, atual: Pick<Sessao, "id" | "inicio" | "cidade" | "pais" | "dispositivo"> | null): string {
  const nome = sessao?.nome ?? "(sem nome)";
  const sitio = [atual?.cidade, atual?.pais].filter(Boolean).join(", ");
  const areas = Object.keys(fn.areas)
    .map((id) => AREAS.find((a) => a.id === id)?.rotulo ?? id)
    .join(", ");
  return [
    "QUEM FALA CONTIGO E ONDE (lê isto antes de responderes):",
    "- Isto é o painel de administração da empresa (back-office). Quem te escreve é uma pessoa da equipa com sessão iniciada: NÃO é um cliente nem um visitante do site. Nunca lhe respondas como a um cliente (nada de «contacte a equipa», de horários de atendimento nem de explicar o painel como se fosse de fora).",
    `- Pessoa: ${nome}${sessao?.email ? ` (${sessao.email})` : ""} · função «${fn.rotulo}»${atual ? ` · sessão ${atual.id}, iniciada em ${new Date(atual.inicio).toLocaleString("pt-PT")}` : ""}${atual?.dispositivo ? ` · ${atual.dispositivo.navegador} em ${atual.dispositivo.sistema} (${atual.dispositivo.tipo})` : ""}${sitio ? ` · de ${sitio}` : ""}.`,
    `- Está na página ${pagina}.`,
    `- A função «${fn.rotulo}» vê estas áreas: ${areas || "nenhuma"}${fn.fechados?.length ? `; módulos fechados: ${fn.fechados.join(", ")}` : ""}. Só ajudas com o que essa função pode ver e fazer; se pedir outra coisa, diz-lhe que a função dele não pode e que é preciso alguém com mais permissões.`,
    "- Responde como um colega que ajuda a operar o painel: fala dos dados e das páginas que ele tem à frente, dá passos concretos e usa o tratamento que ele usa contigo.",
  ].join("\n");
}
