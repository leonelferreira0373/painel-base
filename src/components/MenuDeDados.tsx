// O menu de três pontos (na vertical) dos cartões, dos KPIs e das listas: mudar a cor (a gama de todos os gráficos de uma vez, ou só a deste), exportar em qualquer formato, copiar os dados estruturados, deixar uma nota, perguntar à IA e investigar com a IA (a pesquisa a fundo). O resultado de copiar aparece no próprio botão (visto ou aviso), nunca num aviso flutuante. `ItensDeKpi` entra em qualquer menu de cartão; `MenuDoKpi` é o menu completo de um KPI; `MenuDeDados` é o das listas.
"use client";

import { Button, Dialog, DropdownMenu, Input, Tooltip } from "@cloudflare/kumo";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { registar } from "@/lib/atividade";
import { copiarEstruturado, estruturaDeTabela, type PayloadEstruturado } from "@/lib/copiar-dados";
import { abrirDados } from "@/lib/dados-da-pagina";
import { copiarImagem, type DadosExportaveis } from "@/lib/exportar-dados";
import { COR_DE_PARTIDA, CORES_DE_GRAFICO, corValida, definirCor, definirGama, ID_DA_GAMA, idDoGrafico, lerCores, useCorDoGrafico } from "@/lib/cores-graficos";
import { perguntarAIa } from "@/lib/ia-contexto";
import { abrirNota } from "@/lib/notas";
import { abrirAnalise } from "@/lib/pesquisa-profunda";
import { IconeMorfico, useResultadoTemporario } from "./Copiar";
import { MenuCartao, SeparadorDeMenu, SubMenuCartao } from "./Flutuantes";
import { Ic, ICONES } from "./Icones";
import { EscolhaDeCor } from "./SeletorDeCor";

// ---------- a cor ----------

type Escopo = "gama" | "grafico";

/** A janela de escolher outra cor (a gama inteira ou só um gráfico). O menu abre-a com `abrir`; `janela` põe-se ao lado do menu. */
export function useJanelaDeCor(idDaCor?: string): { abrir: (e: Escopo) => void; janela: ReactNode } {
  const [escopo, setEscopo] = useState<Escopo | null>(null);
  const [cor, , propria] = useCorDoGrafico(idDaCor);
  const [gama, setGama] = useState<string | undefined>(undefined);
  const [escrito, setEscrito] = useState("");
  useEffect(() => {
    if (escopo) setGama(lerCores()[ID_DA_GAMA]);
  }, [escopo]);
  const atual = escopo === "gama" ? (gama ?? COR_DE_PARTIDA) : (propria ?? cor ?? COR_DE_PARTIDA);
  useEffect(() => setEscrito(escopo ? atual : ""), [escopo]); // eslint-disable-line react-hooks/exhaustive-deps
  const aplicar = (hex: string) => {
    const h = hex.toLowerCase();
    if (escopo === "gama") {
      definirGama(h);
      setGama(h);
      registar("definicao", `Mudou a cor de todos os gráficos para ${h}`, { depois: h });
    } else if (idDaCor) {
      definirCor(idDaCor, h);
      registar("definicao", `Mudou a cor do gráfico ${idDaCor.split(":")[1] ?? ""} para ${h}`, { depois: h });
    }
    setEscrito(h);
  };
  const janela = (
    <Dialog.Root open={escopo !== null} onOpenChange={(v) => !v && setEscopo(null)}>
      <Dialog size="sm" className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold">{escopo === "gama" ? "Cor de todos os gráficos" : "Cor deste gráfico"}</Dialog.Title>
            <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
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
          <div className="flex justify-end">
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
            <SeparadorDeMenu />
            <DropdownMenu.Item icon={<Ic nome="repor" />} disabled={!propria && !cor} onClick={() => definirCor(idDaCor, null)}>
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
  aoOutraCor?: (e: Escopo) => void;
  /** Mostra o resultado de copiar (visto ou aviso) no botão do menu. */
  aoResultado: (ok: boolean) => void;
}

export function ItensDeKpi({ dados, estruturado, titulo, tipo = "cartao", idDaCor, aoOutraCor, aoResultado }: PropsDosItens) {
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
      {idDaCor && aoOutraCor && <ItensDeCor idDaCor={idDaCor} aoOutraCor={aoOutraCor} />}
      {dados && (
        <DropdownMenu.Item icon={<Ic nome="transferir" />} onClick={() => abrirDados("exportar", { nome: dados.nome, titulo: dados.titulo, dados })}>
          Exportar…
        </DropdownMenu.Item>
      )}
      <DropdownMenu.Item icon={<Ic nome="copiar" />} onClick={copiarDados}>
        Copiar dados
      </DropdownMenu.Item>
      {dados && (
        <DropdownMenu.Item icon={<Ic nome="imagem" />} onClick={async () => aoResultado(await copiarImagem(dados))}>
          Copiar como imagem
        </DropdownMenu.Item>
      )}
      <SeparadorDeMenu />
      <DropdownMenu.Item icon={<Ic nome="lembrete" />} onClick={() => abrirNota(alvoDeNota)}>
        Deixar nota
      </DropdownMenu.Item>
      <DropdownMenu.Item icon={<Ic nome="ia" />} onClick={() => perguntarAIa(`Explica-me ${tipo === "lista" ? "este quadro" : "este cartão"}: ${titulo}`, { contexto: { titulo, dados: paraIa(), pagina } })}>
        Perguntar à IA
      </DropdownMenu.Item>
      <DropdownMenu.Item icon={<Ic nome="lupa" />} onClick={() => abrirAnalise({ titulo, tipo, pagina, dados: paraIa() })}>
        Investigar com IA
      </DropdownMenu.Item>
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
export function MenuDoKpi(props: Omit<PropsDosItens, "aoResultado" | "aoOutraCor"> & { extra?: ReactNode }) {
  const [estado, definir] = useResultadoTemporario();
  const cor = useJanelaDeCor(props.idDaCor);
  const { extra, ...resto } = props;
  return (
    <>
      <DropdownMenu>
        <GatilhoDoMenu estado={estado} />
        <MenuCartao>
          {extra}
          <ItensDeKpi {...resto} aoOutraCor={cor.abrir} aoResultado={(ok) => definir(ok ? "ok" : "erro")} />
        </MenuCartao>
      </DropdownMenu>
      {cor.janela}
    </>
  );
}

/** O menu de três pontos de uma lista: exportar, copiar, nota e IA. */
export function MenuDeDados({ dados }: { dados: DadosExportaveis }) {
  return <MenuDoKpi dados={dados} titulo={dados.titulo} tipo="lista" />;
}
