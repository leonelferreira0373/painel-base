// O GitHub a sério no painel: o cartão para ligar (ou desligar) um repositório e as tabelas das implementações e das execuções reais. Os dados vêm de lib/github-real.ts (api.github.com, a partir do navegador); o token fica só neste navegador.
"use client";

import { Button, Input, Select } from "@cloudflare/kumo";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { caminho } from "@/dados/estrutura";
import {
  chamarGitHub,
  guardarLigacaoReal,
  lerImplementacoesReais,
  lerLigacaoReal,
  lerTokenReal,
  EVENTO_GITHUB_REAL,
  mapearRepositorio,
  repositorioValido,
  type ExecucaoReal,
  type ImplementacaoReal,
  type ImplementacoesReais,
  type LigacaoReal,
  type LimiteDoGitHub,
  type RepositorioReal,
} from "@/lib/github-real";
import { Cartao, Linha } from "../conta/Pecas";
import { Estado } from "../Estado";
import { AvisoDeApi, dataHora, duracao, TabelaSimples, type ColunaSimples } from "./SuperPecas";

/** A ligação guardada neste navegador (o repositório e o ramo) e o token, sempre atualizados. */
export function useLigacaoReal(): { ligacao: LigacaoReal | null; token: string } {
  const [estado, setEstado] = useState<{ ligacao: LigacaoReal | null; token: string }>({ ligacao: null, token: "" });
  useEffect(() => {
    const ler = () => setEstado({ ligacao: lerLigacaoReal(), token: lerTokenReal() });
    ler();
    window.addEventListener(EVENTO_GITHUB_REAL, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO_GITHUB_REAL, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  return estado;
}

/** Lê do GitHub enquanto `ativo`; volta a ler quando a `chave` muda ou se chama `recarregar`. */
export function useLeituraReal<T>(ativo: boolean, chave: string, ler: (sinal: AbortSignal) => Promise<T>) {
  const [estado, setEstado] = useState<{ dados: T | null; erro: string | null; aCarregar: boolean }>({ dados: null, erro: null, aCarregar: false });
  const [volta, setVolta] = useState(0);
  const lerAgora = useRef(ler);
  lerAgora.current = ler;
  useEffect(() => {
    if (!ativo) {
      setEstado({ dados: null, erro: null, aCarregar: false });
      return;
    }
    const ctl = new AbortController();
    setEstado((e) => ({ ...e, aCarregar: true, erro: null }));
    lerAgora
      .current(ctl.signal)
      .then((dados) => !ctl.signal.aborted && setEstado({ dados, erro: null, aCarregar: false }))
      .catch((e: unknown) => {
        if (ctl.signal.aborted) return;
        setEstado((x) => ({ dados: x.dados, erro: e instanceof Error ? e.message : "Não foi possível ler o GitHub.", aCarregar: false }));
      });
    return () => ctl.abort();
  }, [ativo, chave, volta]);
  return { ...estado, recarregar: () => setVolta((v) => v + 1) };
}

/** Cores dos estados reais (o texto continua preto ou branco; só a bolinha muda). */
const VARIANTE: Record<string, "success" | "error" | "warning" | "neutral"> = {
  Passou: "success",
  Passaram: "success",
  Concluída: "success",
  Falhou: "error",
  Falharam: "error",
  "A correr": "warning",
  Pendente: "warning",
};
export function EstadoReal({ valor }: { valor: string }) {
  return <Estado valor={valor} variante={VARIANTE[valor] ?? "neutral"} />;
}

const horaDe = (iso: string) => new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

/** O cartão de ligar ao GitHub (repositório e, se for preciso, um token de leitura) e, ligado, o resumo do que está ligado. */
export function CartaoLigacaoReal({ ligacao, token, repositorio, ramos, limite, aCarregar, editar }: { ligacao: LigacaoReal | null; token: string; repositorio?: RepositorioReal; ramos: string[]; limite?: LimiteDoGitHub; aCarregar: boolean; editar: boolean }) {
  const [repo, setRepo] = useState("");
  const [chave, setChave] = useState("");
  const [aLigar, setALigar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ligar = async () => {
    const r = repo.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/\/+$/, "");
    if (!repositorioValido(r)) return setErro("Escreva o repositório como dono/nome, por exemplo leonelferreira0373/painel-base.");
    setALigar(true);
    setErro(null);
    try {
      const resposta = await chamarGitHub<Parameters<typeof mapearRepositorio>[0]>(`/repos/${r}`, chave.trim());
      guardarLigacaoReal({ repositorio: resposta.dados.full_name ?? r, ramo: "" }, chave.trim());
      setChave("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ligar ao GitHub.");
    }
    setALigar(false);
  };

  if (!ligacao) {
    return (
      <Cartao titulo="Ligação ao GitHub" dica="Lê, a partir deste navegador, o repositório que escolher: ramos, commits, execuções do GitHub Actions e implementações. Repositórios públicos não precisam de token (60 pedidos por hora); para os privados, e para subir o limite para 5000, use um token de acesso pessoal só de leitura. O token fica guardado apenas neste navegador e só é enviado ao GitHub.">
        <div className="flex flex-col gap-4 p-4">
          <Input label="Repositório" value={repo} disabled={!editar} onChange={(e) => setRepo(e.target.value)} placeholder="dono/nome" autoComplete="off" error={erro ?? undefined} />
          <Input label="Token de acesso (opcional)" type="password" value={chave} disabled={!editar} onChange={(e) => setChave(e.target.value)} placeholder="github_pat_…" autoComplete="off" />
          {editar && (
            <div>
              <Button variant="primary" loading={aLigar} disabled={!repo.trim()} onClick={() => void ligar()}>
                Ligar ao GitHub
              </Button>
            </div>
          )}
        </div>
      </Cartao>
    );
  }
  return (
    <Cartao
      titulo="Ligação ao GitHub"
      acoes={
        editar ? (
          <Button variant="ghost" size="sm" onClick={() => guardarLigacaoReal(null)}>
            Desligar
          </Button>
        ) : undefined
      }
    >
      <Linha titulo={ligacao.repositorio} estado={repositorio?.descricao || (aCarregar ? "A ler o repositório…" : undefined)}>
        {repositorio && (
          <>
            <EstadoReal valor={repositorio.privado ? "Privado" : "Público"} />
            <a href={repositorio.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-kumo-default underline underline-offset-2">
              Abrir no GitHub
            </a>
          </>
        )}
      </Linha>
      <Linha titulo="Ramo">
        <div className="w-44">
          <Select aria-label="Ramo" value={ligacao.ramo || repositorio?.ramoPadrao || ""} disabled={!editar || ramos.length === 0} onValueChange={(v) => guardarLigacaoReal({ ...ligacao, ramo: String(v) })} items={Object.fromEntries((ramos.length ? ramos : [ligacao.ramo || "main"]).map((r) => [r, r]))} className="w-full" />
        </div>
      </Linha>
      <Linha titulo="Token" estado={token ? "Guardado neste navegador" : "Sem token: só repositórios públicos"} />
      {limite && <Linha titulo="Pedidos ao GitHub" estado={`Repõe-se às ${horaDe(limite.reposicao)}`}>{`${limite.restante} de ${limite.total}`}</Linha>}
    </Cartao>
  );
}

const colunasDeImplementacoes: ColunaSimples<ImplementacaoReal>[] = [
  { rotulo: "Ambiente", filtro: (i) => i.ambiente, render: (i) => <span className="font-medium">{i.ambiente}</span> },
  { rotulo: "Ref", render: (i) => <code className="text-xs">{i.ref}</code> },
  { rotulo: "Commit", render: (i) => <code className="text-xs">{i.sha}</code> },
  { rotulo: "Descrição", render: (i) => <span className="block max-w-72 truncate" title={i.descricao}>{i.descricao || "—"}</span> },
  { rotulo: "Autor", render: (i) => i.autor || "—" },
  { rotulo: "Quando", render: (i) => <span className="tabular-nums">{dataHora(i.quando)}</span> },
  { rotulo: "Estado", filtro: (i) => i.estado, render: (i) => <EstadoReal valor={i.estado} /> },
  {
    rotulo: "",
    direita: true,
    render: (i) =>
      i.endereco ? (
        <a href={i.endereco} target="_blank" rel="noreferrer" className="text-sm font-medium text-kumo-default underline underline-offset-2">
          Abrir
        </a>
      ) : null,
  },
];

export const colunasDeExecucoes: ColunaSimples<ExecucaoReal>[] = [
  { rotulo: "Execução", filtro: (e) => e.nome, render: (e) => <span className="block max-w-64 truncate font-medium" title={e.nome}>{e.nome}</span> },
  { rotulo: "Ramo", render: (e) => e.ramo || "—" },
  { rotulo: "Commit", render: (e) => <code className="text-xs">{e.sha}</code> },
  { rotulo: "Evento", filtro: (e) => e.evento, render: (e) => e.evento },
  { rotulo: "Autor", render: (e) => e.autor || "—" },
  { rotulo: "Quando", render: (e) => <span className="tabular-nums">{dataHora(e.quando)}</span> },
  { rotulo: "Duração", direita: true, render: (e) => (e.duracao === undefined ? "—" : duracao(e.duracao)) },
  { rotulo: "Resultado", filtro: (e) => e.resultado, render: (e) => <EstadoReal valor={e.resultado} /> },
  {
    rotulo: "",
    direita: true,
    render: (e) => (
      <a href={e.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-kumo-default underline underline-offset-2">
        Abrir
      </a>
    ),
  },
];

/** As implementações e as execuções reais do repositório ligado (ou o convite para o ligar), no topo de «Implementações». */
export function ImplementacoesDoGitHub() {
  const router = useRouter();
  const { ligacao, token } = useLigacaoReal();
  const leitura = useLeituraReal<ImplementacoesReais>(!!ligacao, `${ligacao?.repositorio}|${token ? 1 : 0}`, (sinal) => lerImplementacoesReais(ligacao!.repositorio, token, sinal));
  if (!ligacao) {
    return (
      <Cartao titulo="Implementações no GitHub">
        <Linha titulo="GitHub sem ligação" estado="Ligue um repositório para ver as implementações e as execuções reais.">
          <Button variant="primary" size="sm" onClick={() => router.push(caminho("dev", "github"))}>
            Ligar ao GitHub
          </Button>
        </Linha>
      </Cartao>
    );
  }
  const d = leitura.dados;
  return (
    <>
      <AvisoDeApi erro={leitura.erro} aoTentar={leitura.recarregar} />
      <Cartao
        titulo={`Implementações de ${ligacao.repositorio}${d ? ` (${d.implementacoes.length})` : ""}`}
        acoes={
          <Button variant="ghost" size="sm" loading={leitura.aCarregar} onClick={leitura.recarregar}>
            Atualizar
          </Button>
        }
      >
        <TabelaSimples colunas={colunasDeImplementacoes} linhas={d?.implementacoes ?? []} chave={(i) => String(i.id)} vazio={leitura.aCarregar ? "A ler as implementações…" : "Este repositório não tem implementações registadas no GitHub."} tabela="github-implementacoes" />
      </Cartao>
      <Cartao titulo={`Execuções do GitHub Actions${d ? ` (${d.execucoes.length})` : ""}`}>
        <TabelaSimples colunas={colunasDeExecucoes} linhas={d?.execucoes ?? []} chave={(e) => String(e.id)} vazio={leitura.aCarregar ? "A ler as execuções…" : "Sem execuções do GitHub Actions."} tabela="github-execucoes" />
      </Cartao>
    </>
  );
}
