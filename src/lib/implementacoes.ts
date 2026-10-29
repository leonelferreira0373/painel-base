// As implementações (versões publicadas) e o teste A/B: a versão A recebe o tráfego principal e a B uma parte dele; promover a B, cancelar o teste e voltar a uma versão anterior (rollback) são as mudanças possíveis. Funções puras: cada uma devolve o estado novo e escreve no histórico, e o ecrã só as chama.

export type EstadoDeImplementacao = "Ativa" | "Em teste" | "Pronta" | "Anterior" | "Falhou";

export interface Implementacao {
  id: string;
  /** Identifica a versão («20261029-0953»). */
  versao: string;
  ramo: string;
  /** Os sete primeiros carateres do commit. */
  commit: string;
  mensagem: string;
  autor: string;
  quando: string;
  estado: EstadoDeImplementacao;
  /** A parte do tráfego que a versão recebe agora (0 a 100). */
  trafego: number;
}

export interface EstadoDeImplementacoes {
  itens: Implementacao[];
  /** A versão que recebe o tráfego principal. */
  a: string;
  /** A versão em teste, se há divisão. */
  b: string | null;
  /** Quanto do tráfego vai para a B (0 a 100). */
  percentagemB: number;
  historico: { quando: string; texto: string }[];
}

const porId = (e: EstadoDeImplementacoes, id: string) => e.itens.find((i) => i.id === id);
export const versaoDe = (e: EstadoDeImplementacoes, id: string | null) => (id ? (porId(e, id)?.versao ?? "") : "");

/** Põe o estado e o tráfego de cada versão de acordo com a A, a B e a percentagem. */
function recalcular(e: EstadoDeImplementacoes): EstadoDeImplementacoes {
  const itens = e.itens.map((i): Implementacao => {
    if (i.id === e.a) return { ...i, estado: "Ativa", trafego: e.b ? 100 - e.percentagemB : 100 };
    if (e.b && i.id === e.b) return { ...i, estado: "Em teste", trafego: e.percentagemB };
    // a que servia tudo fica «Anterior»; a que estava em teste fica «Pronta» (pode voltar a testar-se)
    return { ...i, estado: i.estado === "Ativa" ? "Anterior" : i.estado === "Em teste" ? "Pronta" : i.estado, trafego: 0 };
  });
  return { ...e, itens };
}

const registar = (e: EstadoDeImplementacoes, texto: string, agora: string): EstadoDeImplementacoes => ({ ...e, historico: [{ quando: agora, texto }, ...e.historico].slice(0, 50) });

/** O que impede de começar (ou mudar) um teste com esta versão B e esta percentagem, ou null se serve. */
export function erroDaDivisao(e: EstadoDeImplementacoes, b: string, percentagem: number): string | null {
  const alvo = porId(e, b);
  if (!alvo) return "Escolha a versão B.";
  if (b === e.a) return "A versão B tem de ser diferente da A.";
  if (alvo.estado === "Falhou") return "Esta versão falhou e não pode receber tráfego.";
  if (!Number.isInteger(percentagem) || percentagem < 1 || percentagem > 99) return "A parte da B vai de 1 a 99 por cento.";
  return null;
}

/** Começa (ou muda) o teste: a B recebe `percentagem` do tráfego e a A o resto. */
export function dividir(e: EstadoDeImplementacoes, b: string, percentagem: number, agora = new Date().toISOString()): EstadoDeImplementacoes {
  if (erroDaDivisao(e, b, percentagem)) return e;
  const depois = recalcular({ ...e, b, percentagemB: percentagem });
  return registar(depois, `Teste A/B: ${versaoDe(depois, depois.a)} com ${100 - percentagem} % e ${versaoDe(depois, b)} com ${percentagem} %`, agora);
}

/** A B passa a receber todo o tráfego e a A fica como anterior. */
export function promoverB(e: EstadoDeImplementacoes, agora = new Date().toISOString()): EstadoDeImplementacoes {
  if (!e.b) return e;
  const depois = recalcular({ ...e, a: e.b, b: null, percentagemB: 0 });
  return registar(depois, `${versaoDe(depois, depois.a)} promovida: recebe todo o tráfego`, agora);
}

/** Acaba o teste: a A volta a receber todo o tráfego e a B fica pronta. */
export function cancelarTeste(e: EstadoDeImplementacoes, agora = new Date().toISOString()): EstadoDeImplementacoes {
  if (!e.b) return e;
  const depois = recalcular({ ...e, b: null, percentagemB: 0 });
  return registar(depois, `Teste cancelado: ${versaoDe(depois, depois.a)} recebe todo o tráfego`, agora);
}

/** O que impede de voltar a esta versão, ou null se serve. */
export function erroDoRollback(e: EstadoDeImplementacoes, id: string): string | null {
  const alvo = porId(e, id);
  if (!alvo) return "Esta versão já não existe.";
  if (alvo.estado === "Falhou") return "Esta versão falhou: não se pode voltar a ela.";
  if (id === e.a && !e.b) return "Esta versão já recebe todo o tráfego.";
  return null;
}

/** Rollback: a versão escolhida passa a receber todo o tráfego e o teste A/B, se havia, acaba. */
export function reverter(e: EstadoDeImplementacoes, id: string, agora = new Date().toISOString()): EstadoDeImplementacoes {
  if (erroDoRollback(e, id)) return e;
  const antes = versaoDe(e, e.a);
  const depois = recalcular({ ...e, a: id, b: null, percentagemB: 0 });
  return registar(depois, `Rollback: de ${antes} para ${versaoDe(depois, id)}`, agora);
}

/** Uma versão nova, acabada de construir a partir de um commit: fica pronta, sem tráfego, até se promover ou testar. */
export function lancar(e: EstadoDeImplementacoes, dados: Pick<Implementacao, "ramo" | "commit" | "mensagem" | "autor">, agora = new Date()): EstadoDeImplementacoes {
  const p = (n: number) => String(n).padStart(2, "0");
  const versao = `${agora.getFullYear()}${p(agora.getMonth() + 1)}${p(agora.getDate())}-${p(agora.getHours())}${p(agora.getMinutes())}`;
  const id = `imp-${versao}-${dados.commit}`;
  if (e.itens.some((i) => i.id === id)) return e;
  const nova: Implementacao = { id, versao, ...dados, quando: agora.toISOString(), estado: "Pronta", trafego: 0 };
  return registar({ ...e, itens: [nova, ...e.itens] }, `Versão ${versao} lançada do ramo ${dados.ramo} (${dados.commit})`, agora.toISOString());
}

/** A soma do tráfego tem de dar sempre 100: serve de verificação nos testes e antes de guardar no servidor. */
export const trafegoTotal = (e: EstadoDeImplementacoes) => e.itens.reduce((s, i) => s + i.trafego, 0);
