// A reciclagem do painel: tudo o que alguém apagou, seja de que tipo for, fica aqui durante o prazo definido (90 dias por omissão; só o Master Admin o muda) e pode ser restaurado ou apagado de vez, pelo menu de opções de cada item. Passado o prazo, apaga-se sozinho.
"use client";

import { Button, DropdownMenu, Input, Select, Tooltip } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { useFonteDeExportacao } from "@/lib/dados-da-pagina";
import { useApp } from "@/lib/estado";
import { useEditar } from "@/lib/permissao";
import { definirDias, esvaziar, useReciclagem } from "@/lib/reciclagem";
import { DIAS_MAXIMOS, DIAS_MINIMOS, diasRestantes, diasValidos, expirados, PRAZOS_COMUNS, textoDoPrazo, type ItemApagado } from "@/lib/reciclagem-tipos";
import { Cartao, Confirmar } from "../conta/Pecas";
import { Vazio } from "../conteudo/ConteudoPecas";
import { Estado } from "../Estado";
import { MenuCartao, SeparadorDeMenu } from "../Flutuantes";
import { Ic, ICONES } from "../Icones";
import { Pagina, Titulo } from "../ui";
import { rotuloDaPagina } from "../atividade/ObservadorDaAtividade";
import { dataHora, Estatistica, inteiro, TabelaSimples, type ColunaSimples } from "../super/SuperPecas";

const textoDe = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Reciclagem() {
  const editar = useEditar();
  const { funcao, avisar } = useApp();
  const { itens, pronto, dias, restaurar, apagarDeVez } = useReciclagem();
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [apagar, setApagar] = useState<ItemApagado | null>(null);
  const [esvaziarTudo, setEsvaziarTudo] = useState(false);
  const [novoPrazo, setNovoPrazo] = useState("");
  const [confirmarPrazo, setConfirmarPrazo] = useState<number | null>(null);
  const master = funcao.id === "master";
  const agora = useMemo(() => new Date(), [itens]); // eslint-disable-line react-hooks/exhaustive-deps

  const tipos = useMemo(() => [...new Set(itens.map((i) => i.tipo))].sort((a, b) => a.localeCompare(b, "pt")), [itens]);
  const visiveis = useMemo(() => itens.filter((i) => (tipo === "todos" || i.tipo === tipo) && (!texto.trim() || textoDe(`${i.rotulo} ${i.tipo} ${i.apagadoPor}`).includes(textoDe(texto.trim())))), [itens, tipo, texto]);
  const primeiro = itens.length ? Math.min(...itens.map((i) => diasRestantes(i, dias, agora))) : null;

  useFonteDeExportacao(
    useMemo(
      () => ({ nome: "reciclagem", titulo: "Reciclagem", dados: { nome: "reciclagem", titulo: "Reciclagem", colunas: ["Nome", "Tipo", "Apagado em", "Apagado por", "Página", "Dias que faltam"], linhas: itens.map((i) => [i.rotulo, i.tipo, i.apagadoEm, i.apagadoPor, i.pagina, diasRestantes(i, dias, new Date())] as (string | number)[]) } }),
      [itens, dias],
    ),
  );

  const restaurarItem = async (i: ItemApagado) => {
    try {
      await restaurar(i);
      avisar(`Restaurado «${i.rotulo}»`);
    } catch (e) {
      avisar(`Não foi possível restaurar: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  };

  const colunas: ColunaSimples<ItemApagado>[] = [
    { rotulo: "Nome", render: (i) => <span className="block max-w-72 truncate font-medium" title={i.rotulo}>{i.rotulo}</span> },
    { rotulo: "Tipo", filtro: (i) => String(i.tipo), render: (i) => <Estado valor={i.tipo} variante="neutral" /> },
    { rotulo: "Apagado em", render: (i) => <span className="tabular-nums">{dataHora(i.apagadoEm)}</span> },
    { rotulo: "Apagado por", filtro: (i) => i.apagadoPor, render: (i) => i.apagadoPor },
    { rotulo: "Onde", filtro: (i) => rotuloDaPagina(i.pagina), render: (i) => rotuloDaPagina(i.pagina) },
    { rotulo: "Prazo", render: (i) => <Estado valor={textoDoPrazo(diasRestantes(i, dias, agora))} variante={diasRestantes(i, dias, agora) <= 7 ? "warning" : "neutral"} /> },
    {
      rotulo: "",
      direita: true,
      render: (i) => (
        <DropdownMenu>
          <Tooltip content={`Opções de ${i.rotulo}`} render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="sm" icon={ICONES.mais3} aria-label={`Opções de ${i.rotulo}`} />} />} />
          <MenuCartao>
            <DropdownMenu.Item icon={<Ic nome="repor" />} disabled={!editar} onClick={() => void restaurarItem(i)}>
              Restaurar
            </DropdownMenu.Item>
            <SeparadorDeMenu />
            <DropdownMenu.Item icon={<Ic nome="lixo" />} variant="danger" disabled={!editar} onClick={() => setApagar(i)}>
              Apagar definitivamente
            </DropdownMenu.Item>
          </MenuCartao>
        </DropdownMenu>
      ),
    },
  ];

  const pedirPrazo = () => {
    const n = Number(novoPrazo);
    if (!diasValidos(n) || n === dias) return;
    if (expirados(itens, n, new Date()).length > 0) setConfirmarPrazo(n);
    else definirDias(n);
  };
  const apagadosJa = confirmarPrazo ? expirados(itens, confirmarPrazo, new Date()).length : 0;

  return (
    <Pagina>
      <Titulo titulo="Reciclagem">
        {editar && (
          <Button variant="secondary" icon={ICONES.lixo} onClick={() => setEsvaziarTudo(true)} disabled={itens.length === 0}>
            Esvaziar
          </Button>
        )}
      </Titulo>
      <div className="grid gap-3 sm:grid-cols-3">
        <Estatistica titulo="Itens na reciclagem" valor={inteiro(itens.length)} numero={itens.length} />
        <Estatistica titulo="Prazo de recuperação" valor={`${inteiro(dias)} ${dias === 1 ? "dia" : "dias"}`} numero={dias} />
        <Estatistica titulo="O próximo a apagar-se" valor={primeiro === null ? "—" : textoDoPrazo(primeiro).replace(/^F/, "f")} />
      </div>

      <Cartao titulo="Prazo de recuperação">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="sm:w-56">
            <Select
              label="Prazo"
              value={(PRAZOS_COMUNS as readonly number[]).includes(dias) ? String(dias) : "outro"}
              onValueChange={(v) => v !== "outro" && setNovoPrazo(String(v))}
              items={{ ...Object.fromEntries(PRAZOS_COMUNS.map((d) => [String(d), `${d} dias`])), outro: "Outro prazo" }}
              disabled={!master}
            />
          </div>
          <div className="sm:w-44">
            <Input label="Dias" inputMode="numeric" autoComplete="off" value={novoPrazo || String(dias)} onChange={(e) => setNovoPrazo(e.target.value)} disabled={!master} />
          </div>
          {master ? (
            <Button variant="primary" onClick={pedirPrazo} disabled={!diasValidos(Number(novoPrazo || dias)) || Number(novoPrazo || dias) === dias}>
              Guardar o prazo
            </Button>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-kumo-subtle">
              <Ic nome="cadeado" tamanho={14} />
              Só o Master Admin muda o prazo
            </span>
          )}
        </div>
      </Cartao>

      <Cartao titulo={`Apagados${itens.length ? ` (${itens.length})` : ""}`}>
        <div className="flex flex-col gap-2 border-b border-kumo-hairline p-3 sm:flex-row">
          <Input aria-label="Pesquisar na reciclagem" placeholder="Pesquisar pelo nome, pelo tipo ou por quem apagou" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" className="w-full" />
          <div className="sm:w-60 sm:shrink-0">
            <Select aria-label="Tipo" value={tipo} onValueChange={(v) => setTipo(String(v))} items={{ todos: "Todos os tipos", ...Object.fromEntries(tipos.map((t) => [t, t])) }} />
          </div>
        </div>
        {!pronto ? (
          <div className="p-6 text-sm text-kumo-subtle">A ler a reciclagem…</div>
        ) : itens.length === 0 ? (
          <Vazio icone="lixo" titulo="A reciclagem está vazia" texto="Tudo o que se apagar no painel fica aqui durante o prazo, e pode voltar." />
        ) : (
          <TabelaSimples colunas={colunas} linhas={visiveis} chave={(i) => i.id} vazio="Nada corresponde à pesquisa." />
        )}
      </Cartao>

      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Apagar definitivamente" perigo texto={apagar ? `«${apagar.rotulo}» (${apagar.tipo.toLowerCase()}) vai ser apagado de vez e já não se pode recuperar.` : ""} rotuloAcao="Apagar de vez" aoConfirmar={() => apagar && void apagarDeVez(apagar)} />
      <Confirmar aberto={esvaziarTudo} aoMudar={setEsvaziarTudo} titulo="Esvaziar a reciclagem" perigo texto={`Os ${itens.length} itens vão ser apagados de vez e já não se podem recuperar.`} rotuloAcao="Esvaziar" escrever="APAGAR a reciclagem" aoConfirmar={() => void esvaziar().then((n) => avisar(`${n} ${n === 1 ? "item apagado" : "itens apagados"} de vez`))} />
      <Confirmar
        aberto={confirmarPrazo !== null}
        aoMudar={(v) => !v && setConfirmarPrazo(null)}
        titulo="Encurtar o prazo"
        perigo
        texto={`Com ${confirmarPrazo} ${confirmarPrazo === 1 ? "dia" : "dias"}, ${apagadosJa} ${apagadosJa === 1 ? "item que já passou" : "itens que já passaram"} do prazo ${apagadosJa === 1 ? "apaga-se" : "apagam-se"} de vez agora.`}
        rotuloAcao="Mudar o prazo"
        aoConfirmar={() => {
          if (confirmarPrazo) definirDias(confirmarPrazo);
          setNovoPrazo("");
        }}
      />
    </Pagina>
  );
}
