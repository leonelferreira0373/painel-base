// A janela «Analisar com IA»: abre-se pelo «…» de um cartão, de uma lista ou de um registo (ou pelo botão «Nova análise»). A pessoa diz, se quiser, o que quer saber, escolhe a profundidade e o foco da resposta e se a IA pesquisa na internet, e a análise entra na fila. Quando acabar, a IA avisa no chat.
"use client";

import { Button, Dialog, Input, InputArea, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { registar } from "@/lib/atividade";
import { useApp } from "@/lib/estado";
import { CONFIG_DE_ORIGEM, criarTrabalho, ENFASES, EVENTO_ANALISAR, FOCOS, etasDaFila, lerTrabalhos, PROFUNDIDADES, textoDoTempo, type AlvoDeAnalise, type ConfigDaPesquisa, type Enfase, type Foco, type Profundidade } from "@/lib/pesquisa-profunda";
import { Interruptor } from "../conta/Pecas";
import { Frase } from "../Frase";
import { ICONES } from "../Icones";

const ULTIMA = "painel.pesquisa.config";
const lerConfig = (): ConfigDaPesquisa => {
  try {
    return { ...CONFIG_DE_ORIGEM, ...(JSON.parse(window.localStorage.getItem(ULTIMA) ?? "{}") as Partial<ConfigDaPesquisa>) };
  } catch {
    return CONFIG_DE_ORIGEM;
  }
};

const itens = <T extends string>(o: Record<T, { rotulo: string }>, extra?: (k: T) => string) => Object.fromEntries((Object.keys(o) as T[]).map((k) => [k, extra ? `${o[k].rotulo} · ${extra(k)}` : o[k].rotulo]));

export function AnalisarComIa() {
  const { avisar } = useApp();
  const [alvo, setAlvo] = useState<AlvoDeAnalise | null>(null);
  const [pedido, setPedido] = useState("");
  const [titulo, setTitulo] = useState("");
  const [config, setConfig] = useState<ConfigDaPesquisa>(CONFIG_DE_ORIGEM);

  useEffect(() => {
    const abrir = (e: Event) => {
      const a = (e as CustomEvent<{ alvo: AlvoDeAnalise }>).detail.alvo;
      setAlvo({ ...a, pagina: a.pagina ?? window.location.pathname });
      setPedido("");
      setTitulo("");
      setConfig(lerConfig());
    };
    window.addEventListener(EVENTO_ANALISAR, abrir);
    return () => window.removeEventListener(EVENTO_ANALISAR, abrir);
  }, []);

  const livre = alvo?.tipo === "livre";
  const tituloFinal = livre ? titulo.trim() || pedido.trim().slice(0, 70) : (alvo?.titulo ?? "");
  const naFila = alvo ? lerTrabalhos().filter((t) => t.estado === "fila" || t.estado === "a pesquisar" || t.estado === "em pausa").length : 0;
  const espera = useMemo(() => {
    if (!alvo) return null;
    const hipotese = [...lerTrabalhos(), { ...criarFicticio(config) }];
    return etasDaFila(hipotese).get("novo") ?? null;
  }, [alvo, config]);

  const mudar = <K extends keyof ConfigDaPesquisa>(k: K, v: ConfigDaPesquisa[K]) => setConfig((c) => ({ ...c, [k]: v }));
  const comecar = () => {
    if (!alvo || (livre && !tituloFinal)) return;
    const t = criarTrabalho({ ...alvo, titulo: tituloFinal }, pedido, config);
    try {
      window.localStorage.setItem(ULTIMA, JSON.stringify(config));
    } catch {
      /* sem armazenamento */
    }
    registar("ia", `Pediu uma análise a fundo de «${t.titulo}» (${PROFUNDIDADES[config.profundidade].rotulo.toLowerCase()}, resposta ${FOCOS[config.foco].rotulo.toLowerCase()}${config.internet ? ", com a internet" : ""})`);
    avisar(naFila > 0 ? `A análise «${t.titulo}» ficou na fila, atrás de ${naFila}` : `A análise «${t.titulo}» começou`);
    setAlvo(null);
  };

  return (
    <Dialog.Root open={!!alvo} onOpenChange={(v) => !v && setAlvo(null)}>
      <Dialog size="lg" className="max-h-[90dvh] overflow-y-auto p-5 sm:p-6">
        {alvo && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Dialog.Title className="text-lg font-semibold">Analisar com IA</Dialog.Title>
              <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
            </div>
            {livre ? (
              <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da análise" autoComplete="off" autoFocus />
            ) : (
              <div className="text-sm font-medium">
                <Frase>{`«${alvo.titulo}»`}</Frase>
              </div>
            )}
            <InputArea label={livre ? "Pergunta" : "Instruções (opcional)"} value={pedido} onValueChange={setPedido} minRows={3} autoResize placeholder={livre ? "Descreva a pergunta ou o tema com o detalhe necessário." : "Ex.: comparar com o mercado e priorizar ações."} autoFocus={!livre} />
            {/* duas colunas iguais (com `1fr` a coluna do texto mais comprido ficava maior) e o interruptor com rótulo e altura de seletor, para tudo alinhar */}
            <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
              <Select label="Profundidade da pesquisa" value={config.profundidade} onValueChange={(v) => mudar("profundidade", String(v) as Profundidade)} items={itens(PROFUNDIDADES, (k) => PROFUNDIDADES[k].estimativa)} />
              <Select label="Foco da resposta" value={config.foco} onValueChange={(v) => mudar("foco", String(v) as Foco)} items={itens(FOCOS)} />
              <Select label="Ênfase" value={config.enfase} onValueChange={(v) => mudar("enfase", String(v) as Enfase)} items={itens(ENFASES)} />
              <div className="flex flex-col gap-2">
                <span className="text-base font-medium text-kumo-default">Internet</span>
                <div className="flex h-9 items-center justify-between gap-3 rounded-lg px-3 ring ring-kumo-line">
                  <span className="min-w-0 truncate text-sm">Pesquisar na internet</span>
                  <Interruptor marcado={config.internet} aoMudar={(v) => mudar("internet", v)} rotulo="Pesquisar na internet" />
                </div>
              </div>
            </div>
            {naFila > 0 && espera !== null && (
              <p className="text-sm text-kumo-subtle">
                {naFila} {naFila === 1 ? "análise" : "análises"} na fila. Conclusão estimada em {textoDoTempo(espera)}.
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setAlvo(null)}>
                Cancelar
              </Button>
              <Button variant="primary" icon={ICONES.ia} disabled={livre && !tituloFinal} onClick={comecar}>
                Iniciar análise
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Dialog.Root>
  );
}

/** Um trabalho de mentira, só para saber quanto demoraria a entrar na fila com esta configuração. */
function criarFicticio(config: ConfigDaPesquisa) {
  return { id: "novo", titulo: "", pedido: "", alvo: { titulo: "", tipo: "livre" as const }, config, estado: "fila" as const, criado: "9999-12-31T00:00:00.000Z", passoAtual: 0, passosPrevistos: PROFUNDIDADES[config.profundidade].passos, passos: [], correcoes: [], notas: [], fontes: [], chamadas: 0, tokens: 0, neurons: 0, custoUsd: 0 };
}
