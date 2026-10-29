// Partilha de ficheiros do painel para fora, de aparelho para aparelho e por WebRTC (as funções do SnapShare dentro do painel): os ficheiros vão direitos do navegador de quem envia para o de quem recebe, sem passar por nenhum servidor nem conta. Aqui estão as contas puras: o código curto de ligação (também é o identificador do par), a ligação e o QR, o nome do aparelho, o tamanho, a velocidade, o tempo que falta e os avisos. O protocolo é o do SnapShare (https://github.com/leonelferreira0373/snapshare): quem abrir a ligação do painel, ou a do SnapShare, recebe os ficheiros.

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I, que se confundem
export const PREFIXO_DO_PAR = "snap-";
export const TAMANHO_DO_CODIGO = 6;
/** O endereço do SnapShare original: quem receber por lá também se liga a este painel. */
export const ENDERECO_DO_SNAPSHARE = "https://snapshare-share.vercel.app/";

/** Um código novo («K7M3QX»): é o identificador do par e o que se escreve à mão. */
export function gerarCodigoCurto(aleatorio: (n: number) => Uint32Array = (n) => crypto.getRandomValues(new Uint32Array(n))): string {
  const a = aleatorio(TAMANHO_DO_CODIGO);
  let c = "";
  for (let i = 0; i < TAMANHO_DO_CODIGO; i++) c += ALFABETO[a[i] % ALFABETO.length];
  return c;
}

/** «K7MQ3X» → «K7M-Q3X». */
export const formatarCodigo = (codigo: string): string => (codigo.length === TAMANHO_DO_CODIGO ? `${codigo.slice(0, 3)}-${codigo.slice(3)}` : codigo);

/** O que se escreveu, só com letras e números, em maiúsculas. */
export const normalizarCodigo = (texto: string): string => texto.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const idDoCodigo = (codigo: string): string | null => {
  const c = normalizarCodigo(codigo);
  return c.length === TAMANHO_DO_CODIGO ? PREFIXO_DO_PAR + c : null;
};
export const codigoDoId = (id: string): string => id.replace(new RegExp(`^${PREFIXO_DO_PAR}`), "");

/** O identificador do par que um texto diz: uma ligação com «?peer=…» (a do painel ou a do SnapShare), o código de seis letras ou o identificador inteiro. */
export function idDeTexto(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  try {
    const peer = new URL(t).searchParams.get("peer");
    if (peer && /^[\w-]{3,64}$/.test(peer)) return peer;
  } catch {
    /* não é uma ligação */
  }
  if (/^snap-[A-Za-z0-9]{6}$/.test(t)) return t.slice(0, 5) + t.slice(5).toUpperCase();
  return idDoCodigo(t);
}

/** A ligação que a outra pessoa abre (no painel, sem entrar): `base` é o endereço do painel («https://painel.exemplo.com»). */
export const ligacaoDoPar = (id: string, base: string): string => `${base.replace(/\/+$/, "")}/receber/?peer=${encodeURIComponent(id)}`;
export const ligacaoDoSnapshare = (id: string): string => `${ENDERECO_DO_SNAPSHARE}?peer=${encodeURIComponent(id)}`;

// ---------- o nome do aparelho ----------

const ADJETIVOS = ["Veloz", "Claro", "Calmo", "Bravo", "Ágil", "Atento", "Sortudo", "Quieto", "Ousado", "Quente", "Fresco", "Livre", "Real", "Prateado", "Dourado", "Carmim", "Cobalto", "Nublado", "Solar", "Lunar", "Cristal", "Veludo", "Tranquilo", "Brilhante"];
const ANIMAIS = ["Lontra", "Raposa", "Falcão", "Lobo", "Lince", "Coruja", "Pardal", "Panda", "Tigre", "Leão", "Urso", "Águia", "Tubarão", "Baleia", "Golfinho", "Corvo", "Garça", "Grou", "Veado", "Puma", "Cobra", "Osga", "Louva-a-deus", "Fénix"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Um nome fácil de reconhecer para um aparelho, sempre o mesmo para o mesmo identificador («Veloz-Lontra-PC»). */
export function nomeDoAparelho(id: string, plataforma?: string): string {
  const h = hash(id);
  const nome = `${ADJETIVOS[h % ADJETIVOS.length]}-${ANIMAIS[(h >> 8) % ANIMAIS.length]}`;
  return plataforma ? `${nome}-${plataforma}` : nome;
}

/** O aparelho de quem abre a página, em poucas letras («Android», «iOS», «PC»). */
export function plataformaDe(userAgent: string): string {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Android/.test(userAgent)) return "Android";
  if (/Mac/.test(userAgent)) return "Mac";
  if (/Win/.test(userAgent)) return "PC";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Aparelho";
}

// ---------- tamanhos, tempos e velocidade ----------

const dec = (n: number, casas: number) => n.toLocaleString("pt-PT", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function formatarTamanho(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${dec(n / 1024, 1)} KB`;
  if (n < 1024 ** 3) return `${dec(n / 1024 ** 2, 1)} MB`;
  return `${dec(n / 1024 ** 3, 2)} GB`;
}

export function formatarDuracaoMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${dec(ms / 1000, 1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s === 60 ? `${m + 1} min` : `${m} min ${s} s`;
}

/** Bytes por segundo, desde o início; 0 se ainda não passou tempo. */
export const velocidade = (bytes: number, inicio: number, agora: number): number => (agora > inicio ? (bytes / (agora - inicio)) * 1000 : 0);

export const formatarVelocidade = (bps: number): string => `${formatarTamanho(Math.round(bps))}/s`;

/** Quanto falta, em milissegundos, ao ritmo que levou até agora; null enquanto não se sabe. */
export function tempoQueFalta(tamanho: number, bytes: number, inicio: number, agora: number): number | null {
  const v = velocidade(bytes, inicio, agora);
  if (v <= 0 || bytes >= tamanho) return null;
  return ((tamanho - bytes) / v) * 1000;
}

export const percentagem = (bytes: number, tamanho: number): number => (tamanho > 0 ? Math.min(100, Math.round((bytes / tamanho) * 100)) : 0);

// ---------- o que se recebe ----------

export const LIMITE_DO_TEXTO = 1024 * 1024;

/** Texto (para ler e copiar em vez de descarregar): pelo tipo ou pela extensão. */
export const eTexto = (nome: string, mime: string): boolean => mime.startsWith("text/") || /\.(txt|md|csv|log|json|xml|yml|yaml|html|css|js|ts)$/i.test(nome);

/** A primeira ligação de um texto, para abrir de uma vez. */
export const extrairLigacao = (texto: string): string | null => /\bhttps?:\/\/[^\s<>"']+/i.exec(texto.trim())?.[0] ?? null;

const EXTENSOES: Record<string, string> = { "image/jpeg": "jpg", "image/svg+xml": "svg", "text/plain": "txt" };
/** O nome de um ficheiro que veio da área de transferência («area-de-transferencia-2026-10-29T14-02-11.png»). */
export function nomeDoColado(mime: string, agora = new Date()): string {
  const ext = EXTENSOES[mime] ?? (mime.startsWith("image/") || mime.startsWith("text/") ? mime.split("/")[1] : (mime.split("/")[1]?.split("+")[0] ?? "bin"));
  return `area-de-transferencia-${agora.toISOString().replace(/[:.]/g, "-").slice(0, 19)}.${ext || "bin"}`;
}

/** O aviso antes de enviar um ficheiro grande (o ficheiro fica todo na memória do navegador), ou null. */
export function avisoDeTamanho(bytes: number, noTelemovel: boolean): { nivel: "aviso" | "bloqueio"; texto: string } | null {
  const GB = 1024 ** 3;
  if (noTelemovel && bytes > 2 * GB) return { nivel: "bloqueio", texto: "Este ficheiro tem mais de 2 GB: num telemóvel a memória não chega. Envie-o do computador." };
  if (bytes > GB / 2) return { nivel: "aviso", texto: `Este ficheiro tem ${formatarTamanho(bytes)} e fica todo na memória do navegador durante o envio.` };
  return null;
}

// ---------- os pares que se lembram ----------

export interface ParLembrado {
  peerId: string;
  platform?: string;
  at: number;
}

export const MAXIMO_DE_PARES = 8;

/** Põe um par à frente da lista (sem o repetir) e guarda só os mais recentes. */
export function lembrarPar(lista: ParLembrado[], par: ParLembrado): ParLembrado[] {
  return [par, ...lista.filter((p) => p.peerId !== par.peerId)].slice(0, MAXIMO_DE_PARES);
}
