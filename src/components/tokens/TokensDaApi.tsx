// Conta > Tokens da API: a cópia da área «API Tokens» da Cloudflare. Cada token tem um nome, permissões (uma área ou um módulo, para ler ou para editar), filtros de IP e validade; o segredo mostra-se uma só vez e o painel guarda só a impressão. É o que deixa uma IA (ou qualquer programa) controlar o painel por inteiro, só pelas APIs: o manifesto de ferramentas diz-lhe o que pode fazer com as permissões que tem.
"use client";

import { Banner, Button, Dialog, DropdownMenu, Input, InputArea, Select } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { comoCurl, endpointPorId, paraOpenApi } from "@/lib/api/contrato";
import { useLigacao } from "@/lib/api/cliente";
import { registar } from "@/lib/atividade";
import { copiarEstruturado, estruturaDeRegisto } from "@/lib/copiar-dados";
import { perguntarAIa } from "@/lib/ia-contexto";
import { abrirAnalise } from "@/lib/pesquisa-profunda";
import {
  descreverPermissao,
  endpointsPermitidos,
  erroDoRascunho,
  estadoDoToken,
  manifestoDeFerramentas,
  MODELOS,
  modeloPorId,
  novoToken,
  RECURSOS,
  resumoDasPermissoes,
  rodarToken,
  ROTULO_DO_ESTADO,
  rotuloDaArea,
  simplificarPermissoes,
  useTokens,
  verificarToken,
  type PermissaoDeToken,
  type RascunhoDeToken,
  type RespostaDaVerificacao,
  type TokenDaApi,
} from "@/lib/tokens";
import { VALIDADE } from "@/dados/personalizados";
import { BotaoCopiar } from "../Copiar";
import { Dica } from "../Dica";
import { Estado } from "../Estado";
import { ICONES, Ic } from "../Icones";
import { MenuCartao, SeparadorDeMenu } from "../Flutuantes";
import { Pilula } from "../Pilula";
import { SeletorDeDataHora } from "../SeletoresDeTempo";
import { SeletorPersonalizavel } from "../SeletorPersonalizavel";
import { Cartao, Confirmar, descarregar, haTempo, Linha, soData } from "../conta/Pecas";
import { Vazio } from "../conteudo/ConteudoPecas";
import { TabelaSimples, type ColunaSimples } from "../super/SuperPecas";

type ModoDeIp = "sem" | "incluir" | "excluir";

interface Formulario {
  nome: string;
  modelo: string;
  permissoes: PermissaoDeToken[];
  modoIp: ModoDeIp;
  ips: string;
  validade: string;
  comecarMaisTarde: boolean;
  inicio: string;
}

const paraIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const lerIps = (t: string): string[] => t.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);

function formularioDe(t: TokenDaApi | null, modelo?: string): Formulario {
  const m = modelo ? modeloPorId(modelo) : undefined;
  return {
    nome: t?.nome ?? (m ? m.rotulo.replace(/\s*\(.*\)$/, "") : ""),
    modelo: t?.modelo ?? modelo ?? "personalizado",
    permissoes: t?.permissoes ?? m?.permissoes ?? [{ area: "*", modulo: "*", acesso: "ler" }],
    modoIp: t?.ips ? t.ips.modo : "sem",
    ips: t?.ips?.valores.join("\n") ?? "",
    validade: t ? "manter" : "90",
    comecarMaisTarde: !!t?.inicio && new Date(t.inicio).getTime() > Date.now(),
    inicio: t?.inicio ? paraIso(new Date(t.inicio)) : paraIso(new Date(Date.now() + 86_400_000)),
  };
}

function rascunhoDe(f: Formulario, atual: TokenDaApi | null): RascunhoDeToken {
  const dias = Number(f.validade);
  return {
    nome: f.nome,
    permissoes: f.permissoes,
    ...(f.modoIp !== "sem" ? { ips: { modo: f.modoIp, valores: lerIps(f.ips) } } : {}),
    ...(f.comecarMaisTarde && f.inicio ? { inicio: new Date(f.inicio).toISOString() } : {}),
    ...(f.validade === "manter" ? (atual?.expira ? { expira: atual.expira } : {}) : f.validade === "nunca" || !Number.isFinite(dias) ? {} : { expira: new Date(Date.now() + dias * 86_400_000).toISOString() }),
  };
}

const texto = (t: TokenDaApi) => `${t.prefixo}…${t.fim}`;

/** O que se copia e se dá à IA de um token: tudo menos o segredo (que o painel nem guarda). */
const dadosDoToken = (t: TokenDaApi, agora: Date) => ({ nome: t.nome, token: texto(t), estado: ROTULO_DO_ESTADO[estadoDoToken(t, agora)], permissoes: t.permissoes.map(descreverPermissao), filtroDeIp: t.ips ? `${t.ips.modo === "incluir" ? "só" : "todos menos"}: ${t.ips.valores.join(", ")}` : "sem filtro", comeca: t.inicio ?? null, expira: t.expira ?? null, criado: t.criado, modificado: t.modificado, ultimoUso: t.ultimoUso, usos: t.usos, pedidosPermitidos: endpointsPermitidos(t.permissoes).length });

export function TokensDaApi() {
  const tokens = useTokens();
  const ligacao = useLigacao();
  const [formulario, setFormulario] = useState<{ token: TokenDaApi | null; modelo?: string } | null>(null);
  const [mostrar, setMostrar] = useState<{ token: TokenDaApi; segredo: string; titulo: string } | null>(null);
  const [revogar, setRevogar] = useState<TokenDaApi | null>(null);
  const [rodar, setRodar] = useState<TokenDaApi | null>(null);
  const [apagar, setApagar] = useState<TokenDaApi | null>(null);
  const agora = new Date();
  const ordenados = useMemo(() => [...tokens.itens].sort((a, b) => b.criado.localeCompare(a.criado)), [tokens.itens]);
  const base = ligacao.modo === "ligado" && ligacao.base ? ligacao.base : "https://api.exemplo.pt";

  const guardar = async (f: Formulario, atual: TokenDaApi | null) => {
    const r = rascunhoDe(f, atual);
    if (!atual) {
      const { token, segredo } = await novoToken(r, new Date(), f.modelo !== "personalizado" ? f.modelo : undefined);
      await tokens.guardar(token);
      registar("token", `Criou o token «${token.nome}» da API (${token.permissoes.length} ${token.permissoes.length === 1 ? "permissão" : "permissões"})`);
      setMostrar({ token, segredo, titulo: "O seu token" });
    } else {
      const novo: TokenDaApi = { ...atual, nome: r.nome.trim(), permissoes: simplificarPermissoes(r.permissoes), ips: r.ips && r.ips.valores.length ? r.ips : undefined, inicio: r.inicio, expira: r.expira, modificado: new Date().toISOString() };
      await tokens.guardar(novo);
      registar("token", `Mudou o token «${novo.nome}» da API`);
    }
    setFormulario(null);
  };

  const colunas: ColunaSimples<TokenDaApi>[] = [
    {
      rotulo: "Nome",
      render: (t) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-kumo-default">{t.nome}</span>
          <code className="text-xs text-kumo-subtle">{texto(t)}</code>
        </span>
      ),
    },
    {
      rotulo: "Permissões",
      render: (t) => {
        const r = resumoDasPermissoes(t.permissoes);
        return (
          <span className="flex flex-wrap items-center gap-y-1">
            {r.primeiras.map((p) => (
              <Pilula key={p} inverso>
                {p}
              </Pilula>
            ))}
            {r.mais > 0 && <span className="ml-1 text-xs text-kumo-subtle">+{r.mais}</span>}
          </span>
        );
      },
    },
    { rotulo: "Último uso", render: (t) => <span className="whitespace-nowrap">{t.ultimoUso ? haTempo(t.ultimoUso) : "Nunca usado"}</span> },
    { rotulo: "Criado", render: (t) => <span className="whitespace-nowrap">{soData(t.criado)}</span> },
    { rotulo: "Modificado", render: (t) => <span className="whitespace-nowrap">{soData(t.modificado)}</span> },
    { rotulo: "Estado", filtro: (t) => ROTULO_DO_ESTADO[estadoDoToken(t, agora)], render: (t) => <Estado valor={ROTULO_DO_ESTADO[estadoDoToken(t, agora)]} /> },
    { rotulo: "Ações", direita: true, render: (t) => <span onClick={(e) => e.stopPropagation()}><MenuDoToken t={t} agora={agora} aoEditar={() => setFormulario({ token: t })} aoRodar={() => setRodar(t)} aoRevogar={() => setRevogar(t)} aoApagar={() => setApagar(t)} /></span> },
  ];

  return (
    <>
      <Cartao
        titulo="Tokens da API"
        dica="Um token deixa uma aplicação ou uma IA usar as APIs do painel com as permissões que escolher, sem a sua palavra-passe. O token completo só aparece uma vez: o painel guarda apenas a impressão."
        acoes={
          <Button size="sm" variant="primary" icon={ICONES.mais} onClick={() => setFormulario({ token: null })}>
            Criar token
          </Button>
        }
      >
        {tokens.itens.length === 0 ? (
          <Vazio icone="chave" titulo="Ainda não criou nenhum token" />
        ) : (
          <>
            <div className="max-sm:hidden">
              <TabelaSimples colunas={colunas} linhas={ordenados} chave={(t) => t.id} tabela="tokens-da-api" aoClicar={(t) => estadoDoToken(t, agora) !== "revogado" && setFormulario({ token: t })} />
            </div>
            <div className="sm:hidden">
              {ordenados.map((t) => {
                const r = resumoDasPermissoes(t.permissoes);
                return (
                  <div key={t.id} className="flex items-start gap-2 border-t border-kumo-hairline px-4 py-3 first:border-t-0">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate font-medium text-kumo-default">{t.nome}</span>
                        <Estado valor={ROTULO_DO_ESTADO[estadoDoToken(t, agora)]} />
                      </div>
                      <code className="text-xs text-kumo-subtle">{texto(t)}</code>
                      <span className="flex flex-wrap items-center gap-y-1">
                        {r.primeiras.map((p) => (
                          <Pilula key={p} inverso>
                            {p}
                          </Pilula>
                        ))}
                        {r.mais > 0 && <span className="ml-1 text-xs text-kumo-subtle">+{r.mais}</span>}
                      </span>
                      <span className="text-xs text-kumo-subtle">{t.ultimoUso ? `Usado ${haTempo(t.ultimoUso)}` : "Nunca usado"} · criado a {soData(t.criado)}</span>
                    </div>
                    <MenuDoToken t={t} agora={agora} aoEditar={() => setFormulario({ token: t })} aoRodar={() => setRodar(t)} aoRevogar={() => setRevogar(t)} aoApagar={() => setApagar(t)} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Cartao>

      <Cartao titulo="Usar com uma IA" dica="Uma IA com um token controla o painel por inteiro só pelas APIs. O manifesto de ferramentas dá-lhe, no formato das ferramentas da Anthropic, um pedido por cada coisa que o token permite.">
        <Linha titulo="Agente de IA" dica="Um token com todas as permissões para uma IA gerir o painel de ponta a ponta, só pelas APIs.">
          <Button variant="secondary" icon={<Ic nome="ia" tamanho={16} />} onClick={() => setFormulario({ token: null, modelo: "agente-ia" })}>
            Criar token do agente
          </Button>
        </Linha>
        <Linha titulo="Contrato das APIs" dica="O documento OpenAPI com todos os pedidos do painel, para qualquer programa ou IA o ler.">
          <Button variant="secondary" icon={ICONES.transferir} onClick={() => descarregar("painel-openapi.json", JSON.stringify(paraOpenApi("API do painel"), null, 2), "application/json")}>
            Descarregar OpenAPI
          </Button>
        </Linha>
      </Cartao>

      {formulario && <JanelaDoToken token={formulario.token} modelo={formulario.modelo} aoFechar={() => setFormulario(null)} aoGuardar={guardar} />}
      <JanelaDoSegredo dados={mostrar} lista={tokens.itens} base={base} aoFechar={() => setMostrar(null)} />
      <Confirmar
        aberto={!!rodar}
        aoMudar={(v) => !v && setRodar(null)}
        titulo="Rodar o token"
        texto={rodar ? `O token «${rodar.nome}» passa a ter um segredo novo e o atual deixa de funcionar de imediato. As permissões ficam como estão.` : ""}
        rotuloAcao="Rodar"
        aoConfirmar={async () => {
          if (!rodar) return;
          const r = await rodarToken(rodar);
          await tokens.guardar(r.token);
          registar("token", `Rodou o token «${rodar.nome}» da API`);
          setMostrar({ token: r.token, segredo: r.segredo, titulo: "O token novo" });
        }}
      />
      <Confirmar
        aberto={!!revogar}
        aoMudar={(v) => !v && setRevogar(null)}
        titulo="Revogar o token"
        perigo
        texto={revogar ? `Quem usa o token «${revogar.nome}» deixa de conseguir entrar. Não se pode voltar a ativar: crie outro se precisar.` : ""}
        rotuloAcao="Revogar"
        aoConfirmar={async () => {
          if (!revogar) return;
          await tokens.guardar({ ...revogar, revogado: true, modificado: new Date().toISOString() });
          registar("token", `Revogou o token «${revogar.nome}» da API`);
        }}
      />
      <Confirmar
        aberto={!!apagar}
        aoMudar={(v) => !v && setApagar(null)}
        titulo="Apagar o token"
        perigo
        texto={apagar ? `O token «${apagar.nome}» deixa de existir e de funcionar. Fica na reciclagem durante o prazo definido pelo Master Admin e pode ser restaurado.` : ""}
        rotuloAcao="Apagar"
        aoConfirmar={async () => {
          if (!apagar) return;
          await tokens.remover(apagar.id);
          registar("token", `Apagou o token «${apagar.nome}» da API`);
        }}
      />
    </>
  );
}

// ---------- o menu de cada token ----------

function MenuDoToken({ t, agora, aoEditar, aoRodar, aoRevogar, aoApagar }: { t: TokenDaApi; agora: Date; aoEditar: () => void; aoRodar: () => void; aoRevogar: () => void; aoApagar: () => void }) {
  const revogado = estadoDoToken(t, agora) === "revogado";
  const dados = dadosDoToken(t, agora);
  return (
    <DropdownMenu>
      <Dica conteudo="Ações do token">
        <DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="sm" icon={ICONES.mais3} aria-label={`Ações de ${t.nome}`} />} />
      </Dica>
      <MenuCartao>
        <DropdownMenu.Item icon={<Ic nome="engrenagem" />} disabled={revogado} onClick={aoEditar}>
          Editar
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="atualizar" />} disabled={revogado} onClick={aoRodar}>
          Rodar o segredo
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="codigo" />} disabled={revogado} onClick={() => descarregar(`ferramentas-${t.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`, JSON.stringify({ ferramentas: manifestoDeFerramentas(t.permissoes) }, null, 2), "application/json")}>
          Descarregar ferramentas para IA
        </DropdownMenu.Item>
        <SeparadorDeMenu />
        <DropdownMenu.Item icon={<Ic nome="copiar" />} onClick={() => void copiarEstruturado(estruturaDeRegisto(`Token da API: ${t.nome}`, dados, window.location.pathname))}>
          Copiar dados
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="ia" />} onClick={() => perguntarAIa(`Explica-me o token da API «${t.nome}»: o que pode fazer e se está seguro.`, { contexto: { titulo: `o token ${t.nome}`, dados, pagina: window.location.pathname } })}>
          Perguntar à IA
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="lupa" />} onClick={() => abrirAnalise({ titulo: `Token da API: ${t.nome}`, tipo: "registo", pagina: window.location.pathname, dados })}>
          Investigar com IA
        </DropdownMenu.Item>
        <SeparadorDeMenu />
        <DropdownMenu.Item icon={<Ic nome="proibido" />} variant="danger" disabled={revogado} onClick={aoRevogar}>
          Revogar
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="lixo" />} variant="danger" onClick={aoApagar}>
          Apagar
        </DropdownMenu.Item>
      </MenuCartao>
    </DropdownMenu>
  );
}

// ---------- criar e mudar ----------

const ACESSOS = { ler: "Ler", editar: "Editar" };
const MODOS_DE_IP = { sem: "Sem filtro: qualquer endereço", incluir: "Só estes endereços", excluir: "Todos menos estes" };

function JanelaDoToken({ token, modelo, aoFechar, aoGuardar }: { token: TokenDaApi | null; modelo?: string; aoFechar: () => void; aoGuardar: (f: Formulario, atual: TokenDaApi | null) => Promise<void> }) {
  const [f, setF] = useState<Formulario>(() => formularioDe(token, modelo));
  const [a, setA] = useState(false);
  const rascunho = rascunhoDe(f, token);
  const erro = erroDoRascunho(rascunho);
  const pedidos = endpointsPermitidos(rascunho.permissoes).length;
  const itensDeArea = { "*": "Todas as áreas", ...Object.fromEntries(RECURSOS.map((r) => [r.area, r.rotuloDaArea])) };
  const itensDeModulo = (area: string) => ({ "*": "Todos os módulos", ...Object.fromEntries((RECURSOS.find((r) => r.area === area)?.modulos ?? []).map((m) => [m.id, m.rotulo])) });
  const mudarPermissao = (i: number, parte: Partial<PermissaoDeToken>) => setF((x) => ({ ...x, modelo: "personalizado", permissoes: x.permissoes.map((p, j) => (j === i ? { ...p, ...parte } : p)) }));
  const itensDeValidade = token ? { manter: token.expira ? `Manter (até ${soData(token.expira)})` : "Manter (sem validade)", ...VALIDADE.opcoes } : VALIDADE.opcoes;
  const itensDeModelo = { personalizado: "Personalizado", ...Object.fromEntries(MODELOS.map((m) => [m.id, m.rotulo])) };
  return (
    <Dialog.Root open onOpenChange={(v) => !v && aoFechar()}>
      <Dialog size="lg" className="flex max-h-[calc(100dvh-4rem)] flex-col p-0">
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pb-4 pt-6">
          <Dialog.Title className="text-lg font-semibold">{token ? "Mudar o token" : "Criar token"}</Dialog.Title>
          <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-4">
          <Input label="Nome do token" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Por exemplo, agente de IA" autoComplete="off" />
          {!token && (
            <Select
              label="Começar de um modelo"
              value={f.modelo}
              onValueChange={(v) => {
                const m = modeloPorId(String(v));
                setF({ ...f, modelo: String(v), ...(m ? { permissoes: m.permissoes, nome: f.nome.trim() ? f.nome : m.rotulo.replace(/\s*\(.*\)$/, "") } : {}) });
              }}
              items={itensDeModelo}
            />
          )}

          <div className="flex flex-col gap-2">
            <span className="text-base font-medium text-kumo-default">Permissões</span>
            {f.permissoes.map((p, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_auto] sm:items-center">
                <Select aria-label="Área" className="w-full" value={p.area} onValueChange={(v) => mudarPermissao(i, { area: String(v), modulo: "*" })} items={itensDeArea} />
                <Select aria-label="Módulo" className="w-full" value={p.modulo} disabled={p.area === "*"} onValueChange={(v) => mudarPermissao(i, { modulo: String(v) })} items={p.area === "*" ? { "*": "Todos os módulos" } : itensDeModulo(p.area)} />
                <div className="flex items-center gap-2 sm:contents">
                  <div className="min-w-0 flex-1 sm:contents">
                    <Select aria-label="Acesso" className="w-full" value={p.acesso} onValueChange={(v) => mudarPermissao(i, { acesso: String(v) as PermissaoDeToken["acesso"] })} items={ACESSOS} />
                  </div>
                  <Dica conteudo="Tirar esta permissão">
                    <Button variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Tirar esta permissão" disabled={f.permissoes.length === 1} onClick={() => setF({ ...f, modelo: "personalizado", permissoes: f.permissoes.filter((_, j) => j !== i) })} />
                  </Dica>
                </div>
              </div>
            ))}
            <div>
              <Button variant="secondary" size="sm" icon={ICONES.mais} onClick={() => setF({ ...f, modelo: "personalizado", permissoes: [...f.permissoes, { area: RECURSOS[0]?.area ?? "*", modulo: "*", acesso: "ler" }] })}>
                Adicionar permissão
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Select label="Filtro de endereços IP" value={f.modoIp} onValueChange={(v) => setF({ ...f, modoIp: String(v) as ModoDeIp })} items={MODOS_DE_IP} />
            {f.modoIp !== "sem" && <InputArea aria-label="Endereços IP ou gamas" value={f.ips} onChange={(e) => setF({ ...f, ips: e.target.value })} placeholder={"203.0.113.9\n198.51.100.0/24"} rows={3} />}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SeletorPersonalizavel label="Termina em" valor={f.validade} opcoes={itensDeValidade} personalizado={VALIDADE.personalizado} aoMudar={(v) => setF({ ...f, validade: v })} />
            <div className="flex flex-col gap-2">
              <Select label="Começa a valer" value={f.comecarMaisTarde ? "depois" : "agora"} onValueChange={(v) => setF({ ...f, comecarMaisTarde: v === "depois" })} items={{ agora: "Agora", depois: "Numa data à escolha" }} />
              {f.comecarMaisTarde && <SeletorDeDataHora valor={f.inicio} aoMudar={(v) => setF({ ...f, inicio: v })} minimo={new Date()} />}
            </div>
          </div>

          <div className="rounded-lg bg-kumo-tint p-3 text-sm text-kumo-default">
            <div className="mb-1 font-medium">Resumo</div>
            <ul className="flex list-none flex-col gap-0.5 p-0">
              {simplificarPermissoes(f.permissoes).map((p, i) => (
                <li key={i}>{descreverPermissao(p)}</li>
              ))}
              <li className="text-kumo-subtle">
                {pedidos} {pedidos === 1 ? "pedido da API permitido" : "pedidos da API permitidos"}
                {f.modoIp !== "sem" && lerIps(f.ips).length > 0 ? ` · ${f.modoIp === "incluir" ? "só" : "todos menos"} ${lerIps(f.ips).length} ${lerIps(f.ips).length === 1 ? "endereço" : "endereços"}` : ""}
              </li>
            </ul>
          </div>
          {erro && f.nome.trim() !== "" && <p className="text-sm text-kumo-danger">{erro}</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-kumo-hairline px-6 py-4">
          <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
          <Button
            variant="primary"
            disabled={!!erro || a}
            onClick={async () => {
              setA(true);
              try {
                await aoGuardar(f, token);
              } finally {
                setA(false);
              }
            }}
          >
            {token ? "Guardar" : "Criar token"}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

// ---------- o segredo, uma só vez ----------

function JanelaDoSegredo({ dados, lista, base, aoFechar }: { dados: { token: TokenDaApi; segredo: string; titulo: string } | null; lista: TokenDaApi[]; base: string; aoFechar: () => void }) {
  const [teste, setTeste] = useState<RespostaDaVerificacao | null>(null);
  const curl = dados ? comoCurl(endpointPorId("tokens-ferramentas")!, base, dados.segredo) : "";
  const ferramentas = dados ? JSON.stringify({ ferramentas: manifestoDeFerramentas(dados.token.permissoes) }, null, 2) : "";
  return (
    <Dialog.Root open={!!dados} onOpenChange={(v) => !v && (setTeste(null), aoFechar())}>
      <Dialog size="lg" className="flex max-h-[calc(100dvh-4rem)] flex-col p-0">
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pb-3 pt-6">
          <Dialog.Title className="text-lg font-semibold">{dados?.titulo ?? "O seu token"}</Dialog.Title>
          <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
        </div>
        {dados && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-4">
            <Banner variant="alert" title="Copie-o agora" description="Não volta a ser mostrado: o painel guarda só a impressão. Se o perder, rode o segredo ou crie outro token." />
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-kumo-tint px-3 py-2 font-mono text-sm text-kumo-default">{dados.segredo}</code>
              <BotaoCopiar texto={dados.segredo} dica="Copiar o token" quadrado variante="secondary" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-kumo-default">Experimente</span>
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-kumo-tint px-3 py-2 font-mono text-xs text-kumo-default">{curl}</pre>
                <BotaoCopiar texto={curl} dica="Copiar o comando" quadrado variante="secondary" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={<Ic nome="certo" tamanho={16} />} onClick={async () => setTeste(await verificarToken(dados.segredo, lista, null))}>
                  Testar este token
                </Button>
                <Button variant="secondary" icon={ICONES.transferir} onClick={() => descarregar("ferramentas-para-ia.json", ferramentas, "application/json")}>
                  Ferramentas para IA
                </Button>
              </div>
              {teste && (
                <div className={`rounded-lg px-3 py-2 text-sm ${teste.ativo ? "bg-kumo-tint text-kumo-default" : "bg-kumo-danger-tint text-kumo-default"}`}>
                  {teste.ativo ? (
                    <>
                      <div className="font-medium">O token funciona: {teste.nome}</div>
                      <ul className="mt-1 list-none p-0 text-kumo-subtle">
                        {teste.permissoes?.slice(0, 4).map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                        {(teste.permissoes?.length ?? 0) > 4 && <li>+{(teste.permissoes?.length ?? 0) - 4} permissões</li>}
                      </ul>
                    </>
                  ) : (
                    teste.motivo
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex shrink-0 justify-end border-t border-kumo-hairline px-6 py-4">
          <Button variant="primary" onClick={() => (setTeste(null), aoFechar())}>
            Já o guardei
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

export { rotuloDaArea };
