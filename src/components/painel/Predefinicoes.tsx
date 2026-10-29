// As predefinições de um clique do Master Admin: aplicar muda de uma vez o pacote, as áreas ligadas e o aspeto do painel (acento e letras dos títulos). Quem tem a sua própria aparência nas Definições da conta mantém-na. Só o Master Admin vê este ecrã.
"use client";

import { Badge, Button } from "@cloudflare/kumo";
import { PACOTES } from "@/dados/pacotes";
import { PREDEFINICOES } from "@/dados/predefinicoes";
import { useApp } from "@/lib/estado";
import { aplicarPredefinicao, contagem, type ConfigDoPainel } from "@/lib/modulos";
import { useEditar } from "@/lib/permissao";
import { Cartao, Linha } from "../conta/Pecas";
import { Ic, ICONES } from "../Icones";
import { Pagina, Titulo } from "../ui";

export function Predefinicoes() {
  const { painel, avisar } = useApp();
  const editar = useEditar();
  const config = painel.config;
  const mudar = (nova: ConfigDoPainel, texto: string) =>
    painel.definir(nova).then(
      () => avisar(texto),
      (e) => avisar(e instanceof Error ? e.message : "Não foi possível guardar"),
    );
  const temAparencia = !!config.aparencia && Object.keys(config.aparencia).length > 0;

  return (
    <Pagina>
      <Titulo titulo="Predefinições">
        {editar && temAparencia && (
          <Button variant="secondary" icon={ICONES.repor} onClick={() => void mudar({ ...config, aparencia: undefined }, "Aparência de origem reposta")}>
            Repor a aparência
          </Button>
        )}
      </Titulo>
      <Cartao titulo="Um clique para mudar o painel" dica="Aplicar uma predefinição escolhe o pacote do negócio e o aspeto do painel de uma vez. Pode mudar qualquer interruptor depois, em «Módulos e pacotes».">
        {PREDEFINICOES.map((p) => {
          const emUso = config.predefinicao === p.id;
          const pacote = PACOTES.find((x) => x.id === p.pacote);
          const n = contagem(aplicarPredefinicao(p));
          return (
            <Linha
              key={p.id}
              titulo={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span aria-hidden className="size-3 rounded-full ring ring-kumo-line" style={{ background: p.cor }} />
                  <Ic nome={p.icone} tamanho={16} />
                  {p.rotulo}
                  {emUso && <Badge variant="info">Em uso</Badge>}
                </span>
              }
              estado={`${pacote?.rotulo ?? p.pacote} · ${n.areas} áreas e ${n.modulos} módulos${p.aparencia ? " · com aspeto próprio" : ""}`}
            >
              {editar && !emUso && (
                <Button variant="secondary" size="sm" onClick={() => void mudar(aplicarPredefinicao(p), `Predefinição «${p.rotulo}» aplicada`)}>
                  Aplicar
                </Button>
              )}
            </Linha>
          );
        })}
      </Cartao>
    </Pagina>
  );
}
