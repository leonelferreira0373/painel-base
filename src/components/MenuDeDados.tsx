// O menu «Exportar» dos cartões e das listas, como o da Cloudflare: descarregar como CSV, descarregar como JSON e copiar como imagem. `ItensDeExportar` entra em qualquer menu de cartão; `MenuDeDados` é o menu «…» completo para quem só tem a exportação (as listas). O resultado de copiar a imagem aparece no próprio botão «…» (visto ou aviso), nunca num aviso flutuante.
"use client";

import { Button, DropdownMenu, Tooltip } from "@cloudflare/kumo";
import { copiarImagem, paraCsv, paraJson, type DadosExportaveis } from "@/lib/exportar-dados";
import { IconeMorfico, useResultadoTemporario } from "./Copiar";
import { descarregar } from "./conta/Pecas";
import { MenuCartao, SubMenuCartao } from "./Flutuantes";
import { Ic } from "./Icones";

export function ItensDeExportar({ dados, aoCopiarImagem }: { dados: DadosExportaveis; aoCopiarImagem: (ok: boolean) => void }) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger icon={<Ic nome="transferir" />}>Exportar</DropdownMenu.SubTrigger>
      <SubMenuCartao>
        <DropdownMenu.Item icon={<Ic nome="tabela" />} onClick={() => descarregar(`${dados.nome}.csv`, paraCsv(dados), "text/csv")}>
          Descarregar como CSV
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="json" />} onClick={() => descarregar(`${dados.nome}.json`, paraJson(dados), "application/json")}>
          Descarregar como JSON
        </DropdownMenu.Item>
        <DropdownMenu.Item icon={<Ic nome="imagem" />} onClick={async () => aoCopiarImagem(await copiarImagem(dados))}>
          Copiar como imagem
        </DropdownMenu.Item>
      </SubMenuCartao>
    </DropdownMenu.Sub>
  );
}

/** O botão «…» de um cartão ou de uma lista: o gatilho que mostra o resultado de copiar a imagem. */
export function GatilhoDoMenu({ estado }: { estado: "ocioso" | "ok" | "erro" }) {
  return (
    <Tooltip content={estado === "ok" ? "Imagem copiada" : estado === "erro" ? "Não foi possível copiar a imagem" : "Opções"} render={<DropdownMenu.Trigger render={<Button variant="ghost" shape="square" size="xs" icon={<IconeMorfico estado={estado} repouso="mais3" tamanho={16} />} aria-label="Opções do cartão" className="-mr-1.5 text-kumo-subtle" />} />} />
  );
}

/** O menu «…» completo de uma lista: só a exportação. */
export function MenuDeDados({ dados }: { dados: DadosExportaveis }) {
  const [estado, definir] = useResultadoTemporario();
  return (
    <DropdownMenu>
      <GatilhoDoMenu estado={estado} />
      <MenuCartao>
        <ItensDeExportar dados={dados} aoCopiarImagem={(ok) => definir(ok ? "ok" : "erro")} />
      </MenuCartao>
    </DropdownMenu>
  );
}
