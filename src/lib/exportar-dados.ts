// Exportar os dados de um cartão ou de uma lista, como o menu «Exportar» da Cloudflare: CSV, JSON e imagem. O CSV e o JSON são funções puras; a imagem desenha a tabela num canvas com as cores do tema em vigor.

export interface DadosExportaveis {
  /** O nome do ficheiro, sem extensão. */
  nome: string;
  /** O título que aparece na imagem. */
  titulo: string;
  colunas: string[];
  linhas: (string | number)[][];
}

const celula = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** CSV separado por ponto e vírgula, com BOM, para abrir direto no Excel em português. */
export function paraCsv(d: DadosExportaveis): string {
  return `﻿${[d.colunas.map(celula).join(";"), ...d.linhas.map((l) => l.map(celula).join(";"))].join("\n")}`;
}

/** JSON: uma lista de objetos com o nome de cada coluna. */
export function paraJson(d: DadosExportaveis): string {
  return JSON.stringify(
    d.linhas.map((l) => Object.fromEntries(d.colunas.map((c, i) => [c, l[i]]))),
    null,
    2,
  );
}

/** A cor de uma variável do tema, já resolvida (o canvas não entende `var()` nem `light-dark()`). */
function corDo(variavel: string): string {
  const el = document.createElement("span");
  el.style.color = `var(${variavel})`;
  document.body.appendChild(el);
  const cor = getComputedStyle(el).color;
  el.remove();
  return cor;
}

const MAXIMO_DE_LINHAS = 60;

/** Desenha o título e a tabela como imagem PNG, com as cores do tema em vigor. */
export function paraImagem(d: DadosExportaveis, tipo: "image/png" | "image/jpeg" = "image/png"): Promise<Blob | null> {
  const largura = 640;
  const margem = 20;
  const altura = 28;
  const linhas = d.linhas.slice(0, MAXIMO_DE_LINHAS);
  const total = margem * 2 + 34 + (linhas.length + 1) * altura;
  const escala = 2;
  const tela = document.createElement("canvas");
  tela.width = largura * escala;
  tela.height = total * escala;
  const ctx = tela.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.scale(escala, escala);
  const fonte = getComputedStyle(document.body).fontFamily || "sans-serif";
  const [fundo, texto, suave, linha] = [corDo("--color-kumo-base"), corDo("--text-color-kumo-default"), corDo("--text-color-kumo-subtle"), corDo("--color-kumo-line")];
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, largura, total);
  ctx.textBaseline = "middle";
  ctx.fillStyle = texto;
  ctx.font = `600 16px ${fonte}`;
  ctx.textAlign = "left";
  ctx.fillText(d.titulo, margem, margem + 10);
  const x = (i: number) => (i === 0 ? margem : margem + (largura - margem * 2) * (0.45 + (0.55 * i) / Math.max(1, d.colunas.length - 1)));
  const desenhar = (celulas: (string | number)[], y: number, cor: string, peso: number) => {
    ctx.fillStyle = cor;
    ctx.font = `${peso} 13px ${fonte}`;
    celulas.forEach((c, i) => {
      ctx.textAlign = i === 0 ? "left" : "right";
      ctx.fillText(String(c), x(i), y);
    });
  };
  let y = margem + 34 + altura / 2;
  desenhar(d.colunas, y, suave, 500);
  for (const l of linhas) {
    y += altura;
    ctx.fillStyle = linha;
    ctx.fillRect(margem, y - altura / 2, largura - margem * 2, 1);
    desenhar(l, y, texto, 400);
  }
  return new Promise((resolver) => tela.toBlob(resolver, tipo, 0.92));
}

/** Copia a imagem da tabela para a área de transferência; `false` se o navegador não deixar. */
export async function copiarImagem(d: DadosExportaveis): Promise<boolean> {
  try {
    const imagem = await paraImagem(d);
    if (!imagem) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": imagem })]);
    return true;
  } catch {
    return false;
  }
}
