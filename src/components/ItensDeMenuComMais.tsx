// Itens de menu «com mais»: o item faz o que se faz quase sempre e, à direita, uns três pontinhos (na vertical) abrem as outras formas de o fazer. Servem os menus de três pontos dos cartões, das listas e dos registos: «Copiar» e «Perguntar à IA» são um item cada, sem ocuparem uma linha por variante.
"use client";

import { DropdownMenu } from "@cloudflare/kumo";
import type { ReactNode } from "react";
import { SubMenuCartao } from "./Flutuantes";
import { Ic } from "./Icones";

/** O item e, ao lado, o gatilho dos três pontinhos com o submenu das outras opções. */
export function ItemComMais({ icone, rotulo, aoClicar, desativado = false, rotuloDosMais, children }: { icone: ReactNode; rotulo: string; aoClicar: () => void; desativado?: boolean; rotuloDosMais: string; children: ReactNode }) {
  return (
    <div className="flex items-stretch gap-0.5">
      <DropdownMenu.Item icon={icone} className="min-w-0 flex-1" disabled={desativado} onClick={aoClicar}>
        {rotulo}
      </DropdownMenu.Item>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger aria-label={rotuloDosMais} className="shrink-0 justify-center px-1.5 [&>svg]:hidden">
          <span aria-hidden className="inline-flex">
            <Ic nome="mais3" tamanho={16} />
          </span>
        </DropdownMenu.SubTrigger>
        <SubMenuCartao>{children}</SubMenuCartao>
      </DropdownMenu.Sub>
    </div>
  );
}

/** «Copiar»: copia os dados; os três pontinhos têm as outras formas (a imagem do cartão). Sem outras formas, é um item simples. */
export function ItemCopiarComMais({ aoCopiar, aoImagem }: { aoCopiar: () => void; aoImagem?: () => void }) {
  if (!aoImagem) {
    return (
      <DropdownMenu.Item icon={<Ic nome="copiar" />} onClick={aoCopiar}>
        Copiar
      </DropdownMenu.Item>
    );
  }
  return (
    <ItemComMais icone={<Ic nome="copiar" />} rotulo="Copiar" aoClicar={aoCopiar} rotuloDosMais="Mais formas de copiar">
      <DropdownMenu.Item icon={<Ic nome="copiar" />} onClick={aoCopiar}>
        Copiar dados
      </DropdownMenu.Item>
      <DropdownMenu.Item icon={<Ic nome="imagem" />} onClick={aoImagem}>
        Copiar como imagem
      </DropdownMenu.Item>
    </ItemComMais>
  );
}

/** «Perguntar à IA»: faz a pergunta de sempre; os três pontinhos têm as outras maneiras de pedir ajuda à IA sobre o mesmo assunto. */
export function ItemPerguntarComMais({ pergunta, perguntar, aoInvestigar }: { /** A sugestão que fica escrita no campo do chat: curta (o assunto segue à parte, como contexto). */ pergunta: string; perguntar: (texto: string) => void; aoInvestigar?: () => void }) {
  return (
    <ItemComMais icone={<Ic nome="ia" />} rotulo="Perguntar à IA" aoClicar={() => perguntar(pergunta)} rotuloDosMais="Mais formas de perguntar à IA">
      {aoInvestigar && (
        <DropdownMenu.Item icon={<Ic nome="lupa" />} onClick={aoInvestigar}>
          Investigar com IA
        </DropdownMenu.Item>
      )}
      <DropdownMenu.Item icon={<Ic nome="artigo" />} onClick={() => perguntar("Resumir")}>
        Resumir
      </DropdownMenu.Item>
      <DropdownMenu.Item icon={<Ic nome="aviso" />} onClick={() => perguntar("Procurar problemas")}>
        Procurar problemas
      </DropdownMenu.Item>
    </ItemComMais>
  );
}
