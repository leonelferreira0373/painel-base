// As implementações do painel: a versão A que recebe o tráfego, o teste A/B com uma versão B (e a parte do tráfego que ela recebe), promover a B, cancelar o teste e o rollback para uma versão anterior. Em modo simulado o estado vive no navegador; em modo ligado cada ação chama o contrato e o servidor decide.
"use client";

import { Button, Select } from "@cloudflare/kumo";
import { useState } from "react";
import { gerarImplementacoes } from "@/dados/deploys";
import { TRAFEGO_PARA_B } from "@/dados/personalizados";
import { chamar, useApi, useLigacao } from "@/lib/api/cliente";
import { useApp } from "@/lib/estado";
import { cancelarTeste, dividir, erroDaDivisao, erroDoRollback, promoverB, reverter, versaoDe, type EstadoDeImplementacoes, type Implementacao } from "@/lib/implementacoes";
import { useEditar } from "@/lib/permissao";
import { Cartao, Confirmar, Linha } from "../conta/Pecas";
import { Estado } from "../Estado";
import { Ic, ICONES } from "../Icones";
import { SeletorPersonalizavel } from "../SeletorPersonalizavel";
import { Pagina, Titulo } from "../ui";
import { ImplementacoesDoGitHub, useLigacaoReal } from "./GitHubReal";
import { ColunaDoFluxo, Fluxo, IconeDoGitHub, LinhaDoNo, NoDoFluxo } from "../Fluxo";
import { AvisoDeApi, dataHora, TabelaSimples, useGuardado, type ColunaSimples } from "./SuperPecas";

const ORIGEM = gerarImplementacoes();

export function Implementacoes() {
  const ligacao = useLigacao();
  const { avisar } = useApp();
  const editar = useEditar();
  const real = useLigacaoReal();
  const [local, setLocal] = useGuardado<EstadoDeImplementacoes>("implementacoes", ORIGEM);
  const api = useApi<EstadoDeImplementacoes>("/v1/dev/implementacoes", () => local);
  const ligado = ligacao.modo === "ligado";
  const e = ligado ? (api.dados ?? ORIGEM) : local;
  const [escolhaB, setEscolhaB] = useState("");
  const [percentagem, setPercentagem] = useState("10");
  const [alvo, setAlvo] = useState<Implementacao | null>(null);
  const [promover, setPromover] = useState(false);

  /** Faz a mudança: no navegador (`novo`) ou no servidor (`pedido`), e avisa. */
  const aplicar = async (novo: EstadoDeImplementacoes, pedido: () => Promise<unknown>, texto: string) => {
    try {
      if (ligado) {
        await pedido();
        api.recarregar();
      } else setLocal(novo);
      avisar(texto);
    } catch (er) {
      avisar(er instanceof Error ? er.message : "Não foi possível fazer a mudança");
    }
  };
  const pct = Number(percentagem);
  const erroB = escolhaB ? erroDaDivisao(e, escolhaB, pct) : null;
  const candidatas = e.itens.filter((i) => i.id !== e.a && i.estado !== "Falhou");
  const a = e.itens.find((i) => i.id === e.a);
  const b = e.itens.find((i) => i.id === e.b);

  const colunas: ColunaSimples<Implementacao>[] = [
    { rotulo: "Versão", render: (i) => <span className="font-medium tabular-nums">{i.versao}</span> },
    { rotulo: "Ramo", render: (i) => i.ramo },
    { rotulo: "Commit", render: (i) => <code className="text-xs">{i.commit}</code> },
    { rotulo: "Mudança", render: (i) => <span className="block max-w-72 truncate" title={i.mensagem}>{i.mensagem}</span> },
    { rotulo: "Autor", render: (i) => i.autor },
    { rotulo: "Quando", render: (i) => <span className="tabular-nums">{dataHora(i.quando)}</span> },
    { rotulo: "Estado", filtro: (i) => String(i.estado), render: (i) => <Estado valor={i.estado} /> },
    { rotulo: "Tráfego", direita: true, render: (i) => `${i.trafego} %` },
    ...(editar
      ? [
          {
            rotulo: "",
            direita: true,
            render: (i: Implementacao) =>
              erroDoRollback(e, i.id) ? null : (
                <Button variant="ghost" size="sm" icon={ICONES.repor} onClick={() => setAlvo(i)}>
                  Voltar a esta
                </Button>
              ),
          },
        ]
      : []),
  ];

  return (
    <Pagina>
      <Titulo titulo="Implementações" />
      <AvisoDeApi erro={api.erro} aoTentar={api.recarregar} />
      <ImplementacoesDoGitHub />
      {/* o diagrama como o dos Workers da Cloudflare: de onde vem o código, como se divide o tráfego e que versão recebe cada parte; muda-se tudo nas próprias caixas */}
      <Fluxo
        rotulo="Versão em produção e teste A/B"
        ligacoes={[
          { de: "origem", para: "trafego" },
          { de: "trafego", para: "a" },
          { de: "trafego", para: "b" },
        ]}
      >
        <ColunaDoFluxo>
          <NoDoFluxo id="origem" titulo="Origem" icone={<IconeDoGitHub />}>
            <LinhaDoNo rotulo="Repositório">{real.ligacao?.repositorio ?? "Demonstração"}</LinhaDoNo>
            <LinhaDoNo rotulo="Ramo">{a?.ramo ?? "—"}</LinhaDoNo>
            <LinhaDoNo rotulo="Versões">{e.itens.length}</LinhaDoNo>
          </NoDoFluxo>
        </ColunaDoFluxo>
        <ColunaDoFluxo>
          <NoDoFluxo id="trafego" titulo="Tráfego" icone={<Ic nome="serie" tamanho={16} />}>
            <div className="flex h-3 overflow-hidden rounded-full bg-kumo-recessed ring ring-kumo-line" role="img" aria-label={`Versão A com ${100 - (e.b ? e.percentagemB : 0)} % do tráfego${e.b ? ` e versão B com ${e.percentagemB} %` : ""}`}>
              <div className="h-full bg-blue-500 transition-[width] duration-500" style={{ width: `${e.b ? 100 - e.percentagemB : 100}%` }} />
              {e.b && <div className="h-full bg-amber-500 transition-[width] duration-500" style={{ width: `${e.percentagemB}%` }} />}
            </div>
            <LinhaDoNo rotulo="Versão A">{100 - (e.b ? e.percentagemB : 0)} %</LinhaDoNo>
            <LinhaDoNo rotulo="Versão B">{e.b ? e.percentagemB : 0} %</LinhaDoNo>
            {editar && (
              <>
                <SeletorPersonalizavel label="Tráfego para a B" valor={percentagem} opcoes={TRAFEGO_PARA_B.opcoes} personalizado={TRAFEGO_PARA_B.personalizado} aoMudar={setPercentagem} />
                {erroB && <span className="text-sm text-kumo-danger">{erroB}</span>}
                <Button variant="primary" disabled={!escolhaB || !!erroB} onClick={() => void aplicar(dividir(e, escolhaB, pct), () => chamar(ligacao, "PUT", "/v1/dev/implementacoes/divisao", { b: escolhaB, percentagemB: pct }), "Teste A/B começou")}>
                  {e.b ? "Mudar a divisão" : "Começar o teste"}
                </Button>
              </>
            )}
          </NoDoFluxo>
        </ColunaDoFluxo>
        <ColunaDoFluxo>
          <NoDoFluxo id="a" titulo={a ? `Versão A · ${a.versao}` : "Versão A"} indicador="azul" icone={<Ic nome="codigo" tamanho={16} />}>
            {a && (
              <>
                <LinhaDoNo rotulo="Commit">
                  <code className="text-xs">{a.commit}</code>
                </LinhaDoNo>
                <LinhaDoNo rotulo="Mudança">{a.mensagem}</LinhaDoNo>
                <LinhaDoNo rotulo="Autor">{a.autor}</LinhaDoNo>
                <LinhaDoNo rotulo="Estado">
                  <Estado valor="Ativa" />
                </LinhaDoNo>
              </>
            )}
            {editar && (
              <Select aria-label="Voltar a uma versão anterior" value="—" onValueChange={(v) => { const alvoDeVolta = e.itens.find((i) => i.id === String(v)); if (alvoDeVolta) setAlvo(alvoDeVolta); }} items={{ "—": "Voltar a uma anterior…", ...Object.fromEntries(e.itens.filter((i) => i.id !== e.a && i.estado !== "Falhou" && !erroDoRollback(e, i.id)).map((i) => [i.id, `${i.versao} · ${i.mensagem.slice(0, 28)}`])) }} className="w-full" />
            )}
          </NoDoFluxo>
          <NoDoFluxo id="b" titulo={b ? `Versão B · ${b.versao}` : "Versão B"} indicador={b ? "ambar" : "cinza"} icone={<Ic nome="codigo" tamanho={16} />}>
            {b ? (
              <>
                <LinhaDoNo rotulo="Commit">
                  <code className="text-xs">{b.commit}</code>
                </LinhaDoNo>
                <LinhaDoNo rotulo="Mudança">{b.mensagem}</LinhaDoNo>
                <LinhaDoNo rotulo="Estado">
                  <Estado valor="Em teste" />
                </LinhaDoNo>
                {editar && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setPromover(true)}>
                      Promover a B
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void aplicar(cancelarTeste(e), () => chamar(ligacao, "PUT", "/v1/dev/implementacoes/divisao", { b: null, percentagemB: 0 }), "Teste cancelado")}>
                      Cancelar o teste
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <span className="text-sm text-kumo-subtle">Sem teste A/B.</span>
            )}
            {editar && (
              <Select aria-label="Versão B" value={escolhaB || "—"} onValueChange={(v) => setEscolhaB(String(v) === "—" ? "" : String(v))} items={{ "—": "Escolher a versão B…", ...Object.fromEntries(candidatas.map((i) => [i.id, `${i.versao} · ${i.mensagem.slice(0, 28)}`])) }} className="w-full" />
            )}
          </NoDoFluxo>
        </ColunaDoFluxo>
      </Fluxo>
      <Cartao titulo={`Versões (${e.itens.length})`}>
        <TabelaSimples colunas={colunas} linhas={e.itens} chave={(i) => i.id} vazio="Ainda não há versões." />
      </Cartao>
      <Cartao titulo="Histórico">
        <TabelaSimples
          colunas={[
            { rotulo: "Quando", render: (h: EstadoDeImplementacoes["historico"][number]) => <span className="tabular-nums">{dataHora(h.quando)}</span> },
            { rotulo: "O que aconteceu", render: (h: EstadoDeImplementacoes["historico"][number]) => h.texto },
          ]}
          linhas={e.historico}
          chave={(h) => `${h.quando}${h.texto}`}
          vazio="Ainda não mudou nada."
        />
      </Cartao>
      <Confirmar
        aberto={!!alvo}
        aoMudar={(v) => !v && setAlvo(null)}
        titulo="Voltar a esta versão"
        texto={alvo ? `A versão ${versaoDe(e, e.a)} deixa de receber tráfego e a ${alvo.versao} passa a receber todo.${e.b ? " O teste A/B acaba." : ""}` : ""}
        rotuloAcao="Voltar"
        perigo
        escrever={alvo ? `REVERTER ${alvo.versao}` : "REVERTER"}
        aoConfirmar={() => alvo && void aplicar(reverter(e, alvo.id), () => chamar(ligacao, "POST", "/v1/dev/implementacoes/{id}/reverter", {}, { id: alvo.id }), `Voltou à versão ${alvo.versao}`)}
      />
      <Confirmar
        aberto={promover}
        aoMudar={setPromover}
        titulo="Promover a versão B"
        texto={b ? `A versão ${b.versao} passa a receber todo o tráfego e a ${versaoDe(e, e.a)} fica como anterior.` : ""}
        rotuloAcao="Promover"
        aoConfirmar={() => void aplicar(promoverB(e), () => chamar(ligacao, "POST", "/v1/dev/implementacoes/promover", {}), "Versão B promovida")}
      />
    </Pagina>
  );
}
