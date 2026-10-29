// Developer tools > Registos do servidor: as linhas que o servidor escreve, em direto, como os registos do Render. Vêm do processo do site, de contentores Docker, de ficheiros de registo, do journald de um VPS ou do Cloudflare Workers (o servidor liga-se às fontes e o painel lê /v1/dev/logs). Com pesquisa, níveis, fonte, pausa, quebra de linhas, hora local ou UTC, exportar em qualquer formato e investigar com IA. Em modo simulado geram-se linhas de demonstração, marcadas como tal.
"use client";

import { Button, DropdownMenu, Input, Select } from "@cloudflare/kumo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chamar, useLigacao } from "@/lib/api/cliente";
import { copiarEstruturado, estruturaDeRegisto } from "@/lib/copiar-dados";
import { abrirDados, useFonteDeExportacao } from "@/lib/dados-da-pagina";
import { perguntarAIa } from "@/lib/ia-contexto";
import { contagemPorNivel, filtrarLinhas, horaDaLinha, juntarLinhas, linhaSimulada, linhasParaTexto, NIVEIS, ROTULO_DO_NIVEL, type FonteDeLogs, type LinhaDeLog, type NivelDeLog } from "@/lib/logs";
import { abrirAnalise } from "@/lib/pesquisa-profunda";
import { copiar } from "../Copiar";
import { ItemPerguntarComMais } from "../ItensDeMenuComMais";
import { Dica } from "../Dica";
import { MenuCartao, SeparadorDeMenu } from "../Flutuantes";
import { ICONES, Ic } from "../Icones";
import { Cartao, descarregar } from "../conta/Pecas";
import { Pagina, Titulo } from "../ui";
import { useGuardado } from "./SuperPecas";

const FONTES_SIMULADAS: FonteDeLogs[] = [
  { id: "web", rotulo: "Site (web)", tipo: "processo", ambiente: "VPS", ativa: true },
  { id: "db", rotulo: "Base de dados", tipo: "docker", ambiente: "VPS", ativa: true },
  { id: "worker", rotulo: "Fila de e-mails", tipo: "docker", ambiente: "VPS", ativa: true },
  { id: "nginx", rotulo: "/var/log/nginx/error.log", tipo: "ficheiro", ambiente: "VPS", ativa: false },
  { id: "cloudflare", rotulo: "Cloudflare Workers (painel-ia)", tipo: "cloudflare", ambiente: "Cloudflare", ativa: false },
];

const BARRA: Record<NivelDeLog, string> = { debug: "border-l-kumo-hairline", info: "border-l-transparent", aviso: "border-l-kumo-warning bg-kumo-warning-tint/40", erro: "border-l-kumo-danger bg-kumo-danger-tint/60" };
const RESPOSTA_MAXIMA = 500;

/** As linhas em direto: simuladas no navegador ou lidas do servidor de pouco em pouco tempo (a partir da última que já se tem). */
function useRegistosEmDirecto(pausado: boolean) {
  const ligacao = useLigacao();
  const ligado = ligacao.modo === "ligado";
  const [linhas, setLinhas] = useState<LinhaDeLog[]>([]);
  const [fontes, setFontes] = useState<FonteDeLogs[]>(FONTES_SIMULADAS);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const contador = useRef(0);
  const cursor = useRef("");

  // trocar entre simulado e ligado começa de novo
  useEffect(() => {
    setLinhas([]);
    setErro(null);
    setACarregar(true);
    cursor.current = "";
    contador.current = 0;
  }, [ligado, ligacao.base]);

  // as fontes (só quando se liga a um servidor)
  useEffect(() => {
    if (!ligado) return void setFontes(FONTES_SIMULADAS);
    chamar<{ itens: FonteDeLogs[] }>(ligacao, "GET", "/v1/dev/logs/fontes").then(
      (r) => setFontes(r.itens),
      () => undefined,
    );
  }, [ligado, ligacao]);

  useEffect(() => {
    if (!ligado) {
      // o histórico de demonstração: 150 linhas dos últimos minutos, e depois algumas por segundo
      const agora = Date.now();
      const inicio = Array.from({ length: 150 }, (_, i) => linhaSimulada(i, new Date(agora - (150 - i) * 700)));
      contador.current = 150;
      setLinhas(inicio);
      setACarregar(false);
    }
  }, [ligado]);

  useEffect(() => {
    if (pausado) return;
    let parar = false;
    const passo = async () => {
      if (parar) return;
      if (!ligado) {
        const quantas = 1 + Math.floor(Math.random() * 3);
        const novas: LinhaDeLog[] = [];
        for (let i = 0; i < quantas; i++) novas.push(linhaSimulada(contador.current++, new Date(Date.now() - (quantas - 1 - i) * 180)));
        setLinhas((l) => juntarLinhas(l, novas));
        return;
      }
      try {
        const r = await chamar<{ itens: LinhaDeLog[]; cursor?: string }>(ligacao, "GET", `/v1/dev/logs?limite=${RESPOSTA_MAXIMA}${cursor.current ? `&desde=${encodeURIComponent(cursor.current)}` : ""}`);
        if (parar) return;
        if (r.itens.length) {
          setLinhas((l) => juntarLinhas(l, r.itens));
          cursor.current = r.cursor ?? r.itens[r.itens.length - 1].id;
        }
        setErro(null);
      } catch (e) {
        if (!parar) setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      }
      setACarregar(false);
    };
    void passo();
    const id = window.setInterval(() => void passo(), ligado ? 1500 : 900);
    return () => {
      parar = true;
      window.clearInterval(id);
    };
  }, [ligado, ligacao, pausado]);

  return { linhas, fontes, erro, aCarregar, simulado: !ligado, limpar: () => setLinhas([]) };
}

/** O texto com o que se pesquisou realçado. */
function Realcado({ texto, q }: { texto: string; q: string }) {
  if (!q) return <>{texto}</>;
  const t = texto.toLowerCase();
  const partes: React.ReactNode[] = [];
  let i = 0;
  for (let k = t.indexOf(q); k !== -1; k = t.indexOf(q, i)) {
    if (k > i) partes.push(texto.slice(i, k));
    partes.push(
      <mark key={k} className="rounded-sm bg-kumo-fill/50 px-px text-inherit">
        {texto.slice(k, k + q.length)}
      </mark>,
    );
    i = k + q.length;
  }
  partes.push(texto.slice(i));
  return <>{partes}</>;
}

export function RegistosDoServidor() {
  const [pausado, setPausado] = useState(false);
  const [quebrar, setQuebrar] = useGuardado<boolean>("logs-quebrar", true);
  const [utc, setUtc] = useGuardado<boolean>("logs-utc", false);
  const [niveis, setNiveis] = useState<Set<NivelDeLog>>(new Set());
  const [fonte, setFonte] = useState("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [aSeguir, setASeguir] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const dados = useRegistosEmDirecto(pausado);

  const q = pesquisa.trim().toLowerCase();
  const fontesFiltro = useMemo(() => (fonte === "todas" ? undefined : (new Set([fonte]) as ReadonlySet<string>)), [fonte]);
  // as contagens dos níveis seguem a pesquisa e a fonte, mas não o nível escolhido
  const semNivel = useMemo(() => filtrarLinhas(dados.linhas, { fontes: fontesFiltro, texto: pesquisa }), [dados.linhas, fontesFiltro, pesquisa]);
  const contagem = useMemo(() => contagemPorNivel(semNivel), [semNivel]);
  const visiveis = useMemo(() => (niveis.size ? semNivel.filter((l) => niveis.has(l.nivel)) : semNivel), [semNivel, niveis]);
  const mostradas = visiveis.length > 1500 ? visiveis.slice(visiveis.length - 1500) : visiveis;

  // seguir o fim: enquanto se está no fim, o que chega empurra a vista; ao subir, pára
  useEffect(() => {
    const el = area.current;
    if (el && aSeguir) el.scrollTop = el.scrollHeight;
  }, [mostradas, aSeguir]);
  const aoRolar = useCallback(() => {
    const el = area.current;
    if (!el) return;
    setASeguir(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  }, []);

  const fonteDeExportacao = useMemo(
    () => ({
      nome: "registos-do-servidor",
      titulo: "Registos do servidor",
      dados: { nome: "registos-do-servidor", titulo: "Registos do servidor", colunas: ["Hora", "Nível", "Fonte", "Mensagem"], linhas: visiveis.map((l) => [l.quando, ROTULO_DO_NIVEL[l.nivel], l.fonte, l.texto] as (string | number)[]) },
    }),
    [visiveis],
  );
  useFonteDeExportacao(fonteDeExportacao);

  const alternarNivel = (n: NivelDeLog) =>
    setNiveis((s) => {
      const novo = new Set(s);
      if (!novo.delete(n)) novo.add(n);
      return novo;
    });
  const contexto = () => ({ linhasVisiveis: visiveis.length, porNivel: contagem, fonte, pesquisa: pesquisa || undefined, ultimas: visiveis.slice(-150).map((l) => `${l.quando} [${l.nivel}] [${l.fonte}] ${l.texto}`) });
  const itensDeFonte = { todas: "Todas as fontes", ...Object.fromEntries(dados.fontes.map((f) => [f.id, `${f.rotulo}${f.ativa ? "" : " (sem ligação)"}`])) };

  return (
    <Pagina largo>
      <Titulo titulo="Registos do servidor">
        <Button variant="secondary" icon={ICONES.transferir} onClick={() => abrirDados("exportar")} disabled={visiveis.length === 0}>
          Exportar
        </Button>
        <Button variant="secondary" icon={<Ic nome="lupa" tamanho={16} />} disabled={visiveis.length === 0} onClick={() => abrirAnalise({ titulo: "Registos do servidor", tipo: "pagina", pagina: window.location.pathname, dados: contexto() })}>
          Investigar com IA
        </Button>
      </Titulo>

      <Cartao
        titulo="Em direto"
        acoes={
          <span className="inline-flex items-center gap-2 text-xs text-kumo-subtle">
            <span className={`size-2 rounded-full ${pausado ? "bg-kumo-warning" : dados.erro ? "bg-kumo-danger" : "bg-kumo-success animate-pulse"}`} aria-hidden />
            {pausado ? "Em pausa" : dados.erro ? "Sem ligação" : "A receber"}
            {dados.simulado && <span className="rounded-md bg-kumo-tint px-1.5 py-px font-medium text-kumo-default">simulado</span>}
          </span>
        }
      >
        <div className="flex flex-col gap-3 p-4 pb-3">
          <div className="relative">
            <Ic nome="lupa" tamanho={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-kumo-subtle" />
            <Input aria-label="Pesquisar nos registos" placeholder="Pesquisar nos registos…" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} autoComplete="off" className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 sm:max-w-72">
              <Select aria-label="Fonte" className="w-full" value={fonte} onValueChange={(v) => setFonte(String(v))} items={itensDeFonte} />
            </div>
            <span className="ml-auto flex shrink-0 items-center gap-1">
              <Dica conteudo={pausado ? "Retomar o direto" : "Pôr em pausa"}>
                <Button variant="secondary" shape="square" size="sm" aria-label={pausado ? "Retomar o direto" : "Pôr em pausa"} icon={<Ic nome={pausado ? "seta" : "temporizador"} tamanho={16} />} onClick={() => setPausado((v) => !v)} />
              </Dica>
              <Dica conteudo={quebrar ? "Não quebrar as linhas" : "Quebrar as linhas"}>
                <Button variant={quebrar ? "primary" : "secondary"} shape="square" size="sm" aria-label="Quebrar as linhas" aria-pressed={quebrar} icon={<Ic nome="lista" tamanho={16} />} onClick={() => setQuebrar(!quebrar)} />
              </Dica>
              <Dica conteudo={utc ? "Mostrar a hora local" : "Mostrar a hora em UTC"}>
                <Button variant={utc ? "primary" : "secondary"} shape="square" size="sm" aria-label="Hora em UTC" aria-pressed={utc} icon={<Ic nome="globo" tamanho={16} />} onClick={() => setUtc(!utc)} />
              </Dica>
              <DropdownMenu>
                <Dica conteudo="Mais opções">
                  <DropdownMenu.Trigger render={<Button variant="secondary" shape="square" size="sm" icon={ICONES.mais3} aria-label="Mais opções dos registos" />} />
                </Dica>
                <MenuCartao>
                  <DropdownMenu.Item
                    icon={<Ic nome={copiado ? "certo" : "copiar"} />}
                    onClick={async () => {
                      setCopiado(await copiar(linhasParaTexto(visiveis)));
                      window.setTimeout(() => setCopiado(false), 1800);
                    }}
                  >
                    Copiar as linhas
                  </DropdownMenu.Item>
                  <DropdownMenu.Item icon={<Ic nome="copiar" />} onClick={() => void copiarEstruturado(estruturaDeRegisto("Registos do servidor", contexto(), window.location.pathname))}>
                    Copiar dados
                  </DropdownMenu.Item>
                  <DropdownMenu.Item icon={<Ic nome="transferir" />} onClick={() => descarregar("registos-do-servidor.log", linhasParaTexto(visiveis))}>
                    Descarregar o .log
                  </DropdownMenu.Item>
                  <SeparadorDeMenu />
                  <ItemPerguntarComMais
                    pergunta="Analisar os registos do servidor"
                    perguntar={(texto) => perguntarAIa(texto, { contexto: { titulo: "os registos do servidor", dados: contexto(), pagina: window.location.pathname } })}
                  />
                  <SeparadorDeMenu />
                  <DropdownMenu.Item icon={<Ic nome="lixo" />} variant="danger" onClick={dados.limpar}>
                    Limpar a vista
                  </DropdownMenu.Item>
                </MenuCartao>
              </DropdownMenu>
            </span>
          </div>
          {/* os níveis numa só linha: se não couberem, rolam na horizontal com o desvanecimento nas pontas */}
          <div className="sem-barra -mx-4 -my-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 py-1 [&>*]:shrink-0">
            {NIVEIS.map((n) => (
              <Button key={n} size="sm" variant={niveis.has(n) ? "primary" : "secondary"} aria-pressed={niveis.has(n)} onClick={() => alternarNivel(n)}>
                {ROTULO_DO_NIVEL[n]} <span className="tabular-nums opacity-70">{contagem[n]}</span>
              </Button>
            ))}
            {niveis.size > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setNiveis(new Set())}>
                Todos os níveis
              </Button>
            )}
          </div>
        </div>

        {dados.erro && <p className="px-4 pb-3 text-sm text-kumo-danger">{dados.erro}</p>}
        <div className="relative border-t border-kumo-hairline">
          <div
            ref={area}
            onScroll={aoRolar}
            role="log"
            aria-live="off"
            aria-label="Registos do servidor"
            className={`sem-barra h-[calc(100dvh-24rem)] min-h-80 overflow-y-auto bg-kumo-recessed font-mono text-xs leading-5 text-kumo-default ${quebrar ? "" : "overflow-x-auto"}`}
          >
            {mostradas.length === 0 ? (
              <div className="flex h-full items-center justify-center px-4 text-center font-sans text-sm text-kumo-subtle">{dados.aCarregar ? "A ler os registos…" : dados.linhas.length === 0 ? "Ainda não há linhas." : "Nenhuma linha passa nos filtros."}</div>
            ) : (
              <div className={quebrar ? "" : "w-max min-w-full"}>
                {mostradas.map((l) => (
                  <div key={l.id} className={`flex items-baseline gap-2 border-l-[3px] px-3 py-px hover:bg-kumo-tint/70 ${BARRA[l.nivel]}`}>
                    <span className="shrink-0 tabular-nums text-kumo-subtle">{horaDaLinha(l.quando, utc)}</span>
                    <span className="hidden w-12 shrink-0 font-semibold uppercase sm:inline">{l.nivel === "aviso" ? "aviso" : l.nivel}</span>
                    <span className="hidden w-14 shrink-0 truncate text-kumo-subtle sm:inline" title={l.fonte}>
                      {l.fonte}
                    </span>
                    <span className={`min-w-0 flex-1 ${quebrar ? "whitespace-pre-wrap break-words" : "whitespace-pre"}`}>
                      <Realcado texto={l.texto} q={q} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!aSeguir && mostradas.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <Button
                className="pointer-events-auto shadow-md"
                variant="primary"
                size="sm"
                icon={<Ic nome="baixo" tamanho={14} />}
                onClick={() => {
                  setASeguir(true);
                  if (area.current) area.current.scrollTop = area.current.scrollHeight;
                }}
              >
                Voltar ao fim
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-kumo-hairline px-4 py-2 text-xs tabular-nums text-kumo-subtle">
          <span>
            {visiveis.length.toLocaleString("pt-PT")} {visiveis.length === 1 ? "linha" : "linhas"}
            {visiveis.length !== dados.linhas.length ? ` de ${dados.linhas.length.toLocaleString("pt-PT")}` : ""}
          </span>
          <span>{utc ? "Hora em UTC" : "Hora local"}</span>
        </div>
      </Cartao>
    </Pagina>
  );
}
