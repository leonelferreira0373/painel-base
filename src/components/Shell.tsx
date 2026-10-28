// Estrutura do painel, igual à do painel da Cloudflare: coluna de ícones que se expande, cabeçalho de 58 px com o caminho da página, conteúdo centrado e rodapé com ligações. No telemóvel, a barra lateral abre como gaveta.
"use client";

import { Breadcrumbs, Button, CommandPalette, DropdownMenu, Sidebar, Toasty, Tooltip, TooltipProvider, useSidebar } from "@cloudflare/kumo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { alternarFixado, lerFixados, lerRecentes, registarRecente } from "@/lib/recentes";
import { AREAS, caminho, type Area, type Modulo } from "@/dados/estrutura";
import { caminhoConta, SECOES_CONTA } from "@/dados/conta";
import { emailDe, FUNCOES, podeVer } from "@/dados/rbac";
import { T } from "@/dados/textos";
import { ehPublica, useSessao } from "@/lib/auth";
import { useConta } from "@/lib/conta";
import { useApp } from "@/lib/estado";
import { useTema, type Tema } from "@/lib/tema";
import { toasts } from "@/lib/toasts";
import { useEntradaGlobal } from "./analise/Ficheiros";
import { Avatar } from "./Avatar";
import { CorpoDica, Dica } from "./Dica";
import { EsbatidoGlobal } from "./Estados";
import { Ic, ICONES } from "./Icones";

export function localizar(pathname: string): { areaId: string; moduloId: string } {
  const partes = pathname.split("/").filter(Boolean);
  if (partes.length === 0) return { areaId: "inicio", moduloId: "visao-geral" };
  return { areaId: partes[0], moduloId: partes[1] ?? "" };
}

function AlternarBarra() {
  const { open, openMobile, isMobile } = useSidebar();
  const aberto = isMobile ? openMobile : open;
  return (
    <Dica conteudo={aberto ? "Recolher o menu" : "Fixar o menu aberto. Também abre ao passar o rato pelos ícones."} lado="right">
      <Sidebar.Trigger aria-label={aberto ? "Fechar menu" : "Abrir menu"} aria-pressed={aberto} className={aberto ? "bg-(--sidebar-active-bg) text-kumo-default" : ""}>
        <Ic nome="barra" tamanho={18} peso={aberto ? "fill" : "regular"} />
      </Sidebar.Trigger>
    </Dica>
  );
}

const TEMAS: { id: Tema; rotulo: string; icone: "sol" | "lua" | "monitor" }[] = [
  { id: "claro", rotulo: "Claro", icone: "sol" },
  { id: "escuro", rotulo: "Escuro", icone: "lua" },
  { id: "sistema", rotulo: "Igual ao sistema", icone: "monitor" },
];

function PerfilLateral() {
  const { funcao } = useApp();
  const { conta, terminarSessao, trocarConta } = useConta();
  const { tema, definir } = useTema();
  const { open, isMobile, isPeeking } = useSidebar();
  const expandido = open || isMobile || isPeeking;
  const iconeTema = TEMAS.find((t) => t.id === tema)?.icone ?? "sol";
  const ligacao = (secao: string, rotulo: string, icone: "pessoa" | "escudo" | "campainha" | "lembrete") => (
    <DropdownMenu.LinkItem href={caminhoConta(secao)} icon={<Ic nome={icone} />} render={<Link href={caminhoConta(secao)} />}>
      {rotulo}
    </DropdownMenu.LinkItem>
  );
  return (
    <div className="flex h-[58px] min-w-0 flex-1 items-center">
      <DropdownMenu>
        <Dica bloco lado="right" conteudo={<CorpoDica titulo={conta.nome} texto={`${funcao.rotulo}. Abra o menu para as definições da conta, o tema e para trocar de conta.`} />}>
          <DropdownMenu.Trigger
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
        <DropdownMenu.Content className="w-[288px]">
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar foto={conta.foto} nome={conta.nome} tamanho={40} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-kumo-default">{conta.nome}</div>
              <div className="truncate text-xs text-kumo-subtle">{conta.email}</div>
              <div className="truncate text-xs text-kumo-subtle">{funcao.rotulo}</div>
            </div>
          </div>
          <DropdownMenu.Separator />
          {ligacao("perfil", "Definições da conta", "pessoa")}
          {ligacao("seguranca", "Segurança", "escudo")}
          {ligacao("notificacoes", "Notificações", "campainha")}
          {ligacao("lembretes", "Lembretes", "lembrete")}
          <DropdownMenu.Separator />
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger icon={<Ic nome={iconeTema} />}>Tema</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              {TEMAS.map((t) => (
                <DropdownMenu.Item key={t.id} icon={<Ic nome={t.icone} />} selected={t.id === tema} onClick={() => definir(t.id)}>
                  {t.rotulo}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger icon={<Ic nome="trocar" />}>Trocar de conta</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              {FUNCOES.map((f) => (
                <DropdownMenu.Item key={f.id} selected={f.id === funcao.id} onClick={() => trocarConta(f.id)}>
                  <span className="flex items-center gap-2.5">
                    <Avatar nome={f.pessoa} tamanho={24} />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate">{f.pessoa}</span>
                      <span className="truncate text-xs text-kumo-subtle">{f.rotulo} · {emailDe(f)}</span>
                    </span>
                  </span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
          <DropdownMenu.Separator />
          <DropdownMenu.Item icon={<Ic nome="sair" />} variant="danger" onClick={terminarSessao}>
            Terminar sessão
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
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
  const { funcao } = useApp();
  const { open, setOpen, isMobile, setOpenMobile, isPeeking } = useSidebar();
  const { areaId, moduloId } = localizar(pathname);
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
    const [a, m] = href.split("/").filter(Boolean);
    const area = AREAS.find((x) => x.id === a);
    const mod = area?.modulos.find((x) => x.id === m);
    return area && mod && podeVer(funcao, area.id, mod.id) ? { href, rotulo: mod.rotulo, area: area.rotulo, icone: mod.icone } : null;
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
              <Sidebar.MenuSub>
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
            <Sidebar.MenuButton icon={ICONES.casa} href="/" active={areaId === "inicio"} onClick={ir("/")} tooltip="Início">
              Início
            </Sidebar.MenuButton>
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
                  <Sidebar.MenuSub>
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
        {grupos.map((g) => (
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
                      <Sidebar.MenuSub>{sub(a)}</Sidebar.MenuSub>
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
  const { funcao } = useApp();
  const [q, setQ] = useState("");
  const grupos = useMemo(() => {
    const termo = q.trim().toLowerCase();
    return AREAS.filter((a) => podeVer(funcao, a.id))
      .map((a) => ({
        id: a.id,
        label: a.rotulo,
        items: a.modulos.filter((m) => podeVer(funcao, a.id, m.id) && (termo === "" || `${a.rotulo} ${m.rotulo}`.toLowerCase().includes(termo))).map((m) => ({ id: `${a.id}/${m.id}`, title: m.rotulo, icone: m.icone, href: caminho(a.id, m.id) })),
      }))
      .filter((g) => g.items.length > 0)
      .concat(
        (() => {
          const itens = SECOES_CONTA.filter((c) => termo === "" || `conta definições ${c.rotulo}`.toLowerCase().includes(termo)).map((c) => ({ id: `conta/${c.id}`, title: c.rotulo, icone: c.icone, href: caminhoConta(c.id) }));
          return itens.length > 0 ? [{ id: "conta", label: "Definições da conta", items: itens }] : [];
        })(),
      );
  }, [q, funcao]);
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
                    </span>
                  </CommandPalette.Item>
                )}
              </CommandPalette.Items>
            </CommandPalette.Group>
          )}
        </CommandPalette.Results>
        <CommandPalette.Empty>{T.topo.semResultados}</CommandPalette.Empty>
      </CommandPalette.List>
    </CommandPalette.Root>
  );
}

function Cabecalho({ aoPesquisar }: { aoPesquisar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { areaId, moduloId } = localizar(pathname);
  const area = AREAS.find((a) => a.id === areaId);
  const modulo = area?.modulos.find((m) => m.id === moduloId);
  const ir = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(href);
  };
  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between gap-3 border-b border-kumo-hairline bg-kumo-canvas px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="md:hidden">
          <AlternarBarra />
        </span>
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
      </div>
      <div className="flex items-center gap-1">
        <Tooltip content={T.topo.pesquisar} render={<Button variant="ghost" shape="square" icon={ICONES.lupa} aria-label={T.topo.pesquisar} onClick={aoPesquisar} />} />
        <span className="hidden text-xs text-kumo-subtle sm:inline">{T.topo.simulacao}</span>
      </div>
    </header>
  );
}

function Rodape() {
  const { funcao } = useApp();
  const ligacoes = [
    { href: "/", rotulo: T.visao.titulo },
    ...(podeVer(funcao, "analise", "ficheiros") ? [{ href: "/analise/ficheiros/", rotulo: "Análise de dados" }] : []),
    ...(podeVer(funcao, "admin", "atividade") ? [{ href: "/admin/atividade/", rotulo: "Registo de atividade" }] : []),
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
    if (!window.location.pathname.startsWith("/analise/")) router.push("/analise/ficheiros/");
  }, [router]);
  useEntradaGlobal(podeAnalisar, irParaAnalise);
  useEffect(() => {
    if (!publica) registarRecente(pathname);
  }, [pathname, publica]);
  useEffect(() => {
    const abrir = () => setPesquisa(true);
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPesquisa((p) => !p);
      }
    };
    window.addEventListener("painel:pesquisa", abrir);
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("painel:pesquisa", abrir);
      window.removeEventListener("keydown", tecla);
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
            <Rodape />
          </div>
        </Sidebar.Provider>
        <Pesquisa aberta={pesquisa} aoMudar={setPesquisa} />
      </Toasty>
    </TooltipProvider>
  );
}
