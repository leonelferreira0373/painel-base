// Perfil de uma tabela: tipo de cada coluna, estatísticas, anomalias, duplicados, correlações e pontuação de qualidade.
import type { Anomalia, Celula, Coluna, Correlacao, Estatistica, Perfil, Tabela, TipoColuna } from "@/lib/tipos";
import { detetarOrdemData, lerBooleano, lerData, lerNumero, paraTexto, pareceData, vazio } from "./valores";

const fmt = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 });
const qt = (n: number, singular: string, plural: string) => `${fmt.format(n)} ${n === 1 ? singular : plural}`;

export function quantil(ordenado: number[], q: number): number {
  if (ordenado.length === 0) return NaN;
  const pos = (ordenado.length - 1) * q;
  const base = Math.floor(pos);
  const resto = pos - base;
  return ordenado[base + 1] !== undefined ? ordenado[base] + resto * (ordenado[base + 1] - ordenado[base]) : ordenado[base];
}

export function estatistica(valores: number[]): Estatistica {
  const ordenado = valores.slice().sort((a, b) => a - b);
  const soma = ordenado.reduce((s, v) => s + v, 0);
  const media = soma / ordenado.length;
  const variancia = ordenado.length > 1 ? ordenado.reduce((s, v) => s + (v - media) ** 2, 0) / (ordenado.length - 1) : 0;
  return {
    min: ordenado[0],
    max: ordenado[ordenado.length - 1],
    soma,
    media,
    mediana: quantil(ordenado, 0.5),
    desvio: Math.sqrt(variancia),
    q1: quantil(ordenado, 0.25),
    q3: quantil(ordenado, 0.75),
  };
}

function histograma(valores: number[], est: Estatistica): { de: number; ate: number; n: number }[] {
  if (est.min === est.max) return [{ de: est.min, ate: est.max, n: valores.length }];
  const k = Math.min(30, Math.max(5, Math.ceil(Math.log2(valores.length) + 1)));
  const largura = (est.max - est.min) / k;
  const caixas = Array.from({ length: k }, (_, i) => ({ de: est.min + i * largura, ate: est.min + (i + 1) * largura, n: 0 }));
  for (const v of valores) caixas[Math.min(k - 1, Math.floor((v - est.min) / largura))].n++;
  return caixas;
}

function topo(contagens: Map<string, number>, n = 10): { valor: string; contagem: number }[] {
  return [...contagens.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([valor, contagem]) => ({ valor, contagem }));
}

const DICA_DATA = /(data|date|dia|day|dt_|hora|time|criado|created|vencimento|validade|expir)/i;

interface Resultado {
  coluna: Coluna;
  anomalias: Anomalia[];
  numeros: (number | null)[];
}

function perfilColuna(nome: string, valores: Celula[]): Resultado {
  const n = valores.length;
  const anomalias: Anomalia[] = [];
  const presentes = valores.filter((v) => !vazio(v));
  const nulos = n - presentes.length;
  const unicosMapa = new Map<string, number>();
  for (const v of presentes) {
    const t = paraTexto(v).trim();
    unicosMapa.set(t, (unicosMapa.get(t) ?? 0) + 1);
  }
  const exemplos = [...unicosMapa.keys()].slice(0, 5);
  const base: Coluna = { nome, tipo: "vazio", n, nulos, unicos: unicosMapa.size, exemplos };
  const vazioNumeros = valores.map(() => null);
  if (presentes.length === 0) return { coluna: base, anomalias: [], numeros: vazioNumeros };

  const ordem = detetarOrdemData(presentes);
  const numeros = valores.map((v) => (vazio(v) ? null : lerNumero(v)));
  const nNumeros = numeros.filter((x) => x !== null).length;
  const datas = presentes.map((v) => lerData(v, ordem));
  const nDatas = datas.filter(Boolean).length;
  const nParecemData = presentes.filter((v) => pareceData(v)).length;
  const nBool = presentes.filter((v) => lerBooleano(v) !== null).length;
  const total = presentes.length;
  const limiar = 0.9;

  let tipo: TipoColuna;
  if (nBool / total >= limiar && unicosMapa.size <= 4) tipo = "booleano";
  else if (nDatas / total >= limiar || (nParecemData / total >= limiar && nDatas / total >= 0.5)) tipo = "data";
  else if (nNumeros / total >= limiar) {
    const inteiros = numeros.filter((x) => x !== null).every((x) => Number.isInteger(x as number));
    tipo = inteiros ? "inteiro" : "numero";
  } else if (typeof presentes[0] === "number" && DICA_DATA.test(nome)) {
    tipo = "numero";
  } else {
    const comprimento = presentes.reduce<number>((s, v) => s + paraTexto(v).length, 0) / total;
    const espacos = presentes.reduce<number>((s, v) => s + (paraTexto(v).trim().match(/\s+/g)?.length ?? 0), 0) / total;
    if (unicosMapa.size / total >= 0.95 && total >= 20 && comprimento < 40 && espacos < 0.5) tipo = "identificador";
    else if (unicosMapa.size <= Math.max(12, total * 0.05) && comprimento < 40) tipo = "categoria";
    else tipo = "texto";
  }
  const coluna: Coluna = { ...base, tipo };

  if (tipo === "inteiro" || tipo === "numero") {
    const validos = numeros.filter((x): x is number => x !== null);
    coluna.estat = estatistica(validos);
    coluna.histograma = histograma(validos, coluna.estat);
    const iqr = coluna.estat.q3 - coluna.estat.q1;
    if (iqr > 0) {
      const baixo = coluna.estat.q1 - 1.5 * iqr;
      const alto = coluna.estat.q3 + 1.5 * iqr;
      coluna.outliers = validos.filter((v) => v < baixo || v > alto).length;
      if (coluna.outliers > 0) {
        anomalias.push({ gravidade: "baixa", tipo: "Valores atípicos", coluna: nome, contagem: coluna.outliers, mensagem: `${qt(coluna.outliers, "valor fora", "valores fora")} do intervalo de ${fmt.format(baixo)} a ${fmt.format(alto)}` });
      }
    }
    const naoNumericos = total - nNumeros;
    if (naoNumericos > 0) {
      anomalias.push({ gravidade: naoNumericos / total > 0.05 ? "media" : "baixa", tipo: "Tipos mistos", coluna: nome, contagem: naoNumericos, mensagem: `${qt(naoNumericos, "valor não numérico", "valores não numéricos")} numa coluna numérica` });
    }
  } else if (tipo === "data") {
    const validas = datas.filter((d): d is Date => d !== null).sort((a, b) => a.getTime() - b.getTime());
    coluna.primeiraData = validas[0].toISOString().slice(0, 10);
    coluna.ultimaData = validas[validas.length - 1].toISOString().slice(0, 10);
    const invalidas = nParecemData - nDatas;
    const naoData = total - nDatas - Math.max(0, invalidas);
    if (invalidas > 0) anomalias.push({ gravidade: "media", tipo: "Datas inválidas", coluna: nome, contagem: invalidas, mensagem: `${qt(invalidas, "data que não existe", "datas que não existem")} no calendário` });
    if (naoData > 0) anomalias.push({ gravidade: "baixa", tipo: "Tipos mistos", coluna: nome, contagem: naoData, mensagem: `${qt(naoData, "valor que não é uma data", "valores que não são datas")} numa coluna de datas` });
  }
  if (tipo === "categoria" || tipo === "booleano" || tipo === "identificador" || tipo === "texto") {
    coluna.topo = topo(unicosMapa);
  }
  if (tipo === "categoria") {
    const grupos = new Map<string, Set<string>>();
    for (const t of unicosMapa.keys()) {
      const chave = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
      grupos.set(chave, (grupos.get(chave) ?? new Set()).add(t));
    }
    const variantes = [...grupos.values()].filter((g) => g.size > 1);
    if (variantes.length > 0) {
      anomalias.push({ gravidade: "media", tipo: "Grafias inconsistentes", coluna: nome, contagem: variantes.length, mensagem: `${qt(variantes.length, "grupo de valores escritos", "grupos de valores escritos")} de formas diferentes (por exemplo ${[...variantes[0]].slice(0, 3).join(", ")})` });
    }
  }
  const comEspacos = presentes.filter((v) => typeof v === "string" && v !== v.trim()).length;
  if (comEspacos > 0) anomalias.push({ gravidade: "baixa", tipo: "Espaços nas margens", coluna: nome, contagem: comEspacos, mensagem: `${qt(comEspacos, "valor com espaços", "valores com espaços")} no início ou no fim` });
  if (unicosMapa.size === 1 && n > 1 && nulos === 0) anomalias.push({ gravidade: "baixa", tipo: "Coluna constante", coluna: nome, contagem: n, mensagem: "Todos os valores são iguais" });
  const proporcao = nulos / n;
  if (proporcao >= 0.05) {
    anomalias.push({ gravidade: proporcao >= 0.5 ? "alta" : proporcao >= 0.2 ? "media" : "baixa", tipo: "Valores em falta", coluna: nome, contagem: nulos, mensagem: `${qt(nulos, "célula vazia", "células vazias")} (${fmt.format(Math.round(proporcao * 1000) / 10)} %)` });
  }
  return { coluna, anomalias, numeros };
}

function pearson(a: (number | null)[], b: (number | null)[]): number | null {
  let n = 0;
  let sa = 0;
  let sb = 0;
  let saa = 0;
  let sbb = 0;
  let sab = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === null || y === null) continue;
    n++;
    sa += x;
    sb += y;
    saa += x * x;
    sbb += y * y;
    sab += x * y;
  }
  if (n < 5) return null;
  const den = Math.sqrt((n * saa - sa * sa) * (n * sbb - sb * sb));
  return den === 0 ? null : (n * sab - sa * sb) / den;
}

export function analisar(tabela: Tabela): Perfil {
  const linhas = tabela.linhas.length;
  const resultados = tabela.colunas.map((nome, i) =>
    perfilColuna(
      nome,
      tabela.linhas.map((l) => l[i] ?? null),
    ),
  );
  const colunas = resultados.map((r) => r.coluna);
  const anomalias = resultados.flatMap((r) => r.anomalias);

  const vistas = new Set<string>();
  let duplicadas = 0;
  for (const l of tabela.linhas) {
    const chave = JSON.stringify(l);
    if (vistas.has(chave)) duplicadas++;
    else vistas.add(chave);
  }
  if (duplicadas > 0) {
    anomalias.push({ gravidade: duplicadas / Math.max(1, linhas) > 0.05 ? "media" : "baixa", tipo: "Linhas duplicadas", contagem: duplicadas, mensagem: `${qt(duplicadas, "linha repetida", "linhas repetidas")} por completo` });
  }

  const celulas = linhas * Math.max(1, colunas.length);
  const preenchidas = colunas.reduce((s, c) => s + (c.n - c.nulos), 0);
  const completude = celulas === 0 ? 0 : (preenchidas / celulas) * 100;

  const indicesNumericos = colunas.map((c, i) => (c.tipo === "inteiro" || c.tipo === "numero" ? i : -1)).filter((i) => i >= 0).slice(0, 12);
  const correlacoes: Correlacao[] = [];
  for (let x = 0; x < indicesNumericos.length; x++) {
    for (let y = x + 1; y < indicesNumericos.length; y++) {
      const r = pearson(resultados[indicesNumericos[x]].numeros, resultados[indicesNumericos[y]].numeros);
      if (r !== null) correlacoes.push({ a: colunas[indicesNumericos[x]].nome, b: colunas[indicesNumericos[y]].nome, r });
    }
  }
  correlacoes.sort((p, q) => Math.abs(q.r) - Math.abs(p.r));

  const peso = { alta: 8, media: 4, baixa: 1 };
  const penalizacaoAnomalias = Math.min(40, anomalias.reduce((s, a) => s + peso[a.gravidade], 0));
  const pontuacao = Math.max(0, Math.round(100 - (100 - completude) * 0.5 - (duplicadas / Math.max(1, linhas)) * 30 - penalizacaoAnomalias));
  anomalias.sort((p, q) => peso[q.gravidade] - peso[p.gravidade] || q.contagem - p.contagem);

  return { tabelaId: tabela.id, linhas, colunas, duplicadas, completude, pontuacao, anomalias, correlacoes: correlacoes.slice(0, 66) };
}
