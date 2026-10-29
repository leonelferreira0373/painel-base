// O seletor de opções fixas com a última opção «Personalizado…»: quem precisa de outro valor escreve a sua especificação (um número de minutos, de dias, o nome de um fuso…) numa janela modal (a mesma de todas as ações do painel, Confirmar). Os valores personalizados ficam guardados na conta, aparecem como opções e gerem-se na mesma janela: usar e remover. É o único seletor de opções fixas do painel que aceita um valor livre: nenhum ecrã desenha o seu próprio campo «outro».
"use client";

import { Button, Input, Select } from "@cloudflare/kumo";
import { useState } from "react";
import { useConta } from "@/lib/conta";
import { Confirmar } from "./conta/Pecas";
import { ICONES } from "./Icones";

/** A especificação que a pessoa pode escrever em vez das opções fixas. */
export interface EspecificacaoPersonalizada {
  /** Identifica a lista de valores guardados deste seletor na conta. */
  chave: string;
  /** O valor para onde volta o seletor quando se remove o valor personalizado que estava em uso. */
  omissao: string;
  /** O que se escreve («Minutos», «Dias», «Nome do fuso»). */
  rotulo: string;
  /** «formatoData» não se escreve: escolhe-se a ordem, o separador e o ano, e o código monta o padrão. */
  tipo: "numero" | "texto" | "formatoData";
  /** A unidade a seguir ao campo (por exemplo «minutos»). */
  unidade?: string;
  /** Limites de um número inteiro. */
  min?: number;
  max?: number;
  /** Um exemplo, no campo vazio. */
  exemplo?: string;
  /** Como se mostra no seletor um valor personalizado já guardado. */
  mostrar: (valor: string) => string;
  /** Mensagem de erro para o que foi escrito, ou null se serve (além dos limites do número). */
  validar?: (escrito: string) => string | null;
  /** Converte o que foi escrito no valor guardado (por omissão, o próprio texto). */
  guardar?: (escrito: string) => string;
  /** O contrário: o que mostrar no campo ao editar um valor personalizado já guardado (por omissão, o próprio valor). */
  escrito?: (valor: string) => string;
}

const PERSONALIZADO = "__personalizado__";

const ORDENS: Record<string, string> = { dma: "Dia, mês e ano", mda: "Mês, dia e ano", amd: "Ano, mês e dia" };
const SEPARADORES: Record<string, string> = { "/": "Barra ( / )", ".": "Ponto ( . )", "-": "Hífen ( - )", " ": "Espaço" };
const ANOS: Record<string, string> = { yyyy: "Quatro dígitos (2026)", yy: "Dois dígitos (26)" };

/** O padrão que as três escolhas dão: «dma» + «.» + «yyyy» → «dd.MM.yyyy». */
const montarPadrao = (ordem: string, sep: string, ano: string) => ordem.split("").map((c) => (c === "d" ? "dd" : c === "m" ? "MM" : ano)).join(sep);

/** O contrário: das três escolhas a partir de um padrão guardado. */
function lerPadrao(padrao: string): { ordem: string; sep: string; ano: string } {
  const letras = padrao.replace(/[^dMy]/g, "").replace(/dd/g, "d").replace(/M+/g, "m").replace(/y+/g, "a");
  return { ordem: ORDENS[letras] ? letras : "dma", sep: Object.keys(SEPARADORES).find((s) => padrao.includes(s)) ?? "/", ano: padrao.includes("yyyy") ? "yyyy" : "yy" };
}

function erroDe(e: EspecificacaoPersonalizada, escrito: string): string | null {
  const t = escrito.trim();
  if (!t) return "Escreva um valor.";
  if (e.tipo === "numero") {
    if (!/^\d+$/.test(t)) return "Escreva um número inteiro.";
    const n = Number(t);
    if (e.min !== undefined && n < e.min) return `O mínimo é ${e.min}.`;
    if (e.max !== undefined && n > e.max) return `O máximo é ${e.max}.`;
  }
  return e.validar?.(t) ?? null;
}

export function SeletorPersonalizavel({
  valor,
  opcoes,
  personalizado,
  aoMudar,
  label,
  labelTooltip,
  rotulo,
  className,
  disabled,
}: {
  valor: string;
  /** As opções fixas: valor → texto. */
  opcoes: Record<string, string>;
  personalizado: EspecificacaoPersonalizada;
  aoMudar: (valor: string) => void;
  /** O rótulo visível do campo (num formulário) ou, sem ele, o `rotulo` para leitores de ecrã. */
  label?: string;
  labelTooltip?: string;
  rotulo?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { conta, mudar } = useConta();
  const lista = conta.personalizados?.[personalizado.chave] ?? [];
  const [aberto, setAberto] = useState(false);
  const [escrito, setEscrito] = useState("");
  const guardarLista = (nova: string[]) => mudar({ personalizados: { ...(conta.personalizados ?? {}), [personalizado.chave]: nova } });
  // o valor em uso que não é fixo nem está guardado (de uma versão anterior) também aparece
  const extra = [...lista, ...(valor in opcoes || lista.includes(valor) ? [] : [valor])];
  const itens: Record<string, string> = { ...opcoes, ...Object.fromEntries(extra.map((v) => [v, personalizado.mostrar(v)])), [PERSONALIZADO]: extra.length ? "Gerir personalizados…" : "Personalizado…" };
  const eData = personalizado.tipo === "formatoData";
  const [formato, setFormato] = useState({ ordem: "dma", sep: "/", ano: "yyyy" });
  const padrao = montarPadrao(formato.ordem, formato.sep, formato.ano);
  const erro = eData ? null : erroDe(personalizado, escrito);
  const novo = eData ? padrao : personalizado.guardar ? personalizado.guardar(escrito.trim()) : escrito.trim();
  const abrir = () => {
    if (!(valor in opcoes) && !lista.includes(valor)) guardarLista([...lista, valor]);
    setEscrito("");
    if (eData) setFormato(!(valor in opcoes) ? lerPadrao(valor) : { ordem: "dma", sep: "/", ano: "yyyy" });
    setAberto(true);
  };
  const adicionar = () => {
    if (erro) return;
    if (!lista.includes(novo)) guardarLista([...lista, novo]);
    aoMudar(novo);
    setAberto(false);
  };
  const remover = (v: string) => {
    guardarLista(lista.filter((x) => x !== v));
    if (v === valor) aoMudar(personalizado.omissao);
  };
  const guardados = lista.length ? lista : !(valor in opcoes) ? [valor] : [];
  return (
    <>
      <Select label={label} labelTooltip={labelTooltip} aria-label={label ? undefined : rotulo} value={valor} disabled={disabled} className={className} items={itens} onValueChange={(v) => (String(v) === PERSONALIZADO ? abrir() : aoMudar(String(v)))} />
      <Confirmar aberto={aberto} aoMudar={setAberto} titulo="Valores personalizados" texto={`${label ?? rotulo ?? personalizado.rotulo}: escreva o valor que quer usar em vez das opções fixas. Fica guardado e pode voltar a usá-lo ou removê-lo aqui.`} rotuloAcao="Adicionar e usar" aoConfirmar={adicionar} desativado={!!erro}>
        <div className="flex flex-col gap-4">
          {guardados.length > 0 && (
            <ul className="flex flex-col divide-y divide-kumo-hairline rounded-lg ring ring-kumo-line" aria-label="Valores guardados">
              {guardados.map((v) => (
                <li key={v} className="flex items-center justify-between gap-2 py-1.5 pl-3 pr-1.5 text-sm">
                  <span className="min-w-0 truncate text-kumo-default">
                    {personalizado.mostrar(v)}
                    {v === valor && <span className="ml-2 text-xs text-kumo-subtle">em uso</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    {v !== valor && (
                      <Button variant="ghost" size="xs" onClick={() => (aoMudar(v), setAberto(false))}>
                        Usar
                      </Button>
                    )}
                    <Button variant="ghost" size="xs" shape="square" icon={ICONES.lixo} aria-label={`Remover ${personalizado.mostrar(v)}`} onClick={() => remover(v)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {eData ? (
            <div className="flex flex-col gap-3">
              <Select label="Ordem" value={formato.ordem} onValueChange={(v) => setFormato((f) => ({ ...f, ordem: String(v) }))} items={ORDENS} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Separador" value={formato.sep} onValueChange={(v) => setFormato((f) => ({ ...f, sep: String(v) }))} items={SEPARADORES} />
                <Select label="Ano" value={formato.ano} onValueChange={(v) => setFormato((f) => ({ ...f, ano: String(v) }))} items={ANOS} />
              </div>
              <div className="text-sm text-kumo-subtle">
                Fica assim: <span className="font-medium tabular-nums text-kumo-default">{personalizado.mostrar(padrao)}</span>
              </div>
            </div>
          ) : (
          <div className="flex items-end gap-2">
            <Input
              label={guardados.length ? `Novo valor: ${personalizado.rotulo.toLowerCase()}` : personalizado.rotulo}
              type="text"
              inputMode={personalizado.tipo === "numero" ? "numeric" : undefined}
              placeholder={personalizado.exemplo}
              value={escrito}
              onChange={(e) => setEscrito(personalizado.tipo === "numero" ? e.target.value.replace(/\D/g, "") : e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionar();
              }}
              error={escrito.trim() !== "" ? (erro ?? undefined) : undefined}
              autoFocus
              className="w-full"
            />
            {personalizado.unidade && <span className="pb-2 text-sm text-kumo-subtle">{personalizado.unidade}</span>}
          </div>
          )}
        </div>
      </Confirmar>
    </>
  );
}
