// O filtro de uma coluna: o botão do cabeçalho (um funil, no lugar da dupla seta de ordenar, que fica só para números e datas) e a janela com todas as opções que a coluna tem. Cada opção tem o seu interruptor para ver ou esconder, há uma pesquisa para as encontrar quando são muitas e uma pergunta à IA («só o que tem a ver com e-mails»). O que se escolhe fica guardado por tabela e por coluna.
"use client";

import { Button, Dialog, Input, Loader } from "@cloudflare/kumo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { esconderTudoExcepto, procurarOpcoes, resumoDoFiltro, type Opcao } from "@/lib/filtro-colunas";
import { escolherComIa } from "@/lib/filtro-ia";
import { Interruptor } from "./conta/Pecas";
import { Dica } from "./Dica";
import { Ic, ICONES } from "./Icones";

// ---------- o que se escolheu, guardado ----------

const CHAVE = "painel.filtros";
const EVENTO = "painel:filtros";
type Guardados = Record<string, Record<string, string[]>>;

const lerTodos = (): Guardados => {
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}") as Guardados;
  } catch {
    return {};
  }
};

/** O que cada coluna de uma tabela tem escondido (por valor), guardado neste navegador. */
export function useFiltrosDaTabela(tabela: string): { escondidos: Record<string, Set<string>>; definir: (coluna: string, escondidos: Set<string>) => void; limparTudo: () => void; ativos: number } {
  const [todos, setTodos] = useState<Guardados>({});
  useEffect(() => {
    const ler = () => setTodos(lerTodos());
    ler();
    window.addEventListener(EVENTO, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  const definir = useCallback(
    (coluna: string, escondidos: Set<string>) => {
      const atual = lerTodos();
      const da = { ...(atual[tabela] ?? {}) };
      if (escondidos.size) da[coluna] = [...escondidos];
      else delete da[coluna];
      const novo = { ...atual, [tabela]: da };
      if (!Object.keys(da).length) delete novo[tabela];
      try {
        window.localStorage.setItem(CHAVE, JSON.stringify(novo));
      } catch {
        /* sem armazenamento */
      }
      window.dispatchEvent(new Event(EVENTO));
    },
    [tabela],
  );
  const limparTudo = useCallback(() => {
    const atual = lerTodos();
    delete atual[tabela];
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(atual));
    } catch {
      /* sem armazenamento */
    }
    window.dispatchEvent(new Event(EVENTO));
  }, [tabela]);
  const escondidos = useMemo(() => Object.fromEntries(Object.entries(todos[tabela] ?? {}).map(([c, v]) => [c, new Set(v)])), [todos, tabela]);
  return { escondidos, definir, limparTudo, ativos: Object.keys(escondidos).length };
}

// ---------- o botão do cabeçalho ----------

/** O funil de uma coluna que não se ordena: abre o filtro e mostra quantas opções estão à vista quando há filtro. */
export function BotaoDeFiltro({ rotulo, escondidas, aoAbrir, numerica }: { rotulo: string; escondidas: number; aoAbrir: () => void; numerica?: boolean }) {
  return (
    <Dica conteudo={escondidas ? `Filtro ligado em ${rotulo}: ${escondidas} ${escondidas === 1 ? "opção escondida" : "opções escondidas"}. Clique para mudar.` : `Filtrar ${rotulo}: escolha, de todas as opções, as que quer ver.`}>
      <button type="button" onClick={aoAbrir} aria-label={`Filtrar: ${rotulo}`} className={`inline-flex items-center gap-1.5 font-medium hover:text-kumo-default ${numerica ? "flex-row-reverse" : ""}`}>
        {rotulo}
        <span className="relative inline-flex">
          <Ic nome="filtrar" tamanho={13} peso={escondidas ? "fill" : "regular"} className={escondidas ? "text-kumo-default" : "text-kumo-inactive"} />
          {escondidas > 0 && <span aria-hidden className="absolute -right-1 -top-1 size-1.5 rounded-full bg-kumo-brand" />}
        </span>
      </button>
    </Dica>
  );
}

// ---------- a janela ----------

const POR_VEZ = 150;

export function JanelaDeFiltro({ rotulo, opcoes, escondidos, aoMudar, aoFechar }: { rotulo: string; opcoes: Opcao[]; escondidos: Set<string>; aoMudar: (e: Set<string>) => void; aoFechar: () => void }) {
  const [texto, setTexto] = useState("");
  const [pedido, setPedido] = useState("");
  const [aPensar, setAPensar] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [quantas, setQuantas] = useState(POR_VEZ);
  useEffect(() => {
    setTexto("");
    setPedido("");
    setNota(null);
    setQuantas(POR_VEZ);
  }, [rotulo]);
  const visiveis = useMemo(() => procurarOpcoes(opcoes, texto), [opcoes, texto]);
  const alternar = (valor: string) => {
    const novo = new Set(escondidos);
    if (novo.has(valor)) novo.delete(valor);
    else if (novo.size < opcoes.length - 1) novo.add(valor); // pelo menos uma fica à vista
    aoMudar(novo);
  };
  const perguntar = async () => {
    if (!pedido.trim()) return;
    setAPensar(true);
    setNota(null);
    const r = await escolherComIa(rotulo, opcoes, pedido);
    setAPensar(false);
    if (r.escolhidas.length === 0) return setNota(r.viaIa ? "A IA não encontrou nenhuma opção que sirva a este pedido." : "Não encontrei nenhuma opção com essas palavras.");
    aoMudar(esconderTudoExcepto(opcoes, r.escolhidas));
    setNota(`${r.viaIa ? "A IA deixou à vista" : "Deixei à vista, pelas palavras,"} ${r.escolhidas.length} ${r.escolhidas.length === 1 ? "opção" : "opções"}.`);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Dialog.Title className="min-w-0 text-lg font-semibold">
          <span className="block truncate">Filtrar · {rotulo}</span>
        </Dialog.Title>
        <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
      </div>

      <form
        className="flex flex-col gap-2 rounded-xl bg-kumo-tint p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void perguntar();
        }}
      >
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <Ic nome="ia" tamanho={14} />
          Pesquisar com a IA
        </span>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input aria-label="Filtrar por descrição" placeholder="Ex.: tudo o que tem a ver com e-mails" value={pedido} onChange={(e) => setPedido(e.target.value)} autoComplete="off" className="w-full" />
          </div>
          <Button type="submit" variant="secondary" disabled={!pedido.trim() || aPensar} icon={aPensar ? <Loader size={14} /> : ICONES.enviar}>
            Perguntar
          </Button>
        </div>
        {nota && (
          <p className="text-sm text-kumo-subtle" role="status">
            {nota}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Ic nome="lupa" tamanho={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-kumo-subtle" />
          <Input aria-label="Pesquisar nas opções" placeholder={`Pesquisar nas ${opcoes.length} opções`} value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" className="w-full pl-9" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-kumo-subtle tabular-nums">{resumoDoFiltro(opcoes, escondidos)} à vista</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={escondidos.size === 0} onClick={() => aoMudar(new Set([...escondidos].filter((v) => !visiveis.some((o) => o.valor === v))))}>
              {texto.trim() ? "Ver as da pesquisa" : "Ver todas"}
            </Button>
            {texto.trim() && visiveis.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => aoMudar(esconderTudoExcepto(opcoes, visiveis.map((o) => o.valor)))}>
                Só as da pesquisa
              </Button>
            )}
          </div>
        </div>
        <ul className="sem-barra flex max-h-[42dvh] flex-col overflow-y-auto rounded-xl ring ring-kumo-line">
          {visiveis.length === 0 && <li className="p-4 text-sm text-kumo-subtle">Nenhuma opção tem este texto.</li>}
          {visiveis.slice(0, quantas).map((o) => (
            <li key={o.valor} className="flex items-center justify-between gap-3 border-t border-kumo-hairline px-3 py-2 first:border-t-0">
              <span className="min-w-0 truncate text-sm" title={o.valor}>
                {o.valor}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-xs tabular-nums text-kumo-subtle">{o.contagem.toLocaleString("pt-PT")}</span>
                <Interruptor marcado={!escondidos.has(o.valor)} aoMudar={() => alternar(o.valor)} rotulo={`Ver ${o.valor}`} />
              </span>
            </li>
          ))}
          {visiveis.length > quantas && (
            <li className="flex justify-center border-t border-kumo-hairline p-2">
              <Button size="sm" variant="ghost" onClick={() => setQuantas((q) => q + POR_VEZ)}>
                Mostrar mais ({visiveis.length - quantas})
              </Button>
            </li>
          )}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" disabled={escondidos.size === 0} onClick={() => aoMudar(new Set())}>
          Limpar o filtro
        </Button>
        <Button variant="primary" onClick={aoFechar}>
          Concluído
        </Button>
      </div>
    </div>
  );
}

/** A janela do filtro de uma tabela: abre-se para a coluna escolhida. */
export function FiltroDaTabela({ coluna, opcoes, escondidos, aoMudar, aoFechar }: { coluna: string | null; opcoes: Opcao[]; escondidos: Set<string>; aoMudar: (e: Set<string>) => void; aoFechar: () => void }) {
  return (
    <Dialog.Root open={coluna !== null} onOpenChange={(v) => !v && aoFechar()}>
      <Dialog size="lg" className="max-h-[92dvh] overflow-y-auto p-5 sm:p-6">
        {coluna !== null && <JanelaDeFiltro rotulo={coluna} opcoes={opcoes} escondidos={escondidos} aoMudar={aoMudar} aoFechar={aoFechar} />}
      </Dialog>
    </Dialog.Root>
  );
}
