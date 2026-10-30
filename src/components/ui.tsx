// Peças de página do painel (as mesmas proporções do painel da Cloudflare): contentor centrado, título com ações, cartão de métrica com menu de opções e cartão de painel.
"use client";

import { Button, DropdownMenu, LayerCard, Popover, Surface, Tooltip } from "@cloudflare/kumo";
import { IdDoGraficoProvider } from "./graficos/CorDoGrafico";
import { NumeroEmRoda } from "./NumeroEmRoda";
import { idDoGrafico, useCorDoGrafico } from "@/lib/cores-graficos";
import { variacaoDeSerie } from "@/lib/serie";
import { usePathname } from "next/navigation";
import { MenuCartao, PopupCartao, SubMenuCartao, SeparadorDeMenu } from "./Flutuantes";
import Link from "next/link";
import { createElement, type ComponentType, type ReactNode } from "react";
import { CorpoDica, Dica, DicaInfo } from "./Dica";
import { EsqueletoCartao } from "./Estados";
import { Ic, ICONES, type Icone } from "./Icones";
import { AreaMini } from "./graficos/Pequenos";
import { mesmoPeriodo, PERIODOS, type Periodo } from "./Periodo";
import { GatilhoDoMenu, ItensDeKpi, MenuDoKpi, useJanelaDeCor } from "./MenuDeDados";
import { useJanelasDoCartao } from "./DetalhesDoCartao";
import { IndicadorDeVariacao } from "./IndicadorDeVariacao";
import { useTemGrafico } from "@/lib/elementos-do-grafico";
import { IndicadorDeNotas } from "./notas/MotorDeNotas";
import { useResultadoTemporario } from "./Copiar";
import type { DadosExportaveis } from "@/lib/exportar-dados";
import { useEditar } from "@/lib/permissao";
import { T } from "@/dados/textos";

export function Pagina({ children, largo = false }: { children: ReactNode; largo?: boolean }) {
  return <div className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 ${largo ? "max-w-[1440px]" : "max-w-[1220px]"}`}>{children}</div>;
}

/** A marca de um ecrã em que a função ativa só pode ver. */
export function SoLeitura() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-kumo-subtle">
      <Ic nome="cadeado" tamanho={14} />
      {T.acesso.somenteLeitura}
    </span>
  );
}

export function Titulo({ titulo, children }: { titulo: string; children?: ReactNode }) {
  const editar = useEditar();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-semibold tracking-tight text-kumo-default">{titulo}</h1>
      {(children || !editar) && (
        <div className="sem-barra -mx-4 -my-1 grid auto-cols-[minmax(max-content,1fr)] grid-flow-col gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:my-0 sm:flex sm:overflow-visible sm:p-0 sm:items-center">
          {!editar && <SoLeitura />}
          {children}
        </div>
      )}
    </div>
  );
}

export function Secao({ titulo, acoes, children }: { titulo: string; acoes?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-kumo-default">{titulo}</h2>
        {acoes && <div className="flex items-center gap-2">{acoes}</div>}
      </div>
      {children}
    </section>
  );
}

/** Um ícone para um botão: o nome de um dos ícones do painel ou um componente SVG (por exemplo, do Lucide). */
export type IconeDeBotao = keyof typeof ICONES | ComponentType<{ className?: string }>;
const iconeDe = (i: IconeDeBotao): ReactNode | (typeof ICONES)[keyof typeof ICONES] => (typeof i === "string" ? ICONES[i] : createElement(i));

/** Como se vê um botão de ícone ligado (negrito ativo, menu aberto): um fundo suave, nunca uma caixa com contorno. */
export const BOTAO_LIGADO = "!bg-black/[0.09] dark:!bg-white/15";
/** Todo o botão de ícone responde ao rato e ao dedo: o fundo muda ao passar e ao premir encolhe um pouco. */
const RESPOSTA = "transition-[background-color,transform] duration-100 active:scale-90";

/** Botão só com ícone e dica ao passar o rato, como os botões de ícone do painel da Cloudflare. `ligado` pinta-o como ativo (fundo suave). */
export function BotaoIcone({ dica, icone, aoClicar, tamanho = "base", variante = "ghost", desativado = false, ligado = false, className = "" }: { dica: string; icone: IconeDeBotao; aoClicar?: () => void; tamanho?: "xs" | "sm" | "base"; variante?: "ghost" | "secondary"; desativado?: boolean; ligado?: boolean; className?: string }) {
  const botao = <Button variant={variante} shape="square" size={tamanho} icon={iconeDe(icone)} aria-label={dica} aria-pressed={ligado || undefined} onClick={aoClicar} disabled={desativado} className={`${RESPOSTA} ${ligado ? BOTAO_LIGADO : ""} ${className}`} />;
  // um botão desativado não recebe o rato: a dica fica no invólucro
  return desativado ? (
    <Tooltip content={dica} render={<span className="inline-flex" />}>
      {botao}
    </Tooltip>
  ) : (
    <Tooltip content={dica} render={botao} />
  );
}

/** Um botão só com ícone (e dica) que abre um menu de itens; `ativo` pinta-o como ligado e fica com o mesmo fundo enquanto o menu está aberto. */
export function MenuDeIcone({ dica, icone, ativo = false, tamanho = "sm", className = "", children }: { dica: string; icone: IconeDeBotao; ativo?: boolean; tamanho?: "xs" | "sm" | "base"; className?: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <Tooltip content={dica} render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size={tamanho} icon={iconeDe(icone)} aria-label={dica} className={`${RESPOSTA} data-[popup-open]:${BOTAO_LIGADO.replace(" dark:!", " dark:data-[popup-open]:!").replace("!bg", "!bg")} ${ativo ? BOTAO_LIGADO : ""} ${className}`} />} />} />
      <MenuCartao>{children}</MenuCartao>
    </DropdownMenu>
  );
}

/** Um botão só com ícone (e dica) que abre um cartão com o que lá se pôr (um campo, uma paleta). */
export function CartaoDeIcone({ dica, icone, ativo = false, tamanho = "sm", largura = "w-[232px]", className = "", children }: { dica: string; icone: IconeDeBotao; ativo?: boolean; tamanho?: "xs" | "sm" | "base"; largura?: string; className?: string; children: ReactNode }) {
  return (
    <Popover.Root>
      <Tooltip content={dica} render={<Popover.Trigger render={<Button variant="ghost" shape="square" size={tamanho} icon={iconeDe(icone)} aria-label={dica} className={`${RESPOSTA} data-[popup-open]:!bg-black/[0.09] dark:data-[popup-open]:!bg-white/15 ${ativo ? BOTAO_LIGADO : ""} ${className}`} />} />} />
      <PopupCartao alinhar="start" className={`${largura} p-3`}>
        {children}
      </PopupCartao>
    </Popover.Root>
  );
}

export type TipoCartao = "serie" | "colunas" | "rosca";
export const TIPOS_CARTAO: { id: TipoCartao; rotulo: string; icone: Icone }[] = [
  { id: "serie", rotulo: "Série temporal", icone: "serie" },
  { id: "colunas", rotulo: "Colunas", icone: "grafico" },
  { id: "rosca", rotulo: "Rosca", icone: "rosca" },
];

/** Cartão com o aspeto das métricas da página inicial da Cloudflare: título pequeno com menu de opções, número grande, variação e gráfico. */
export function CartaoMetrica({
  titulo,
  valor,
  variacao,
  variacaoDica,
  dica,
  children,
  className = "",
  href,
  aoAtualizar,
  aoRemover,
  periodo,
  aoMudarPeriodo,
  tipo,
  aoMudarTipo,
  exportar,
  carregando = false,
  alturaEsqueleto = 110,
  anel = false,
}: {
  titulo: string;
  valor?: string;
  variacao?: number | null;
  /** Explica a variação: com que período se compara e os valores. */
  variacaoDica?: string;
  /** Explica o que o cartão mede; aparece como «i» ao lado do título. */
  dica?: string;
  children?: ReactNode;
  className?: string;
  href?: string;
  aoAtualizar?: () => void;
  aoRemover?: () => void;
  /** Período do próprio cartão; com `aoMudarPeriodo` o menu ganha a lista de períodos. */
  periodo?: Periodo;
  aoMudarPeriodo?: (p: Periodo) => void;
  /** Tipo de gráfico do cartão; com `aoMudarTipo` o menu ganha «Visualizar como». */
  tipo?: TipoCartao;
  aoMudarTipo?: (t: TipoCartao) => void;
  /** Os dados do cartão; com eles o menu ganha «Exportar» (CSV, JSON e copiar como imagem). */
  exportar?: DadosExportaveis;
  carregando?: boolean;
  alturaEsqueleto?: number;
  anel?: boolean;
}) {
  const temPeriodo = !!(periodo && aoMudarPeriodo);
  const temTipo = !!(tipo && aoMudarTipo);
  const temMenu = true;
  const [copia, definirCopia] = useResultadoTemporario();
  const paginaDoCartao = usePathname() ?? "";
  const idDaCor = idDoGrafico(paginaDoCartao, titulo);
  const cor = useJanelaDeCor(idDaCor);
  const det = useJanelasDoCartao(idDaCor, titulo);
  const tipoAtual = TIPOS_CARTAO.find((t) => t.id === tipo);
  return (
    <Surface className={`pleno group/cartao flex min-w-0 flex-col gap-1 rounded-xl p-4 ${className}`}>
      <div className="flex h-5 items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-kumo-subtle">
          {titulo}
          {dica && <DicaInfo titulo={titulo} texto={dica} />}
        </span>
        {temMenu && <IndicadorDeNotas alvo={{ tipo: "kpi", chave: idDaCor, rotulo: titulo, pagina: paginaDoCartao }} />}
        {temMenu && (
          <DropdownMenu>
            <GatilhoDoMenu estado={copia} />
            <MenuCartao>
              {href && (
                <DropdownMenu.LinkItem href={href} icon={<Ic nome="olho" />} render={<Link href={href} />}>
                  {det.aoVerDetalhes ? "Abrir a página" : "Ver detalhes"}
                </DropdownMenu.LinkItem>
              )}
              {aoAtualizar && (
                <DropdownMenu.Item icon={<Ic nome="atualizar" />} onClick={aoAtualizar}>
                  Atualizar
                </DropdownMenu.Item>
              )}
              {temPeriodo && (
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger icon={<Ic nome="calendario" />}>{periodo!.rotulo}</DropdownMenu.SubTrigger>
                  <SubMenuCartao>
                    {PERIODOS.map((p) => (
                      <DropdownMenu.Item key={p.rotulo} selected={mesmoPeriodo(p, periodo!)} onClick={() => aoMudarPeriodo!(p)}>
                        {p.rotulo}
                      </DropdownMenu.Item>
                    ))}
                  </SubMenuCartao>
                </DropdownMenu.Sub>
              )}
              {temTipo && (
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger icon={<Ic nome={tipoAtual?.icone ?? "serie"} />}>Visualizar como</DropdownMenu.SubTrigger>
                  <SubMenuCartao>
                    {TIPOS_CARTAO.map((t) => (
                      <DropdownMenu.Item key={t.id} icon={<Ic nome={t.icone} />} selected={t.id === tipo} onClick={() => aoMudarTipo!(t.id)}>
                        {t.rotulo}
                      </DropdownMenu.Item>
                    ))}
                  </SubMenuCartao>
                </DropdownMenu.Sub>
              )}
              <ItensDeKpi dados={exportar} titulo={titulo} idDaCor={idDaCor} aoOutraCor={cor.abrir} aoVerDetalhes={det.aoVerDetalhes} aoVerMapa={det.aoVerMapa} aoResultado={(ok) => definirCopia(ok ? "ok" : "erro")} estruturado={valor !== undefined ? { dados: { indicador: titulo, valor, variacao: variacao ?? null } } : undefined} />
              {aoRemover && (
                <>
                  <SeparadorDeMenu />
                  <DropdownMenu.Item icon={<Ic nome="lixo" />} variant="danger" onClick={aoRemover}>
                    Remover
                  </DropdownMenu.Item>
                </>
              )}
            </MenuCartao>
          </DropdownMenu>
        )}
        {cor.janela}
        {det.janelas}
      </div>
      {carregando ? (
        <EsqueletoCartao altura={alturaEsqueleto} anel={anel} />
      ) : (
        <>
          {valor !== undefined && (
            <div className="flex items-baseline gap-2">
              <NumeroEmRoda valor={valor} className="text-2xl font-semibold tabular-nums tracking-tight text-kumo-default" />
              {variacao !== null && variacao !== undefined && Number.isFinite(variacao) && (
                <Dica conteudo={variacaoDica ? <CorpoDica texto={variacaoDica} /> : null}>
                  <IndicadorDeVariacao variacao={variacao} />
                </Dica>
              )}
            </div>
          )}
          <IdDoGraficoProvider titulo={titulo}>{children}</IdDoGraficoProvider>
        </>
      )}
    </Surface>
  );
}

export function Painel({ titulo, children, acoes, className = "", dados, semCor = false }: { titulo: string; /** O gráfico do painel não se pinta elemento a elemento (um mapa). */ semCor?: boolean; children: ReactNode; acoes?: ReactNode; className?: string; /** Os dados do painel, em tabela: dão-lhe «Exportar» e «Copiar» no menu. */ dados?: DadosExportaveis }) {
  const pagina = usePathname() ?? "";
  const idDaCor = idDoGrafico(pagina, titulo);
  // um painel com um gráfico tem o menu de três pontinhos dos cartões (cor de cada elemento, nota, IA); um painel só com texto ou listas fica como estava
  const temGrafico = useTemGrafico(idDaCor);
  return (
    <LayerCard className={`pleno min-w-0 ${className}`}>
      <LayerCard.Secondary className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{titulo}</h3>
        <span className="flex shrink-0 items-center gap-1">
          {acoes}
          {(temGrafico || dados) && <MenuDoKpi titulo={titulo} dados={dados} tipo="cartao" idDaCor={temGrafico ? idDaCor : undefined} semCor={semCor} />}
        </span>
      </LayerCard.Secondary>
      <LayerCard.Primary className="p-4">
        <IdDoGraficoProvider titulo={titulo}>{children}</IdDoGraficoProvider>
      </LayerCard.Primary>
    </LayerCard>
  );
}

/** O KPI como tabela para exportar: a série (se há) ou só o valor. */
function dadosDoKpi(titulo: string, valor: string, variacao: number | null, valores: number[]): DadosExportaveis {
  const nome = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "kpi";
  if (valores.length >= 2) return { nome, titulo: `${titulo}: ${valor}`, colunas: ["Posição", "Valor"], linhas: valores.map((v, i) => [i + 1, v]) };
  return { nome, titulo, colunas: ["Indicador", "Valor", "Variação (%)"], linhas: [[titulo, valor, variacao !== null && Number.isFinite(variacao) ? variacao : ""]] };
}

/** Cartão de estatística da análise, como os da Cloudflare: título pequeno, número grande, variação face ao período anterior e, por baixo, o gráfico de área de ponta a ponta. A variação mostra-se sem abrir nada; `pior` marca as estatísticas em que subir é mau. */
export function CartaoEstatistica({ titulo, valor, variacao: variacaoDada, pior = false, dica, valores, carregando = false }: { titulo: string; valor: string; /** Em percentagem; sem ela, calcula-se da própria série (a média dos últimos valores face à dos anteriores); `null` esconde-a. */ variacao?: number | null; pior?: boolean; dica?: string; valores: number[]; carregando?: boolean }) {
  const pagina = usePathname() ?? "";
  const idDaCor = idDoGrafico(pagina, titulo);
  const [cor] = useCorDoGrafico(idDaCor);
  const calculada = variacaoDada === undefined ? variacaoDeSerie(valores) : null;
  const variacao = variacaoDada !== undefined ? variacaoDada : (calculada?.variacao ?? null);
  // sem série para desenhar o cartão fica só com o número, sem um vazio por baixo
  const comGrafico = carregando || valores.length >= 2;
  return (
    <div className={`pleno group/grafico relative flex ${comGrafico ? "h-32" : "h-auto pb-3"} min-h-0 min-w-0 flex-col overflow-hidden rounded-lg bg-kumo-base ring ring-kumo-line transition-colors hover:ring-kumo-fill`}>
      <div className="flex items-start gap-3 px-4 pb-0.5 pt-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-kumo-subtle">
          <span className="truncate">{titulo}</span>
          {dica && <DicaInfo titulo={titulo} texto={dica} />}
        </span>
        {!carregando && (
          <span className="-mr-2 -mt-1.5 ml-auto flex shrink-0 items-center gap-1">
            <IndicadorDeNotas alvo={{ tipo: "kpi", chave: idDaCor, rotulo: titulo, pagina }} />
            <MenuDoKpi
              titulo={titulo}
              idDaCor={valores.length >= 2 ? idDaCor : undefined}
              dados={dadosDoKpi(titulo, valor, variacao, valores)}
              estruturado={{ dados: { indicador: titulo, valor, variacao: variacao !== null && Number.isFinite(variacao) ? variacao : null, serie: valores } }}
            />
          </span>
        )}
      </div>
      {carregando ? (
        <div className="px-4 pt-1">
          <EsqueletoCartao altura={60} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-0.5">
          <div className="flex items-baseline gap-2">
            <NumeroEmRoda valor={valor} className="text-2xl font-semibold leading-tight tabular-nums text-kumo-default" />
            {variacao !== null && Number.isFinite(variacao) && (
              <Dica conteudo={calculada ? `Variação: a média dos últimos ${calculada.n} valores face à dos ${calculada.n} anteriores.` : "Variação face ao período anterior com a mesma duração."}>
                <IndicadorDeVariacao variacao={variacao} pior={pior} tamanho="text-sm" valor={(texto) => <NumeroEmRoda valor={texto} />} />
              </Dica>
            )}
          </div>
          {valores.length >= 2 && (
            <div className="-mx-4 mt-1.5 min-h-10 flex-1">
              <AreaMini valores={valores} altura={60} cor={cor} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Separadores de uma página (Pedidos, Desempenho…), como a lista de separadores da Cloudflare: fundo rebaixado e o separador escolhido em branco, com anel e sombra. */
export function Separadores({ itens, valor, aoMudar }: { itens: readonly { id: string; rotulo: string }[]; valor: string; aoMudar: (id: string) => void }) {
  return (
    <div role="tablist" className="sem-barra flex h-9 min-w-0 shrink items-stretch overflow-x-auto rounded-lg bg-kumo-recessed px-0.5">
      {itens.map((i) => (
        <button key={i.id} role="tab" aria-selected={i.id === valor} onClick={() => aoMudar(i.id)} className={`my-0.5 flex items-center whitespace-nowrap rounded-md px-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kumo-brand ${i.id === valor ? "bg-kumo-base text-kumo-default shadow-sm ring ring-kumo-line" : "text-kumo-subtle hover:text-kumo-default"}`}>
          {i.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Legenda de um gráfico com o valor de cada série (como «TCP handshake 94 ms» nos gráficos da Cloudflare). */
export function LegendaValores({ itens }: { itens: { nome: string; cor: string; valor: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
      {itens.map((i) => (
        <span key={i.nome} className="inline-flex items-center gap-1.5 text-kumo-subtle">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: i.cor }} />
          {i.nome}
          <b className="font-semibold tabular-nums text-kumo-default">{i.valor}</b>
        </span>
      ))}
    </div>
  );
}
