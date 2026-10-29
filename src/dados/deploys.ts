// Os dados de demonstração das implementações, dos commits do GitHub e dos conectores (Developer tools). Têm a forma exata das respostas do contrato das APIs (lib/api/contrato.ts); em modo ligado vêm do servidor.
import type { EstadoDeImplementacoes, Implementacao } from "@/lib/implementacoes";
import { Sorteio } from "./semente";

export const RAMOS_DE_DEMONSTRACAO = ["main", "desenvolvimento", "correcoes"];
const AUTORES = ["Ana Costa", "Bruno Ferreira", "Carla Pereira", "Diogo Santos"];
const MENSAGENS = ["Corrige o cálculo do ticket médio", "Acrescenta o filtro por local na galeria", "Atualiza as dependências", "Melhora o carregamento da lista de pedidos", "Corrige o erro ao guardar uma conta", "Novo ecrã de implementações", "Ajusta o espaçamento no telemóvel", "Mais testes para o IBAN", "Remove código que já não se usa", "Corrige a ordem das cópias de segurança"];

/** 29 de outubro de 2026, 09:53 (hora de Luanda), o instante de referência dos dados de demonstração. */
const REFERENCIA = Date.UTC(2026, 9, 29, 8, 53);

const p2 = (n: number) => String(n).padStart(2, "0");
const sha = (s: Sorteio) => s.entre(0x1000000, 0xfffffff).toString(16);

export function gerarImplementacoes(): EstadoDeImplementacoes {
  const s = new Sorteio(711);
  const itens: Implementacao[] = Array.from({ length: 8 }, (_, i) => {
    const quando = new Date(REFERENCIA - i * 31 * 3_600_000 - s.entre(0, 90) * 60_000);
    const commit = sha(s);
    return {
      id: `imp-${i + 1}`,
      versao: `${quando.getUTCFullYear()}${p2(quando.getUTCMonth() + 1)}${p2(quando.getUTCDate())}-${p2(quando.getUTCHours() + 1)}${p2(quando.getUTCMinutes())}`,
      ramo: i === 3 ? "correcoes" : "main",
      commit,
      mensagem: s.de(MENSAGENS),
      autor: s.de(AUTORES),
      quando: quando.toISOString(),
      estado: i === 0 ? "Ativa" : i === 2 ? "Falhou" : "Anterior",
      trafego: i === 0 ? 100 : 0,
    };
  });
  return { itens, a: itens[0].id, b: null, percentagemB: 0, historico: [{ quando: itens[0].quando, texto: `Versão ${itens[0].versao} em produção` }] };
}

export interface Commit {
  sha: string;
  mensagem: string;
  autor: string;
  quando: string;
  ramo: string;
  testes: "Passaram" | "Falharam" | "A correr";
}

/** Os últimos commits de um ramo, do mais recente para o mais antigo. */
export function gerarCommits(ramo: string, n = 10): Commit[] {
  const s = new Sorteio(721 + [...ramo].reduce((t, c) => t + c.charCodeAt(0), 0));
  return Array.from({ length: n }, (_, i) => ({
    sha: sha(s),
    mensagem: s.de(MENSAGENS),
    autor: s.de(AUTORES),
    quando: new Date(REFERENCIA - i * 5 * 3_600_000 - s.entre(0, 120) * 60_000).toISOString(),
    ramo,
    testes: i === 0 && ramo !== "main" ? "A correr" : s.pesada<Commit["testes"]>(["Passaram", "Falharam"], [9, 1]),
  }));
}

export interface Conector {
  id: string;
  rotulo: string;
  ligado: boolean;
  /** O que está ligado (o repositório, o registo, o canal). */
  detalhe: string;
}

export const CONECTORES_DE_ORIGEM: Conector[] = [
  { id: "github", rotulo: "GitHub", ligado: true, detalhe: "empresa-exemplo/painel" },
  { id: "cloudflare", rotulo: "Cloudflare", ligado: true, detalhe: "DNS e túneis" },
  { id: "docker", rotulo: "Registo de imagens Docker", ligado: false, detalhe: "Sem registo escolhido" },
  { id: "slack", rotulo: "Avisos no Slack", ligado: false, detalhe: "Sem canal escolhido" },
];

export interface LigacaoGitHub {
  /** «dono/nome». */
  repositorio: string;
  ramo: string;
}

export const GITHUB_DE_ORIGEM: LigacaoGitHub = { repositorio: "empresa-exemplo/painel", ramo: "main" };
