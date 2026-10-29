// Se a função ativa pode alterar o ecrã que está aberto: quem só vê, vê tudo mas não muda nada. Cada ecrã lê `useEditar()` e o título mostra «Só leitura» sozinho.
"use client";

import { createContext, useContext, type ReactNode } from "react";

const Ctx = createContext(true);

export function PermissaoProvider({ editar, children }: { editar: boolean; children: ReactNode }) {
  return <Ctx.Provider value={editar}>{children}</Ctx.Provider>;
}

/** `true` quando a função ativa pode alterar este ecrã (por omissão, fora de um `PermissaoProvider`, pode). */
export function useEditar(): boolean {
  return useContext(Ctx);
}
