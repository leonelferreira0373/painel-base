// A configuração dos módulos do painel como estado: no navegador (chave `painel.modulos`) em modo simulado, e no servidor (`/v1/painel/configuracao`) em modo ligado. Quem a lê é o Provider, que tira da função de cada pessoa o que está desligado; quem a muda é só o ecrã do Master Admin.
"use client";

import { chamar, useApi, useLigacao } from "@/lib/api/cliente";
import { useGuardado } from "@/lib/guardado";
import { CONFIG_DE_ORIGEM, type ConfigDoPainel } from "@/lib/modulos";

export interface PainelConfig {
  config: ConfigDoPainel;
  /** Grava a configuração nova (no navegador ou no servidor). */
  definir: (nova: ConfigDoPainel) => Promise<void>;
  /** Já se leu o que estava guardado. */
  pronto: boolean;
  erro: string | null;
}

export function useConfigDoPainel(): PainelConfig {
  const ligacao = useLigacao();
  const [local, setLocal, prontoLocal] = useGuardado<ConfigDoPainel>("modulos", CONFIG_DE_ORIGEM);
  const api = useApi<ConfigDoPainel>("/v1/painel/configuracao", () => local);
  const ligado = ligacao.modo === "ligado";
  return {
    config: ligado ? (api.dados ?? CONFIG_DE_ORIGEM) : local,
    pronto: ligado ? !api.aCarregar : prontoLocal,
    erro: ligado ? api.erro : null,
    definir: async (nova) => {
      if (ligado) {
        await chamar(ligacao, "PUT", "/v1/painel/configuracao", nova);
        api.recarregar();
      } else setLocal(nova);
    },
  };
}
