// Perguntar à IA a partir de qualquer sítio (um cartão, um termo): abre o chat e põe lá a pergunta (ou envia-a logo), e guarda o que a pessoa tem no ecrã (o título e os dados) para a IA o ler junto com a pergunta. O contexto vale uma só pergunta e expira passados cinco minutos.

export interface ContextoDaPergunta {
  titulo: string;
  dados?: unknown;
  pagina?: string;
}

let pendente: { contexto: ContextoDaPergunta; ate: number } | null = null;

/** O contexto à espera de uma pergunta (e esquece-o: vale só uma vez). */
export function consumirContexto(agora = Date.now()): ContextoDaPergunta | null {
  const c = pendente && pendente.ate > agora ? pendente.contexto : null;
  pendente = null;
  return c;
}

/** O contexto como texto para as instruções da IA (os dados cortados para caberem). */
export function textoDoContexto(c: ContextoDaPergunta, maximo = 5000): string {
  let dados = "";
  if (c.dados !== undefined) {
    try {
      dados = JSON.stringify(c.dados);
    } catch {
      dados = String(c.dados);
    }
    if (dados.length > maximo) dados = `${dados.slice(0, maximo)}… (cortado)`;
  }
  return `A pessoa está a perguntar sobre isto, que tem à frente${c.pagina ? ` em ${c.pagina}` : ""}: ${c.titulo}.${dados ? `\nDados (JSON): ${dados}` : ""}`;
}

/** Quem abriu uma janelinha ou uma janela para a pessoa perguntar à IA fecha-a quando a pergunta sai: o chat abre por cima e as duas coisas abertas ao mesmo tempo ficavam mal. */
export const EVENTO_FECHAR_FLUTUANTES = "painel:fechar-flutuantes";

/** Abre o chat e faz a pergunta: com `enviar` envia-a logo; senão fica escrita para a pessoa acabar. Fecha antes as janelinhas e as janelas que estavam abertas. */
export function perguntarAIa(texto: string, opcoes: { contexto?: ContextoDaPergunta; enviar?: boolean } = {}): void {
  window.dispatchEvent(new Event(EVENTO_FECHAR_FLUTUANTES));
  if (opcoes.contexto) pendente = { contexto: { pagina: window.location.pathname, ...opcoes.contexto }, ate: Date.now() + 5 * 60_000 };
  window.dispatchEvent(new Event("bridge:assistente"));
  // o chat leva um instante a abrir; o que fica só escrito (num campo de texto) não pode levar os «» dos termos
  window.setTimeout(() => window.dispatchEvent(new CustomEvent("painel:chat-perguntar", { detail: { texto: opcoes.enviar === true ? texto : texto.replace(/[«»]/g, ""), enviar: opcoes.enviar === true } })), 450);
}
