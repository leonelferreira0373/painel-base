// O estado de cada pessoa que escreve ou a quem se escreve, tirado das mensagens: urgente, quente, lead, atendido, visto, frio, novo ou automático, conforme os dias, o atendimento e as vezes que o endereço contactou. É daqui que saem as etiquetas de estado ao lado dos nomes (Recebidos e Enviados), as sugestões do campo «Para» e as métricas. Funções puras.
import { enderecosDe, nomeDe, soEndereco, type Email } from "./email";

export type EstadoDeContacto = "urgente" | "quente" | "atendido" | "lead" | "frio" | "visto" | "novo" | "automatico";

export type CorDoEstado = "vermelho" | "laranja" | "azul" | "verde" | "cinza" | "ceu" | "violeta";

/** Por ordem de importância: o primeiro que se aplica é o que aparece ao lado do nome. */
export const ORDEM_DOS_ESTADOS: EstadoDeContacto[] = ["urgente", "quente", "atendido", "lead", "frio", "visto", "novo", "automatico"];

export const ESTADOS_DE_CONTACTO: Record<EstadoDeContacto, { rotulo: string; cor: CorDoEstado; significado: string }> = {
  urgente: { rotulo: "Urgente", cor: "vermelho", significado: "Pede algo com pressa, ou espera por resposta há três dias ou mais." },
  quente: { rotulo: "Quente", cor: "laranja", significado: "Um interessado (orçamento, proposta, parceria) que escreveu há pouco: é a altura de responder." },
  atendido: { rotulo: "Atendido", cor: "verde", significado: "Já tem resposta nossa à última mensagem." },
  lead: { rotulo: "Lead", cor: "azul", significado: "Mostrou interesse em comprar ou em trabalhar connosco." },
  frio: { rotulo: "Frio", cor: "ceu", significado: "Há quatro dias ou mais sem contacto." },
  visto: { rotulo: "Visto", cor: "cinza", significado: "A mensagem foi lida, mas ainda não tem resposta." },
  novo: { rotulo: "Novo", cor: "violeta", significado: "Primeiro contacto deste endereço." },
  automatico: { rotulo: "Automático", cor: "cinza", significado: "Mensagens do sistema (falhas de entrega, avisos), não de uma pessoa." },
};

const URGENTE = /urgen|ainda n[ãa]o (recebe|temos|fomos)|atras|reclam|reembols/i;
/** Uma mensagem de agradecimento não pede nada: não fica urgente por esperar. */
const AGRADECIMENTO = /obrigad[oa]|agradec/i;
const LEAD = /or[çc]amento|proposta|parceria|cota[çc][ãa]o|pre[çc]os|cat[áa]logo|interessad|encomendar|adquirir/i;
const AUTOMATICO = /^(mailer-daemon|postmaster|no-?reply|noreply|do-?not-?reply)@/i;

const HORA = 3_600_000;
/** Há quantas horas espera uma mensagem sem resposta para ser urgente por si só. */
export const HORAS_ATE_SER_URGENTE = 72;
/** Há quantas horas sem contacto é «frio». */
export const HORAS_ATE_SER_FRIO = 96;
/** Até quantas horas depois de escrever um interessado ainda está «quente». */
export const HORAS_ATE_DEIXAR_DE_SER_QUENTE = 72;

export interface Contacto {
  endereco: string;
  nome: string;
  /** Quantas mensagens escreveu. */
  recebidas: number;
  /** Quantas lhe enviámos (as que chegaram). */
  respostas: number;
  porLer: number;
  /** A última vez que houve contacto (ISO). */
  ultimoContacto: string;
  /** Quantas horas passaram desde esse contacto. */
  horasDesdeOUltimo: number;
  estados: EstadoDeContacto[];
  principal: EstadoDeContacto;
  /** Porquê, numa frase para a dica. */
  motivo: string;
}

const horasEntre = (a: string, b: Date) => Math.max(0, (b.getTime() - new Date(a).getTime()) / HORA);

export function descreverEspera(horas: number): string {
  if (horas < 1) return "há menos de uma hora";
  if (horas < 24) return `há ${Math.round(horas)} h`;
  const d = Math.round(horas / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

/** Os contactos que as mensagens mostram, pelo endereço (maiúsculas e minúsculas contam igual). */
export function analisarContactos(emails: Email[], agora: Date): Record<string, Contacto> {
  const recebidas = new Map<string, Email[]>();
  const enviadas = new Map<string, Email[]>();
  for (const e of emails) {
    if (e.pasta === "recebidos") {
      const k = soEndereco(e.de).toLowerCase();
      recebidas.set(k, [...(recebidas.get(k) ?? []), e]);
    } else if (e.pasta === "enviados" && e.estado !== "Falhou" && e.estado !== "Devolvido") {
      for (const p of enderecosDe(e.para)) {
        const k = soEndereco(p).toLowerCase();
        enviadas.set(k, [...(enviadas.get(k) ?? []), e]);
      }
    }
  }
  const nomes = new Map<string, string>();
  for (const e of emails) {
    if (e.pasta === "recebidos") nomes.set(soEndereco(e.de).toLowerCase(), nomeDe(e.de));
    else for (const p of enderecosDe(e.para)) if (!nomes.has(soEndereco(p).toLowerCase())) nomes.set(soEndereco(p).toLowerCase(), nomeDe(p));
  }
  const saida: Record<string, Contacto> = {};
  for (const k of new Set([...recebidas.keys(), ...enviadas.keys()])) {
    const dele = (recebidas.get(k) ?? []).slice().sort((a, b) => b.data.localeCompare(a.data));
    const nossas = (enviadas.get(k) ?? []).slice().sort((a, b) => b.data.localeCompare(a.data));
    const ultimaDele = dele[0]?.data;
    const ultimaNossa = nossas[0]?.data;
    const ultimo = [ultimaDele, ultimaNossa].filter(Boolean).sort().reverse()[0] as string;
    const horas = horasEntre(ultimo, agora);
    const atendido = !!ultimaDele && !!ultimaNossa && ultimaNossa > ultimaDele;
    const texto = dele.map((e) => `${e.assunto} ${e.corpo}`).join(" ");
    const ultimoTexto = dele[0] ? `${dele[0].assunto} ${dele[0].corpo}` : "";
    const horasSemResposta = ultimaDele && !atendido ? horasEntre(ultimaDele, agora) : 0;
    const eAutomatico = AUTOMATICO.test(k);
    const eLead = LEAD.test(texto);
    const estados: EstadoDeContacto[] = [];
    let motivo = "";
    if (eAutomatico) {
      estados.push("automatico");
      motivo = ESTADOS_DE_CONTACTO.automatico.significado;
    } else {
      if (ultimaDele && !atendido && (URGENTE.test(ultimoTexto) || (horasSemResposta >= HORAS_ATE_SER_URGENTE && !AGRADECIMENTO.test(dele[0].assunto)))) {
        estados.push("urgente");
        motivo = horasSemResposta >= HORAS_ATE_SER_URGENTE ? `Espera resposta ${descreverEspera(horasSemResposta)}.` : `Escreveu ${descreverEspera(horasSemResposta)} com urgência e ainda não foi atendido.`;
      }
      if (eLead && ultimaDele && horasEntre(ultimaDele, agora) <= HORAS_ATE_DEIXAR_DE_SER_QUENTE && (!atendido || dele.length >= 2)) {
        estados.push("quente");
        motivo ||= `Pediu orçamento ou propôs algo ${descreverEspera(horasEntre(ultimaDele, agora))}${atendido ? "" : " e ainda não foi atendido"}.`;
      }
      if (atendido) {
        estados.push("atendido");
        motivo ||= `A última mensagem tem resposta nossa ${descreverEspera(horasEntre(ultimaNossa as string, agora))}.`;
      }
      if (eLead) {
        estados.push("lead");
        motivo ||= "Mostrou interesse em comprar ou em trabalhar connosco.";
      }
      if (horas >= HORAS_ATE_SER_FRIO) {
        estados.push("frio");
        motivo ||= `Sem contacto ${descreverEspera(horas)}.`;
      }
      if (ultimaDele && !atendido && dele.every((e) => e.lido)) {
        estados.push("visto");
        motivo ||= `Lida ${descreverEspera(horasSemResposta)}, ainda sem resposta.`;
      }
      if (dele.length + nossas.length <= 1) {
        estados.push("novo");
        motivo ||= "Primeiro contacto deste endereço.";
      }
    }
    const ordenados = ORDEM_DOS_ESTADOS.filter((s) => estados.includes(s));
    if (ordenados.length === 0) ordenados.push("visto");
    saida[k] = {
      endereco: k,
      nome: nomes.get(k) ?? k,
      recebidas: dele.length,
      respostas: nossas.length,
      porLer: dele.filter((e) => !e.lido).length,
      ultimoContacto: ultimo,
      horasDesdeOUltimo: horas,
      estados: ordenados,
      principal: ordenados[0],
      motivo: motivo || ESTADOS_DE_CONTACTO[ordenados[0]].significado,
    };
  }
  return saida;
}

/** O contacto de uma mensagem: quem escreveu (recebidos) ou o primeiro a quem vai (enviados). */
export function contactoDe(e: Email, contactos: Record<string, Contacto>): Contacto | undefined {
  const endereco = e.pasta === "recebidos" ? soEndereco(e.de) : soEndereco(enderecosDe(e.para)[0] ?? "");
  return contactos[endereco.toLowerCase()];
}

export interface MetricasDeContactos {
  contactos: number;
  porEstado: Record<EstadoDeContacto, number>;
  urgentes: number;
  /** Quem é interessado: leads, quentes incluídos. */
  leads: number;
  /** Quantos dos contactos (sem os automáticos) já têm resposta à última mensagem, de 0 a 1. */
  taxaDeResposta: number;
  /** Em média, quantas horas demora a primeira resposta a uma mensagem; `null` se ainda não houve. */
  horasAteResponder: number | null;
  /** Em média, quantas vezes cada pessoa escreveu. */
  mensagensPorContacto: number;
}

export function metricasDeContactos(contactos: Record<string, Contacto>, emails: Email[]): MetricasDeContactos {
  const lista = Object.values(contactos);
  const porEstado = Object.fromEntries(ORDEM_DOS_ESTADOS.map((s) => [s, lista.filter((c) => c.principal === s).length])) as Record<EstadoDeContacto, number>;
  const pessoas = lista.filter((c) => !c.estados.includes("automatico") && c.recebidas > 0);
  const atendidos = pessoas.filter((c) => c.estados.includes("atendido")).length;
  // o tempo até à primeira resposta: de cada mensagem recebida à primeira que lhe enviámos depois
  const esperas: number[] = [];
  const enviadas = emails.filter((e) => e.pasta === "enviados" && e.estado !== "Falhou" && e.estado !== "Devolvido");
  for (const r of emails.filter((e) => e.pasta === "recebidos" && !AUTOMATICO.test(soEndereco(e.de)))) {
    const k = soEndereco(r.de).toLowerCase();
    const resposta = enviadas.filter((e) => e.data > r.data && enderecosDe(e.para).some((p) => soEndereco(p).toLowerCase() === k)).sort((a, b) => a.data.localeCompare(b.data))[0];
    if (resposta) esperas.push((new Date(resposta.data).getTime() - new Date(r.data).getTime()) / HORA);
  }
  return {
    contactos: lista.length,
    porEstado,
    urgentes: lista.filter((c) => c.estados.includes("urgente")).length,
    leads: lista.filter((c) => c.estados.includes("lead") || c.estados.includes("quente")).length,
    taxaDeResposta: pessoas.length ? atendidos / pessoas.length : 0,
    horasAteResponder: esperas.length ? esperas.reduce((s, x) => s + x, 0) / esperas.length : null,
    mensagensPorContacto: pessoas.length ? pessoas.reduce((s, c) => s + c.recebidas, 0) / pessoas.length : 0,
  };
}

/** O contacto serve para esta pesquisa (nome ou endereço)? */
export const contactoCorresponde = (c: Contacto, texto: string): boolean => {
  const t = texto.trim().toLowerCase();
  return !t || c.nome.toLowerCase().includes(t) || c.endereco.includes(t);
};
