// O ecrã do Master Admin para escolher o pacote do negócio e ligar ou desligar cada área e cada módulo. É só uma forma de ligar e desligar painéis: o que se desliga desaparece do menu, da pesquisa e das páginas de todas as funções, e volta quando se liga. O pacote «Personalizado» é o ponto de partida de quem quer escolher à mão.
"use client";

import { Badge, Button } from "@cloudflare/kumo";
import { AREAS } from "@/dados/estrutura";
import { AREAS_ESSENCIAIS, PACOTES } from "@/dados/pacotes";
import { useApp } from "@/lib/estado";
import { alternar, areaLigada, contagem, escolherPacote, moduloLigado, pacoteEfetivo, type ConfigDoPainel } from "@/lib/modulos";
import { useEditar } from "@/lib/permissao";
import { Cartao, Interruptor, Linha } from "../conta/Pecas";
import { Ic, ICONES } from "../Icones";
import { Pagina, Titulo } from "../ui";
import { AvisoDeApi } from "../super/SuperPecas";

export function ModulosDoPainel() {
  const { painel, avisar } = useApp();
  const editar = useEditar();
  const config = painel.config;
  const efetivo = pacoteEfetivo(config);
  const excecoes = Object.keys(config.ligados).length;
  const mudar = (nova: ConfigDoPainel) => painel.definir(nova).catch((e) => avisar(e instanceof Error ? e.message : "Não foi possível guardar"));
  const pacoteDeOrigem = PACOTES.find((p) => p.id === config.pacote);

  return (
    <Pagina>
      <Titulo titulo="Módulos e pacotes">
        {editar && excecoes > 0 && (
          <Button variant="secondary" icon={ICONES.repor} onClick={() => void mudar(escolherPacote(config, config.pacote))}>
            Repor o pacote
          </Button>
        )}
      </Titulo>
      <AvisoDeApi erro={painel.erro} aoTentar={() => undefined} />
      <Cartao titulo="Pacote do negócio" dica="Cada pacote liga as áreas de um tipo de negócio. Depois pode ligar ou desligar qualquer área ou módulo à mão: o pacote passa a «Personalizado».">
        {PACOTES.map((p) => {
          const n = contagem({ pacote: p.id, ligados: {} });
          const emUso = efetivo === p.id;
          return (
            <Linha
              key={p.id}
              titulo={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Ic nome={p.icone} tamanho={16} />
                  {p.rotulo}
                  {emUso && <Badge variant="info">Em uso</Badge>}
                </span>
              }
              estado={p.id === "personalizado" && excecoes > 0 ? `Parte de «${pacoteDeOrigem?.rotulo ?? config.pacote}» com ${excecoes} ${excecoes === 1 ? "alteração" : "alterações"}` : `${n.areas} áreas e ${n.modulos} módulos`}
            >
              {editar && !emUso && (
                <Button variant="secondary" size="sm" onClick={() => void mudar(escolherPacote(config, p.id))}>
                  Usar
                </Button>
              )}
            </Linha>
          );
        })}
      </Cartao>
      {AREAS.filter((a) => !AREAS_ESSENCIAIS.includes(a.id)).map((a) => {
        const ligada = areaLigada(config, a.id);
        return (
          <Cartao key={a.id} titulo={a.rotulo} acoes={<Interruptor marcado={ligada} aoMudar={(v) => void mudar(alternar(config, a.id, v))} rotulo={`Área ${a.rotulo}`} desativado={!editar} />}>
            {a.modulos.map((m) => (
              <Linha key={m.id} titulo={<span className="inline-flex items-center gap-2">{m.rotulo}</span>} dica={m.descricao}>
                <Interruptor marcado={moduloLigado(config, a.id, m.id)} aoMudar={(v) => void mudar(alternar(config, `${a.id}/${m.id}`, v))} rotulo={`Módulo ${m.rotulo}`} desativado={!editar || !ligada} />
              </Linha>
            ))}
          </Cartao>
        );
      })}
    </Pagina>
  );
}
