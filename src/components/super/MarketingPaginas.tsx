// Os ecrãs de marketing que não são uma lista simples: a visão geral (visitas, de onde vieram, páginas quentes e botões mais clicados), o construtor de campanhas (ligações com UTM) e o rastreio (o script para pôr no site, o contrato de eventos e um teste). As origens, as páginas e os cliques em tabela são módulos de registos.
"use client";

import { Button, Input } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { gerarCliques, gerarOrigens, gerarPaginas, gerarResumoMarketing, type Clique, type Origem, type PaginaQuente, type ResumoMarketing } from "@/dados/super-dados";
import { chamar, useApi, useLigacao } from "@/lib/api/cliente";
import { endpointPorId } from "@/lib/api/contrato";
import { identificador } from "@/lib/conta";
import { erroDoUtm, montarUrlUtm, origemDoVisitante, taxaDeConversao, type ParametrosUtm } from "@/lib/marketing";
import { Cartao, Confirmar, Linha } from "../conta/Pecas";
import { BotaoCopiar } from "../Copiar";
import { Grafico } from "../graficos/Graficos";
import { GrelhaOrdenavel } from "../GrelhaOrdenavel";
import { ICONES } from "../Icones";
import { LinhaOrdenada } from "../LinhaOrdenada";
import { CartaoEstatistica, Painel, Pagina, Titulo } from "../ui";
import { Vazio } from "../conteudo/ConteudoPecas";
import { AvisoDeApi, dataCurta, Estatistica, inteiro, percentagem, TabelaSimples, useGuardado, useTick } from "./SuperPecas";

// ---------- visão geral ----------

export function MarketingVisao() {
  const resumo = useApi<ResumoMarketing>("/v1/marketing/resumo", () => gerarResumoMarketing());
  const origens = useApi<{ itens: Origem[] }>("/v1/marketing/origens", () => ({ itens: gerarOrigens() }));
  const paginas = useApi<{ itens: PaginaQuente[] }>("/v1/marketing/paginas", () => ({ itens: gerarPaginas() }));
  const cliques = useApi<{ itens: Clique[] }>("/v1/marketing/cliques", () => ({ itens: gerarCliques() }));
  const r = resumo.dados;
  const serie = r?.porDia.map((d) => d.visitas) ?? [];
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
      <AvisoDeApi erro={resumo.erro ?? origens.erro ?? paginas.erro ?? cliques.erro} aoTentar={() => (resumo.recarregar(), origens.recarregar(), paginas.recarregar(), cliques.recarregar())} />
      {r && (
        <>
          <GrelhaOrdenavel
            chave="marketing-visao"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
            itens={[
              { id: "visitas", conteudo: <CartaoEstatistica titulo="Visitas" valor={inteiro(r.visitas)} variacao={null} valores={serie} dica="Cada vez que alguém abre o site conta uma visita (uma sessão)." /> },
              { id: "visitantes", conteudo: <Estatistica titulo="Visitantes" valor={inteiro(r.visitantes)} dica="Pessoas diferentes (o mesmo aparelho só conta uma vez)." numero={r.visitantes} /> },
              { id: "paginas", conteudo: <Estatistica titulo="Páginas por visita" valor={r.paginasPorVisita.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} dica="Quantas páginas se veem, em média, em cada visita." numero={r.paginasPorVisita} /> },
              { id: "rejeicao", conteudo: <Estatistica titulo="Taxa de rejeição" valor={percentagem(r.rejeicao)} pior dica="Visitas que saíram sem ver mais nenhuma página." numero={r.rejeicao * 100} /> },
              { id: "conversoes", conteudo: <Estatistica titulo="Conversões" valor={inteiro(r.conversoes)} dica="Pedidos de proposta, contactos e outros objetivos cumpridos." numero={r.conversoes} /> },
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
            <Painel titulo="De onde vieram">
              {porFonte.map((f) => (
                <LinhaOrdenada key={f.fonte} nome={f.fonte} valor={inteiro(f.visitas)} proporcao={(f.visitas / Math.max(1, porFonte[0].visitas)) * 100} />
              ))}
            </Painel>
            <Painel titulo="Páginas quentes">
              {quentes.map((p) => (
                <LinhaOrdenada key={p.pagina} nome={p.pagina} valor={inteiro(p.visitas)} proporcao={(p.visitas / Math.max(1, quentes[0].visitas)) * 100} />
              ))}
            </Painel>
            <Painel titulo="Botões mais clicados">
              {topCliques.map((c) => (
                <LinhaOrdenada key={`${c.elemento}${c.pagina}`} nome={`${c.elemento} · ${c.pagina}`} copiar={c.elemento} valor={inteiro(c.cliques)} proporcao={(c.cliques / Math.max(1, topCliques[0].cliques)) * 100} />
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

const CAMPANHA_VAZIA: ParametrosUtm = { url: "https://", fonte: "", meio: "", campanha: "", termo: "", conteudo: "" };

export function Campanhas() {
  const [lista, setLista] = useGuardado<Campanha[]>("campanhas-utm", []);
  const [p, setP] = useState<ParametrosUtm>(CAMPANHA_VAZIA);
  const [apagar, setApagar] = useState<Campanha | null>(null);
  const erro = erroDoUtm(p);
  const mostrarErro = p.fonte !== "" || p.meio !== "" || p.campanha !== "" || p.url !== "https://";
  const ligacao = erro ? null : montarUrlUtm(p);
  return (
    <Pagina>
      <Titulo titulo="Campanhas" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Nova ligação rastreada" dica="Os parâmetros UTM dizem ao rastreio de que campanha veio cada visita. Use sempre os mesmos nomes (em minúsculas, sem espaços) para os relatórios não se partirem.">
          <div className="flex flex-col gap-3 p-4">
            <Input label="Endereço da página" value={p.url} onChange={(e) => setP({ ...p, url: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Fonte" value={p.fonte} onChange={(e) => setP({ ...p, fonte: e.target.value })} placeholder="facebook" />
              <Input label="Meio" value={p.meio} onChange={(e) => setP({ ...p, meio: e.target.value })} placeholder="social" />
              <Input label="Campanha" value={p.campanha} onChange={(e) => setP({ ...p, campanha: e.target.value })} placeholder="outubro-2026" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Termo (opcional)" value={p.termo ?? ""} onChange={(e) => setP({ ...p, termo: e.target.value })} placeholder="pedir-proposta" />
              <Input label="Conteúdo (opcional)" value={p.conteudo ?? ""} onChange={(e) => setP({ ...p, conteudo: e.target.value })} placeholder="botao-azul" />
            </div>
            {mostrarErro && erro && <span className="text-sm text-kumo-danger">{erro}</span>}
            <div className="rounded-lg bg-kumo-tint p-3 text-xs break-all" aria-label="Ligação gerada">
              {ligacao ?? "A ligação aparece aqui quando os campos estiverem certos."}
            </div>
            <div className="flex flex-wrap gap-2">
              {ligacao && <BotaoCopiar texto={ligacao} rotulo="Copiar a ligação" dica="Copiar a ligação" />}
              <Button variant="primary" icon={ICONES.guardar} disabled={!!erro} onClick={() => (setLista((l) => [{ ...p, id: identificador(), criada: new Date().toISOString() }, ...l]), setP(CAMPANHA_VAZIA))}>
                Guardar na lista
              </Button>
            </div>
          </div>
        </Cartao>
        <Cartao titulo={`Ligações guardadas (${lista.length})`}>
          {lista.length === 0 ? (
            <Vazio icone="link" titulo="Ainda não guardou nenhuma" texto="Preencha o formulário e guarde a ligação para a ter sempre à mão." />
          ) : (
            lista.map((c) => (
              <Linha key={c.id} titulo={<span className="truncate font-medium">{c.campanha}</span>} estado={`${c.fonte} / ${c.meio} · ${c.url.replace(/^https?:\/\//, "")}`}>
                <div className="flex items-center gap-1">
                  <BotaoCopiar texto={montarUrlUtm(c)} tamanho="sm" variante="ghost" quadrado dica="Copiar a ligação" />
                  <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Remover ${c.campanha}`} onClick={() => setApagar(c)} />
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
      <Cartao titulo="O contrato do evento" dica="O mesmo que está em Developer tools, «API e ligações».">
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
