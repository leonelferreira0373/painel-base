// Definições da conta: menu de secções à esquerda (em fila deslizante no telemóvel) e a secção escolhida à direita.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { caminhoConta, SECOES_CONTA } from "@/dados/conta";
import { useConta } from "@/lib/conta";
import { Avatar } from "../Avatar";
import { Dica } from "../Dica";
import { Esbatido } from "../Estados";
import { Ic } from "../Icones";
import { Pagina, Titulo } from "../ui";
import { SecaoAtalhos } from "./SecaoAtalhos";
import { SecaoAparencia, SecaoContactos, SecaoPerfil } from "./SecoesA";
import { SecaoDados, SecaoSeguranca, SecaoTokens } from "./SecoesB";
import { SecaoLembretes, SecaoNotificacoes } from "./SecoesC";

const SECOES: Record<string, () => React.ReactNode> = {
  atalhos: () => <SecaoAtalhos />,
  perfil: () => <SecaoPerfil />,
  seguranca: () => <SecaoSeguranca />,
  contactos: () => <SecaoContactos />,
  notificacoes: () => <SecaoNotificacoes />,
  lembretes: () => <SecaoLembretes />,
  aparencia: () => <SecaoAparencia />,
  tokens: () => <SecaoTokens />,
  dados: () => <SecaoDados />,
};

export function Conta({ secao }: { secao: string }) {
  const { conta } = useConta();
  const router = useRouter();
  const atual = SECOES_CONTA.find((s) => s.id === secao) ?? SECOES_CONTA[0];
  return (
    <Pagina>
      <Titulo titulo="Definições da conta">
        <span className="hidden items-center gap-2 text-sm text-kumo-subtle sm:inline-flex">
          <Avatar foto={conta.foto} nome={conta.nome} tamanho={24} />
          {conta.email}
        </span>
      </Titulo>
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Esbatido className="sem-barra -mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <nav aria-label="Secções da conta" className="flex gap-1 lg:flex-col">
            {SECOES_CONTA.map((s) => {
              const ativa = s.id === atual.id;
              return (
                <Dica key={s.id} conteudo={s.descricao} lado="right">
                  <Link
                    href={caminhoConta(s.id)}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(caminhoConta(s.id));
                    }}
                    aria-current={ativa ? "page" : undefined}
                    className={`flex h-9 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${ativa ? "bg-kumo-tint text-kumo-default" : "text-kumo-subtle hover:bg-kumo-tint hover:text-kumo-default"}`}
                  >
                    <Ic nome={s.icone} tamanho={16} />
                    {s.rotulo}
                  </Link>
                </Dica>
              );
            })}
          </nav>
        </Esbatido>
        <div className="flex min-w-0 flex-col gap-4">{SECOES[atual.id]()}</div>
      </div>
    </Pagina>
  );
}
