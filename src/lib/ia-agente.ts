// O assistente que age no painel: um transporte para o chat que fala com o Worker da IA e deixa o modelo usar ferramentas (ver o ecrã, abrir páginas, clicar, escrever, escolher, premir teclas e a FAQ). Quem executa as ferramentas é o painel, neste navegador, como uma pessoa o faria; cada ação que muda alguma coisa pede a aprovação de quem está a falar, num cartão dentro da conversa. Cada chamada à IA fica no histórico de utilização com o que gastou.
import type { EventoDoTransporte, TransporteDoAssistente } from "@/assistente";
import { caminho } from "@/dados/estrutura";
import { faqAtivas, guardarFaqAgora, lerFaq, faqNova, erroDaFaq, type Faq } from "./faq";
import { clicar, descreverRef, escolher, esperarMs, escrever, lerEcra, premirTecla } from "./ia-ecra";
import { registar } from "./atividade";
import { marcarEmUso, marcarFase, registarUsoDaIa } from "./ia-uso";
import type { UsoDeChamada } from "./ia-modelos";
import { pontuarPaginas, type PaginaPesquisavel } from "./pesquisa-ia";

export type IconeDoPasso = "cerebro" | "globo" | "lapis";

export interface FerramentaDoPainel {
  nome: string;
  descricao: string;
  parametros: Record<string, unknown>;
  /** Muda alguma coisa: pede a aprovação de quem fala com a IA. */
  escreve: boolean;
  icone: IconeDoPasso;
  /** O que se mostra na conversa quando a ferramenta é usada («Clicar em «Guardar»»). */
  titulo: (args: Record<string, unknown>) => string;
  executar: (args: Record<string, unknown>) => Promise<string>;
}

export interface ConfiguracaoDoAgente {
  /** O Worker da IA (sem a barra final). */
  urlIa: string;
  /** As instruções de cada pergunta: quem é, o que pode fazer, as páginas, as respostas oficiais e o tom. Lê-se a cada pergunta (a função e a página mudam). */
  sistema: (pergunta: string) => string;
  /** A resposta oficial da equipa a esta pergunta (uma pergunta pronta, escrita tal e qual), se há: responde-se sem gastar a IA. */
  respostaOficial?: (pergunta: string) => string | null;
  /** As páginas que a função atual pode abrir. */
  catalogo: () => (PaginaPesquisavel & { href: string })[];
  abrirPagina: (href: string) => void;
  /** Mensagem do painel («Escrito na FAQ») para quando uma ferramenta muda dados sem passar pelo ecrã. */
  limiteDePassos?: number;
}

const texto = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));
const inteiro = (v: unknown) => Math.round(Number(v));

/** As ferramentas, com o que cada uma faz e como se mostra. */
export function ferramentasDoPainel(cfg: Pick<ConfiguracaoDoAgente, "catalogo" | "abrirPagina">): FerramentaDoPainel[] {
  const refSchema = { type: "object", properties: { ref: { type: "integer", description: "O número do controlo na última leitura do ecrã." } }, required: ["ref"] };
  return [
    { nome: "ver_ecra", descricao: "Lê o ecrã: a página, a janela aberta e os controlos numerados. Só quando precisas de clicar ou escrever, ou de ler o que lá está.", parametros: { type: "object", properties: {} }, escreve: false, icone: "cerebro", titulo: () => "A ver o ecrã", executar: async () => lerEcra().texto },
    {
      nome: "procurar_paginas",
      descricao: "Procura páginas do painel pelo assunto (por exemplo «bloquear um IP») e devolve os identificadores para abrir_pagina.",
      parametros: { type: "object", properties: { assunto: { type: "string", description: "O assunto, em poucas palavras." } }, required: ["assunto"] },
      escreve: false,
      icone: "globo",
      titulo: (a) => `A procurar páginas sobre «${texto(a.assunto).slice(0, 40)}»`,
      executar: async (a) => {
        const r = pontuarPaginas([texto(a.assunto)], cfg.catalogo(), 6);
        return r.length ? r.map((p) => `${p.id} — ${p.rotulo} (${p.area})`).join("\n") : "Nenhuma página corresponde: tente outras palavras.";
      },
    },
    {
      nome: "abrir_pagina",
      descricao: "Abre uma página do painel pelo identificador que procurar_paginas deu (por exemplo «pagamentos/metricas»).",
      parametros: { type: "object", properties: { id: { type: "string", description: "O identificador da página, da lista de páginas." } }, required: ["id"] },
      escreve: false,
      icone: "globo",
      titulo: (a) => {
        const p = cfg.catalogo().find((x) => x.id === texto(a.id));
        return `A abrir ${p ? `«${p.rotulo}»` : `«${texto(a.id)}»`}`;
      },
      executar: async (a) => {
        const p = cfg.catalogo().find((x) => x.id === texto(a.id));
        if (!p) return "Essa página não existe, ou a função atual não a pode abrir. Use procurar_paginas.";
        cfg.abrirPagina(p.href);
        await esperarMs(1800);
        // devolve já o que lá está: poupa uma leitura do ecrã (e as suas centenas de tokens) só para confirmar
        return `Aberta a página «${p.rotulo}».\n${lerEcra(25).texto.slice(0, 1500)}`;
      },
    },
    { nome: "clicar", descricao: "Clica num controlo (botão, ligação, separador, interruptor, item de menu) pelo número da última leitura do ecrã.", parametros: refSchema, escreve: true, icone: "lapis", titulo: (a) => `Clicar em ${descreverRef(inteiro(a.ref))}`, executar: async (a) => clicar(inteiro(a.ref)) },
    {
      nome: "escrever",
      descricao: "Escreve texto num campo (substitui o que lá estiver), pelo número da última leitura do ecrã.",
      parametros: { type: "object", properties: { ref: { type: "integer" }, texto: { type: "string" } }, required: ["ref", "texto"] },
      escreve: true,
      icone: "lapis",
      titulo: (a) => `Escrever «${texto(a.texto).slice(0, 40)}» em ${descreverRef(inteiro(a.ref))}`,
      executar: async (a) => escrever(inteiro(a.ref), texto(a.texto)),
    },
    {
      nome: "escolher",
      descricao: "Abre uma lista ou um menu (pelo número do controlo que o abre) e escolhe a opção com esse texto.",
      parametros: { type: "object", properties: { ref: { type: "integer" }, opcao: { type: "string", description: "O texto da opção." } }, required: ["ref", "opcao"] },
      escreve: true,
      icone: "lapis",
      titulo: (a) => `Escolher «${texto(a.opcao).slice(0, 40)}» em ${descreverRef(inteiro(a.ref))}`,
      executar: async (a) => escolher(inteiro(a.ref), texto(a.opcao)),
    },
    {
      nome: "premir_tecla",
      descricao: "Prime uma tecla no controlo que tem o foco: enter, escape, tab, baixo, cima, esquerda, direita ou espaco.",
      parametros: { type: "object", properties: { tecla: { type: "string" } }, required: ["tecla"] },
      escreve: true,
      icone: "lapis",
      titulo: (a) => `Premir a tecla ${texto(a.tecla)}`,
      executar: async (a) => premirTecla(texto(a.tecla)),
    },
    { nome: "esperar", descricao: "Espera uns instantes (até 5 segundos) para o painel acabar de carregar.", parametros: { type: "object", properties: { ms: { type: "integer" } } }, escreve: false, icone: "cerebro", titulo: () => "A esperar", executar: async (a) => esperarMs(inteiro(a.ms) || 1000) },
    {
      nome: "faq_listar",
      descricao: "Lista as perguntas frequentes (FAQ) do painel, as que o assistente usa como respostas oficiais e mostra como sugestões.",
      parametros: { type: "object", properties: {} },
      escreve: false,
      icone: "cerebro",
      titulo: () => "A ler a FAQ",
      executar: async () => {
        const l = lerFaq();
        return l.length ? l.map((f: Faq) => `- ${f.pergunta} - ${f.resposta.slice(0, 120)} [${f.ativa ? "publicada" : "escondida"}${f.sugerida ? ", sugerida no chat" : ""}]`).join("\n") : "A FAQ está vazia.";
      },
    },
    {
      nome: "faq_guardar",
      descricao: "Acrescenta uma pergunta e a sua resposta à FAQ do painel (publicada, e por omissão também sugerida no chat).",
      parametros: { type: "object", properties: { pergunta: { type: "string" }, resposta: { type: "string" }, sugerir_no_chat: { type: "boolean" } }, required: ["pergunta", "resposta"] },
      escreve: true,
      icone: "lapis",
      titulo: (a) => `Acrescentar à FAQ: «${texto(a.pergunta).slice(0, 50)}»`,
      executar: async (a) => {
        const f: Faq = { ...faqNova(`ia-${Date.now().toString(36)}`), pergunta: texto(a.pergunta).trim(), resposta: texto(a.resposta).trim(), sugerida: a.sugerir_no_chat !== false };
        const erro = erroDaFaq(f, lerFaq());
        if (erro) return `Não guardei: ${erro}`;
        guardarFaqAgora(f);
        return "Guardado na FAQ.";
      },
    },
  ];
}

export const esquemaDasFerramentas = (fs: FerramentaDoPainel[]) => fs.map((f) => ({ type: "function" as const, function: { name: f.nome, description: f.descricao, parameters: f.parametros } }));

// ---------- a aprovação ----------

export type Decisao = "sim" | "sempre" | "nao";
const pendentes = new Map<string, (d: Decisao) => void>();
const decididas = new Map<string, Decisao>();
const semPerguntar = new Set<string>();
export const EVENTO_APROVACAO = "painel:ia-aprovacao";

export function resolverAprovacao(id: string, d: Decisao): void {
  decididas.set(id, d);
  pendentes.get(id)?.(d);
  pendentes.delete(id);
  window.dispatchEvent(new Event(EVENTO_APROVACAO));
}
export const decisaoDe = (id: string): Decisao | undefined => decididas.get(id);

/** Pede à pessoa que aprove a ação (o cartão da conversa chama `resolverAprovacao`); acaba sozinho se a conversa for interrompida. */
function pedirAprovacao(id: string, conversa: string, sinal: AbortSignal): Promise<Decisao> {
  if (semPerguntar.has(conversa)) {
    decididas.set(id, "sempre");
    return Promise.resolve("sempre");
  }
  return new Promise((resolver) => {
    pendentes.set(id, (d) => {
      if (d === "sempre") semPerguntar.add(conversa);
      resolver(d);
    });
    sinal.addEventListener("abort", () => resolverAprovacao(id, "nao"), { once: true });
  });
}

// ---------- o transporte ----------

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAXIMO_DE_MENSAGENS = 12;
const MAXIMO_POR_MENSAGEM = 1200;

type MensagemParaIa = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: unknown[]; tool_call_id?: string };

interface RespostaDoWorker {
  texto: string;
  chamadas: { id: string; nome: string; argumentos: Record<string, unknown> }[];
  uso: UsoDeChamada;
}

export function criarTransporteDoPainel(cfg: ConfiguracaoDoAgente): TransporteDoAssistente {
  const limite = cfg.limiteDePassos ?? 6;
  return {
    async *perguntar({ historico, conversa, sinal }): AsyncGenerator<EventoDoTransporte> {
      const ferramentas = ferramentasDoPainel(cfg);
      const esquema = esquemaDasFerramentas(ferramentas);
      const pergunta = [...historico].reverse().find((m) => m.papel === "user")?.texto ?? "";
      const sistema = cfg.sistema(pergunta);
      registar("ia", `Perguntou à IA: «${pergunta.slice(0, 160)}»`);
      const mensagens: MensagemParaIa[] = [
        { role: "system", content: sistema },
        ...historico.slice(-MAXIMO_DE_MENSAGENS).map<MensagemParaIa>((m) => ({ role: m.papel === "user" ? "user" : "assistant", content: m.texto.slice(0, MAXIMO_POR_MENSAGEM) })),
      ];
      const oficial = cfg.respostaOficial?.(pergunta);
      if (oficial) {
        // uma pergunta pronta (um pill) responde-se com a resposta oficial, sem gastar a IA
        yield { passo: { titulo: "A usar a resposta oficial da equipa", icone: "cerebro" } };
        registar("ia", `A IA respondeu com a resposta oficial: «${oficial.slice(0, 140)}»`);
        marcarFase("escrever");
        try {
          for (const bloco of oficial.match(/\S+\s*|\s+/g) ?? [oficial]) {
            if (sinal.aborted) return;
            yield { t: bloco };
            await esperar(10);
          }
        } finally {
          marcarFase(null);
        }
        yield { fim: true };
        return;
      }
      marcarEmUso("assistente", 60_000);
      marcarFase("pensar");
      const feitas = new Map<string, string>();
      try {
        for (let passo = 0; passo < limite; passo++) {
          if (sinal.aborted) return;
          marcarFase("pensar");
          let r: Response;
          try {
            r = await fetch(`${cfg.urlIa}/assistente`, { method: "POST", headers: { "Content-Type": "application/json", "X-Sessao-Ia": conversa }, body: JSON.stringify({ mensagens, ferramentas: esquema, sessao: conversa }), signal: sinal });
          } catch {
            if (!sinal.aborted) yield { erro: "indisponivel" };
            return;
          }
          if (r.status === 429) {
            yield { erro: "limite" };
            return;
          }
          if (!r.ok) {
            yield { erro: "indisponivel" };
            return;
          }
          const d = (await r.json()) as RespostaDoWorker;
          const partes = { sistema: sistema.length, ferramentas: JSON.stringify(esquema).length, mensagens: mensagens.slice(1).reduce((s, m) => s + m.content.length, 0) };
          registarUsoDaIa({ origem: "assistente", pergunta, resposta: d.texto || `(ferramentas: ${d.chamadas.map((c) => c.nome).join(", ")})`, uso: d.uso, ferramentas: d.chamadas.map((c) => c.nome), partes });
          marcarEmUso("assistente", 8_000);

          if (d.chamadas.length === 0) {
            const final = d.texto.trim() || "Não consegui responder a isto.";
            registar("ia", `A IA respondeu: «${final.slice(0, 140)}»`);
            // a resposta chega aos poucos, como se escrevesse
            marcarFase("escrever");
            for (const bloco of final.match(/\S+\s*|\s+/g) ?? [final]) {
              if (sinal.aborted) return;
              yield { t: bloco };
              await esperar(14);
            }
            yield { fim: true };
            return;
          }

          mensagens.push({ role: "assistant", content: d.texto ?? "", tool_calls: d.chamadas.map((c) => ({ id: c.id, type: "function", function: { name: c.nome, arguments: JSON.stringify(c.argumentos) } })) });
          for (const c of d.chamadas) {
            const f = ferramentas.find((x) => x.nome === c.nome);
            if (!f) {
              mensagens.push({ role: "tool", tool_call_id: c.id, content: `Não existe a ferramenta ${c.nome}.` });
              continue;
            }
            const titulo = f.titulo(c.argumentos);
            yield { passo: { titulo, icone: f.icone } };
            if (!f.escreve) registar("ia", `A IA: ${titulo}`);
            if (f.escreve) {
              const id = `${conversa}-${c.id}`;
              yield { cartoes: [{ tipo: "aprovacao", id, descricao: titulo }] };
              const decisao = await pedirAprovacao(id, conversa, sinal);
              registar("ia", `${decisao === "nao" ? "Recusou" : decisao === "sempre" ? "Permitiu sempre, nesta conversa," : "Permitiu"} à IA: ${titulo}`);
              if (decisao === "nao") {
                mensagens.push({ role: "tool", tool_call_id: c.id, content: "A pessoa não autorizou esta ação. Não tentes outra vez sem ela pedir." });
                continue;
              }
            }
            let resultado: string;
            const assinatura = `${c.nome}:${JSON.stringify(c.argumentos)}`;
            if (!f.escreve && feitas.has(assinatura)) {
              // a mesma leitura outra vez: não se repete, e empurra-se o modelo para responder
              resultado = "Já fizeste exatamente isto agora e o resultado não mudou. Responde à pessoa com o que sabes.";
            } else {
              try {
                resultado = await f.executar(c.argumentos);
              } catch (e) {
                resultado = `Erro: ${e instanceof Error ? e.message : "a ferramenta falhou"}.`;
              }
              feitas.set(assinatura, resultado);
            }
            mensagens.push({ role: "tool", tool_call_id: c.id, content: resultado.slice(0, 6000) });
          }
        }
        yield { t: "Parei: fiz muitos passos sem chegar ao fim. Diga-me como continuar." };
        yield { fim: true };
      } finally {
        marcarEmUso("assistente", 3_000);
        marcarFase(null);
      }
    },
  };
}

/** O endereço de uma página do painel (como o menu o escreve). */
export const hrefDe = (area: string, modulo: string) => caminho(area, modulo);

/** As respostas oficiais da FAQ, em texto, para as instruções do assistente. */
export function respostasOficiais(lista: Faq[], maximo = 14): string {
  return faqAtivas(lista)
    .slice(0, maximo)
    .map((f) => `P: ${f.pergunta}\nR: ${f.resposta.slice(0, 400)}`)
    .join("\n\n");
}
