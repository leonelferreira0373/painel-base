// Sugestões automáticas de gráficos: olha para os tipos de colunas encontrados e propõe as leituras que um analista faria primeiro.
import type { GraficoSpec } from "@/components/graficos/Graficos";
import type { Perfil, Tabela } from "@/lib/tipos";
import { porCategoria, dispersao, serieTemporal, type Granularidade } from "./series";

export interface Sugestao {
  id: string;
  titulo: string;
  spec: GraficoSpec;
}

export function granularidadeAuto(primeira?: string, ultima?: string): Granularidade {
  if (!primeira || !ultima) return "mes";
  const dias = (Date.parse(ultima) - Date.parse(primeira)) / 86_400_000;
  if (dias <= 70) return "dia";
  if (dias <= 500) return "semana";
  if (dias <= 365 * 6) return "mes";
  return "ano";
}

const ROTULO_GRAN: Record<Granularidade, string> = { dia: "dia", semana: "semana", mes: "mês", ano: "ano" };

export function rotuloGranularidade(g: Granularidade): string {
  return ROTULO_GRAN[g];
}

export function sugerir(t: Tabela, p: Perfil): Sugestao[] {
  const out: Sugestao[] = [];
  const idx = (nome: string) => t.colunas.indexOf(nome);
  const colunas = p.colunas;
  const datas = colunas.filter((c) => c.tipo === "data");
  const numericas = colunas.filter((c) => (c.tipo === "inteiro" || c.tipo === "numero") && c.unicos > 1);
  const categorias = colunas.filter((c) => c.tipo === "categoria" && c.unicos >= 2 && c.unicos <= 40);

  if (datas.length > 0) {
    const d = datas[0];
    const g = granularidadeAuto(d.primeiraData, d.ultimaData);
    const pontos = serieTemporal(t, idx(d.nome), null, "contagem", g);
    if (pontos.length > 1) out.push({ id: "tempo-registos", titulo: `Registos por ${ROTULO_GRAN[g]} (${d.nome})`, spec: { tipo: "linha", pontos } });
    for (const m of numericas.slice(0, 2)) {
      const serie = serieTemporal(t, idx(d.nome), idx(m.nome), "soma", g);
      if (serie.length > 1) out.push({ id: `tempo-${m.nome}`, titulo: `Soma de ${m.nome} por ${ROTULO_GRAN[g]}`, spec: { tipo: "linha", pontos: serie } });
    }
  }

  for (const c of categorias.slice(0, 3)) {
    const pontos = porCategoria(t, idx(c.nome), null, "contagem", 10);
    out.push({ id: `cat-${c.nome}`, titulo: `Registos por ${c.nome}`, spec: c.unicos <= 6 ? { tipo: "rosca", pontos } : { tipo: "barras", pontos } });
    if (numericas[0]) {
      const m = numericas[0];
      const soma = porCategoria(t, idx(c.nome), idx(m.nome), "soma", 10);
      out.push({ id: `cat-${c.nome}-${m.nome}`, titulo: `Soma de ${m.nome} por ${c.nome}`, spec: { tipo: "barras", pontos: soma } });
    }
  }

  for (const m of numericas.slice(0, 4)) {
    if (m.histograma && m.histograma.length > 0) out.push({ id: `hist-${m.nome}`, titulo: `Distribuição de ${m.nome}`, spec: { tipo: "histograma", classes: m.histograma } });
  }

  const forte = p.correlacoes.find((c) => Math.abs(c.r) >= 0.3);
  if (forte) {
    const pontos = dispersao(t, idx(forte.a), idx(forte.b));
    if (pontos.length > 3) out.push({ id: "dispersao", titulo: `${forte.b} em função de ${forte.a} (correlação ${forte.r.toFixed(2).replace(".", ",")})`, spec: { tipo: "dispersao", pontos, rx: forte.a, ry: forte.b } });
  }

  if (numericas.length >= 3) {
    const nomes = numericas.slice(0, 8).map((c) => c.nome);
    const valores = nomes.map((a) => nomes.map((b) => (a === b ? 1 : (p.correlacoes.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a))?.r ?? 0))));
    out.push({ id: "matriz", titulo: "Correlações entre colunas numéricas", spec: { tipo: "matriz", nomes, valores } });
  }

  const faltas = colunas.filter((c) => c.nulos > 0).sort((a, b) => b.nulos - a.nulos).slice(0, 10);
  if (faltas.length > 0) out.push({ id: "faltas", titulo: "Valores em falta por coluna", spec: { tipo: "barras", pontos: faltas.map((c) => ({ chave: c.nome, rotulo: c.nome, valor: c.nulos, n: c.nulos })) } });

  return out;
}
