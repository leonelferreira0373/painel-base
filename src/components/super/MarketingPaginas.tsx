// Os ecrãs de marketing que não são uma lista simples: a visão geral (visitas, de onde vieram, páginas quentes e botões mais clicados), o construtor de campanhas (ligações com UTM) e o rastreio (o script para pôr no site, o contrato de eventos e um teste). As origens, as páginas e os cliques em tabela são módulos de registos.
"use client";

import { Button } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { gerarCliques, gerarOrigens, gerarPaginas, gerarPublico, gerarResumoMarketing, type Clique, type Origem, type PaginaQuente, type PublicoDeMarketing, type ResumoMarketing } from "@/dados/super-dados";
import { NOMES_DE_PAISES } from "@/dados/paises";
import { paisNoMapa } from "@/lib/detalhes-do-grafico";
import { GraficoMapa } from "../graficos/GraficoMapa";
import { estruturaDeRegisto } from "@/lib/copiar-dados";
import { chamar, useApi, useLigacao } from "@/lib/api/cliente";
import { endpointPorId } from "@/lib/api/contrato";
import { identificador } from "@/lib/conta";
import { analisarContactos, ESTADOS_DE_CONTACTO, metricasDeContactos, ORDEM_DOS_ESTADOS } from "@/lib/email-contactos";
import { eRota, frasaDaRota, textoDaRota } from "@/lib/rotas";
import { erroDoUtm, montarUrlUtm, origemDoVisitante, taxaDeConversao, type ParametrosUtm } from "@/lib/marketing";
import { ESCOLHAS_VAZIAS, faltaEscolher, FONTES_DE_CAMPANHA, MEIOS_DE_CAMPANHA, meioHabitual, normalizarPagina, normalizarSite, OBJETIVOS_DE_CAMPANHA, parametrosDeCampanha, periodosDeCampanha, SEM_DATA, VARIANTES_DE_CAMPANHA, type EscolhasDeCampanha } from "@/lib/campanhas";
import { useEditar } from "@/lib/permissao";
import { Cartao, Confirmar, EscolhaDeOpcoes, Linha, Seccao } from "../conta/Pecas";
import { Frase, Rota } from "../Frase";
import { BotaoCopiar } from "../Copiar";
import { Grafico, RegistoDoGrafico } from "../graficos/Graficos";
import { GrelhaOrdenavel } from "../GrelhaOrdenavel";
import { ICONES } from "../Icones";
import { LinhaOrdenada } from "../LinhaOrdenada";
import { CartaoEstatistica, Painel, Pagina, Titulo } from "../ui";
import { Vazio } from "../conteudo/ConteudoPecas";
import { useAgora, useEmails } from "./EmailPecas";
import { AvisoDeApi, dataCurta, Estatistica, inteiro, percentagem, TabelaSimples, useGuardado, useTick } from "./SuperPecas";

// ---------- visão geral ----------

/** O estado das pessoas que escrevem ou a quem se escreve (urgente, quente, lead, atendido…), tirado das mensagens: a rosca por estado e os números que dizem como se atende. */
function EstadoDosContactos() {
  const emails = useEmails();
  const agora = useAgora();
  const m = useMemo(() => (agora ? metricasDeContactos(analisarContactos(emails.itens, agora), emails.itens) : null), [emails.itens, agora]);
  if (!m) return <div className="min-h-40 text-sm text-kumo-subtle">A ler as mensagens…</div>;
  if (m.contactos === 0) return <span className="text-sm text-kumo-subtle">Ainda não há mensagens.</span>;
  const pontos = ORDEM_DOS_ESTADOS.filter((s) => m.porEstado[s] > 0).map((s) => ({ chave: s, rotulo: ESTADOS_DE_CONTACTO[s].rotulo, valor: m.porEstado[s], n: m.porEstado[s] }));
  const horas = m.horasAteResponder;
  return (
    <div className="flex flex-col gap-3">
      <Grafico spec={{ tipo: "rosca", pontos }} altura={180} />
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-kumo-subtle">Taxa de resposta</dt>
          <dd className="font-semibold tabular-nums">{Math.round(m.taxaDeResposta * 100)} %</dd>
        </div>
        <div>
          <dt className="text-xs text-kumo-subtle">Até responder</dt>
          <dd className="font-semibold tabular-nums">{horas === null ? "—" : horas < 1 ? "< 1 h" : horas < 48 ? `${Math.round(horas)} h` : `${Math.round(horas / 24)} dias`}</dd>
        </div>
        <div>
          <dt className="text-xs text-kumo-subtle">Mensagens por pessoa</dt>
          <dd className="font-semibold tabular-nums">{m.mensagensPorContacto.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}</dd>
        </div>
      </dl>
    </div>
  );
}

export function MarketingVisao() {
  const resumo = useApi<ResumoMarketing>("/v1/marketing/resumo", () => gerarResumoMarketing());
  const origens = useApi<{ itens: Origem[] }>("/v1/marketing/origens", () => ({ itens: gerarOrigens() }));
  const paginas = useApi<{ itens: PaginaQuente[] }>("/v1/marketing/paginas", () => ({ itens: gerarPaginas() }));
  const cliques = useApi<{ itens: Clique[] }>("/v1/marketing/cliques", () => ({ itens: gerarCliques() }));
  const publico = useApi<PublicoDeMarketing>("/v1/marketing/publico", () => gerarPublico());
  const r = resumo.dados;
  const p = publico.dados;
  // o mapa pinta os países (o nome que o mapa usa); a lista ao lado diz quantas visitas e que parte do total
  const paises = useMemo(() => [...(p?.paises ?? [])].sort((a, b) => b.visitas - a.visitas), [p]);
  const totalDePaises = paises.reduce((s, x) => s + x.visitas, 0);
  const dadosDoMapa = paises.flatMap((x) => {
    const nome = paisNoMapa(x.pais);
    return nome ? [{ nome, valor: x.visitas }] : [];
  });
  const totalDeDispositivos = (p?.dispositivos ?? []).reduce((s, x) => s + x.visitas, 0);
  const serie = r?.porDia.map((d) => d.visitas) ?? [];
  // os outros cartões usam o mesmo número de cada dia, se o servidor o disser
  const doDia = (campo: "visitantes" | "paginasPorVisita" | "rejeicao" | "conversoes", escala = 1) => (r && r.porDia.length > 1 && r.porDia.every((d) => d[campo] !== undefined) ? r.porDia.map((d) => (d[campo] as number) * escala) : undefined);
  const porFonte = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of origens.dados?.itens ?? []) m.set(o.fonte, (m.get(o.fonte) ?? 0) + o.visitas);
    return [...m].map(([fonte, visitas]) => ({ fonte, visitas })).sort((a, b) => b.visitas - a.visitas).slice(0, 6);
  }, [origens.dados]);
  const quentes = [...(paginas.dados?.itens ?? [])].sort((a, b) => b.visitas - a.visitas).slice(0, 6);
  const topCliques = [...(cliques.dados?.itens ?? [])].sort((a, b) => b.cliques - a.cliques).slice(0, 6);
  // visitantes neste momento: uma oscilação em volta de um valor, a cada 3 segundos (em modo ligado, o servidor diria o número verdadeiro)
  const t = useTick(3000);
  const agora = 14 + Math.round(Math.sin(t / 2) * 4 + Math.cos(t / 3.3) * 3);
  return (
    <Pagina>
      <Titulo titulo="Marketing" />
      <AvisoDeApi erro={resumo.erro ?? origens.erro ?? paginas.erro ?? cliques.erro ?? publico.erro} aoTentar={() => (resumo.recarregar(), origens.recarregar(), paginas.recarregar(), cliques.recarregar(), publico.recarregar())} />
      {r && (
        <>
          <GrelhaOrdenavel
            chave="marketing-visao"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
            itens={[
              { id: "visitas", conteudo: <CartaoEstatistica titulo="Visitas" valor={inteiro(r.visitas)} valores={serie} dica="Cada vez que alguém abre o site conta uma visita (uma sessão)." /> },
              { id: "visitantes", conteudo: <Estatistica titulo="Visitantes" valor={inteiro(r.visitantes)} dica="Pessoas diferentes (o mesmo aparelho só conta uma vez)." numero={r.visitantes} serie={doDia("visitantes")} /> },
              { id: "paginas", conteudo: <Estatistica titulo="Páginas por visita" valor={r.paginasPorVisita.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} dica="Quantas páginas se veem, em média, em cada visita." numero={r.paginasPorVisita} serie={doDia("paginasPorVisita")} /> },
              { id: "rejeicao", conteudo: <Estatistica titulo="Taxa de rejeição" valor={percentagem(r.rejeicao)} pior dica="Visitas que saíram sem ver mais nenhuma página." numero={r.rejeicao * 100} serie={doDia("rejeicao", 100)} /> },
              { id: "conversoes", conteudo: <Estatistica titulo="Conversões" valor={inteiro(r.conversoes)} dica="Pedidos de proposta, contactos e outros objetivos cumpridos." numero={r.conversoes} serie={doDia("conversoes")} /> },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <Painel titulo="Visitas por dia" className="lg:col-span-2">
              <Grafico spec={{ tipo: "linha", pontos: r.porDia.map((d) => ({ chave: d.data, rotulo: dataCurta(d.data), valor: d.visitas, n: 1 })) }} altura={220} />
            </Painel>
            <Painel titulo="Agora no site">
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-semibold tabular-nums" aria-live="polite">
                  {agora}
                </span>
                <span className="inline-flex items-center gap-2 text-sm text-kumo-subtle">
                  <span aria-hidden className="size-2 animate-pulse rounded-full bg-kumo-success" />
                  visitantes neste momento
                </span>
              </div>
            </Painel>
            <Painel titulo="Visitantes por país" className="lg:col-span-3" semCor dados={{ nome: "visitantes-por-pais", titulo: "Visitantes por país", colunas: ["País", "Visitas"], linhas: paises.map((x) => [x.pais, x.visitas]) }}>
              <RegistoDoGrafico spec={{ tipo: "barras", pontos: paises.map((x) => ({ chave: x.pais, rotulo: x.pais, valor: x.visitas, n: x.visitas })) }} />
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <div className="min-w-0 overflow-hidden rounded-lg">
                  <GraficoMapa dados={dadosDoMapa} nomes={NOMES_DE_PAISES} unidade="visitas" altura={320} />
                </div>
                <div className="flex min-w-0 flex-col">
                  {paises.slice(0, 8).map((x) => (
                    <LinhaOrdenada key={x.pais} larguraDoValor="min-w-28" nome={x.pais} valor={`${inteiro(x.visitas)} · ${percentagem(totalDePaises ? x.visitas / totalDePaises : 0)}`} proporcao={(x.visitas / Math.max(1, paises[0].visitas)) * 100} />
                  ))}
                </div>
              </div>
            </Painel>
            <Painel titulo="Aparelhos">
              <Grafico spec={{ tipo: "rosca", pontos: (p?.dispositivos ?? []).map((d) => ({ chave: d.tipo, rotulo: d.tipo, valor: d.visitas, n: d.visitas })) }} altura={200} />
              <p className="mt-2 text-sm text-kumo-subtle">{totalDeDispositivos ? `${percentagem((p?.dispositivos[0]?.visitas ?? 0) / totalDeDispositivos)} das visitas vêm de ${(p?.dispositivos[0]?.tipo ?? "").toLowerCase()}.` : ""}</p>
            </Painel>
            <Painel titulo="Horas de maior movimento" className="lg:col-span-2">
              <Grafico spec={{ tipo: "colunas", pontos: (p?.horas ?? []).map((h) => ({ chave: `${h.hora}`, rotulo: `${String(h.hora).padStart(2, "0")}h`, valor: h.visitas, n: h.visitas })) }} altura={220} />
            </Painel>
            <Painel titulo="Do primeiro clique ao pedido">
              <Grafico spec={{ tipo: "barras", pontos: (p?.funil ?? []).map((f) => ({ chave: f.etapa, rotulo: f.etapa, valor: f.visitantes, n: f.visitantes })) }} altura={200} />
            </Painel>
            <Painel titulo="De onde vieram">
              {porFonte.map((f) => (
                <LinhaOrdenada key={f.fonte} nome={f.fonte} valor={inteiro(f.visitas)} proporcao={(f.visitas / Math.max(1, porFonte[0].visitas)) * 100} />
              ))}
            </Painel>
            <Painel titulo="Páginas quentes">
              {quentes.map((p) => (
                <LinhaOrdenada key={p.pagina} nome={textoDaRota(p.pagina)} conteudo={<Rota caminho={p.pagina} />} copiar={p.pagina} valor={inteiro(p.visitas)} proporcao={(p.visitas / Math.max(1, quentes[0].visitas)) * 100} />
              ))}
            </Painel>
            <Painel titulo="Contactos de e-mail">
              <EstadoDosContactos />
            </Painel>
            <Painel titulo="Botões mais clicados">
              {topCliques.map((c) => (
                <LinhaOrdenada key={`${c.elemento}${c.pagina}`} nome={`${textoDaRota(c.pagina)} › ${c.elemento}`} conteudo={<Frase>{`${frasaDaRota(c.pagina)} > «${c.elemento}»`}</Frase>} copiar={c.elemento} valor={inteiro(c.cliques)} proporcao={(c.cliques / Math.max(1, topCliques[0].cliques)) * 100} />
              ))}
            </Painel>
          </div>
        </>
      )}
    </Pagina>
  );
}

/** A taxa de conversão de cada origem, para os registos usarem a mesma conta. */
export { taxaDeConversao };

// ---------- campanhas (construtor de ligações com UTM) ----------

interface Campanha extends ParametrosUtm {
  id: string;
  criada: string;
}

/** O que a pessoa já escolheu (para só mostrar o que falta quando já começou). */
const comecou = (e: EscolhasDeCampanha) => !!(e.pagina || e.fonte || e.meio || e.objetivo);

export function Campanhas() {
  const [lista, setLista] = useGuardado<Campanha[]>("campanhas-utm", []);
  const [sites, setSites, sitesLidos] = useGuardado<string[]>("campanhas-sites", []);
  const paginas = useApi<{ itens: PaginaQuente[] }>("/v1/marketing/paginas", () => ({ itens: gerarPaginas() }));
  const agora = useAgora();
  const [e, setE] = useState<EscolhasDeCampanha>(ESCOLHAS_VAZIAS);
  const [apagar, setApagar] = useState<Campanha | null>(null);
  const editar = useEditar();
  const periodos = useMemo(() => (agora ? periodosDeCampanha(agora) : [SEM_DATA]), [agora?.getMonth(), agora?.getFullYear()]); // eslint-disable-line react-hooks/exhaustive-deps
  const caminhos = useMemo(() => [...(paginas.dados?.itens ?? [])].sort((a, b) => b.visitas - a.visitas).map((p) => p.pagina), [paginas.dados]);
  // o site (o do painel, na primeira vez) e o mês de hoje já vêm escolhidos: é o que quase toda a gente quer
  useEffect(() => {
    if (sitesLidos && sites.length === 0) setSites([window.location.origin]);
  }, [sitesLidos, sites.length, setSites]);
  useEffect(() => {
    setE((x) => (x.site || !sites[0] ? x : { ...x, site: sites[0] }));
  }, [sites]);
  useEffect(() => {
    setE((x) => (x.periodo || !agora ? x : { ...x, periodo: periodos[0] }));
  }, [agora, periodos]);

  const falta = faltaEscolher(e);
  const parametros = parametrosDeCampanha(e);
  const erro = parametros ? erroDoUtm(parametros) : null;
  const ligacao = parametros && !erro ? montarUrlUtm(parametros) : null;
  const guardar = () => {
    if (!parametros || erro) return;
    setLista((l) => [{ ...parametros, id: identificador(), criada: new Date().toISOString() }, ...l]);
    setE({ ...ESCOLHAS_VAZIAS, site: e.site, periodo: e.periodo });
  };
  return (
    <Pagina>
      <Titulo titulo="Campanhas" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Nova ligação rastreada" dica="Escolha uma opção em cada passo ou carregue em «Personalizar» para escrever a sua. Os nomes ficam sempre certos para os relatórios (minúsculas, sem acentos nem espaços), por isso não precisa de saber nada de UTM.">
          <div className="flex flex-col gap-5 p-4">
            <Seccao titulo="Site">
              <EscolhaDeOpcoes
                rotulo="Site"
                opcoes={sites}
                valor={e.site ? [e.site] : []}
                placeholder="exemplo.pt"
                renderizar={(s) => s.replace(/^https?:\/\//, "")}
                aoMudar={(v) => {
                  const s = normalizarSite(v[0] ?? "");
                  if (s && !sites.includes(s)) setSites([...sites, s]);
                  setE({ ...e, site: s });
                }}
              />
            </Seccao>
            <Seccao titulo="Página">
              <EscolhaDeOpcoes rotulo="Página" opcoes={caminhos} valor={e.pagina ? [e.pagina] : []} placeholder="/pagina ou endereço completo" renderizar={(p) => (eRota(p) ? <Frase>{frasaDaRota(p)}</Frase> : p)} aoMudar={(v) => setE({ ...e, pagina: normalizarPagina(v[0] ?? "") })} />
            </Seccao>
            <Seccao titulo="Onde vai aparecer">
              <EscolhaDeOpcoes
                rotulo="Onde vai aparecer"
                opcoes={FONTES_DE_CAMPANHA.map((f) => f.rotulo)}
                valor={e.fonte ? [e.fonte] : []}
                placeholder="Rádio, parceiro, evento…"
                aoMudar={(v) => {
                  const fonte = v[0] ?? "";
                  // o tipo de divulgação que costuma ir com a fonte fica já escolhido, a menos que a pessoa tenha escolhido outro
                  const meio = !e.meio || e.meio === meioHabitual(e.fonte) ? meioHabitual(fonte) : e.meio;
                  setE({ ...e, fonte, meio });
                }}
              />
            </Seccao>
            <Seccao titulo="Tipo de divulgação">
              <EscolhaDeOpcoes rotulo="Tipo de divulgação" opcoes={MEIOS_DE_CAMPANHA.map((m) => m.rotulo)} valor={e.meio ? [e.meio] : []} placeholder="Spot de rádio, flyer…" aoMudar={(v) => setE({ ...e, meio: v[0] ?? "" })} />
            </Seccao>
            <Seccao titulo="Para quê">
              <EscolhaDeOpcoes rotulo="Para quê" opcoes={OBJETIVOS_DE_CAMPANHA} valor={e.objetivo ? [e.objetivo] : []} placeholder="Dia do cliente, feira…" aoMudar={(v) => setE({ ...e, objetivo: v[0] ?? "" })} />
            </Seccao>
            <Seccao titulo="Quando">
              <EscolhaDeOpcoes rotulo="Quando" opcoes={periodos} valor={e.periodo ? [e.periodo] : []} placeholder="Verão 2027…" aoMudar={(v) => setE({ ...e, periodo: v[0] ?? "" })} />
            </Seccao>
            <Seccao titulo="Versão da mensagem (opcional)">
              <EscolhaDeOpcoes rotulo="Versão da mensagem" opcoes={VARIANTES_DE_CAMPANHA} valor={e.variante ? [e.variante] : []} placeholder="Botão verde, cartaz A3…" aoMudar={(v) => setE({ ...e, variante: v[0] ?? "" })} />
            </Seccao>
            <Seccao titulo="Palavra-chave (opcional)">
              <EscolhaDeOpcoes rotulo="Palavra-chave" opcoes={[]} valor={e.palavra ? [e.palavra] : []} placeholder="transporte marítimo" aoMudar={(v) => setE({ ...e, palavra: v[0] ?? "" })} />
            </Seccao>
            {erro ? <span className="text-sm text-kumo-danger">{erro}</span> : comecou(e) && falta.length > 0 ? <span className="text-sm text-kumo-subtle">Falta escolher: {falta.join(", ")}.</span> : null}
            <div className="rounded-lg bg-kumo-tint p-3 text-xs break-all" aria-label="Ligação gerada">
              {ligacao ?? "A ligação aparece aqui quando tudo estiver escolhido."}
            </div>
            <div className="flex flex-wrap gap-2">
              {ligacao && <BotaoCopiar texto={ligacao} rotulo="Copiar a ligação" dica="Copiar a ligação" />}
              {editar && (
                <Button variant="primary" icon={ICONES.guardar} disabled={!ligacao} onClick={guardar}>
                  Guardar na lista
                </Button>
              )}
            </div>
          </div>
        </Cartao>
        <Cartao titulo={`Ligações guardadas (${lista.length})`}>
          {lista.length === 0 ? (
            <Vazio icone="link" titulo="Ainda não guardou nenhuma" texto="Escolha as opções e guarde a ligação para a ter sempre à mão." />
          ) : (
            lista.map((c) => (
              <Linha key={c.id} titulo={<span className="truncate font-medium">{c.campanha}</span>} estado={`${c.fonte} / ${c.meio} · ${c.url.replace(/^https?:\/\//, "")}`}>
                <div className="flex items-center gap-1">
                  <BotaoCopiar texto={montarUrlUtm(c)} estruturado={estruturaDeRegisto(`Campanha ${c.campanha}`, { ...c, ligacao: montarUrlUtm(c) }, "/marketing/campanhas/")} tamanho="sm" variante="ghost" quadrado dica="Copiar os dados da campanha" />
                  {editar && <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Remover ${c.campanha}`} onClick={() => setApagar(c)} />}
                </div>
              </Linha>
            ))
          )}
        </Cartao>
      </div>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover a ligação" texto={apagar ? `«${apagar.campanha}» sai da lista (as visitas já rastreadas ficam).` : ""} rotuloAcao="Remover" perigo aoConfirmar={() => apagar && setLista((l) => l.filter((x) => x.id !== apagar.id))} />
    </Pagina>
  );
}

// ---------- rastreio ----------

const SCRIPT = (endpoint: string) => `<script defer src="${typeof window !== "undefined" ? window.location.origin : ""}/rastreio.js" data-endpoint="${endpoint || "https://api.exemplo.pt/v1/eventos"}"></script>`;

export function Rastreio() {
  const ligacao = useLigacao();
  const editar = useEditar();
  const e = endpointPorId("eventos-registar")!;
  const [enviados, setEnviados] = useState<{ quando: string; tipo: string; origem: string; json: string }[]>([]);
  const [resultado, setResultado] = useState<string | null>(null);
  const [endereco, setEndereco] = useState("");
  useEffect(() => setEndereco(ligacao.base ? `${ligacao.base.replace(/\/$/, "")}/v1/eventos` : ""), [ligacao.base]);
  const exemploDeOrigem = origemDoVisitante("https://www.google.com/search?q=pedir+proposta");

  const enviarTeste = async (tipo: "visita" | "clique") => {
    const evento = { tipo, visitante: "v-teste", sessao: "s-teste", pagina: "/precos", referrer: "https://www.google.com/", ...(tipo === "clique" ? { elemento: "Pedir proposta" } : {}), utm: { source: "teste", medium: "painel", campaign: "verificacao" }, quando: new Date().toISOString() };
    try {
      if (ligacao.modo === "ligado") await chamar(ligacao, "POST", e.caminho, evento);
      setResultado(ligacao.modo === "ligado" ? "O servidor aceitou o evento." : "Evento aceite no modo de demonstração (não saiu do navegador).");
      setEnviados((l) => [{ quando: evento.quando, tipo, origem: `${evento.utm.source} / ${evento.utm.medium}`, json: JSON.stringify(evento, null, 2) }, ...l].slice(0, 5));
    } catch (er) {
      setResultado(er instanceof Error ? er.message : "Não foi possível enviar.");
    }
  };
  return (
    <Pagina>
      <Titulo titulo="Rastreio" />
      <Cartao titulo="Pôr no seu site" dica="Uma linha antes de fechar o corpo da página. O script regista as visitas e os cliques, e envia-os para o endereço de eventos.">
        <div className="flex flex-col gap-3 p-4">
          <pre className="overflow-x-auto rounded-lg bg-kumo-tint p-3 text-xs">{SCRIPT(endereco)}</pre>
          <div>
            <BotaoCopiar texto={SCRIPT(endereco)} rotulo="Copiar o script" dica="Copiar o script" />
          </div>
        </div>
      </Cartao>
      {editar && (
      <Cartao titulo="Enviar um evento de teste" dica={`Um visitante vindo do Google fica classificado como ${exemploDeOrigem.fonte} / ${exemploDeOrigem.meio}. Envie um evento para ver o pedido que o servidor recebe.`}>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => enviarTeste("visita")}>
              Enviar uma visita
            </Button>
            <Button variant="secondary" onClick={() => enviarTeste("clique")}>
              Enviar um clique
            </Button>
          </div>
          {resultado && (
            <span className="text-sm" role="status">
              {resultado}
            </span>
          )}
          {enviados.length > 0 && (
            <div className="-mx-4 border-t border-kumo-hairline">
              <TabelaSimples
                colunas={[
                  { rotulo: "Hora", render: (x: (typeof enviados)[number]) => <span className="tabular-nums">{new Date(x.quando).toLocaleTimeString("pt-PT")}</span> },
                  { rotulo: "Tipo", render: (x: (typeof enviados)[number]) => x.tipo },
                  { rotulo: "Origem", render: (x: (typeof enviados)[number]) => x.origem },
                  { rotulo: "", direita: true, render: (x: (typeof enviados)[number]) => <BotaoCopiar texto={x.json} dica="Copiar o evento (JSON)" tamanho="sm" variante="ghost" quadrado /> },
                ]}
                linhas={enviados}
                chave={(x) => x.quando}
              />
            </div>
          )}
        </div>
      </Cartao>
      )}
      <Cartao titulo="O contrato do evento" dica="O mesmo que está em Ferramentas de programador, «API e ligações».">
        <div className="flex flex-col gap-2 p-4 text-sm">
          <span>
            <b>{e.metodo}</b> <code>{e.caminho}</code>: {e.descricao}
          </span>
          <pre className="overflow-x-auto rounded-lg bg-kumo-tint p-3 text-xs">{JSON.stringify(e.exemplo, null, 2)}</pre>
        </div>
      </Cartao>
    </Pagina>
  );
}
