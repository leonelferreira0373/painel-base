// Peças comuns dos ecrãs do super painel (pagamentos, marketing e developer tools): estado guardado no navegador, tabela simples de uma linha por linha, o aviso do modo da API, o relógio do tempo real e os formatos de números.
"use client";

import { Badge, Button, Table } from "@cloudflare/kumo";
import { useEffect, useState, type ReactNode } from "react";
import { Dica } from "../Dica";
import { Esbatido } from "../Estados";
import { Ic } from "../Icones";
import { CartaoEstatistica } from "../ui";
import { useLigacao } from "@/lib/api/cliente";

export { useGuardado } from "@/lib/guardado";

/** Um número que aumenta de `ms` em `ms` enquanto `ativo` (para o tempo real). */
export function useTick(ms: number, ativo = true): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    const t = window.setInterval(() => setN((x) => x + 1), ms);
    return () => window.clearInterval(t);
  }, [ms, ativo]);
  return n;
}

/** O histórico de um número (os últimos valores que teve enquanto o ecrã esteve aberto), para o gráfico pequeno dos cartões: só mostra o que se observou. */
export function useSerie(valor: number, n = 24): number[] {
  const [serie, setSerie] = useState<number[]>([]);
  useEffect(() => setSerie((s) => (s.length > 0 && s[s.length - 1] === valor ? s : [...s.slice(-(n - 1)), valor])), [valor, n]);
  return serie;
}

/** O cartão de estatística dos ecrãs do super painel: o valor e, se mudou enquanto olhava, o gráfico do que se observou. Sem `numero`, só o valor. */
export function Estatistica({ titulo, valor, numero, pior, dica }: { titulo: string; valor: string; numero?: number; pior?: boolean; dica?: string }) {
  const serie = useSerie(numero ?? 0);
  return <CartaoEstatistica titulo={titulo} valor={valor} variacao={null} pior={pior} dica={dica} valores={numero !== undefined && serie.length > 2 ? serie : []} />;
}

export const dinheiro = (valor: number, moeda = "AOA") => new Intl.NumberFormat("pt-PT", { style: "currency", currency: moeda, maximumFractionDigits: 0 }).format(valor);
export const inteiro = (n: number) => Math.round(n).toLocaleString("pt-PT");
export const percentagem = (f: number, casas = 0) => `${(f * 100).toLocaleString("pt-PT", { maximumFractionDigits: casas })} %`;
export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
export const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
export const horaCompleta = (iso: string) => new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** «1 d 3 h», «4 h 12 min». */
export function duracao(segundos: number): string {
  const d = Math.floor(segundos / 86_400);
  const h = Math.floor((segundos % 86_400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export interface ColunaSimples<T> {
  rotulo: string;
  render: (linha: T) => ReactNode;
  /** Alinha à direita (números). */
  direita?: boolean;
}

/** Uma tabela de uma linha por linha, que desliza na horizontal quando não cabe (as palavras nunca se quebram nem empilham). */
export function TabelaSimples<T>({ colunas, linhas, chave, vazio = "Sem dados.", aoClicar }: { colunas: ColunaSimples<T>[]; linhas: T[]; chave: (l: T) => string; vazio?: string; aoClicar?: (l: T) => void }) {
  if (linhas.length === 0) return <div className="p-6 text-sm text-kumo-subtle">{vazio}</div>;
  return (
    <Esbatido className="sem-barra tabela-larga overflow-x-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            {colunas.map((c) => (
              <Table.Head key={c.rotulo} className={c.direita ? "text-right" : undefined}>
                {c.rotulo}
              </Table.Head>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {linhas.map((l) => (
            <Table.Row key={chave(l)} className={aoClicar ? "cursor-pointer hover:bg-kumo-tint/60" : undefined} onClick={aoClicar ? () => aoClicar(l) : undefined}>
              {colunas.map((c) => (
                <Table.Cell key={c.rotulo} className={c.direita ? "text-right tabular-nums" : undefined}>
                  {c.render(l)}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Esbatido>
  );
}

/** Diz de onde vêm os dados do ecrã: simulados (demonstração) ou do servidor ligado, com o erro e a tentativa de novo se falhar. */
export function AvisoDeApi({ erro, aoTentar }: { erro: string | null; aoTentar: () => void }) {
  const ligacao = useLigacao();
  if (erro)
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-kumo-danger-tint px-4 py-3 text-sm text-kumo-default ring ring-kumo-danger/30">
        <span className="inline-flex items-center gap-2">
          <Ic nome="aviso" tamanho={16} />
          {erro}
        </span>
        <Button variant="secondary" size="sm" onClick={aoTentar}>
          Tentar de novo
        </Button>
      </div>
    );
  const texto = ligacao.modo === "ligado" ? `Dados do servidor ${ligacao.base}.` : "Dados de demonstração, só neste navegador. Em Developer tools, «API e ligações», liga este painel ao seu servidor.";
  return (
    <Dica conteudo={texto}>
      <Badge variant={ligacao.modo === "ligado" ? "success" : "outline"}>{ligacao.modo === "ligado" ? "Ligado ao servidor" : "Dados de demonstração"}</Badge>
    </Dica>
  );
}
