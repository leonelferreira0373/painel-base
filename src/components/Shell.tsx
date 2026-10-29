// Estrutura do painel, igual à do painel da Cloudflare: coluna de ícones que se expande, cabeçalho de 58 px com o caminho da página, conteúdo centrado e rodapé com ligações. No telemóvel, a barra lateral abre como gaveta.
"use client";

import { Breadcrumbs, Button, CommandPalette, DropdownMenu, Popover, Sidebar, Toasty, Tooltip, TooltipProvider, useSidebar } from "@cloudflare/kumo";
import { AparenciaPessoal } from "./AparenciaPessoal";
import { MenuCartao, PopupCartao, SeparadorDeMenu, SubMenuCartao } from "./Flutuantes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { alternarFixado, lerFixados, lerRecentes, registarRecente } from "@/lib/recentes";
import { AREAS, caminho, type Area, type Modulo } from "@/dados/estrutura";
import { PROJETO } from "@/dados/projeto";
import { caminhoConta, FUSOS, SECOES_CONTA } from "@/dados/conta";
import { emailDe, FUNCOES, podeVer } from "@/dados/rbac";
import { T } from "@/dados/textos";
import { ehPublica, useSessao } from "@/lib/auth";
import { atalhosEfetivos, combinacaoDe } from "@/lib/atalhos";
import { useConta } from "@/lib/conta";
import { useApp } from "@/lib/estado";
import { useTema, type Tema } from "@/lib/tema";
import { toasts } from "@/lib/toasts";
import { useEntradaGlobal } from "./analise/Ficheiros";
import { CONTEXTO, caminhoContexto, entidadesDe, paginaDoContexto } from "@/dados/contexto";
import { Avatar } from "./Avatar";
import { SeletorCliente } from "./cliente/SeletorCliente";
import { CorpoDica, Dica } from "./Dica";
import { AssistentePainel, EVENTO_ASSISTENTE } from "./AssistentePainel";
import { EsbatidoGlobal } from "./Estados";
import { Ic, ICONES } from "./Icones";
import { BotaoIcone } from "./ui";
import { Frase } from "./Frase";
import { CampoDePesquisa } from "./CampoDePesquisa";

/** Onde estamos: a área e o módulo (ou, nas páginas de um cliente, «cliente» e a página). O identificador da conta, quando existe, não conta. */
export function localizar(pathname: string): { areaId: string; moduloId: string; cliente?: string } {
  let partes = pathname.split("/").filter(Boolean);
  if (partes[0] === PROJETO.contaId) partes = partes.slice(1);
  if (partes.length === 0) return { areaId: "inicio", moduloId: "visao-geral" };
  if (partes.length >= 2 && !AREAS.some((x) => x.id === partes[0]) && partes[0] !== "conta") return { areaId: "cliente", moduloId: partes[1], cliente: partes[0] };
  return { areaId: partes[0], moduloId: partes[1] ?? "" };
}

/** O ícone do painel que o Kumo desenha no botão da barra (a barra vertical desliza de um lado para o outro). Copiado porque o do Kumo só segue a barra do computador e no telemóvel a barra é uma gaveta. */
function IconeBarra({ aberto }: { aberto: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0">
      <path d="M21.25 6.72v10.56a2.97 2.97 0 0 1-2.97 2.97H5.72a2.97 2.97 0 0 1-2.97-2.97V6.72a2.97 2.97 0 0 1 2.97-2.97h12.56a2.97 2.97 0 0 1 2.97 2.97" />
      <path d="M6.25 7.25v9.5" className={`transition-transform duration-(--sidebar-animation-duration) ease-(--sidebar-easing) ${aberto ? "translate-x-px" : "translate-x-[10.5px]"}`} />
    </svg>
  );
}

function AlternarBarra() {
  const { open, openMobile, isMobile } = useSidebar();
  const aberto = isMobile ? openMobile : open;
  return (
    <Dica conteudo={aberto ? "Recolher o menu" : "Fixar o menu aberto. Também abre ao passar o rato pelos ícones."} lado="right">
      <Sidebar.Trigger aria-label={aberto ? "Fechar menu" : "Abrir menu"} className="cursor-default">
        <IconeBarra aberto={aberto} />
      </Sidebar.Trigger>
    </Dica>
  );
}

const TEMAS: { id: Tema; rotulo: string; icone: "sol" | "lua" | "monitor" }[] = [
  { id: "claro", rotulo: "Claro", icone: "sol" },
  { id: "escuro", rotulo: "Escuro", icone: "lua" },
  { id: "sistema", rotulo: "Igual ao sistema", icone: "monitor" },
];

/** Linha de um menu em popup: a mesma altura, cantos e realce em todos os popups do painel. */
const LINHA_POPUP = "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-kumo-default transition-colors hover:bg-kumo-tint focus-visible:bg-kumo-tint focus-visible:outline-none";

/** O seletor de contas, como o da Cloudflare: pesquisa, lista de contas com visto na atual e «Criar conta». O resto da conta (definições, aparência, idioma, fuso, terminar sessão) está no menu do utilizador, no cabeçalho. */
function PerfilLateral() {
  const { funcao } = useApp();
  const { conta, trocarConta } = useConta();
  const { open, isMobile, isPeeking, setOpenMobile } = useSidebar();
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const expandido = open || isMobile || isPeeking;
  useEffect(() => {
    if (!aberto) setQ("");
  }, [aberto]);
  const termo = q.trim().toLowerCase();
  const contas = FUNCOES.filter((f) => termo === "" || `${f.pessoa} ${f.rotulo} ${emailDe(f)}`.toLowerCase().includes(termo));
  const fechar = () => {
    setAberto(false);
    if (isMobile) setOpenMobile(false);
  };
  return (
    <div className="flex h-14 sm:h-[58px] min-w-0 flex-1 items-center">
      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Dica bloco lado="right" conteudo={<CorpoDica titulo={conta.nome} texto={`${funcao.rotulo}. Abra o menu para trocar de conta ou criar uma nova.`} />}>
          <Popover.Trigger
            render={
              <button aria-label={T.topo.mudarFuncao} title="" className={`flex h-10 items-center rounded-lg text-left transition-colors hover:bg-kumo-tint ${expandido ? "-ml-2 w-[calc(100%+8px)] gap-2.5 px-2" : "w-8 justify-center"}`}>
                <Avatar foto={conta.foto} nome={conta.nome} tamanho={32} />
                {expandido && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-kumo-default">{conta.nome}</span>
                    <Ic nome="seletor" tamanho={14} className="shrink-0 text-kumo-subtle" />
                  </>
                )}
              </button>
            }
          />
        </Dica>
        <PopupCartao modalNoTelemovel aoFechar={() => setAberto(false)} className="w-[288px] max-w-[calc(100vw-16px)]">
              <div className="flex items-center border-b border-kumo-line pr-3">
                <Ic nome="lupa" tamanho={14} className="ml-3 shrink-0 text-kumo-subtle" />
                <CampoDePesquisa valor={q} aoMudar={setQ} rotulo="Pesquisar contas" placeholder="Pesquisar contas…" idLista="lista-contas" />
              </div>
              <div id="lista-contas" role="listbox" data-incorporado aria-label="Contas" className="flex max-h-[min(60dvh,360px)] flex-col gap-1 overflow-y-auto p-1.5">
                {contas.length === 0 && <div className="px-2.5 py-2 text-sm text-kumo-subtle">{T.topo.semResultados}</div>}
                {contas.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="option"
                    aria-selected={f.id === funcao.id}
                    onClick={() => {
                      if (f.id !== funcao.id) trocarConta(f.id);
                      fechar();
                    }}
                    className={`${LINHA_POPUP} h-auto py-1.5 ${f.id === funcao.id ? "bg-kumo-tint" : ""}`}
                  >
                    <Avatar nome={f.pessoa} tamanho={24} />
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate">{f.pessoa}</span>
                      <span className="truncate text-xs text-kumo-subtle">
                        {f.rotulo} · {emailDe(f)}
                      </span>
                    </span>
                    {f.id === funcao.id && <Ic nome="certo" tamanho={16} className="shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-kumo-line p-1.5">
                <Link href="/registar/" onClick={fechar} className={LINHA_POPUP}>
                  <Ic nome="mais" tamanho={16} className="shrink-0" />
                  Criar conta
                </Link>
              </div>
            </PopupCartao>
      </Popover.Root>
    </div>
  );
}

function ItemRecente({ href, rotulo, area, fixado, aoIr }: { href: string; rotulo: string; area: string; fixado: boolean; aoIr: (e: React.MouseEvent) => void }) {
  return (
    <div className="group/recente relative">
      <Sidebar.MenuSubButton href={href} onClick={aoIr} className="h-auto min-h-[34px] py-1 pr-9">
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13px] font-medium text-kumo-default">{rotulo}</span>
          <span className="truncate text-[11px] text-kumo-subtle">{area}</span>
        </span>
      </Sidebar.MenuSubButton>
      <Tooltip
        content={fixado ? "Desafixar do menu" : "Fixar no menu"}
        side="right"
        render={<button type="button" aria-label={fixado ? "Desafixar do menu" : "Fixar no menu"} onClick={() => alternarFixado(href)} className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-kumo-subtle opacity-0 transition-opacity hover:bg-kumo-fill hover:text-kumo-default focus-visible:opacity-100 group-hover/recente:opacity-100" />}
      >
        <Ic nome={fixado ? "desafixar" : "fixar"} tamanho={14} />
      </Tooltip>
    </div>
  );
}

function Navegacao() {
  const pathname = usePathname();
  const router = useRouter();
  const { funcao, registos } = useApp();
  const { open, setOpen, isMobile, setOpenMobile, isPeeking } = useSidebar();
  const { areaId, moduloId, cliente: clienteSlug } = localizar(pathname);
  const entidades = useMemo(() => entidadesDe(registos[CONTEXTO.registos] ?? []), [registos]);
  const voltarHref = caminho(CONTEXTO.voltar.area, CONTEXTO.voltar.modulo);
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const [recentes, setRecentes] = useState<string[]>([]);
  const [fixados, setFixados] = useState<string[]>([]);
  useEffect(() => {
    const ler = () => {
      setRecentes(lerRecentes());
      setFixados(lerFixados());
    };
    ler();
    window.addEventListener("painel:menu", ler);
    return () => window.removeEventListener("painel:menu", ler);
  }, []);
  const visiveis = AREAS.filter((a) => a.id !== "inicio" && podeVer(funcao, a.id));
  const grupos: { rotulo: string; areas: Area[] }[] = [...new Set(visiveis.map((a) => a.secao))].map((rotulo) => ({ rotulo, areas: visiveis.filter((a) => a.secao === rotulo) }));

  const ir = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(href);
    if (isMobile) setOpenMobile(false);
  };
  const abrirPesquisa = () => window.dispatchEvent(new CustomEvent("painel:pesquisa"));
  const expandido = open || isMobile || isPeeking;

  const entradaDe = (href: string) => {
    const { areaId: a, moduloId: m, cliente } = localizar(href);
    if (cliente) {
      const ent = entidades.find((e) => e.slug === cliente);
      const pg = paginaDoContexto(m);
      return ent && pg ? { href: caminhoContexto(ent.nome, pg.id), rotulo: pg.rotulo, area: ent.nome, icone: pg.icone } : null;
    }
    const area = AREAS.find((x) => x.id === a);
    const mod = area?.modulos.find((x) => x.id === m);
    return area && mod && podeVer(funcao, area.id, mod.id) ? { href: caminho(area.id, mod.id), rotulo: mod.rotulo, area: area.rotulo, icone: mod.icone } : null;
  };
  const listaFixados = fixados.map(entradaDe).filter((x): x is NonNullable<typeof x> => x !== null);
  const listaRecentes = recentes
    .map(entradaDe)
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 5);

  const subBotao = (a: Area, m: Modulo) => (
    <Tooltip key={m.id} side="right" content={<CorpoDica titulo={m.rotulo} texto={m.descricao} />} render={<Sidebar.MenuSubButton href={caminho(a.id, m.id)} active={a.id === areaId && m.id === moduloId} onClick={ir(caminho(a.id, m.id))} />}>
      {m.rotulo}
    </Tooltip>
  );

  // Módulos de uma área, agrupados em submenus quando têm «grupo» (como Observability > Analytics na Cloudflare).
  const sub = (a: Area) => {
    const modulos = a.modulos.filter((m) => podeVer(funcao, a.id, m.id));
    type M = (typeof modulos)[number];
    const blocos: ({ grupo: null; m: M } | { grupo: string; ms: M[] })[] = [];
    for (const m of modulos) {
      if (!m.grupo) blocos.push({ grupo: null, m });
      else {
        const anterior = blocos[blocos.length - 1];
        if (anterior && anterior.grupo === m.grupo) (anterior as { ms: M[] }).ms.push(m);
        else blocos.push({ grupo: m.grupo, ms: [m] });
      }
    }
    return blocos.map((b) =>
      b.grupo === null ? (
        subBotao(a, b.m)
      ) : (
        <Sidebar.MenuSubItem key={b.grupo}>
          <Sidebar.Collapsible defaultOpen={a.id === areaId && b.ms.some((m) => m.id === moduloId)}>
            <Sidebar.CollapsibleTrigger
              render={
                <Sidebar.MenuSubButton>
                  {b.grupo}
                  <Sidebar.MenuChevron />
                </Sidebar.MenuSubButton>
              }
            />
            <Sidebar.CollapsibleContent>
              <Sidebar.MenuSub className="mt-1 gap-1">
                {b.ms.map((m) => (
                  subBotao(a, m)
                ))}
              </Sidebar.MenuSub>
            </Sidebar.CollapsibleContent>
          </Sidebar.Collapsible>
        </Sidebar.MenuSubItem>
      ),
    );
  };

  return (
    <Sidebar>
      <Sidebar.Header>
        <PerfilLateral />
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu>
            <Sidebar.MenuButton icon={ICONES.lupa} onClick={abrirPesquisa} tooltip={T.topo.pesquisar}>
              <span className="flex-1 text-left text-kumo-subtle">Pesquisa rápida…</span>
              {expandido && <kbd className="rounded bg-kumo-tint px-1 py-0.5 text-[11px] text-kumo-subtle">Ctrl K</kbd>}
            </Sidebar.MenuButton>
            {clienteSlug ? (
              <>
                <Sidebar.MenuButton icon={ICONES.anterior} href={voltarHref} onClick={ir(voltarHref)} tooltip={`Voltar a ${CONTEXTO.rotuloPlural}`} className="bg-kumo-tint">
                  Voltar a {CONTEXTO.rotuloPlural}
                </Sidebar.MenuButton>
                {CONTEXTO.paginas.map((p) => {
                  const href = caminhoContexto(entidades.find((e) => e.slug === clienteSlug)?.nome ?? clienteSlug, p.id);
                  return (
                    <Sidebar.MenuButton key={p.id} icon={ICONES[p.icone]} href={href} active={moduloId === p.id} onClick={ir(href)} tooltip={p.rotulo}>
                      {p.rotulo}
                    </Sidebar.MenuButton>
                  );
                })}
              </>
            ) : (
              <Sidebar.MenuButton icon={ICONES.casa} href="/" active={areaId === "inicio"} onClick={ir("/")} tooltip="Início">
                Início
              </Sidebar.MenuButton>
            )}
            <Sidebar.MenuItem>
              <Sidebar.Collapsible>
                <Sidebar.CollapsibleTrigger
                  render={
                    <Sidebar.MenuButton icon={ICONES.recentes} tooltip="Recentes" onClick={() => !open && !isMobile && setOpen(true)}>
                      Recentes
                      <Sidebar.MenuChevron />
                    </Sidebar.MenuButton>
                  }
                />
                <Sidebar.CollapsibleContent>
                  <Sidebar.MenuSub className="mt-1 gap-1">
                    {listaRecentes.length === 0 && <span className="px-3 py-2 text-[13px] text-kumo-subtle">Os módulos que abrir aparecem aqui</span>}
                    {listaRecentes.map((r) => (
                      <ItemRecente key={r.href} href={r.href} rotulo={r.rotulo} area={r.area} fixado={fixados.includes(r.href)} aoIr={ir(r.href)} />
                    ))}
                  </Sidebar.MenuSub>
                </Sidebar.CollapsibleContent>
              </Sidebar.Collapsible>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Group>
        {listaFixados.length > 0 && (
          <Sidebar.Group>
            <Sidebar.GroupLabel>Fixados</Sidebar.GroupLabel>
            <Sidebar.Menu>
              {listaFixados.map((f) => (
                <div key={f.href} className="group/fixo relative">
                  <Sidebar.MenuButton icon={ICONES[f.icone]} href={f.href} active={pathname === f.href} onClick={ir(f.href)} tooltip={f.rotulo}>
                    {f.rotulo}
                  </Sidebar.MenuButton>
                  {expandido && (
                    <Tooltip
                      content="Desafixar do menu"
                      side="right"
                      render={<button type="button" aria-label="Desafixar do menu" onClick={() => alternarFixado(f.href)} className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-kumo-subtle opacity-0 transition-opacity hover:bg-kumo-fill hover:text-kumo-default focus-visible:opacity-100 group-hover/fixo:opacity-100" />}
                    >
                      <Ic nome="desafixar" tamanho={14} />
                    </Tooltip>
                  )}
                </div>
              ))}
            </Sidebar.Menu>
          </Sidebar.Group>
        )}
        {(clienteSlug ? [] : grupos).map((g) => (
          <Sidebar.Group key={g.rotulo}>
            <Sidebar.Separator />
            <Sidebar.GroupLabel>{g.rotulo}</Sidebar.GroupLabel>
            <Sidebar.Menu>
              {g.areas.map((a) => (
                <Sidebar.MenuItem key={a.id}>
                  <Sidebar.Collapsible open={(abertas[a.id] ?? a.id === areaId) && expandido} onOpenChange={(v: boolean) => setAbertas((s) => ({ ...s, [a.id]: v }))}>
                    <Sidebar.CollapsibleTrigger
                      render={
                        <Sidebar.MenuButton
                          icon={ICONES[a.icone]}
                          tooltip={a.rotulo}
                          active={a.id === areaId}
                          onClick={() => {
                            if (!open && !isMobile) {
                              setOpen(true);
                              setAbertas((s) => ({ ...s, [a.id]: true }));
                            }
                          }}
                        >
                          {a.rotulo}
                          <Sidebar.MenuChevron />
                        </Sidebar.MenuButton>
                      }
                    />
                    <Sidebar.CollapsibleContent>
                      <Sidebar.MenuSub className="mt-1 gap-1">{sub(a)}</Sidebar.MenuSub>
                    </Sidebar.CollapsibleContent>
                  </Sidebar.Collapsible>
                </Sidebar.MenuItem>
              ))}
            </Sidebar.Menu>
          </Sidebar.Group>
        ))}
      </Sidebar.Content>
      <Sidebar.Footer>
        <AlternarBarra />
      </Sidebar.Footer>
    </Sidebar>
  );
}

function Pesquisa({ aberta, aoMudar }: { aberta: boolean; aoMudar: (v: boolean) => void }) {
  const router = useRouter();
  const { funcao, registos } = useApp();
  const [q, setQ] = useState("");
  const [recentes, setRecentes] = useState<string[]>([]);
  useEffect(() => {
    if (aberta) setRecentes(lerRecentes());
  }, [aberta]);
  const grupos = useMemo(() => {
    const termo = q.trim().toLowerCase();
    const dosRecentes = termo !== "" ? [] : recentes.flatMap((r) => {
      const { areaId, moduloId, cliente } = localizar(r);
      if (cliente) {
        const ent = entidadesDe(registos[CONTEXTO.registos] ?? []).find((e) => e.slug === cliente);
        const pg = paginaDoContexto(moduloId);
        return ent && pg ? [{ id: `recente/${r}`, title: pg.rotulo, sub: ent.nome, icone: pg.icone, href: caminhoContexto(ent.nome, pg.id) }] : [];
      }
      const area = AREAS.find((x) => x.id === areaId);
      const mod = area?.modulos.find((x) => x.id === moduloId);
      return area && mod && podeVer(funcao, area.id, mod.id) ? [{ id: `recente/${area.id}/${mod.id}`, title: mod.rotulo, sub: area.rotulo, icone: mod.icone, href: caminho(area.id, mod.id) }] : [];
    }).slice(0, 5);
    const inicio = dosRecentes.length > 0 ? [{ id: "recentes", label: T.topo.recentes, items: dosRecentes }] : [];
    return [...inicio, ...AREAS.filter((a) => podeVer(funcao, a.id))
      .map((a) => ({
        id: a.id,
        label: a.rotulo,
        items: a.modulos.filter((m) => podeVer(funcao, a.id, m.id) && (termo === "" || `${a.rotulo} ${m.rotulo}`.toLowerCase().includes(termo))).map((m) => ({ id: `${a.id}/${m.id}`, title: m.rotulo, sub: undefined as string | undefined, icone: m.icone, href: caminho(a.id, m.id) })),
      }))
      .filter((g) => g.items.length > 0)
      .concat(
        (() => {
          const itens = SECOES_CONTA.filter((c) => termo === "" || `conta definições ${c.rotulo}`.toLowerCase().includes(termo)).map((c) => ({ id: `conta/${c.id}`, title: c.rotulo, sub: undefined as string | undefined, icone: c.icone, href: caminhoConta(c.id) }));
          return itens.length > 0 ? [{ id: "conta", label: "Definições da conta", items: itens }] : [];
        })(),
      )];
  }, [q, funcao, recentes, registos]);
  type Item = (typeof grupos)[number]["items"][number];
  return (
    <CommandPalette.Root
      open={aberta}
      onOpenChange={aoMudar}
      items={grupos}
      value={q}
      onValueChange={setQ}
      itemToStringValue={(g: (typeof grupos)[number]) => g.label}
      onSelect={(item: Item) => {
        router.push(item.href);
        aoMudar(false);
      }}
      getSelectableItems={() => grupos.flatMap((g) => g.items)}
    >
      <CommandPalette.Input placeholder={T.topo.pesquisaPlaceholder} />
      <CommandPalette.List>
        <CommandPalette.Results>
          {(g: (typeof grupos)[number]) => (
            <CommandPalette.Group key={g.id} items={g.items}>
              <CommandPalette.GroupLabel>{g.label}</CommandPalette.GroupLabel>
              <CommandPalette.Items>
                {(item: Item) => (
                  <CommandPalette.Item key={item.id} value={item}>
                    <span className="flex items-center gap-3">
                      <span className="text-kumo-subtle">
                        <Ic nome={item.icone} />
                      </span>
                      {item.title}
                      {item.sub && <span className="text-kumo-subtle">— {item.sub}</span>}
                    </span>
                  </CommandPalette.Item>
                )}
              </CommandPalette.Items>
            </CommandPalette.Group>
          )}
        </CommandPalette.Results>
        <CommandPalette.Empty>{T.topo.semResultados}</CommandPalette.Empty>
        {q.trim() === "" && (
          <div className="border-t border-kumo-hairline px-3 pb-2 pt-3">
            <div className="pb-1 text-xs font-medium text-kumo-subtle">{T.topo.dicasTitulo}</div>
            {T.topo.dicasPesquisa.map((d) => (
              <div key={d} className="flex items-center gap-2.5 py-1 text-sm text-kumo-subtle">
                <Ic nome="info" tamanho={14} className="shrink-0" />
                <span>
                  <Frase>{d}</Frase>
                </span>
              </div>
            ))}
          </div>
        )}
      </CommandPalette.List>
      <CommandPalette.Footer>
        <span className="flex items-center gap-4 text-xs text-kumo-subtle">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-kumo-tint px-1.5 py-0.5 text-[11px]">↑</kbd>
            <kbd className="rounded bg-kumo-tint px-1.5 py-0.5 text-[11px]">↓</kbd>
            {T.topo.navegar}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-kumo-tint px-1.5 py-0.5 text-[11px]">↵</kbd>
            {T.topo.escolher}
          </span>
        </span>
      </CommandPalette.Footer>
    </CommandPalette.Root>
  );
}

/** Os atalhos de teclado do painel, com as combinações que o utilizador escolheu (Definições da conta → Atalhos). */
function AtalhosGlobais({ aoPesquisar }: { aoPesquisar: () => void }) {
  const router = useRouter();
  const { conta } = useConta();
  const { efetivo, definir } = useTema();
  const { toggleSidebar } = useSidebar();
  const mapa = useMemo(() => atalhosEfetivos(conta.atalhos), [conta.atalhos]);
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      const combinacao = combinacaoDe(e);
      if (!combinacao) return;
      const id = Object.keys(mapa).find((k) => mapa[k] === combinacao);
      if (!id) return;
      const alvo = e.target as HTMLElement | null;
      const aEscrever = !!alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName));
      if (aEscrever && !/^(Ctrl|Alt)/.test(combinacao)) return;
      e.preventDefault();
      if (id === "pesquisa") aoPesquisar();
      else if (id === "barra") toggleSidebar();
      else if (id === "inicio") router.push("/");
      else if (id === "conta") router.push(caminhoConta("perfil"));
      else if (id === "tema") definir(efetivo === "claro" ? "escuro" : "claro");
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [mapa, aoPesquisar, toggleSidebar, router, efetivo, definir]);
  return null;
}

/** O menu do utilizador, no canto do cabeçalho, como o da Cloudflare: e-mail, definições da conta, aparência, idioma, fuso horário e terminar sessão. Os submenus abrem para o lado onde houver espaço. */
function MenuUtilizador() {
  const { conta, mudar, terminarSessao } = useConta();
  const { tema, definir } = useTema();
  const idioma = conta.idioma ?? "pt-PT";
  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);
  return (
    <DropdownMenu>
      <Tooltip content={`${conta.nome}. Menu da conta`} render={<DropdownMenu.Trigger render={<button aria-label="Menu da conta" className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-kumo-tint"><Avatar foto={conta.foto} nome={conta.nome} tamanho={26} /></button>} />} />
      <MenuCartao>
        <DropdownMenu.Item disabled>
          <span className="max-w-40 truncate text-xs">{conta.email}</span>
        </DropdownMenu.Item>
        <SeparadorDeMenu />
        <DropdownMenu.LinkItem href={caminhoConta("perfil")} icon={<Ic nome="pessoa" />} render={<Link href={caminhoConta("perfil")} />}>
          Definições da conta
        </DropdownMenu.LinkItem>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger icon={<Ic nome="paleta" />}>Aparência</DropdownMenu.SubTrigger>
          <SubMenuCartao>
            {TEMAS.map((t) => (
              <DropdownMenu.Item key={t.id} icon={<Ic nome={t.icone} />} selected={t.id === tema} onClick={() => definir(t.id)}>
                {t.rotulo}
              </DropdownMenu.Item>
            ))}
          </SubMenuCartao>
        </DropdownMenu.Sub>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger icon={<Ic nome="globo" />}>Idioma</DropdownMenu.SubTrigger>
          <SubMenuCartao>
            <DropdownMenu.Item selected={idioma === "pt-PT"} onClick={() => mudar({ idioma: "pt-PT" }, "Idioma alterado")}>
              Português
            </DropdownMenu.Item>
            <DropdownMenu.Item disabled>English (em breve)</DropdownMenu.Item>
          </SubMenuCartao>
        </DropdownMenu.Sub>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger icon={<Ic nome="relogio" />}>Fuso horário</DropdownMenu.SubTrigger>
          <SubMenuCartao>
            {FUSOS.map((f) => (
              <DropdownMenu.Item key={f.id} selected={f.id === conta.fuso} onClick={() => mudar({ fuso: f.id }, "Fuso horário alterado")}>
                {f.rotulo}
              </DropdownMenu.Item>
            ))}
          </SubMenuCartao>
        </DropdownMenu.Sub>
        <SeparadorDeMenu />
        <DropdownMenu.Item icon={<Ic nome="sair" />} variant="danger" onClick={terminarSessao}>
          Terminar sessão
        </DropdownMenu.Item>
      </MenuCartao>
    </DropdownMenu>
  );
}

function Cabecalho({ aoPesquisar }: { aoPesquisar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { areaId, moduloId, cliente } = localizar(pathname);
  const area = AREAS.find((a) => a.id === areaId);
  const modulo = area?.modulos.find((m) => m.id === moduloId);
  const ir = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(href);
  };
  return (
    <header className="flex h-14 sm:h-[58px] shrink-0 items-center justify-between gap-3 border-b border-kumo-hairline bg-kumo-canvas px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="md:hidden">
          <AlternarBarra />
        </span>
        {cliente ? (
          <SeletorCliente slug={cliente} pagina={moduloId} />
        ) : (
        <Breadcrumbs>
          {areaId === "inicio" ? (
            <Breadcrumbs.Current icon={<Ic nome="casa" tamanho={16} />}>{T.visao.titulo}</Breadcrumbs.Current>
          ) : areaId === "conta" ? (
            <>
              <Breadcrumbs.Link href="/conta/perfil/" icon={<Ic nome="pessoa" tamanho={16} />}>
                <span onClick={ir("/conta/perfil/")}>Definições da conta</span>
              </Breadcrumbs.Link>
              <Breadcrumbs.Separator />
              <Breadcrumbs.Current>{SECOES_CONTA.find((c) => c.id === moduloId)?.rotulo ?? ""}</Breadcrumbs.Current>
            </>
          ) : (
            <>
              <Breadcrumbs.Link href="/" icon={<Ic nome={area?.icone ?? "casa"} tamanho={16} />}>
                <span onClick={ir("/")}>{area?.rotulo ?? ""}</span>
              </Breadcrumbs.Link>
              <Breadcrumbs.Separator />
              <Breadcrumbs.Current>{modulo?.rotulo ?? ""}</Breadcrumbs.Current>
            </>
          )}
        </Breadcrumbs>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Tooltip content={T.topo.perguntarIa} render={<Button variant="ghost" className="h-8" aria-label={T.topo.perguntarIa} icon={<Ic nome="ia" tamanho={16} peso="fill" className="-translate-y-px text-kumo-subtle" />} onClick={() => window.dispatchEvent(new Event(EVENTO_ASSISTENTE))}><span className="hidden md:inline">{T.topo.perguntarIa}</span></Button>} />
        <Tooltip content={T.topo.pesquisar} render={<Button variant="ghost" shape="square" icon={ICONES.lupa} aria-label={T.topo.pesquisar} onClick={aoPesquisar} />} />
        <span className="hidden text-xs text-kumo-subtle sm:inline">{T.topo.simulacao}</span>
        <MenuUtilizador />
      </div>
    </header>
  );
}

function Rodape() {
  const { funcao } = useApp();
  const ligacoes = [
    { href: "/", rotulo: T.visao.titulo },
    ...(podeVer(funcao, "analise", "ficheiros") ? [{ href: caminho("analise", "ficheiros"), rotulo: "Análise de dados" }] : []),
    ...(podeVer(funcao, "admin", "atividade") ? [{ href: caminho("admin", "atividade"), rotulo: "Registo de atividade" }] : []),
  ];
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-kumo-hairline bg-kumo-canvas px-3 py-2.5 text-xs text-kumo-subtle">
      {ligacoes.map((l) => (
        <Link key={l.href} href={l.href} className="hover:text-kumo-default">
          {l.rotulo}
        </Link>
      ))}
      <span>© 2026</span>
    </footer>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { funcao, mudarFuncao } = useApp();
  const { conta } = useConta();
  const { sessao, verificada } = useSessao();
  const pathname = usePathname();
  const publica = ehPublica(pathname);
  const [aberta, setAberta] = useState(false);
  const [pesquisa, setPesquisa] = useState(false);
  const alternarPesquisa = useCallback(() => setPesquisa((p) => !p), []);
  const podeAnalisar = podeVer(funcao, "analise", "ficheiros") && !publica;
  useEffect(() => setAberta(conta.barraAberta), [conta.barraAberta]);
  // Sem sessão, só as páginas abertas se mostram; com sessão, a conta de demonstração acompanha a entrada.
  useEffect(() => {
    if (!verificada) return;
    if (!sessao && !publica) router.replace(`/entrar/?seguinte=${encodeURIComponent(pathname)}`);
  }, [verificada, sessao, publica, pathname, router]);
  useEffect(() => {
    if (sessao && sessao.funcaoId !== funcao.id) mudarFuncao(sessao.funcaoId);
  }, [sessao, funcao.id, mudarFuncao]);
  const irParaAnalise = useCallback(() => {
    if (!window.location.pathname.includes("/analise/")) router.push(caminho("analise", "ficheiros"));
  }, [router]);
  useEntradaGlobal(podeAnalisar, irParaAnalise);
  useEffect(() => {
    if (!publica) registarRecente(pathname);
  }, [pathname, publica]);
  useEffect(() => {
    const abrir = () => setPesquisa(true);
    window.addEventListener("painel:pesquisa", abrir);
    return () => {
      window.removeEventListener("painel:pesquisa", abrir);
    };
  }, []);

  if (publica)
    return (
      <TooltipProvider>
        <Toasty toastManager={toasts}>{children}</Toasty>
      </TooltipProvider>
    );
  if (!verificada || !sessao) return <div className="min-h-dvh bg-kumo-canvas" />;

  return (
    <TooltipProvider>
      <Toasty toastManager={toasts}>
        <Sidebar.Provider open={aberta} onOpenChange={setAberta} peekable className="h-dvh">
          <Navegacao />
          <div className="flex h-dvh min-w-0 flex-1 flex-col">
            <Cabecalho aoPesquisar={() => setPesquisa(true)} />
            <main className="sem-barra min-h-0 flex-1 overflow-y-auto">{children}</main>
            <EsbatidoGlobal />
            <AtalhosGlobais aoPesquisar={alternarPesquisa} />
            <AparenciaPessoal />
            <AssistentePainel />
            <Rodape />
          </div>
        </Sidebar.Provider>
        <Pesquisa aberta={pesquisa} aoMudar={setPesquisa} />
      </Toasty>
    </TooltipProvider>
  );
}
