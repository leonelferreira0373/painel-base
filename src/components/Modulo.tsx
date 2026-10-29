// Escolhe o ecrã de cada módulo e aplica o controlo de acesso simulado da função ativa.
"use client";

import { Button, Empty } from "@cloudflare/kumo";
import Link from "next/link";
import { caminho, moduloPorIds } from "@/dados/estrutura";
import { REGISTOS } from "@/dados/modulos";
import { FUNCOES, podeEditar, podeVer } from "@/dados/rbac";
import { T } from "@/dados/textos";
import { useApp } from "@/lib/estado";
import { moduloLigado } from "@/lib/modulos";
import { PermissaoProvider } from "@/lib/permissao";
import { ControlosDaIA } from "./conteudo/ControlosIA";
import { Blog } from "./conteudo/Blog";
import { Galeria } from "./conteudo/Galeria";
import { GestorDeFicheiros } from "./conteudo/GestorDeFicheiros";
import { Faq } from "./conteudo/Faq";
import { Produtos } from "./conteudo/Produtos";
import { UsoDaIa } from "./ia/UsoDaIa";
import { AtividadeDoPainel } from "./atividade/AtividadeDoPainel";
import { Reciclagem } from "./reciclagem/Reciclagem";
import { CaixaDeEmail } from "./super/EmailCaixa";
import { CampanhasDeEmail, EmailsAgendados } from "./super/EmailCampanhas";
import { FinanceiroDoHotel } from "./negocios/FinanceiroDoHotel";
import { MapaDoTaxi } from "./negocios/MapaDoTaxi";
import { ModulosDoPainel } from "./painel/Modulos";
import { Predefinicoes } from "./painel/Predefinicoes";
import { GitHub } from "./super/GitHub";
import { Implementacoes } from "./super/Implementacoes";
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
import { RegistosDns } from "./super/DevDns";
import { RegistosDoServidor } from "./super/DevLogs";
import { PartilhaDeFicheiros } from "./partilha/PartilhaDeFicheiros";
import { Pagina } from "./ui";
import { VisaoGeral } from "./VisaoGeral";

/** Os ecrãs próprios do super painel (os que não são uma lista de registos), por área e módulo. */
const ECRAS: Record<string, Record<string, ComponentType>> = {
  pagamentos: { metricas: PagamentosVisao, comprovativos: Comprovativos, contas: ContasIban },
  marketing: {
    "visao-marketing": MarketingVisao,
    campanhas: Campanhas,
    rastreio: Rastreio,
    "campanhas-email": CampanhasDeEmail,
    "agendados-email": EmailsAgendados,
    recebidos: () => <CaixaDeEmail pasta="recebidos" />,
    enviados: () => <CaixaDeEmail pasta="enviados" />,
  },
  hotel: { "financeiro-hotel": FinanceiroDoHotel },
  taxi: { "mapa-taxi": MapaDoTaxi },
  painel: { modulos: ModulosDoPainel, predefinicoes: Predefinicoes },
  dev: { dns: RegistosDns, logs: RegistosDoServidor, implementacoes: Implementacoes, github: GitHub, saude: SaudeVps, "pedidos-web": PedidosEmTempoReal, bd: BaseDeDados, backups: Backups, limpeza: Limpeza, firewall: Firewall, paginas: PaginasDoSite, envios: EnviosDeEmail, api: ApiLigacoes },
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

/** Um módulo que o Master Admin desligou: quem o abre por uma ligação antiga vê isto; só o Master Admin tem o botão para o voltar a ligar. */
function ModuloDesligado() {
  const { funcao } = useApp();
  return (
    <Pagina>
      <Empty
        icon={<Ic nome="cadeado" tamanho={40} />}
        title="Módulo desligado"
        description="Este módulo está desligado neste painel."
        contents={
          podeVer(funcao, "painel", "modulos") ? (
            <Link href={caminho("painel", "modulos")}>
              <Button variant="primary" icon={ICONES.engrenagem}>
                Abrir módulos e pacotes
              </Button>
            </Link>
          ) : undefined
        }
      />
    </Pagina>
  );
}

export function Modulo({ areaId, moduloId }: { areaId: string; moduloId: string }) {
  const { funcao, painel } = useApp();
  const loc = moduloPorIds(areaId, moduloId);
  if (!loc) return <SemAcesso />;
  // enquanto não se leu a configuração, não se mostra «módulo desligado» por engano
  if (!painel.pronto) return <Pagina>{null}</Pagina>;
  if (!moduloLigado(painel.config, areaId, moduloId)) return <ModuloDesligado />;
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
    if (moduloId === "partilha") return (
      <PermissaoProvider editar={podeEditar(funcao, areaId, moduloId)}>
        <PartilhaDeFicheiros />
      </PermissaoProvider>
    );
    if (moduloId === "editor-produtos") return <Produtos />;
    if (moduloId === "faq") return <Faq />;
    return <Blog />;
  }
  if (areaId === "admin" && moduloId === "atividade") return <AtividadeDoPainel />;
  if (areaId === "admin" && moduloId === "reciclagem") return <Reciclagem />;
  if (areaId === "ia") return moduloId === "uso" ? <UsoDaIa /> : <ControlosDaIA aba={moduloId as "comportamento" | "memoria" | "testar"} />;
  const Ecra = ECRAS[areaId]?.[moduloId];
  if (Ecra)
    return (
      <PermissaoProvider editar={podeEditar(funcao, areaId, moduloId)}>
        <Ecra />
      </PermissaoProvider>
    );
  const Painel = PAINEIS[moduloId];
  if (Painel) return <Painel />;
  if (REGISTOS[moduloId]) return <Registos moduloId={moduloId} />;
  return <SemAcesso />;
}
