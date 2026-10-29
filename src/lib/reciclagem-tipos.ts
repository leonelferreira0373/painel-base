// A reciclagem: tudo o que se apaga no painel, seja de que tipo for (uma pergunta da FAQ, um ficheiro, um registo DNS, uma regra do firewall, uma conta, um lembrete, uma análise…), fica aqui durante um prazo (90 dias por omissão; o Master Admin muda-o) e pode ser restaurado ou apagado de vez, pelo menu de opções de cada item. Os tipos e as contas dos prazos (puros); guardar, restaurar e limpar está em reciclagem.ts.

/** De onde veio o item e, portanto, para onde volta. */
export type OrigemDoItem =
  | { kind: "colecao"; chave: string; caminho?: string }
  | { kind: "armazem"; loja: "ficheiros" | "memoria" | "artigos" }
  | { kind: "faq" }
  | { kind: "conta"; campo: "lembretes" | "tokens" | "fontes" }
  | { kind: "pesquisa" }
  | { kind: "atividade" }
  | { kind: "uso-ia" };

export interface ItemApagado {
  id: string;
  /** O tipo de dado em palavras («Regra do firewall»). */
  tipo: string;
  /** O nome que a pessoa lhe dava. */
  rotulo: string;
  origem: OrigemDoItem;
  /** O item inteiro, tal como estava (um ficheiro leva o seu conteúdo). */
  dados: unknown;
  apagadoEm: string;
  apagadoPor: string;
  /** A página onde se apagou. */
  pagina: string;
}

/** Avisa as listas guardadas no navegador de que uma delas mudou por fora (um item restaurado). */
export const EVENTO_GUARDADO = "painel:guardado";
/** Pede à conta que ponha de volta um lembrete ou uma chave restaurada. */
export const EVENTO_RESTAURAR_CONTA = "painel:restaurar-conta";

export const DIAS_DE_ORIGEM = 90;
export const DIAS_MINIMOS = 1;
export const DIAS_MAXIMOS = 3650;
/** Os prazos que o Master Admin escolhe de uma lista; pode escrever outro. */
export const PRAZOS_COMUNS = [7, 14, 30, 60, 90, 180, 365] as const;

const DIA = 86_400_000;

export const diasValidos = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= DIAS_MINIMOS && n <= DIAS_MAXIMOS;

export const expiraEm = (i: Pick<ItemApagado, "apagadoEm">, dias: number): Date => new Date(new Date(i.apagadoEm).getTime() + dias * DIA);

/** Quantos dias faltam para o item se apagar de vez (arredondado para cima; 0 quando já passou). */
export const diasRestantes = (i: Pick<ItemApagado, "apagadoEm">, dias: number, agora: Date): number => Math.max(0, Math.ceil((expiraEm(i, dias).getTime() - agora.getTime()) / DIA));

/** Os itens cujo prazo já acabou. */
export const expirados = <T extends Pick<ItemApagado, "apagadoEm">>(itens: T[], dias: number, agora: Date): T[] => itens.filter((i) => expiraEm(i, dias).getTime() <= agora.getTime());

/** «faltam 12 dias», «falta 1 dia», «acaba hoje». */
export function textoDoPrazo(restantes: number): string {
  if (restantes <= 0) return "Acaba hoje";
  return restantes === 1 ? "Falta 1 dia" : `Faltam ${restantes} dias`;
}

/** O que cada coleção guardada no navegador é, em palavras. */
export const TIPOS_DE_COLECAO: Record<string, string> = {
  "contas-bancarias": "Conta bancária",
  "firewall-regras": "Regra do firewall",
  backups: "Cópia de segurança",
  emails: "Mensagem de e-mail",
  "campanhas-email": "Campanha de e-mail",
  "dns-registos": "Registo DNS",
  conectores: "Conector",
  convites: "Convite",
  comprovativos: "Comprovativo",
  campanhas: "Ligação de campanha",
  produtos: "Produto",
  faq: "Pergunta da FAQ",
  "tokens-api": "Token da API",
  "dev-emails": "E-mail enviado",
};

export const tipoDaColecao = (chave: string): string => TIPOS_DE_COLECAO[chave] ?? chave.replace(/-/g, " ");

/** O nome de um item: o primeiro campo que costuma ter nome. */
export function rotuloDe(dados: unknown): string {
  if (typeof dados === "string") return dados.slice(0, 120);
  if (!dados || typeof dados !== "object") return "Sem nome";
  const o = dados as Record<string, unknown>;
  // um registo DNS é «A www», não só «www»
  if (typeof o.tipo === "string" && typeof o.nome === "string" && typeof o.valor === "string" && o.tipo.length <= 5) return `${o.tipo} ${o.nome.trim() || "@"}`;
  for (const k of ["nome", "titulo", "pergunta", "assunto", "campanha", "rotulo", "banco", "alvo", "email", "referencia", "processo", "sha", "tipo"]) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 120);
  }
  return typeof o.id === "string" ? o.id : "Sem nome";
}

export function novoItemApagado(p: { id?: string; tipo: string; dados: unknown; origem: OrigemDoItem; por: string; pagina: string; rotulo?: string; agora?: Date }): ItemApagado {
  const agora = p.agora ?? new Date();
  return {
    id: p.id ?? `${agora.getTime().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    tipo: p.tipo,
    rotulo: p.rotulo ?? rotuloDe(p.dados),
    origem: p.origem,
    dados: p.dados,
    apagadoEm: agora.toISOString(),
    apagadoPor: p.por,
    pagina: p.pagina,
  };
}

/** Uma chave de armazém (IndexedDB) em palavras. */
export function tipoDoArmazem(loja: "ficheiros" | "memoria" | "artigos", dados: unknown): string {
  if (loja === "memoria") return "Documento da memória da IA";
  if (loja === "artigos") return "Artigo do blog";
  return (dados as { tipo?: string })?.tipo === "pasta" ? "Pasta" : "Ficheiro";
}
