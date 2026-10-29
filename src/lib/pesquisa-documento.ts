// O documento que a pesquisa a fundo devolve: texto rico com objetos inteligentes (títulos, parágrafos com termos em pill e citações [1], listas, tabelas, métricas, avisos, gráficos, passos, pares de dados e fontes). A IA escreve-o em JSON; aqui valida-se (um bloco mau não deita o documento abaixo), repara-se um JSON cortado a meio e converte-se para Markdown, HTML e texto simples (a exportação em Word, PDF e os outros vive em lib/exportar/). Funções puras.
import { z } from "zod";

const texto = z.string().max(4000);
const celula = z.union([z.string().max(600), z.number()]);

const Blocos = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("titulo"), texto: z.string().max(200), nivel: z.number().int().min(2).max(3).optional() }),
  z.object({ tipo: z.literal("paragrafo"), texto }),
  z.object({ tipo: z.literal("lista"), itens: z.array(z.string().max(800)).min(1).max(30), ordenada: z.boolean().optional() }),
  z.object({ tipo: z.literal("tabela"), colunas: z.array(z.string().max(120)).min(1).max(10), linhas: z.array(z.array(celula).max(10)).max(60), legenda: z.string().max(300).optional() }),
  z.object({ tipo: z.literal("metricas"), itens: z.array(z.object({ rotulo: z.string().max(80), valor: z.union([z.string().max(60), z.number()]), nota: z.string().max(160).optional() })).min(1).max(8) }),
  z.object({ tipo: z.literal("destaque"), variante: z.enum(["info", "aviso", "sucesso", "erro"]).default("info"), titulo: z.string().max(120).optional(), texto }),
  z.object({ tipo: z.literal("grafico"), grafico: z.enum(["barras", "linha", "rosca"]).default("barras"), titulo: z.string().max(160), categorias: z.array(z.string().max(60)).min(1).max(40), series: z.array(z.object({ nome: z.string().max(60), valores: z.array(z.number()).max(40) })).min(1).max(6), unidade: z.string().max(20).optional() }),
  z.object({ tipo: z.literal("citacao"), texto, fonte: z.number().int().min(1).optional() }),
  z.object({ tipo: z.literal("passos"), itens: z.array(z.object({ titulo: z.string().max(160), texto: z.string().max(800) })).min(1).max(20) }),
  z.object({ tipo: z.literal("pares"), itens: z.array(z.object({ chave: z.string().max(80), valor: z.string().max(400) })).min(1).max(30) }),
]);

export type Bloco = z.infer<typeof Blocos>;

export interface FonteDoDocumento {
  n: number;
  titulo: string;
  url: string;
}

export interface DocumentoRico {
  titulo: string;
  resumo: string;
  blocos: Bloco[];
  fontes: FonteDoDocumento[];
  confianca?: "alta" | "media" | "baixa";
  limitacoes: string[];
}

const MAXIMO_DE_BLOCOS = 40;

/** Fecha as aspas, as chavetas e os parênteses retos que ficaram abertos num JSON cortado a meio. */
export function repararJson(bruto: string): string {
  let s = bruto.trim();
  for (let tentativas = 0; tentativas < 40; tentativas++) {
    const pilha: string[] = [];
    let dentro = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (dentro) {
        if (c === "\\") i++;
        else if (c === '"') dentro = false;
      } else if (c === '"') dentro = true;
      else if (c === "{") pilha.push("}");
      else if (c === "[") pilha.push("]");
      else if ((c === "}" || c === "]") && pilha[pilha.length - 1] === c) pilha.pop();
    }
    const fechado = `${s}${dentro ? '"' : ""}${pilha.reverse().join("")}`;
    try {
      JSON.parse(fechado);
      return fechado;
    } catch {
      // corta o que ficou a meio (o último valor incompleto) e tenta outra vez
      const corte = Math.max(s.lastIndexOf(","), s.lastIndexOf("{"), s.lastIndexOf("["));
      if (corte <= 0) return bruto;
      s = s.slice(0, s[corte] === "," ? corte : corte + 1);
    }
  }
  return bruto;
}

/** O primeiro objeto JSON de um texto (a IA às vezes põe-no dentro de ``` ou rodeia-o de frases). */
export function extrairJson(t: string): string | null {
  const limpo = t.replace(/```(?:json)?/gi, "").trim();
  const ini = limpo.indexOf("{");
  if (ini < 0) return null;
  return limpo.slice(ini);
}

const textoCurto = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");

/** Lê o documento que a IA devolveu. Bloco que não cumpre a forma fica de fora; sem blocos nenhuns, o texto que veio vira um parágrafo. */
export function lerDocumento(saida: string, tituloPadrao = "Análise"): { doc: DocumentoRico; avisos: string[] } {
  const avisos: string[] = [];
  const bruto = extrairJson(saida);
  let obj: Record<string, unknown> | null = null;
  if (bruto) {
    try {
      obj = JSON.parse(bruto) as Record<string, unknown>;
    } catch {
      try {
        obj = JSON.parse(repararJson(bruto)) as Record<string, unknown>;
        avisos.push("O documento veio cortado e foi arranjado.");
      } catch {
        obj = null;
      }
    }
  }
  if (!obj || typeof obj !== "object") {
    const t = textoCurto(saida, 4000);
    return { doc: { titulo: tituloPadrao, resumo: t.slice(0, 280), blocos: t ? [{ tipo: "paragrafo", texto: t }] : [], fontes: [], limitacoes: [] }, avisos: ["A IA não devolveu o documento na forma pedida: mostra-se o texto como veio."] };
  }
  const blocos: Bloco[] = [];
  const bs = Array.isArray(obj.blocos) ? obj.blocos : [];
  bs.slice(0, MAXIMO_DE_BLOCOS).forEach((b, i) => {
    const r = Blocos.safeParse(b);
    if (r.success) blocos.push(r.data);
    else avisos.push(`O bloco ${i + 1} não tinha a forma certa e ficou de fora.`);
  });
  const fontes: FonteDoDocumento[] = [];
  (Array.isArray(obj.fontes) ? obj.fontes : []).slice(0, 30).forEach((f, i) => {
    const o = f as Record<string, unknown>;
    const url = textoCurto(o?.url, 500);
    if (/^https?:\/\//i.test(url)) fontes.push({ n: Number.isInteger(o.n) && (o.n as number) > 0 ? (o.n as number) : i + 1, titulo: textoCurto(o.titulo, 200) || url, url });
  });
  const conf = obj.confianca;
  const doc: DocumentoRico = {
    titulo: textoCurto(obj.titulo, 200) || tituloPadrao,
    resumo: textoCurto(obj.resumo, 1200),
    blocos,
    fontes,
    ...(conf === "alta" || conf === "media" || conf === "baixa" ? { confianca: conf } : {}),
    limitacoes: (Array.isArray(obj.limitacoes) ? obj.limitacoes : []).map((l) => textoCurto(l, 300)).filter(Boolean).slice(0, 8),
  };
  if (blocos.length === 0 && !doc.resumo) avisos.push("O documento veio vazio.");
  return { doc, avisos };
}

// ---------- conversões ----------

const sem = (t: string) => t.replace(/«([^»]+)»/g, "$1");
const celulaTexto = (c: string | number) => String(c).replace(/\|/g, "\\|").replace(/\n/g, " ");

/** O documento em Markdown (os pills «termo» viram negrito; as citações [1] mantêm-se). */
export function paraMarkdown(d: DocumentoRico): string {
  const L: string[] = [`# ${d.titulo}`, ""];
  if (d.resumo) L.push(`> ${sem(d.resumo)}`, "");
  for (const b of d.blocos) {
    switch (b.tipo) {
      case "titulo":
        L.push(`${"#".repeat(b.nivel ?? 2)} ${b.texto}`, "");
        break;
      case "paragrafo":
        L.push(b.texto.replace(/«([^»]+)»/g, "**$1**"), "");
        break;
      case "lista":
        L.push(...b.itens.map((x, i) => `${b.ordenada ? `${i + 1}.` : "-"} ${sem(x)}`), "");
        break;
      case "tabela":
        L.push(`| ${b.colunas.join(" | ")} |`, `| ${b.colunas.map(() => "---").join(" | ")} |`, ...b.linhas.map((l) => `| ${b.colunas.map((_, i) => celulaTexto(l[i] ?? "")).join(" | ")} |`));
        if (b.legenda) L.push("", `*${b.legenda}*`);
        L.push("");
        break;
      case "metricas":
        L.push(...b.itens.map((m) => `- **${m.rotulo}:** ${m.valor}${m.nota ? ` (${m.nota})` : ""}`), "");
        break;
      case "destaque":
        L.push(`> **${b.titulo ?? { info: "Nota", aviso: "Atenção", sucesso: "Conclusão", erro: "Problema" }[b.variante]}:** ${sem(b.texto)}`, "");
        break;
      case "grafico":
        L.push(`**${b.titulo}**`, "", `| | ${b.series.map((s) => s.nome).join(" | ")} |`, `| --- | ${b.series.map(() => "---").join(" | ")} |`, ...b.categorias.map((c, i) => `| ${c} | ${b.series.map((s) => s.valores[i] ?? "").join(" | ")} |`), "");
        break;
      case "citacao":
        L.push(`> ${sem(b.texto)}${b.fonte ? ` [${b.fonte}]` : ""}`, "");
        break;
      case "passos":
        L.push(...b.itens.map((p, i) => `${i + 1}. **${p.titulo}** — ${sem(p.texto)}`), "");
        break;
      case "pares":
        L.push(...b.itens.map((p) => `- **${p.chave}:** ${p.valor}`), "");
        break;
    }
  }
  if (d.limitacoes.length) L.push("## Limitações", "", ...d.limitacoes.map((l) => `- ${l}`), "");
  if (d.fontes.length) L.push("## Fontes", "", ...d.fontes.map((f) => `${f.n}. [${f.titulo}](${f.url})`), "");
  return L.join("\n");
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (t: string) => esc(t).replace(/«([^»]+)»/g, "<mark>$1</mark>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\[(\d{1,2})\]/g, '<sup><a href="#fonte-$1">[$1]</a></sup>');

/** O documento como página HTML completa (abre-se em qualquer navegador e imprime bem). */
export function paraHtml(d: DocumentoRico): string {
  const B: string[] = [];
  for (const b of d.blocos) {
    switch (b.tipo) {
      case "titulo":
        B.push(`<h${b.nivel ?? 2}>${esc(b.texto)}</h${b.nivel ?? 2}>`);
        break;
      case "paragrafo":
        B.push(`<p>${inline(b.texto)}</p>`);
        break;
      case "lista":
        B.push(`<${b.ordenada ? "ol" : "ul"}>${b.itens.map((x) => `<li>${inline(x)}</li>`).join("")}</${b.ordenada ? "ol" : "ul"}>`);
        break;
      case "tabela":
        B.push(`<table><thead><tr>${b.colunas.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${b.linhas.map((l) => `<tr>${b.colunas.map((_, i) => `<td>${esc(String(l[i] ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody></table>${b.legenda ? `<p class="legenda">${esc(b.legenda)}</p>` : ""}`);
        break;
      case "metricas":
        B.push(`<div class="metricas">${b.itens.map((m) => `<div><span>${esc(m.rotulo)}</span><strong>${esc(String(m.valor))}</strong>${m.nota ? `<small>${esc(m.nota)}</small>` : ""}</div>`).join("")}</div>`);
        break;
      case "destaque":
        B.push(`<aside class="${b.variante}">${b.titulo ? `<strong>${esc(b.titulo)}</strong> ` : ""}${inline(b.texto)}</aside>`);
        break;
      case "grafico":
        B.push(`<h3>${esc(b.titulo)}</h3><table><thead><tr><th></th>${b.series.map((s) => `<th>${esc(s.nome)}</th>`).join("")}</tr></thead><tbody>${b.categorias.map((c, i) => `<tr><td>${esc(c)}</td>${b.series.map((s) => `<td>${s.valores[i] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
        break;
      case "citacao":
        B.push(`<blockquote>${inline(b.texto)}${b.fonte ? ` <sup>[${b.fonte}]</sup>` : ""}</blockquote>`);
        break;
      case "passos":
        B.push(`<ol>${b.itens.map((p) => `<li><strong>${esc(p.titulo)}</strong> — ${inline(p.texto)}</li>`).join("")}</ol>`);
        break;
      case "pares":
        B.push(`<dl>${b.itens.map((p) => `<dt>${esc(p.chave)}</dt><dd>${esc(p.valor)}</dd>`).join("")}</dl>`);
        break;
    }
  }
  const fontes = d.fontes.length ? `<h2>Fontes</h2><ol>${d.fontes.map((f) => `<li id="fonte-${f.n}" value="${f.n}"><a href="${esc(f.url)}">${esc(f.titulo)}</a></li>`).join("")}</ol>` : "";
  const limites = d.limitacoes.length ? `<h2>Limitações</h2><ul>${d.limitacoes.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : "";
  return `<!doctype html>\n<html lang="pt-PT"><head><meta charset="utf-8"><title>${esc(d.titulo)}</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem;color:#111}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}th{background:#f5f5f5}mark{background:#eee;border-radius:99px;padding:0 .5em}aside{border-left:4px solid #999;background:#f7f7f7;padding:.6rem 1rem;margin:1rem 0}aside.aviso{border-color:#d97706}aside.erro{border-color:#dc2626}aside.sucesso{border-color:#16a34a}.metricas{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem}.metricas div{border:1px solid #ddd;border-radius:8px;padding:.6rem}.metricas span{display:block;color:#666;font-size:.85rem}.metricas strong{font-size:1.4rem}.legenda{color:#666;font-size:.85rem}blockquote{border-left:3px solid #ccc;margin:1rem 0;padding-left:1rem;color:#444}</style></head><body><h1>${esc(d.titulo)}</h1>${d.resumo ? `<p><em>${inline(d.resumo)}</em></p>` : ""}${B.join("\n")}${limites}${fontes}</body></html>\n`;
}

/** O documento em texto simples. */
export function paraTextoSimples(d: DocumentoRico): string {
  return paraMarkdown(d)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
    .replace(/\n{3,}/g, "\n\n");
}

/** As tabelas do documento como dados exportáveis (para o CSV e o Excel). */
export function tabelasDoDocumento(d: DocumentoRico): { titulo: string; colunas: string[]; linhas: (string | number)[][] }[] {
  const out: { titulo: string; colunas: string[]; linhas: (string | number)[][] }[] = [];
  d.blocos.forEach((b) => {
    if (b.tipo === "tabela") out.push({ titulo: b.legenda || `Tabela ${out.length + 1}`, colunas: b.colunas, linhas: b.linhas.map((l) => b.colunas.map((_, i) => l[i] ?? "")) });
    if (b.tipo === "grafico") out.push({ titulo: b.titulo, colunas: ["", ...b.series.map((s) => s.nome)], linhas: b.categorias.map((c, i) => [c, ...b.series.map((s) => s.valores[i] ?? "")]) });
  });
  return out;
}
