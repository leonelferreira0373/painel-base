// As opções da tabela do blog, como em «Opções da tabela» do Google Docs, num cartão: o estilo, as bordas (cor, espessura e traço), as cores do cabeçalho e as células (cor de fundo e alinhamento vertical). Na barra de ferramentas atua nas células escolhidas (ou na do cursor); na barra por cima da tabela (com `posicao`) atua na tabela inteira.
"use client";

import { Button } from "@cloudflare/kumo";
import type { Node as NoPM } from "@tiptap/pm/model";
import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { ALINHAMENTOS_VERTICAIS, ESTILOS_DE_TABELA, estiloDeTabela, escreverOpcoesDaTabela, lerOpcoesDaTabela, LARGURA_MAXIMA_DA_BORDA, TRACOS_DA_TABELA, type OpcoesDaTabela } from "@/lib/blog-tabela";
import { CORES_DE_GRAFICO } from "@/lib/cores-graficos";
import { EscolhaDeOpcoes, LinhaDeCor, Seccao } from "../conta/Pecas";
import { CampoDeTamanho, CORES_DE_REALCE } from "./PecasDoTexto";

const ESPESSURAS = [0, 0.5, 1, 2, 3, 4, 6, 8];

/** A tabela onde está o cursor, ou a que está na posição dada. */
function acharTabela(editor: Editor, posicao: number | null): { pos: number; no: NoPM } | null {
  if (posicao !== null) {
    const no = editor.state.doc.nodeAt(posicao);
    return no?.type.name === "table" ? { pos: posicao, no } : null;
  }
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d -= 1) if ($from.node(d).type.name === "table") return { pos: $from.before(d), no: $from.node(d) };
  return null;
}

export function OpcoesDaTabela({ editor, posicao }: { editor: Editor; posicao: number | null }) {
  const tabela = acharTabela(editor, posicao);
  if (!tabela) return <span className="text-sm text-kumo-subtle">Ponha o cursor numa tabela.</span>;
  const opcoes = lerOpcoesDaTabela(tabela.no.attrs.opcoes as string);
  const estilo = estiloDeTabela(tabela.no.attrs.estilo);
  const daTabelaInteira = posicao !== null;

  /** Muda os atributos da tabela. */
  const naTabela = (atributos: Record<string, unknown>) =>
    editor
      .chain()
      .command(({ tr }) => {
        const t = acharTabela(editor, posicao);
        if (!t) return false;
        tr.setNodeMarkup(t.pos, undefined, { ...t.no.attrs, ...atributos });
        return true;
      })
      .run();
  const gravar = (parcial: Partial<OpcoesDaTabela>) => naTabela({ opcoes: escreverOpcoesDaTabela({ ...opcoes, ...parcial }) });

  /** Muda os atributos das células escolhidas, da do cursor ou, na barra por cima da tabela, de todas. */
  const nasCelulas = (atributos: Record<string, unknown>) =>
    editor
      .chain()
      .command(({ tr, state }) => {
        const t = acharTabela(editor, posicao);
        if (!t) return false;
        const alvos: number[] = [];
        const sel = state.selection;
        if (sel instanceof CellSelection) sel.forEachCell((_n, pos) => void alvos.push(pos));
        else if (!daTabelaInteira) {
          for (let d = sel.$from.depth; d > 0; d -= 1) {
            const papel = sel.$from.node(d).type.spec.tableRole;
            if (papel === "cell" || papel === "header_cell") {
              alvos.push(sel.$from.before(d));
              break;
            }
          }
        } else {
          t.no.descendants((n, p) => {
            const papel = n.type.spec.tableRole;
            if (papel === "cell" || papel === "header_cell") alvos.push(t.pos + 1 + p);
            return papel !== "cell" && papel !== "header_cell";
          });
        }
        for (const pos of alvos) {
          const n = tr.doc.nodeAt(pos);
          if (n) tr.setNodeMarkup(pos, undefined, { ...n.attrs, ...atributos });
        }
        return alvos.length > 0;
      })
      .run();

  const rotuloDoEstilo = ESTILOS_DE_TABELA.find((e) => e.id === estilo)?.rotulo ?? "";
  const rotuloDoTraco = TRACOS_DA_TABELA.find((t) => t.id === (opcoes.traco ?? "solid"))?.rotulo ?? "";

  return (
    <div className="flex max-h-[min(70dvh,540px)] flex-col gap-4 overflow-y-auto p-0.5" data-nao-pm="">
      <Seccao titulo="Estilo da tabela">
        <EscolhaDeOpcoes rotulo="Estilo da tabela" personalizar={false} opcoes={ESTILOS_DE_TABELA.map((e) => e.rotulo)} valor={[rotuloDoEstilo]} aoMudar={(v) => naTabela({ estilo: ESTILOS_DE_TABELA.find((e) => e.rotulo === v[0])?.id ?? estilo })} />
      </Seccao>
      <Seccao titulo="Bordas">
        <LinhaDeCor titulo="Cor da borda" valor={opcoes.corBorda ?? null} aoMudar={(hex) => gravar({ corBorda: hex ?? undefined })} cores={CORES_DE_GRAFICO} padrao="#171717" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-kumo-default">Espessura (px)</span>
          <CampoDeTamanho rotulo="Espessura da borda" valor={opcoes.larguraBorda ?? 1} aoMudar={(n) => gravar({ larguraBorda: n })} passos={ESPESSURAS} minimo={0} maximo={LARGURA_MAXIMA_DA_BORDA} pequeno />
        </div>
        <EscolhaDeOpcoes rotulo="Traço da borda" personalizar={false} opcoes={TRACOS_DA_TABELA.map((t) => t.rotulo)} valor={[rotuloDoTraco]} aoMudar={(v) => gravar({ traco: TRACOS_DA_TABELA.find((t) => t.rotulo === v[0])?.id })} />
      </Seccao>
      <Seccao titulo="Cabeçalho">
        <LinhaDeCor titulo="Cor de fundo" valor={opcoes.fundoCabecalho ?? null} aoMudar={(hex) => gravar({ fundoCabecalho: hex ?? undefined })} cores={CORES_DE_REALCE} padrao="#e5e7eb" />
        <LinhaDeCor titulo="Cor do texto" valor={opcoes.corCabecalho ?? null} aoMudar={(hex) => gravar({ corCabecalho: hex ?? undefined })} cores={CORES_DE_GRAFICO} padrao="#171717" />
      </Seccao>
      <Seccao titulo={daTabelaInteira ? "Todas as células" : "Células escolhidas"}>
        <LinhaDeCor titulo="Cor de fundo" valor={(editor.getAttributes("tableCell").fundo as string | null) ?? (editor.getAttributes("tableHeader").fundo as string | null) ?? null} aoMudar={(hex) => nasCelulas({ fundo: hex })} cores={CORES_DE_REALCE} padrao="#fef08a" />
        <EscolhaDeOpcoes
          rotulo="Alinhamento vertical"
          personalizar={false}
          opcoes={ALINHAMENTOS_VERTICAIS.map((a) => a.rotulo)}
          valor={[ALINHAMENTOS_VERTICAIS.find((a) => a.id === ((editor.getAttributes("tableCell").alinharV as string | null) ?? "top"))?.rotulo ?? ""]}
          aoMudar={(v) => nasCelulas({ alinharV: ALINHAMENTOS_VERTICAIS.find((a) => a.rotulo === v[0])?.id ?? null })}
        />
      </Seccao>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => (naTabela({ opcoes: "", estilo: "grelha" }), nasCelulas({ fundo: null, alinharV: null }))}>
          Repor a tabela
        </Button>
      </div>
    </div>
  );
}
