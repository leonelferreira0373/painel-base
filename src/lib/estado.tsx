// Estado da aplicação: função ativa (RBAC simulado), registos dos módulos com interface otimista e os ficheiros analisados.
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { REGISTOS } from "@/dados/modulos";
import { criarNotificacao, MODULO_NOTIFICACOES } from "@/dados/notificacoes";
import { FUNCOES, funcaoPorId, type Funcao } from "@/dados/rbac";
import { aplicarModulos } from "@/lib/modulos";
import { useConfigDoPainel, type PainelConfig } from "@/lib/painel-config";
import type { DefRegistos, DefTransicao, Linha } from "@/dados/tipos";
import { chamar, lerLigacao, useLigacao } from "@/lib/api/cliente";
import { extrairFicheiro } from "@/lib/extract";
import { analisar } from "@/lib/analysis/perfil";
import type { Sugestao } from "@/lib/analysis/sugestoes";
import type { Extraido, Perfil, Tabela } from "@/lib/tipos";
import { guardar, ler } from "@/lib/persistencia";
import { Frase } from "@/components/Frase";
import { toasts } from "@/lib/toasts";

interface Api {
  /** A função ativa, já sem as áreas e os módulos que o Master Admin desligou. */
  funcao: Funcao;
  /** Os módulos ligados e desligados (e como mudá-los). */
  painel: PainelConfig;
  mudarFuncao: (id: string) => void;
  registos: Record<string, Linha[]>;
  pendentes: Set<string>;
  transitar: (modulo: string, linha: Linha, t: DefTransicao) => void;
  criar: (modulo: string, valores: Record<string, string>) => void;
  ficheiros: Extraido[];
  tabelas: Tabela[];
  tabelaAtiva: Tabela | null;
  escolherTabela: (id: string) => void;
  perfil: Perfil | null;
  perfilDe: (t: Tabela) => Perfil;
  progresso: string | null;
  adicionar: (ficheiros: File[]) => Promise<void>;
  adicionarTexto: (nome: string, texto: string) => Promise<void>;
  adicionarUrl: (url: string) => Promise<void>;
  removerFicheiro: (id: string) => void;
  limparAnalise: () => void;
  guardados: Sugestao[];
  guardarGrafico: (s: Sugestao) => void;
  removerGuardado: (id: string) => void;
  avisar: (texto: string) => void;
  pronto: boolean;
}

const Ctx = createContext<Api | null>(null);

export function useApp(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp fora do Provider");
  return v;
}

const inicial = () => Object.fromEntries(Object.values(REGISTOS).map((d) => [d.id, d.semente()]));

export function Provider({ children }: { children: ReactNode }) {
  const [funcaoId, setFuncaoId] = useState(FUNCOES[0].id);
  const painel = useConfigDoPainel();
  const [registos, setRegistos] = useState<Record<string, Linha[]>>(inicial);
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());
  const [ficheiros, setFicheiros] = useState<Extraido[]>([]);
  const [tabelaId, setTabelaId] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [guardados, setGuardados] = useState<Sugestao[]>([]);
  const cache = useRef(new Map<string, Perfil>());
  const contador = useRef(1000);

  const avisar = useCallback((texto: string) => {
    toasts.add({ title: <Frase>{texto}</Frase>, timeout: 4200 });
  }, []);

  // Com o painel ligado a um servidor, os módulos que declaram `api` leem as linhas dele; ao desligar, voltam aos dados de demonstração.
  const ligacao = useLigacao();
  const modoAnterior = useRef(ligacao.modo);
  const carregarDaApi = useCallback(async (def: DefRegistos) => {
    if (!def.api) return;
    const r = await chamar<{ itens: Record<string, string | number>[] }>(lerLigacao(), "GET", def.api.lista);
    const linhas = r.itens.map((it, i) => ({ ...(def.api?.mapear ? def.api.mapear(it) : it), id: String(it.id ?? `${def.id}-${i + 1}`) }) as Linha);
    setRegistos((x) => ({ ...x, [def.id]: linhas }));
  }, []);
  useEffect(() => {
    const defs = Object.values(REGISTOS).filter((d) => d.api);
    const veioDeLigado = modoAnterior.current === "ligado";
    modoAnterior.current = ligacao.modo;
    if (ligacao.modo === "ligado") {
      let vivo = true;
      defs.forEach((d) => carregarDaApi(d).catch((e) => vivo && avisar(`${d.titulo}: ${e instanceof Error ? e.message : "não foi possível ler do servidor"}`)));
      return () => {
        vivo = false;
      };
    }
    if (veioDeLigado) setRegistos((x) => ({ ...x, ...Object.fromEntries(defs.map((d) => [d.id, d.semente()])) }));
  }, [ligacao.modo, ligacao.base, ligacao.token, carregarDaApi, avisar]);

  // Restaura a função escolhida e os ficheiros já analisados: recarregar a página não volta a zero.
  useEffect(() => {
    try {
      const f = window.localStorage.getItem("painel.funcao");
      if (f && FUNCOES.some((x) => x.id === f)) setFuncaoId(f);
    } catch {
      /* sem armazenamento */
    }
    ler<{ ficheiros: Extraido[]; tabelaId: string | null }>("analise").then((d) => {
      if (d?.ficheiros?.length) {
        setFicheiros(d.ficheiros);
        setTabelaId(d.tabelaId);
      }
      setPronto(true);
    });
  }, []);

  const gravar = useCallback((fs: Extraido[], t: string | null) => {
    void guardar("analise", { ficheiros: fs, tabelaId: t });
  }, []);

  const mudarFuncao = useCallback((id: string) => {
    setFuncaoId(id);
    try {
      window.localStorage.setItem("painel.funcao", id);
    } catch {
      /* sem armazenamento */
    }
  }, []);

  const marcar = useCallback((chave: string) => {
    setPendentes((p) => new Set(p).add(chave));
    window.setTimeout(
      () =>
        setPendentes((p) => {
          const n = new Set(p);
          n.delete(chave);
          return n;
        }),
      700,
    );
  }, []);

  const transitar = useCallback(
    (modulo: string, linha: Linha, t: DefTransicao) => {
      const def = REGISTOS[modulo];
      const chave = def.estadoChave ?? "estado";
      if (def.api?.estado && lerLigacao().modo === "ligado") chamar(lerLigacao(), "PATCH", def.api.estado, { estado: t.para }, { id: linha.id }).catch((e) => avisar(e instanceof Error ? e.message : "O servidor não aceitou a mudança"));
      const extra = t.aplicar ? t.aplicar(linha, contador.current++) : {};
      setRegistos((r) => {
        const proximo = { ...r, [modulo]: r[modulo].map((l) => (l.id === linha.id ? ({ ...l, ...extra, [chave]: t.para } as Linha) : l)) };
        if (t.notifica && r[MODULO_NOTIFICACOES]) {
          const nova = criarNotificacao(def, linha, t, contador.current++, new Date().toISOString().slice(0, 10));
          proximo[MODULO_NOTIFICACOES] = [nova, ...r[MODULO_NOTIFICACOES]];
        }
        return proximo;
      });
      marcar(`${modulo}:${linha.id}`);
      avisar(t.notifica ? "Estado atualizado e notificação enviada ao cliente" : "Estado atualizado");
    },
    [avisar, marcar],
  );

  const criar = useCallback(
    (modulo: string, valores: Record<string, string>) => {
      const def = REGISTOS[modulo];
      const n = contador.current++;
      const prefixo = def.id.slice(0, 2).toUpperCase();
      const nova: Linha = { id: `${modulo}-n${n}`, ...valores, ...(def.estadoChave ? { [def.estadoChave]: def.estadoInicial ?? def.transicoes?.[0]?.de[0] ?? "Pedido" } : {}), ...(def.colunas.some((c) => c.chave === "processo") ? { processo: `${prefixo}-${String(2700 + (n % 1000)).padStart(5, "0")}` } : {}) };
      setRegistos((r) => ({ ...r, [modulo]: [nova, ...r[modulo]] }));
      marcar(`${modulo}:${nova.id}`);
      if (def.api?.criar && lerLigacao().modo === "ligado") chamar(lerLigacao(), "POST", def.api.criar, valores).then(() => carregarDaApi(def)).catch((e) => avisar(e instanceof Error ? e.message : "O servidor não aceitou o registo"));
      avisar("Registo criado");
    },
    [avisar, marcar],
  );

  const processar = useCallback(
    async (fn: () => Promise<Extraido[]>) => {
      try {
        const novos = await fn();
        setFicheiros((antes) => {
          const todos = [...antes, ...novos];
          const primeira = novos.flatMap((e) => e.tabelas)[0];
          setTabelaId((atual) => {
            const id = atual && todos.some((e) => e.tabelas.some((t) => t.id === atual)) ? atual : (primeira?.id ?? null);
            gravar(todos, id);
            return id;
          });
          return todos;
        });
        const nTabelas = novos.reduce((s, e) => s + e.tabelas.length, 0);
        avisar(nTabelas > 0 ? `${novos.length} ficheiro(s) lido(s), ${nTabelas} tabela(s) extraída(s)` : "O ficheiro foi lido, mas não contém tabelas");
      } catch (e) {
        avisar(`Não foi possível ler: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setProgresso(null);
      }
    },
    [avisar, gravar],
  );

  const adicionar = useCallback(
    async (fs: File[]) => {
      await processar(async () => {
        const saida: Extraido[] = [];
        for (const f of fs) saida.push(...(await extrairFicheiro(f, { progresso: setProgresso })));
        return saida;
      });
    },
    [processar],
  );

  const adicionarTexto = useCallback(
    async (nome: string, texto: string) => {
      await adicionar([new File([texto], nome, { type: "text/plain" })]);
    },
    [adicionar],
  );

  const adicionarUrl = useCallback(
    async (url: string) => {
      setProgresso(`A descarregar ${url}`);
      try {
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error(`o servidor respondeu ${resposta.status}`);
        const blob = await resposta.blob();
        const nome = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() ?? "ficheiro-remoto");
        await adicionar([new File([blob], nome, { type: blob.type })]);
      } catch (e) {
        setProgresso(null);
        const msg = e instanceof TypeError ? "o servidor de origem não permite a leitura direta a partir do navegador (CORS); descarregue o ficheiro e arraste-o para aqui" : e instanceof Error ? e.message : String(e);
        avisar(`Não foi possível importar o endereço: ${msg}`);
      }
    },
    [adicionar, avisar],
  );

  const removerFicheiro = useCallback(
    (id: string) => {
      setFicheiros((antes) => {
        const resto = antes.filter((e) => e.id !== id);
        setTabelaId((atual) => {
          const ainda = atual && resto.some((e) => e.tabelas.some((t) => t.id === atual)) ? atual : (resto.flatMap((e) => e.tabelas)[0]?.id ?? null);
          gravar(resto, ainda);
          return ainda;
        });
        return resto;
      });
    },
    [gravar],
  );

  const limparAnalise = useCallback(() => {
    setFicheiros([]);
    setTabelaId(null);
    cache.current.clear();
    setGuardados([]);
    gravar([], null);
    avisar("Análise limpa");
  }, [avisar, gravar]);

  const escolherTabela = useCallback(
    (id: string) => {
      setTabelaId(id);
      gravar(ficheiros, id);
    },
    [ficheiros, gravar],
  );

  const tabelas = useMemo(() => ficheiros.flatMap((e) => e.tabelas), [ficheiros]);
  const tabelaAtiva = useMemo(() => tabelas.find((t) => t.id === tabelaId) ?? tabelas[0] ?? null, [tabelas, tabelaId]);
  const perfilDe = useCallback((t: Tabela) => {
    let p = cache.current.get(t.id);
    if (!p) {
      p = analisar(t);
      cache.current.set(t.id, p);
    }
    return p;
  }, []);
  const perfil = useMemo(() => (tabelaAtiva ? perfilDe(tabelaAtiva) : null), [tabelaAtiva, perfilDe]);

  const funcaoDaPessoa = useMemo(() => aplicarModulos(funcaoPorId(funcaoId), painel.config), [funcaoId, painel.config]);

  const api: Api = {
    funcao: funcaoDaPessoa,
    painel,
    mudarFuncao,
    registos,
    pendentes,
    transitar,
    criar,
    ficheiros,
    tabelas,
    tabelaAtiva,
    escolherTabela,
    perfil,
    perfilDe,
    progresso,
    adicionar,
    adicionarTexto,
    adicionarUrl,
    removerFicheiro,
    limparAnalise,
    guardados,
    guardarGrafico: (s) => {
      setGuardados((g) => [...g.filter((x) => x.id !== s.id), s]);
      avisar("Gráfico guardado no relatório");
    },
    removerGuardado: (id) => setGuardados((g) => g.filter((x) => x.id !== id)),
    avisar,
    pronto,
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
