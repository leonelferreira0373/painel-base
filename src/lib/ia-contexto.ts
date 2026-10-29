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

/** Abre o chat e faz a pergunta: com `enviar` envia-a logo; senão fica escrita para a pessoa acabar. */
export function perguntarAIa(texto: string, opcoes: { contexto?: ContextoDaPergunta; enviar?: boolean } = {}): void {
  if (opcoes.contexto) pendente = { contexto: { pagina: window.location.pathname, ...opcoes.contexto }, ate: Date.now() + 5 * 60_000 };
  window.dispatchEvent(new Event("bridge:assistente"));
  // o chat leva um instante a abrir
  window.setTimeout(() => window.dispatchEvent(new CustomEvent("painel:chat-perguntar", { detail: { texto, enviar: opcoes.enviar === true } })), 450);
}
