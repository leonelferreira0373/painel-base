// O menu de três pontos (na vertical) dos cartões, dos KPIs e das listas: mudar a cor (a gama de todos os gráficos de uma vez, só a deste, ou a de cada elemento dele: uma barra, uma fatia, uma série), exportar em qualquer formato, copiar os dados estruturados, deixar uma nota, perguntar à IA e investigar com a IA (a pesquisa a fundo). O resultado de copiar aparece no próprio botão (visto ou aviso), nunca num aviso flutuante. `ItensDeKpi` entra em qualquer menu de cartão; `MenuDoKpi` é o menu completo de um KPI; `MenuDeDados` é o das listas.
"use client";

import { Button, Dialog, DropdownMenu, Input, Tooltip } from "@cloudflare/kumo";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { registar } from "@/lib/atividade";
import { copiarEstruturado, estruturaDeTabela, type PayloadEstruturado } from "@/lib/copiar-dados";
import { abrirDados } from "@/lib/dados-da-pagina";
import { copiarImagem, type DadosExportaveis } from "@/lib/exportar-dados";
import { COR_DE_PARTIDA, CORES_DE_GRAFICO, corValida, definirCor, definirCorDoElemento, definirGama, ID_DA_GAMA, idDoGrafico, lerCores, reporCoresDosElementos, useCoresDosElementos, useCorDoGrafico } from "@/lib/cores-graficos";
import { useElementosDoGrafico } from "@/lib/elementos-do-grafico";
import { perguntarAIa } from "@/lib/ia-contexto";
import { abrirNota } from "@/lib/notas";
import { abrirAnalise } from "@/lib/pesquisa-profunda";
import { IconeMorfico, useResultadoTemporario } from "./Copiar";
import { useJanelasDoCartao } from "./DetalhesDoCartao";
import { ItemCopiarComMais, ItemPerguntarComMais } from "./ItensDeMenuComMais";
import { MenuCartao, SeparadorDeMenu, SubMenuCartao } from "./Flutuantes";
import { Ic, ICONES } from "./Icones";
import { EscolhaDeCor } from "./SeletorDeCor";

// ---------- a cor ----------

/** `elemento` abre a janela já no primeiro elemento do gráfico (a barra 1, a fatia 1…). */
type Escopo = "gama" | "grafico" | "elemento";

/** A janela de escolher outra cor: a gama inteira, só um gráfico, ou um elemento dele (uma barra, uma fatia, uma série). O menu abre-a com `abrir`; `janela` põe-se ao lado do menu. */
export function useJanelaDeCor(idDaCor?: string): { abrir: (e: Escopo) => void; janela: ReactNode } {
  const [escopo, setEscopo] = useState<Escopo | null>(null);
  const [cor, , propria] = useCorDoGrafico(idDaCor);
  const elementos = useElementosDoGrafico(idDaCor);
  const [escolhidas] = useCoresDosElementos(idDaCor);
  /** O elemento que se está a pintar; `null` é o gráfico todo. */
  const [chave, setChave] = useState<string | null>(null);
  const [gama, setGama] = useState<string | undefined>(undefined);
  const [escrito, setEscrito] = useState("");
  useEffect(() => {
    if (escopo) setGama(lerCores()[ID_DA_GAMA]);
    setChave(escopo === "elemento" ? (elementos[0]?.chave ?? null) : null);
  }, [escopo]); // eslint-disable-line react-hooks/exhaustive-deps
  const elemento = escopo !== "gama" ? elementos.find((e) => e.chave === chave) : undefined;
  const atual = escopo === "gama" ? (gama ?? COR_DE_PARTIDA) : elemento ? (escolhidas[elemento.chave] ?? elemento.padrao) : (propria ?? cor ?? COR_DE_PARTIDA);
  useEffect(() => setEscrito(escopo ? atual : ""), [escopo, chave]); // eslint-disable-line react-hooks/exhaustive-deps
  const aplicar = (hex: string) => {
    const h = hex.toLowerCase();
    if (escopo === "gama") {
      definirGama(h);
      setGama(h);
      registar("definicao", `Mudou a cor de todos os gráficos para ${h}`, { depois: h });
    } else if (idDaCor && elemento) {
      definirCorDoElemento(idDaCor, elemento.chave, h);
      registar("definicao", `Mudou a cor de «${elemento.rotulo}» no gráfico ${idDaCor.split(":")[1] ?? ""} para ${h}`, { depois: h });
    } else if (idDaCor) {
      definirCor(idDaCor, h);
      registar("definicao", `Mudou a cor do gráfico ${idDaCor.split(":")[1] ?? ""} para ${h}`, { depois: h });
    }
    setEscrito(h);
  };
  const temEscolhas = Object.keys(escolhidas).length > 0;
  // com a janela da cor aberta o resto do ecrã não escurece nem fica tapado: vê-se o gráfico a mudar (a regra está em globals.css)
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.toggle("janela-de-cor", escopo !== null);
    return () => raiz.classList.remove("janela-de-cor");
  }, [escopo]);
  const janela = (
    <Dialog.Root open={escopo !== null} onOpenChange={(v) => !v && setEscopo(null)}>
      <Dialog size="sm" className="!fixed !bottom-3 !left-1/2 !top-auto w-[calc(100vw-1.5rem)] !-translate-x-1/2 p-4 sm:!left-auto sm:!right-4 sm:!translate-x-0 sm:w-[22rem]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold">{escopo === "gama" ? "Cor de todos os gráficos" : elemento ? "Cor de um elemento" : "Cor deste gráfico"}</Dialog.Title>
            <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
          {escopo !== "gama" && elementos.length > 1 && (
            <div role="radiogroup" aria-label="O que pintar" className="sem-barra -mx-1 -my-1 flex gap-1.5 overflow-x-auto px-1 py-1">
              {[{ chave: null as string | null, rotulo: "Todo o gráfico", cor: propria ?? cor ?? COR_DE_PARTIDA }, ...elementos.map((e) => ({ chave: e.chave as string | null, rotulo: e.rotulo, cor: escolhidas[e.chave] ?? e.padrao }))].map((o) => (
                <button
                  key={o.chave ?? "*"}
                  type="button"
                  role="radio"
                  aria-checked={chave === o.chave}
                  onClick={() => setChave(o.chave)}
                  className="inline-flex max-w-[180px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-kumo-default ring ring-kumo-line transition-colors hover:bg-kumo-tint aria-checked:bg-kumo-tint aria-checked:ring-2 aria-checked:ring-kumo-default"
                >
                  <Amostra hex={o.cor} />
                  <span className="min-w-0 truncate">{o.rotulo}</span>
                </button>
              ))}
            </div>
          )}
          <EscolhaDeCor valor={corValida(atual) ? atual : COR_DE_PARTIDA} aoMudar={aplicar} />
          <Input
            label="Código da cor"
            value={escrito}
            placeholder={COR_DE_PARTIDA}
            onChange={(e) => {
              setEscrito(e.target.value);
              const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
              if (corValida(v)) aplicar(v);
            }}
            error={escrito !== "" && !corValida(escrito.startsWith("#") ? escrito : `#${escrito}`) ? "Use seis dígitos, de 0 a 9 e de a a f." : undefined}
          />
          <div className="flex items-center justify-between gap-2">
            {escopo !== "gama" && idDaCor && elementos.length > 1 ? (
              <Button
                variant="ghost"
                icon={ICONES.repor}
                disabled={elemento ? !escolhidas[elemento.chave] : !temEscolhas}
                onClick={() => {
                  if (elemento) definirCorDoElemento(idDaCor, elemento.chave, null);
                  else reporCoresDosElementos(idDaCor);
                }}
              >
                {elemento ? "Repor este elemento" : "Repor os elementos"}
              </Button>
            ) : (
              <span />
            )}
            <Button variant="primary" onClick={() => setEscopo(null)}>
              Concluído
            </Button>
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  );
  return { abrir: setEscopo, janela };
}

function Amostra({ hex }: { hex: string }) {
  return <span aria-hidden className="inline-block size-3.5 rounded-[4px] ring-1 ring-black/15" style={{ background: hex }} />;
}

function ItensDeCor({ idDaCor, aoOutraCor }: { idDaCor: string; aoOutraCor: (e: Escopo) => void }) {
  const [cor, , propria] = useCorDoGrafico(idDaCor);
  const elementos = useElementosDoGrafico(idDaCor);
  const [escolhidas] = useCoresDosElementos(idDaCor);
  const temEscolhas = Object.keys(escolhidas).length > 0;
  const gama = lerCores()[ID_DA_GAMA];
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger icon={<Ic nome="paleta" />}>Mudar a cor</DropdownMenu.SubTrigger>
      <SubMenuCartao>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger icon={<Ic nome="barras" />}>Todos os gráficos de uma vez</DropdownMenu.SubTrigger>
          <SubMenuCartao>
            {CORES_DE_GRAFICO.map((c) => (
              <DropdownMenu.Item
                key={c.hex}
                icon={<Amostra hex={c.hex} />}
                selected={gama === c.hex}
                onClick={() => {
                  definirGama(c.hex);
                  registar("definicao", `Mudou a cor de todos os gráficos para ${c.rotulo.toLowerCase()}`, { depois: c.hex });
                }}
              >
                {c.rotulo}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Item icon={<Ic nome="paleta" />} onClick={() => aoOutraCor("gama")}>
              Outra cor…
            </DropdownMenu.Item>
            <SeparadorDeMenu />
            <DropdownMenu.Item icon={<Ic nome="repor" />} onClick={() => (definirGama(null), registar("definicao", "Repôs as cores originais de todos os gráficos"))}>
              Repor as cores originais
            </DropdownMenu.Item>
          </SubMenuCartao>
        </DropdownMenu.Sub>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger icon={<Ic nome="serie" />}>Só este gráfico</DropdownMenu.SubTrigger>
          <SubMenuCartao>
            {CORES_DE_GRAFICO.map((c) => (
              <DropdownMenu.Item
                key={c.hex}
                icon={<Amostra hex={c.hex} />}
                selected={propria === c.hex}
                onClick={() => {
                  definirCor(idDaCor, c.hex);
                  registar("definicao", `Mudou a cor do gráfico ${idDaCor.split(":")[1] ?? ""} para ${c.rotulo.toLowerCase()}`, { depois: c.hex });
                }}
              >
                {c.rotulo}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Item icon={<Ic nome="paleta" />} onClick={() => aoOutraCor("grafico")}>
              Outra cor…
            </DropdownMenu.Item>
            {elementos.length > 1 && (
              <DropdownMenu.Item icon={<Ic nome="barras" />} onClick={() => aoOutraCor("elemento")}>
                Cada elemento…
              </DropdownMenu.Item>
            )}
            <SeparadorDeMenu />
            <DropdownMenu.Item icon={<Ic nome="repor" />} disabled={!propria && !cor && !temEscolhas} onClick={() => (definirCor(idDaCor, null), reporCoresDosElementos(idDaCor))}>
              {gama ? "Usar a cor de todos" : "Voltar à cor original"}
            </DropdownMenu.Item>
          </SubMenuCartao>
        </DropdownMenu.Sub>
      </SubMenuCartao>
    </DropdownMenu.Sub>
  );
}

// ---------- os itens ----------

export interface PropsDosItens {
  /** O que o cartão mostra, em tabela: dá o «Exportar…» (todos os formatos) e a imagem. */
  dados?: DadosExportaveis;
  /** A informação estruturada do cartão (um valor, a variação, a série…), para copiar, perguntar e investigar. Sem ela, vale a tabela. */
  estruturado?: { dados: unknown };
  titulo: string;
  tipo?: "cartao" | "lista";
  /** Com o id da cor do gráfico o menu ganha «Mudar a cor». */
  idDaCor?: string;
  /** O cartão tem gráfico mas não se pinta elemento a elemento (um mapa): sem «Mudar a cor». */
  semCor?: boolean;
  aoOutraCor?: (e: Escopo) => void;
  /** Abrem as janelas «Ver detalhes» e «Ver o mapa» (só se o cartão tem um gráfico que as permite). */
  aoVerDetalhes?: () => void;
  aoVerMapa?: () => void;
  /** Mostra o resultado de copiar (visto ou aviso) no botão do menu. */
  aoResultado: (ok: boolean) => void;
}

export function ItensDeKpi({ dados, estruturado, titulo, tipo = "cartao", idDaCor, semCor = false, aoOutraCor, aoVerDetalhes, aoVerMapa, aoResultado }: PropsDosItens) {
  const pagina = usePathname() ?? "";
  const alvoDeNota = { tipo: "kpi" as const, chave: idDaCor ?? idDoGrafico(pagina, titulo), rotulo: titulo, pagina };
  const tabela = () => (dados ? estruturaDeTabela(dados, pagina) : undefined);
  /** O que a IA lê: a informação estruturada do cartão e, se há, a tabela. */
  const paraIa = (): unknown => {
    const t = tabela();
    if (estruturado && t) return { ...(estruturado.dados as object), tabela: t.dados };
    return estruturado?.dados ?? t?.dados;
  };
  const copiarDados = async () => {
    const t = tabela();
    if (!estruturado && !t) return aoResultado(false);
    aoResultado(await copiarEstruturado(estruturado ? { tipo, titulo, origem: pagina, geradoEm: new Date().toISOString(), dados: paraIa() } : { ...t!, tipo }));
  };
  return (
    <>
      {aoVerDetalhes && (
        <DropdownMenu.Item icon={<Ic nome="grafico" />} onClick={aoVerDetalhes}>
          Ver detalhes
        </DropdownMenu.Item>
      )}
      {aoVerMapa && (
        <DropdownMenu.Item icon={<Ic nome="globo" />} onClick={aoVerMapa}>
          Ver o mapa
        </DropdownMenu.Item>
      )}
      {idDaCor && aoOutraCor && !semCor && <ItensDeCor idDaCor={idDaCor} aoOutraCor={aoOutraCor} />}
      {dados && (
        <DropdownMenu.Item icon={<Ic nome="transferir" />} onClick={() => abrirDados("exportar", { nome: dados.nome, titulo: dados.titulo, dados })}>
          Exportar…
        </DropdownMenu.Item>
      )}
      {(dados || estruturado) && <ItemCopiarComMais aoCopiar={copiarDados} aoImagem={dados ? async () => aoResultado(await copiarImagem(dados)) : undefined} />}
      <DropdownMenu.Item icon={<Ic nome="nota" />} onClick={() => abrirNota(alvoDeNota)}>
        Deixar nota
      </DropdownMenu.Item>
      <ItemPerguntarComMais
        pergunta={tipo === "lista" ? "Explicar este quadro" : "Explicar este cartão"}
        perguntar={(texto) => perguntarAIa(texto, { contexto: { titulo, dados: paraIa(), pagina } })}
        aoInvestigar={() => abrirAnalise({ titulo, tipo, pagina, dados: paraIa() })}
      />
    </>
  );
}

/** Os mesmos itens, para o nome antigo (os menus das listas e dos cartões). */
export const ItensDeExportar = ItensDeKpi;

/** O botão de três pontos (na vertical) de um cartão ou de uma lista: o gatilho que mostra o resultado de copiar. */
export function GatilhoDoMenu({ estado }: { estado: "ocioso" | "ok" | "erro" }) {
  return (
    <Tooltip content={estado === "ok" ? "Copiado" : estado === "erro" ? "Não foi possível copiar" : "Opções"} render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="xs" icon={<IconeMorfico estado={estado} repouso="mais3" tamanho={16} />} aria-label="Opções do cartão" className="-mr-1.5 text-kumo-subtle" />} />} />
  );
}

/** O menu completo de um KPI (os cartões de estatística e os de gráfico): cor, exportar, copiar, nota e IA. */
export function MenuDoKpi(props: Omit<PropsDosItens, "aoResultado" | "aoOutraCor" | "aoVerDetalhes" | "aoVerMapa"> & { extra?: ReactNode }) {
  const [estado, definir] = useResultadoTemporario();
  const cor = useJanelaDeCor(props.idDaCor);
  const det = useJanelasDoCartao(props.idDaCor, props.titulo);
  const { extra, ...resto } = props;
  return (
    <>
      <DropdownMenu>
        <GatilhoDoMenu estado={estado} />
        <MenuCartao>
          {extra}
          <ItensDeKpi {...resto} aoOutraCor={cor.abrir} aoVerDetalhes={det.aoVerDetalhes} aoVerMapa={det.aoVerMapa} aoResultado={(ok) => definir(ok ? "ok" : "erro")} />
        </MenuCartao>
      </DropdownMenu>
      {cor.janela}
      {det.janelas}
    </>
  );
}

/** O menu de três pontos de uma lista: exportar, copiar, nota e IA. */
export function MenuDeDados({ dados }: { dados: DadosExportaveis }) {
  return <MenuDoKpi dados={dados} titulo={dados.titulo} tipo="lista" />;
}
