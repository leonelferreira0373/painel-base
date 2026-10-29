// Escolhe o ecrã de cada módulo e aplica o controlo de acesso simulado da função ativa.
"use client";

import { Button, Empty } from "@cloudflare/kumo";
import { moduloPorIds } from "@/dados/estrutura";
import { REGISTOS } from "@/dados/modulos";
import { FUNCOES, podeVer } from "@/dados/rbac";
import { T } from "@/dados/textos";
import { useApp } from "@/lib/estado";
import { ControlosDaIA } from "./conteudo/ControlosIA";
import { Blog } from "./conteudo/Blog";
import { Galeria } from "./conteudo/Galeria";
import { GestorDeFicheiros } from "./conteudo/GestorDeFicheiros";
import { Exportar } from "./analise/Exportar";
import { Ficheiros } from "./analise/Ficheiros";
import { GraficosPagina } from "./analise/Graficos";
import { Perfil } from "./analise/Perfil";
import { Ic, ICONES } from "./Icones";
import { PAINEIS } from "./Paineis";
import { Registos } from "./Registos";
import { BaseDeDados, PedidosEmTempoReal, SaudeVps } from "./super/DevServidor";
import { ApiLigacoes, Backups, EnviosDeEmail, Firewall, Limpeza, PaginasDoSite } from "./super/DevOperacoes";
import { Campanhas, MarketingVisao, Rastreio } from "./super/MarketingPaginas";
import { Comprovativos, ContasIban, PagamentosVisao } from "./super/PagamentosPaginas";
import type { ComponentType } from "react";
import { Pagina } from "./ui";
import { VisaoGeral } from "./VisaoGeral";

/** Os ecrãs próprios do super painel (os que não são uma lista de registos), por área e módulo. */
const ECRAS: Record<string, Record<string, ComponentType>> = {
  pagamentos: { metricas: PagamentosVisao, comprovativos: Comprovativos, contas: ContasIban },
  marketing: { "visao-marketing": MarketingVisao, campanhas: Campanhas, rastreio: Rastreio },
  dev: { saude: SaudeVps, "pedidos-web": PedidosEmTempoReal, bd: BaseDeDados, backups: Backups, limpeza: Limpeza, firewall: Firewall, paginas: PaginasDoSite, envios: EnviosDeEmail, api: ApiLigacoes },
};

function SemAcesso() {
  const { funcao, mudarFuncao } = useApp();
  const alternativa = FUNCOES.find((f) => f.id !== funcao.id && f.id === "administrador") ?? FUNCOES[0];
  return (
    <Pagina>
      <Empty
        icon={<Ic nome="cadeado" tamanho={40} />}
        title={T.acesso.titulo}
        description={T.acesso.texto}
        contents={
          <Button variant="primary" icon={ICONES.pessoa} onClick={() => mudarFuncao(alternativa.id)}>
            {alternativa.rotulo}
          </Button>
        }
      />
    </Pagina>
  );
}

export function Modulo({ areaId, moduloId }: { areaId: string; moduloId: string }) {
  const { funcao } = useApp();
  const loc = moduloPorIds(areaId, moduloId);
  if (!loc) return <SemAcesso />;
  if (!podeVer(funcao, areaId, moduloId)) return <SemAcesso />;
  if (areaId === "inicio") return <VisaoGeral />;
  if (areaId === "analise") {
    if (moduloId === "ficheiros") return <Ficheiros />;
    if (moduloId === "perfil") return <Perfil />;
    if (moduloId === "graficos") return <GraficosPagina />;
    return <Exportar />;
  }
  if (areaId === "conteudo") {
    if (moduloId === "biblioteca") return <GestorDeFicheiros />;
    if (moduloId === "galeria") return <Galeria />;
    return <Blog />;
  }
  if (areaId === "ia") return <ControlosDaIA aba={moduloId as "comportamento" | "memoria" | "testar"} />;
  const Ecra = ECRAS[areaId]?.[moduloId];
  if (Ecra) return <Ecra />;
  const Painel = PAINEIS[moduloId];
  if (Painel) return <Painel />;
  if (REGISTOS[moduloId]) return <Registos moduloId={moduloId} />;
  return <SemAcesso />;
}
