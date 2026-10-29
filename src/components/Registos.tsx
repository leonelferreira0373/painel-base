// Página genérica de um módulo de registos, no padrão das páginas de listas da Cloudflare: título com ação principal, métricas com gráficos, tabela com menu de ações por linha e diálogo para criar registos (interface otimista).
"use client";

import { Button, Dialog, DropdownMenu, Input, Select, Tooltip } from "@cloudflare/kumo";
import { MenuCartao, SeparadorDeMenu } from "./Flutuantes";
import { SeletorDeData, SeletorDeHora } from "./SeletoresDeTempo";
import { DICA_CAMPO } from "@/dados/dicas";
import { useMemo, useState } from "react";
import { AREAS } from "@/dados/estrutura";
import { REGISTOS } from "@/dados/modulos";
import { podeEditar } from "@/dados/rbac";
import { T } from "@/dados/textos";
import type { DefGrafico, DefRegistos, Linha } from "@/dados/tipos";
import { porCategoria, serieTemporal } from "@/lib/analysis/series";
import { granularidadeAuto } from "@/lib/analysis/sugestoes";
import { useApp } from "@/lib/estado";
import { textoDaRota } from "@/lib/rotas";
import { PermissaoProvider } from "@/lib/permissao";
import type { Tabela } from "@/lib/tipos";
import { Estado } from "./Estado";
import { copiarEstruturado, estruturaDeRegisto } from "@/lib/copiar-dados";
import { useAlvoDeImportacao, useFonteDeExportacao } from "@/lib/dados-da-pagina";
import { abrirAnalise } from "@/lib/pesquisa-profunda";
import { Frase, Rota } from "./Frase";
import { Grafico, type GraficoSpec } from "./graficos/Graficos";
import { GrelhaRegistos, type LinhaGrelha } from "./Grelhas";
import { Ic, ICONES } from "./Icones";
import { CartaoMetrica, Pagina, Titulo } from "./ui";

function tabelaDe(def: DefRegistos, linhas: Linha[]): Tabela {
  const chaves = [...new Set([...def.colunas.map((c) => c.chave), ...linhas.flatMap((l) => Object.keys(l)).filter((k) => k !== "id")])];
  return { id: def.id, ficheiroId: def.id, nome: def.titulo, origem: def.titulo, colunas: chaves, linhas: linhas.map((l) => chaves.map((k) => l[k] ?? null)) };
}

function especificacao(g: DefGrafico, t: Tabela, def: DefRegistos): GraficoSpec | null {
  const idx = (k?: string) => (k ? t.colunas.indexOf(k) : -1);
  if (g.tipo === "linha" && g.data) {
    const c = idx(g.data);
    if (c < 0) return null;
    const datas = t.linhas.map((l) => String(l[c] ?? "")).filter(Boolean).sort();
    const m = g.medida ? idx(g.medida) : -1;
    const pontos = serieTemporal(t, c, m >= 0 ? m : null, "soma", g.gran ?? granularidadeAuto(datas[0], datas[datas.length - 1]));
    return pontos.length > 0 ? { tipo: "linha", pontos } : null;
  }
  if (g.por) {
    const c = idx(g.por);
    if (c < 0) return null;
    const m = g.medida ? idx(g.medida) : -1;
    const rotas = def.colunas.find((x) => x.chave === g.por)?.tipo === "rota";
    // uma rota nunca se mostra como endereço: o gráfico usa o nome da página
    const pontos = porCategoria(t, c, m >= 0 ? m : null, "soma", 8).map((p) => (rotas ? { ...p, rotulo: textoDaRota(p.rotulo) } : p));
    if (pontos.length === 0) return null;
    return g.tipo === "rosca" ? { tipo: "rosca", pontos, rotas } : { tipo: "barras", pontos };
  }
  return null;
}

function NovoRegisto({ def, aberto, aoMudar, iniciais }: { def: DefRegistos; aberto: boolean; aoMudar: (v: boolean) => void; iniciais?: Record<string, string> }) {
  const { criar } = useApp();
  const [v, setV] = useState<Record<string, string>>(iniciais ?? {});
  const valido = def.campos.filter((c) => c.obrigatorio).every((c) => (v[c.chave] ?? "").trim() !== "");
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="lg" className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valido) return;
            criar(def.id, v);
            setV(iniciais ?? {});
            aoMudar(false);
          }}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold">{def.titulo}</Dialog.Title>
            <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label={T.geral.fechar} />} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {def.campos.map((c) =>
              c.tipo === "opcoes" ? (
                <Select key={c.chave} label={c.rotulo} labelTooltip={DICA_CAMPO[c.chave]} hideLabel={false} value={v[c.chave] ?? ""} onValueChange={(x) => setV({ ...v, [c.chave]: String(x) })} required={c.obrigatorio} items={Object.fromEntries((c.opcoes ?? []).map((o) => [o, o]))} />
              ) : c.tipo === "data" ? (
                <SeletorDeData key={c.chave} label={c.rotulo} valor={v[c.chave] ?? ""} aoMudar={(x) => setV({ ...v, [c.chave]: x })} />
              ) : c.tipo === "hora" ? (
                <SeletorDeHora key={c.chave} label={c.rotulo} valor={v[c.chave] ?? ""} aoMudar={(x) => setV({ ...v, [c.chave]: x })} />
              ) : (
                <Input key={c.chave} label={c.rotulo} labelTooltip={DICA_CAMPO[c.chave]} inputMode={c.tipo === "numero" ? "decimal" : undefined} value={v[c.chave] ?? ""} onChange={(e) => setV({ ...v, [c.chave]: c.tipo === "numero" ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value })} required={c.obrigatorio} />
              ),
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close render={(props) => <Button {...props} variant="secondary">{T.geral.fechar}</Button>} />
            <Button type="submit" variant="primary" disabled={!valido}>
              {T.geral.guardar}
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  );
}

/** `filtro` mostra só as linhas com esse valor numa coluna (as páginas de uma entidade: os pedidos de um cliente) e preenche-o nos registos novos. */
/** Uma coluna só de números, datas ou horas (se ordena do maior para o menor); as outras, de nomes, ações e estados, filtram-se. */
function soNumerosOuTempos(valores: string[]): boolean {
  const cheios = valores.filter((v) => v.trim() !== "");
  return cheios.length > 0 && cheios.every((v) => /^[\d\s.,:/+-]+$/.test(v));
}

/** Todos os campos de um registo com o nome que lhes damos (as colunas) e os que só existem por dentro. */
function registoComRotulos(def: (typeof REGISTOS)[string], l: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of def.colunas) out[c.rotulo] = l[c.chave] ?? null;
  for (const [k, v] of Object.entries(l)) if (k !== "id" && !def.colunas.some((c) => c.chave === k)) out[k] = v;
  return out;
}

export function Registos({ moduloId, filtro, titulo }: { moduloId: string; filtro?: { chave: string; valor: string }; titulo?: string }) {
  const def = REGISTOS[moduloId];
  const { registos, funcao, pendentes, transitar, criar } = useApp();
  const [novo, setNovo] = useState(false);
  const area = AREAS.find((a) => a.modulos.some((m) => m.id === moduloId));
  const editar = !!area && podeEditar(funcao, area.id, moduloId);
  const todas = registos[moduloId] ?? [];
  const linhas = useMemo(() => (filtro ? todas.filter((l) => String(l[filtro.chave]) === filtro.valor) : todas), [todas, filtro]);
  const tabela = useMemo(() => tabelaDe(def, linhas), [def, linhas]);
  const graficos = useMemo(() => def.graficos.map((g) => ({ g, spec: especificacao(g, tabela, def) })).filter((x) => x.spec), [def, tabela]);
  const chaveEstado = def.estadoChave ?? "estado";
  // exportar e importar: a lista e as colunas deste módulo
  const nomeDaLista = titulo ?? def.titulo;
  useFonteDeExportacao({ nome: moduloId, titulo: nomeDaLista, dados: { nome: moduloId, titulo: nomeDaLista, colunas: def.colunas.map((c) => c.rotulo), linhas: linhas.map((l) => def.colunas.map((c) => (c.tipo === "rota" ? textoDaRota(String(l[c.chave] ?? "")) : String(l[c.chave] ?? "")))) } });
  useAlvoDeImportacao(editar && def.campos.length > 0 ? { titulo: nomeDaLista, colunas: def.colunas.map((c) => ({ chave: c.chave, rotulo: c.rotulo })), aoLinhas: (novas) => novas.forEach((v) => criar(moduloId, v)) } : null);

  const grelha: LinhaGrelha[] = useMemo(
    () =>
      linhas.map((l) => {
        const disponiveis = (def.transicoes ?? []).filter((t) => t.de.includes(String(l[chaveEstado])));
        return {
          chave: l.id,
          pendente: pendentes.has(`${moduloId}:${l.id}`),
          valores: def.colunas.map((c) => (c.tipo === "rota" ? textoDaRota(String(l[c.chave] ?? "")) : String(l[c.chave] ?? ""))),
          texto: def.colunas.map((c) => (c.tipo === "rota" ? `${textoDaRota(String(l[c.chave] ?? ""))} ${String(l[c.chave] ?? "")}` : String(l[c.chave] ?? ""))).join(" ").toLowerCase(),
          ordem: def.colunas.map((c) => (c.tipo === "numero" ? Number(l[c.chave] ?? 0) : String(l[c.chave] ?? ""))),
          celulas: def.colunas.map((c) => (c.tipo === "estado" ? <Estado key={c.chave} valor={String(l[c.chave] ?? "")} modulo={moduloId} /> : c.tipo === "rota" ? <Rota key={c.chave} caminho={String(l[c.chave] ?? "")} /> : c.tipo === "numero" ? Number(l[c.chave] ?? 0).toLocaleString("pt-PT") : String(l[c.chave] ?? ""))),
          acoes: (
            <DropdownMenu>
              <Tooltip content={`Ações de ${String(l.processo ?? l.id)}`} render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="sm" icon={ICONES.mais3} aria-label={`Ações de ${String(l.processo ?? l.id)}`} />} />} />
              <MenuCartao>
                {disponiveis.map((t) => {
                  const permitido = editar && t.funcoes.includes(funcao.id);
                  return (
                    <DropdownMenu.Item key={t.para} icon={<Ic nome={permitido ? t.icone : "cadeado"} />} disabled={!permitido} variant={t.para === "Recusado" || t.para === "Cancelado" || t.para === "Rejeitada" ? "danger" : "default"} onClick={() => transitar(moduloId, l, t)}>
                      {t.rotulo}
                    </DropdownMenu.Item>
                  );
                })}
                {disponiveis.length > 0 && <SeparadorDeMenu />}
                <DropdownMenu.Item icon={<Ic nome="copiar" />} onClick={() => void copiarEstruturado(estruturaDeRegisto(`${def.titulo}: ${String(l.processo ?? l.id)}`, registoComRotulos(def, l), window.location.pathname))}>
                  Copiar o registo
                </DropdownMenu.Item>
                <DropdownMenu.Item icon={<Ic nome="ia" />} onClick={() => abrirAnalise({ titulo: `${def.titulo}: ${String(l.processo ?? l.id)}`, tipo: "registo", pagina: window.location.pathname, dados: registoComRotulos(def, l) })}>
                  Analisar com IA
                </DropdownMenu.Item>
              </MenuCartao>
            </DropdownMenu>
          ),
        };
      }),
    [linhas, def, pendentes, moduloId, chaveEstado, editar, funcao.id, transitar],
  );

  return (
    <PermissaoProvider editar={editar}>
    <Pagina>
      <Titulo titulo={titulo ?? def.titulo}>
        {editar && def.campos.length > 0 && (
          <Tooltip content="Criar um registo novo neste módulo" render={<Button variant="primary" icon={ICONES.mais} onClick={() => setNovo(true)} />}>
            {T.geral.novo}
          </Tooltip>
        )}
      </Titulo>
      {graficos.length > 0 && (
        <div className={`grid gap-4 ${graficos.length === 1 ? "" : graficos.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
          {graficos.map(({ g, spec }) => (
            <CartaoMetrica key={g.titulo} titulo={g.titulo}>
              <Grafico spec={spec!} altura={170} nome={g.titulo} />
            </CartaoMetrica>
          ))}
        </div>
      )}
      <GrelhaRegistos tabela={`registos:${moduloId}`} colunas={def.colunas.map((c) => ({ rotulo: c.rotulo, numerica: c.tipo === "numero", ordenavel: c.tipo === "numero" || c.tipo === "data" || soNumerosOuTempos(linhas.map((l) => String(l[c.chave] ?? ""))) }))} linhas={grelha} />
      {editar && def.campos.length > 0 && <NovoRegisto def={def} aberto={novo} aoMudar={setNovo} iniciais={filtro ? { [filtro.chave]: filtro.valor } : undefined} />}
    </Pagina>
    </PermissaoProvider>
  );
}
