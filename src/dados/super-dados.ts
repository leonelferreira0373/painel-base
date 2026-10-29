// Dados de demonstração do super painel (pagamentos, marketing e developer tools), determinísticos: o mesmo resultado em cada carregamento. Têm a forma exata das respostas do contrato das APIs (lib/api/contrato.ts), por isso trocar o simulado pelo servidor não muda nenhum ecrã.
import { gerarIban } from "@/lib/iban";
import { PROJETO } from "./projeto";
import { CLIENTES, Sorteio } from "./semente";

const dia = (deslocamento: number, hora = 0) => new Date(Date.UTC(2026, 9, 29) + deslocamento * 86_400_000 + hora * 3_600_000).toISOString();

// ---------- pagamentos ----------

export interface Pagamento {
  id: string;
  referencia: string;
  cliente: string;
  metodo: string;
  valor: number;
  moeda: string;
  data: string;
  estado: "Pendente" | "Confirmado" | "Recusado" | "Reembolsado";
  conta: string;
}

export const METODOS_DE_PAGAMENTO = ["Transferência", "Multicaixa Express", "Referência", "Cartão", "Numerário"] as const;

export interface ContaBancaria {
  id: string;
  banco: string;
  titular: string;
  iban: string;
  moeda: string;
  principal: boolean;
  ativa: boolean;
}

export const CONTAS_DE_ORIGEM: ContaBancaria[] = [
  { id: "cb-1", banco: "BAI", titular: PROJETO.empresa, iban: gerarIban("AO", "0040000012345678101"), moeda: "AOA", principal: true, ativa: true },
  { id: "cb-2", banco: "BFA", titular: PROJETO.empresa, iban: gerarIban("AO", "0006000055501000123"), moeda: "AOA", principal: false, ativa: true },
  { id: "cb-3", banco: "Millennium bcp", titular: PROJETO.empresa, iban: gerarIban("PT", "0033000012345678901"), moeda: "EUR", principal: false, ativa: false },
];

export function gerarPagamentos(n = 48): Pagamento[] {
  const s = new Sorteio(311);
  return Array.from({ length: n }, (_, i) => {
    const conta = s.de(CONTAS_DE_ORIGEM.filter((c) => c.ativa));
    return {
      id: `pagamentos-${i + 1}`,
      referencia: `PG-${String(2600 + i).padStart(5, "0")}`,
      cliente: s.de(CLIENTES),
      metodo: s.pesada(METODOS_DE_PAGAMENTO, [6, 3, 3, 2, 1]),
      valor: s.entre(8, 240) * 1000,
      moeda: "AOA",
      data: s.dia(-s.entre(0, 29)),
      estado: s.pesada(["Confirmado", "Pendente", "Recusado", "Reembolsado"] as const, [14, 5, 2, 1]),
      conta: conta.iban,
    };
  });
}

export interface Comprovativo {
  id: string;
  ficheiro: string;
  pagamento: string;
  de: string;
  recebido: string;
  estado: "Por validar" | "Validado" | "Rejeitado";
  nota?: string;
}

export function gerarComprovativos(): Comprovativo[] {
  const s = new Sorteio(312);
  const pg = gerarPagamentos();
  return Array.from({ length: 7 }, (_, i) => ({
    id: `cp-${i + 1}`,
    ficheiro: `comprovativo-${String(140 + i).padStart(4, "0")}.png`,
    pagamento: pg[i * 3].referencia,
    de: pg[i * 3].cliente,
    recebido: dia(-s.entre(0, 6), s.entre(7, 18)),
    estado: i < 4 ? "Por validar" : i === 4 ? "Rejeitado" : "Validado",
  }));
}

// ---------- marketing ----------

export interface Origem {
  fonte: string;
  meio: string;
  campanha: string;
  visitas: number;
  visitantes: number;
  conversoes: number;
}
export interface PaginaQuente {
  pagina: string;
  visitas: number;
  tempoMedio: number;
  rejeicao: number;
  conversoes: number;
}
export interface Clique {
  elemento: string;
  pagina: string;
  cliques: number;
  visitantes: number;
}

export function gerarOrigens(): Origem[] {
  const s = new Sorteio(321);
  const base: [string, string, string][] = [["google", "organico", ""], ["google", "cpc", "outubro-propostas"], ["direto", "nenhum", ""], ["facebook", "social", "lancamento"], ["instagram", "social", "bastidores"], ["linkedin", "social", "casos-de-sucesso"], ["newsletter", "email", "boletim-29"], ["bing", "organico", ""], ["parceiros.pt", "referencia", ""], ["whatsapp", "social", "partilha"]];
  return base.map(([fonte, meio, campanha]) => {
    const visitas = s.entre(300, 3600);
    return { fonte, meio, campanha, visitas, visitantes: Math.round(visitas * (0.55 + s.entre(0, 25) / 100)), conversoes: Math.round(visitas * (s.entre(1, 9) / 100)) };
  });
}

export function gerarPaginas(): PaginaQuente[] {
  const s = new Sorteio(322);
  return ["/", "/precos", "/servicos", "/servicos/consultoria", "/contactos", "/pedir-proposta", "/blog/como-escolher", "/sobre", "/blog/novidades", "/faq"].map((pagina, i) => ({ pagina, visitas: Math.round(4200 / (i + 1) + s.entre(40, 220)), tempoMedio: s.entre(18, 140), rejeicao: s.entre(18, 62) / 100, conversoes: Math.round((4200 / (i + 1)) * (s.entre(1, 8) / 100)) }));
}

export function gerarCliques(): Clique[] {
  const s = new Sorteio(323);
  const base: [string, string][] = [["Pedir proposta", "/precos"], ["Pedir proposta", "/"], ["Falar no WhatsApp", "/contactos"], ["Ver preços", "/"], ["Submeter pedido", "/pedir-proposta"], ["Ligar agora", "/contactos"], ["Ler artigo", "/blog/como-escolher"], ["Descarregar brochura", "/servicos"], ["Subscrever boletim", "/blog/novidades"], ["Menu: Serviços", "/"]];
  return base.map(([elemento, pagina], i) => {
    const cliques = Math.round(1500 / (i + 1.3) + s.entre(20, 120));
    return { elemento, pagina, cliques, visitantes: Math.round(cliques * (0.62 + s.entre(0, 20) / 100)) };
  });
}

export interface ResumoMarketing {
  visitas: number;
  visitantes: number;
  paginasPorVisita: number;
  rejeicao: number;
  conversoes: number;
  porDia: { data: string; visitas: number }[];
}

export function gerarResumoMarketing(dias = 14): ResumoMarketing {
  const s = new Sorteio(324);
  const porDia = Array.from({ length: dias }, (_, i) => ({ data: dia(i - dias + 1).slice(0, 10), visitas: s.entre(520, 1380) + (i % 7 === 5 || i % 7 === 6 ? -180 : 0) }));
  const visitas = porDia.reduce((t, d) => t + d.visitas, 0);
  return { visitas, visitantes: Math.round(visitas * 0.57), paginasPorVisita: 2.8, rejeicao: 0.41, conversoes: Math.round(visitas * 0.023), porDia };
}

// ---------- developer tools ----------

export interface TabelaBd {
  nome: string;
  linhas: number;
  bytes: number;
  rls: boolean;
  politicas: { nome: string; comando: string; expressao: string }[];
}

export function gerarTabelas(): TabelaBd[] {
  return [
    { nome: "utilizadores", linhas: 1240, bytes: 884_736, rls: true, politicas: [{ nome: "ver_proprios", comando: "SELECT", expressao: "id = auth.uid()" }, { nome: "editar_proprios", comando: "UPDATE", expressao: "id = auth.uid()" }] },
    { nome: "pedidos", linhas: 18_730, bytes: 12_713_984, rls: true, politicas: [{ nome: "ver_da_conta", comando: "SELECT", expressao: "conta_id = auth.conta()" }] },
    { nome: "pagamentos", linhas: 9_204, bytes: 6_815_744, rls: true, politicas: [{ nome: "ver_da_conta", comando: "SELECT", expressao: "conta_id = auth.conta()" }] },
    { nome: "comprovativos", linhas: 2_516, bytes: 1_245_184, rls: false, politicas: [] },
    { nome: "eventos", linhas: 412_880, bytes: 96_468_992, rls: false, politicas: [] },
    { nome: "sessoes", linhas: 3_912, bytes: 1_048_576, rls: true, politicas: [{ nome: "so_o_dono", comando: "ALL", expressao: "utilizador_id = auth.uid()" }] },
    { nome: "logs", linhas: 88_340, bytes: 28_311_552, rls: false, politicas: [] },
  ];
}

export interface Backup {
  id: string;
  quando: string;
  tipo: "Automático" | "Manual";
  bytes: number;
  estado: "Concluído" | "A decorrer" | "Falhou";
  destino: string;
}

export function gerarBackups(): Backup[] {
  const s = new Sorteio(331);
  return Array.from({ length: 8 }, (_, i) => ({ id: `bk-${8 - i}`, quando: dia(-i, 2), tipo: i === 3 ? "Manual" : "Automático", bytes: 52_000_000 + s.entre(0, 6_000_000) - i * 100_000, estado: i === 5 ? "Falhou" : "Concluído", destino: "s3://copias/painel" }));
}

export interface RegraFirewall {
  id: string;
  acao: "permitir" | "bloquear";
  alvo: string;
  nota: string;
  ativa: boolean;
}

export const REGRAS_DE_ORIGEM: RegraFirewall[] = [
  { id: "fw-1", acao: "bloquear", alvo: "203.0.113.0/24", nota: "Tentativas de entrada repetidas", ativa: true },
  { id: "fw-2", acao: "permitir", alvo: "102.67.0.0/16", nota: "Escritório de Luanda", ativa: true },
  { id: "fw-3", acao: "bloquear", alvo: "RU", nota: "Sem clientes neste país", ativa: false },
];

export interface PaginaSite {
  caminho: string;
  estado: "ativa" | "manutencao" | "desativada";
  mensagem: string;
}

export const PAGINAS_DE_ORIGEM: PaginaSite[] = ["/", "/precos", "/servicos", "/servicos/consultoria", "/contactos", "/pedir-proposta", "/blog", "/faq"].map((caminho) => ({ caminho, estado: "ativa", mensagem: "" }));

export type EstadoDeEmail = "Fila" | "Enviado" | "Entregue" | "Rejeitado" | "Falhou";
export interface EmailEnviado {
  id: string;
  para: string;
  assunto: string;
  estado: EstadoDeEmail;
  quando: string;
  erro?: string;
}

export function gerarEmails(n = 40): EmailEnviado[] {
  const s = new Sorteio(341);
  const assuntos = ["Pedido confirmado", "Recuperar palavra-passe", "Comprovativo recebido", "Proposta comercial", "Aviso de início de sessão", "Resumo semanal"];
  return Array.from({ length: n }, (_, i) => {
    const estado = s.pesada<EstadoDeEmail>(["Entregue", "Enviado", "Rejeitado", "Falhou", "Fila"], [30, 6, 3, 2, 1]);
    return { id: `em-${n - i}`, para: `${s.de(["adilson", "beatriz", "carlos", "domingos", "eduarda", "fernando"])}@${s.de(["empresa.exemplo", "cliente.pt", "mail.co.ao", "gmail.com"])}`, assunto: s.de(assuntos), estado, quando: dia(0, -i * 1.3), erro: estado === "Rejeitado" ? "550 5.1.1 Caixa inexistente" : estado === "Falhou" ? "Tempo esgotado a falar com o servidor" : undefined };
  });
}

export interface ErroRegistado {
  id: string;
  nivel: "erro" | "aviso" | "fatal";
  mensagem: string;
  origem: string;
  ocorrencias: number;
  ultimo: string;
  estado: string;
}

export const MENSAGENS_DE_ERRO: [string, string, ErroRegistado["nivel"]][] = [
  ["TypeError: Cannot read properties of undefined (reading 'valor')", "/api/pagamentos", "erro"],
  ["Timeout de 30 s a falar com a base de dados", "/api/pedidos", "fatal"],
  ["ECONNREFUSED 127.0.0.1:5432", "worker de e-mails", "fatal"],
  ["Token expirado", "/api/sessao", "aviso"],
  ["Ficheiro de comprovativo maior do que 5 MB", "/api/comprovativos", "aviso"],
  ["Falha a validar o IBAN recebido", "/api/contas-bancarias", "erro"],
  ["Pedido bloqueado pelo limite de 120 por minuto", "firewall", "aviso"],
  ["Cópia de segurança falhou: disco cheio", "backup", "erro"],
];

export function gerarErros(): ErroRegistado[] {
  const s = new Sorteio(351);
  return MENSAGENS_DE_ERRO.map(([mensagem, origem, nivel], i) => ({ id: `erros-${i + 1}`, nivel, mensagem, origem, ocorrencias: s.entre(2, 240), ultimo: dia(0, -s.entre(1, 70)), estado: i < 3 ? "Novo" : i < 6 ? "Visto" : "Resolvido" }));
}

// ---------- pedidos web em tempo real ----------

export interface PedidoWeb {
  id: string;
  quando: string;
  metodo: "GET" | "POST" | "PUT" | "DELETE";
  caminho: string;
  estado: number;
  ms: number;
  ip: string;
  pais: string;
  agente: string;
}

const CAMINHOS = ["/", "/precos", "/servicos", "/contactos", "/api/pedidos", "/api/pagamentos", "/api/sessao", "/blog", "/entrar/", "/_next/static/chunks/app.js", "/favicon.ico", "/api/eventos"];
const AGENTES = ["Chrome 141 · Android", "Safari 18 · iOS", "Chrome 141 · Windows", "Firefox 133", "Edge 141", "curl/8.5", "Googlebot/2.1"];
const PAISES = ["AO", "AO", "AO", "PT", "BR", "US", "ZA", "MZ"];

/** Os visitantes que voltam: dois em cada três pedidos vêm dos mesmos IPs, como no tráfego verdadeiro, por isso bloquear um deles faz diferença nos pedidos seguintes. */
const VISITANTES = Array.from({ length: 14 }, (_, i) => {
  const s = new Sorteio(7000 + i);
  return { ip: `${s.de([102, 41, 197, 154])}.${s.entre(0, 255)}.${s.entre(0, 255)}.${s.entre(1, 254)}`, pais: s.de(PAISES) };
});

/**
 * Gera um pedido novo; `n` é o número de ordem, para os identificadores e o sorteio serem estáveis. Se `bloqueia` disser que o firewall bloqueia o IP do pedido, o pedido
 * fica recusado (403) e quase instantâneo.
 */
export function gerarPedido(n: number, agora = Date.now(), bloqueia?: (ip: string, pais: string) => boolean): PedidoWeb {
  const s = new Sorteio(400 + n);
  const caminho = s.de(CAMINHOS);
  const eApi = caminho.startsWith("/api/");
  const metodo = eApi ? s.pesada(["POST", "GET", "PUT", "DELETE"] as const, [5, 6, 1, 1]) : "GET";
  const estado = eApi ? s.pesada([200, 201, 401, 429, 500, 502], [70, 8, 8, 5, 6, 3]) : s.pesada([200, 304, 404, 500], [82, 12, 5, 1]);
  const ms = Math.round((eApi ? 40 : 12) + s.entre(0, eApi ? 380 : 90) * (estado >= 500 ? 4 : 1));
  const volta = s.entre(0, 2) > 0 ? VISITANTES[s.entre(0, VISITANTES.length - 1)] : null;
  const ip = volta?.ip ?? `${s.de([102, 41, 197, 154])}.${s.entre(0, 255)}.${s.entre(0, 255)}.${s.entre(1, 254)}`;
  const pais = volta?.pais ?? s.de(PAISES);
  const recusado = !!bloqueia?.(ip, pais);
  return { id: `rq-${n}`, quando: new Date(agora).toISOString(), metodo, caminho, estado: recusado ? 403 : estado, ms: recusado ? 1 + (n % 4) : ms, ip, pais, agente: s.de(AGENTES) };
}

/** O percentil `p` (0 a 1) de uma lista de números. */
export function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.floor(p * ordenados.length))];
}

// ---------- saúde do servidor ----------

export interface Servico {
  nome: string;
  estado: "saudavel" | "a-arrancar" | "parado";
  cpu: number;
  memoria: number;
}

export interface Saude {
  cpu: number;
  memoria: number;
  disco: number;
  redeEntrada: number;
  redeSaida: number;
  carga: number[];
  tempoLigado: number;
  servicos: Servico[];
}

/** A saúde do servidor no instante `t` (segundos): valores que oscilam de forma suave e verosímil. */
export function gerarSaude(t: number): Saude {
  const onda = (periodo: number, fase = 0) => (Math.sin(((t + fase) / periodo) * Math.PI * 2) + 1) / 2;
  return {
    cpu: 0.12 + onda(37) * 0.28 + onda(7, 3) * 0.06,
    memoria: 0.52 + onda(113) * 0.12,
    disco: 0.41,
    redeEntrada: Math.round(80_000 + onda(19) * 260_000),
    redeSaida: Math.round(220_000 + onda(23, 5) * 900_000),
    carga: [0.4 + onda(41) * 0.5, 0.5 + onda(97) * 0.4, 0.55 + onda(211) * 0.3],
    tempoLigado: 14 * 86_400 + 3 * 3600 + Math.round(t),
    servicos: [
      { nome: "web (nginx)", estado: "saudavel", cpu: 0.01 + onda(11) * 0.03, memoria: 38_000_000 },
      { nome: "api", estado: "saudavel", cpu: 0.05 + onda(13) * 0.2, memoria: 210_000_000 },
      { nome: "base de dados", estado: "saudavel", cpu: 0.04 + onda(17) * 0.12, memoria: 640_000_000 },
      { nome: "worker de e-mails", estado: "saudavel", cpu: 0.01 + onda(29) * 0.04, memoria: 96_000_000 },
      { nome: "túnel (cloudflared)", estado: "saudavel", cpu: 0.01, memoria: 42_000_000 },
    ],
  };
}

// ---------- firewall: pedidos bloqueados ----------

export interface Bloqueio {
  id: string;
  quando: string;
  ip: string;
  caminho: string;
  motivo: string;
}

/** Um IP sorteado dentro do alvo de uma regra (um IP ou uma gama CIDR); null se o alvo não é um IPv4 (por exemplo, um país). */
function ipNoAlvo(alvo: string, s: Sorteio): string | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(alvo);
  if (!m) return null;
  const base = ((Number(m[1]) << 24) | (Number(m[2]) << 16) | (Number(m[3]) << 8) | Number(m[4])) >>> 0;
  const bits = m[5] === undefined ? 32 : Number(m[5]);
  const livres = 32 - bits;
  const mascara = bits === 0 ? 0 : (0xffffffff << livres) >>> 0;
  const r = s.entre(0, 1_000_000) / 1_000_000;
  const aleatorio = livres === 0 ? 0 : livres === 1 ? Math.round(r) : 1 + Math.floor(r * (2 ** livres - 2));
  const n = ((base & mascara) | aleatorio) >>> 0;
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

/** Os pedidos bloqueados mais recentes: cada um pelo motivo (uma regra de bloquear ativa ou o limite de pedidos). `t` muda de 3 em 3 segundos para a lista andar. */
export function gerarBloqueios(t: number, regras: { acao: string; alvo: string; ativa: boolean }[], limite: number, agora = Date.now()): Bloqueio[] {
  const motivos = [...regras.filter((r) => r.ativa && r.acao === "bloquear").map((r) => `Regra: ${r.alvo}`), `Limite de ${limite} por minuto`];
  const base = Math.floor(t / 3) * 10;
  return Array.from({ length: 10 }, (_, i) => {
    const s = new Sorteio(900 + base + i);
    const motivo = s.de(motivos);
    const alvo = motivo.startsWith("Regra: ") ? motivo.slice(7) : "";
    const ip = ipNoAlvo(alvo, s) ?? `${s.de([203, 185, 45, 91])}.${s.entre(0, 255)}.${s.entre(0, 255)}.${s.entre(1, 254)}`;
    return { id: `bl-${base + i}`, quando: new Date(agora - i * 7000).toISOString(), ip, caminho: s.de(["/entrar/", "/api/sessao", "/api/pagamentos", "/wp-login.php", "/.env"]), motivo };
  });
}
