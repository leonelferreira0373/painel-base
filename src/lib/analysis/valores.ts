// Leitura de valores soltos: números (formatos português e inglês), datas e booleanos. Funções puras.
import type { Celula } from "@/lib/tipos";

const MOEDA = /(?:kz|aoa|usd|eur|gbp|€|\$|£)/gi;

export function lerNumero(v: Celula): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.replace(/[  ]/g, " ").trim();
  if (s === "" || s.length > 32) return null;
  s = s.replace(MOEDA, "").trim();
  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1).trim();
  }
  if (s.endsWith("-")) {
    negativo = true;
    s = s.slice(0, -1).trim();
  }
  s = s.replace(/%$/, "").trim();
  if (/^[-+]?\d[\d\s]*$/.test(s) && /\d\s+\d/.test(s)) {
    // 1 250 000 é um número; um número de telefone com indicativo (+244 923 000 104) não é
    if (s.startsWith("+")) return null;
    // todos os grupos depois do primeiro têm de ter 3 algarismos
    const grupos = s.replace(/^[-+]/, "").split(/\s+/);
    if (!grupos.slice(1).every((g) => g.length === 3) || grupos[0].length > 3) return null;
  }
  s = s.replace(/\s+/g, "");
  if (!/^[-+]?(\d+[.,]?)*\d*([eE][-+]?\d+)?$/.test(s) || !/\d/.test(s)) return null;
  const sinal = s.startsWith("-") ? -1 : 1;
  s = s.replace(/^[-+]/, "");
  if (/^0\d+$/.test(s)) return null; // códigos com zeros à esquerda não são números
  const temPonto = s.includes(".");
  const temVirgula = s.includes(",");
  if (temPonto && temVirgula) {
    const decimal = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    const milhar = decimal === "." ? "," : ".";
    s = s.split(milhar).join("").replace(decimal, ".");
  } else if (temVirgula) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (temPonto) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return (negativo ? -1 : 1) * sinal * n;
}

const VERDADEIRO = new Set(["sim", "s", "yes", "y", "true", "verdadeiro", "v"]);
const FALSO = new Set(["não", "nao", "n", "no", "false", "falso", "f"]);

export function lerBooleano(v: Celula): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (VERDADEIRO.has(s)) return true;
  if (FALSO.has(s)) return false;
  return null;
}

export type OrdemData = "dia" | "mes";

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const DATA_ANO_PRIMEIRO = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const DATA_ANO_ULTIMO = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

function construir(a: number, m: number, d: number, h = 0, mi = 0, s = 0): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const data = new Date(Date.UTC(a, m - 1, d, h, mi, s));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return null;
  return data;
}

export function lerData(v: Celula, ordem: OrdemData = "dia"): Date | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s === "" || s.length > 32) return null;
  let m = DATA_ISO.exec(s);
  if (m) return construir(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  m = DATA_ANO_PRIMEIRO.exec(s);
  if (m) return construir(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  m = DATA_ANO_ULTIMO.exec(s);
  if (m) {
    const [a, b] = ordem === "dia" ? [+m[1], +m[2]] : [+m[2], +m[1]];
    return construir(+m[3], b, a, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  }
  return null;
}

/** Parece uma data (mesmo que inválida, como 31/02/2024): serve para separar «data errada» de «texto». */
export function pareceData(v: Celula): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  return DATA_ISO.test(s) || DATA_ANO_PRIMEIRO.test(s) || DATA_ANO_ULTIMO.test(s);
}

/** Dia primeiro por omissão (convenção portuguesa); mês primeiro só se algum valor tiver um segundo campo acima de 12 e nenhum um primeiro. */
export function detetarOrdemData(valores: Celula[]): OrdemData {
  let primeiroAcima12 = false;
  let segundoAcima12 = false;
  for (const v of valores) {
    if (typeof v !== "string") continue;
    const m = DATA_ANO_ULTIMO.exec(v.trim());
    if (!m) continue;
    if (+m[1] > 12) primeiroAcima12 = true;
    if (+m[2] > 12) segundoAcima12 = true;
  }
  return segundoAcima12 && !primeiroAcima12 ? "mes" : "dia";
}

export function paraTexto(v: Celula): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  return String(v);
}

export function vazio(v: Celula): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}
