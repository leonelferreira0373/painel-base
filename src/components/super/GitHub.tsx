// O GitHub e os conectores do painel: o repositório e o ramo ligados, os últimos commits com o resultado dos testes, lançar uma versão a partir de um commit (fica em Implementações, pronta e sem tráfego) e ligar ou desligar cada conector, com teste da ligação. Em modo simulado vive no navegador; em modo ligado cada ação chama o contrato.
"use client";

import { Button, Input, Select } from "@cloudflare/kumo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { caminho } from "@/dados/estrutura";
import { CONECTORES_DE_ORIGEM, gerarCommits, gerarImplementacoes, GITHUB_DE_ORIGEM, RAMOS_DE_DEMONSTRACAO, type Commit, type Conector, type LigacaoGitHub } from "@/dados/deploys";
import { estruturaDeRegisto } from "@/lib/copiar-dados";
import { chamar, useApi, useLigacao } from "@/lib/api/cliente";
import { useColecao } from "@/lib/api/colecao";
import { erroDoRepositorio } from "@/lib/dev";
import { useApp } from "@/lib/estado";
import { lancar, type EstadoDeImplementacoes } from "@/lib/implementacoes";
import { useEditar } from "@/lib/permissao";
import { BotaoCopiar, Cartao, Confirmar, Interruptor, Linha } from "../conta/Pecas";
import { Estado } from "../Estado";
import { ColunaDoFluxo, Fluxo, IconeDoGitHub, LinhaDoNo, NoDoFluxo } from "../Fluxo";
import { Ic } from "../Icones";
import { guardarLigacaoReal, lerPainelReal, type CommitReal, type PainelReal } from "@/lib/github-real";
import { EstadoReal, NoDaLigacaoReal, useLeituraReal, useLigacaoReal } from "./GitHubReal";
import { Pagina, Titulo } from "../ui";
import { AvisoDeApi, dataHora, TabelaSimples, useGuardado, type ColunaSimples } from "./SuperPecas";

export function GitHub() {
  const ligacao = useLigacao();
  const router = useRouter();
  const { avisar } = useApp();
  const editar = useEditar();
  const ligado = ligacao.modo === "ligado";
  const [guardado, setGuardado] = useGuardado<LigacaoGitHub>("github", GITHUB_DE_ORIGEM);
  const api = useApi<LigacaoGitHub & { ramos?: string[] }>("/v1/dev/github", () => ({ ...guardado, ramos: RAMOS_DE_DEMONSTRACAO }));
  const atual = ligado ? (api.dados ?? GITHUB_DE_ORIGEM) : guardado;
  const ramos = (ligado ? api.dados?.ramos : undefined) ?? RAMOS_DE_DEMONSTRACAO;
  const [rascunho, setRascunho] = useState(atual);
  useEffect(() => setRascunho(atual), [atual.repositorio, atual.ramo]); // eslint-disable-line react-hooks/exhaustive-deps
  const erro = erroDoRepositorio(rascunho.repositorio);
  const mudou = rascunho.repositorio.trim() !== atual.repositorio;
  const commits = useApi<{ itens: Commit[] }>(`/v1/dev/github/commits?ramo=${encodeURIComponent(atual.ramo)}`, () => ({ itens: gerarCommits(atual.ramo) }));
  const conectores = useColecao<Conector>("/v1/dev/conectores", "conectores", CONECTORES_DE_ORIGEM);
  const [versoes, setVersoes] = useGuardado<EstadoDeImplementacoes>("implementacoes", gerarImplementacoes());
  const [lancarCommit, setLancarCommit] = useState<Commit | null>(null);
  const [aTestar, setATestar] = useState<string | null>(null);
  const github = conectores.itens.find((c) => c.id === "github");
  // o GitHub a sério: com um repositório ligado, tudo o que se vê vem do GitHub (e não da demonstração)
  const real = useLigacaoReal();
  const modoReal = !!real.ligacao;
  const leitura = useLeituraReal<PainelReal & { ramoUsado: string }>(modoReal, `${real.ligacao?.repositorio}|${real.ligacao?.ramo}|${real.token ? 1 : 0}`, (sinal) => lerPainelReal(real.ligacao!.repositorio, real.ligacao!.ramo, real.token, sinal));
  const ramoMostrado = modoReal ? (leitura.dados?.ramoUsado ?? real.ligacao?.ramo ?? "") : atual.ramo;
  const commitsMostrados: (Commit | CommitReal)[] = modoReal ? (leitura.dados?.commits ?? []) : (commits.dados?.itens ?? []);

  const ramosMostrados = modoReal ? (leitura.dados?.ramos ?? []) : ramos;
  const ultimo = commitsMostrados[0];
  const emProducao = versoes.itens.find((i) => i.id === versoes.a);

  const guardar = async (novo = { repositorio: rascunho.repositorio.trim(), ramo: rascunho.ramo }, mensagem = "Repositório guardado") => {
    try {
      if (ligado) {
        await chamar(ligacao, "PUT", "/v1/dev/github", novo);
        api.recarregar();
      } else setGuardado(novo);
      avisar(mensagem);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível guardar");
    }
  };
  /** Mudar o ramo no diagrama: com o GitHub ligado guarda a ligação; sem ele guarda o ramo da demonstração. */
  const mudarRamo = (r: string) => {
    if (modoReal && real.ligacao) guardarLigacaoReal({ ...real.ligacao, ramo: r });
    else {
      setRascunho({ ...rascunho, ramo: r });
      void guardar({ repositorio: atual.repositorio, ramo: r }, "Ramo guardado");
    }
  };
  const lancarVersao = async (c: Commit) => {
    try {
      if (ligado) await chamar(ligacao, "POST", "/v1/dev/implementacoes", { ramo: c.ramo, commit: c.sha });
      else setVersoes((v) => lancar(v, { ramo: c.ramo, commit: c.sha, mensagem: c.mensagem, autor: c.autor }));
      avisar(`Versão do commit ${c.sha} lançada: está pronta em Implementações`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível lançar a versão");
    }
  };
  const testar = async (c: Conector) => {
    setATestar(c.id);
    try {
      if (ligado) {
        const r = await chamar<{ ok: boolean; mensagem: string }>(ligacao, "POST", "/v1/dev/conectores/{id}/testar", {}, { id: c.id });
        avisar(`${c.rotulo}: ${r.mensagem}`);
      } else {
        await new Promise((r) => window.setTimeout(r, 800));
        avisar(c.ligado ? `${c.rotulo}: respondeu em ${90 + (c.id.length * 17) % 80} ms` : `${c.rotulo}: está desligado, ligue-o primeiro`);
      }
    } catch (e) {
      avisar(e instanceof Error ? e.message : "A ligação falhou");
    }
    setATestar(null);
  };

  const colunas: ColunaSimples<Commit | CommitReal>[] = [
    { rotulo: "Commit", render: (c) => <code className="inline-flex items-center gap-1 text-xs">{c.sha}<BotaoCopiar texto={c.sha} estruturado={estruturaDeRegisto(`Commit ${c.sha}`, { ...c }, "/dev/github/")} tamanho="xs" dica="Copiar os dados do commit" /></code> },
    { rotulo: "Mudança", render: (c) => <span className="block max-w-72 truncate" title={c.mensagem}>{c.mensagem}</span> },
    { rotulo: "Autor", render: (c) => c.autor },
    { rotulo: "Quando", render: (c) => <span className="tabular-nums">{dataHora(c.quando)}</span> },
    { rotulo: "Testes", filtro: (c) => String(c.testes), render: (c) => (modoReal ? <EstadoReal valor={c.testes} /> : <Estado valor={c.testes} />) },
    ...(modoReal
      ? [
          {
            rotulo: "",
            direita: true,
            render: (c: Commit | CommitReal) =>
              "url" in c && c.url ? (
                <a href={c.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-kumo-default underline underline-offset-2">
                  Abrir
                </a>
              ) : null,
          },
        ]
      : editar
      ? [
          {
            rotulo: "",
            direita: true,
            render: (c: Commit | CommitReal) => (
              <Button variant="ghost" size="sm" disabled={c.testes !== "Passaram" || !github?.ligado} onClick={() => setLancarCommit(c as Commit)}>
                Lançar
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Pagina>
      <Titulo titulo="GitHub e conectores" />
      <AvisoDeApi erro={modoReal ? leitura.erro : (api.erro ?? commits.erro ?? conectores.erro)} aoTentar={() => (modoReal ? leitura.recarregar() : (api.recarregar(), commits.recarregar(), conectores.recarregar()))} />
      {/* o diagrama como o dos Workers da Cloudflare: o repositório, o ramo, os commits com os testes e as implementações; liga-se e muda-se tudo nas próprias caixas */}
      <Fluxo
        rotulo="Do repositório às implementações"
        ligacoes={[
          { de: "repo", para: "ramo" },
          ...(modoReal ? [] : [{ de: "ligar", para: "ramo" }]),
          { de: "ramo", para: "commits" },
          { de: "commits", para: "impl" },
        ]}
      >
        <ColunaDoFluxo>
          {!modoReal && (
            <NoDoFluxo id="repo" titulo="Repositório (demonstração)" icone={<IconeDoGitHub />} indicador="cinza">
              <Input label="Repositório" value={rascunho.repositorio} disabled={!editar} onChange={(e) => setRascunho({ ...rascunho, repositorio: e.target.value })} error={rascunho.repositorio.trim() ? (erro ?? undefined) : undefined} placeholder="dono/nome" autoComplete="off" />
              {editar && (
                <Button variant="primary" disabled={!mudou || !!erro} onClick={() => void guardar()}>
                  Guardar
                </Button>
              )}
            </NoDoFluxo>
          )}
          <NoDaLigacaoReal ligacao={real.ligacao} token={real.token} repositorio={leitura.dados?.repositorio} limite={leitura.dados?.limite} aCarregar={leitura.aCarregar} editar={editar} />
        </ColunaDoFluxo>
        <ColunaDoFluxo>
          <NoDoFluxo id="ramo" titulo="Ramo" icone={<Ic nome="codigo" tamanho={16} />} indicador={ramoMostrado ? "verde" : "cinza"}>
            <Select aria-label="Ramo" value={ramoMostrado} disabled={!editar || (modoReal && ramosMostrados.length === 0)} onValueChange={(v) => mudarRamo(String(v))} items={Object.fromEntries((ramosMostrados.length ? ramosMostrados : [ramoMostrado || "main"]).map((r) => [r, r]))} className="w-full" />
          </NoDoFluxo>
        </ColunaDoFluxo>
        <ColunaDoFluxo>
          <NoDoFluxo id="commits" titulo="Commits e testes" icone={<Ic nome="serie" tamanho={16} />} contagem={commitsMostrados.length} indicador={!ultimo ? "cinza" : /^Falha/.test(String(ultimo.testes)) ? "ambar" : "verde"}>
            {ultimo ? (
              <>
                <LinhaDoNo rotulo="Último">
                  <code className="text-xs">{ultimo.sha}</code>
                </LinhaDoNo>
                <LinhaDoNo rotulo="Mudança">{ultimo.mensagem}</LinhaDoNo>
                <LinhaDoNo rotulo="Autor">{ultimo.autor}</LinhaDoNo>
                <LinhaDoNo rotulo="Testes">{modoReal ? <EstadoReal valor={ultimo.testes} /> : <Estado valor={ultimo.testes} />}</LinhaDoNo>
                {modoReal
                  ? "url" in ultimo && ultimo.url && (
                      <a href={ultimo.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-kumo-default underline underline-offset-2">
                        Abrir o commit
                      </a>
                    )
                  : editar && (
                      <Button variant="secondary" size="sm" disabled={ultimo.testes !== "Passaram" || !github?.ligado} onClick={() => setLancarCommit(ultimo as Commit)}>
                        Lançar esta versão
                      </Button>
                    )}
              </>
            ) : (
              <span className="text-sm text-kumo-subtle">{(modoReal ? leitura.aCarregar : commits.aCarregar) ? "A ler os commits…" : "Sem commits neste ramo."}</span>
            )}
          </NoDoFluxo>
        </ColunaDoFluxo>
        <ColunaDoFluxo>
          <NoDoFluxo id="impl" titulo="Implementações" icone={<Ic nome="atualizar" tamanho={16} />} indicador={modoReal || emProducao ? "verde" : "cinza"}>
            {modoReal ? (
              <LinhaDoNo rotulo="Origem">GitHub</LinhaDoNo>
            ) : (
              <>
                <LinhaDoNo rotulo="Versões">{versoes.itens.length}</LinhaDoNo>
                <LinhaDoNo rotulo="Em produção">{emProducao?.versao ?? "—"}</LinhaDoNo>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={() => router.push(caminho("dev", "implementacoes"))}>
              Abrir implementações
            </Button>
          </NoDoFluxo>
        </ColunaDoFluxo>
      </Fluxo>
      <Cartao titulo="Conectores">
        {conectores.itens.map((c) => (
          <Linha key={c.id} titulo={c.rotulo} estado={c.detalhe}>
            <Button variant="ghost" size="sm" disabled={aTestar === c.id} onClick={() => void testar(c)}>
              {aTestar === c.id ? "A testar…" : "Testar"}
            </Button>
            <Interruptor marcado={c.ligado} aoMudar={(v) => void conectores.guardar({ ...c, ligado: v })} rotulo={`Conector ${c.rotulo} ligado`} desativado={!editar} />
          </Linha>
        ))}
      </Cartao>
      <Cartao titulo={`Últimos commits de ${ramoMostrado}`}>
        <TabelaSimples colunas={colunas} linhas={commitsMostrados} chave={(c) => c.sha} vazio={(modoReal ? leitura.aCarregar : commits.aCarregar) ? "A ler os commits…" : "Este ramo ainda não tem commits."} />
      </Cartao>
      <Confirmar
        aberto={!!lancarCommit}
        aoMudar={(v) => !v && setLancarCommit(null)}
        titulo="Lançar esta versão"
        texto={lancarCommit ? `Constrói uma versão nova do commit ${lancarCommit.sha} (${lancarCommit.ramo}). Fica pronta, sem tráfego, em Implementações, até a promover ou a testar.` : ""}
        rotuloAcao="Lançar"
        aoConfirmar={() => lancarCommit && void lancarVersao(lancarCommit)}
      />
    </Pagina>
  );
}
