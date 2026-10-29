// O campo de pesquisa que vai dentro dos cartões flutuantes (o seletor de contas, o de clientes…): o Input do Kumo sem moldura, para ficar na barra do cartão com a lupa e a linha por baixo. Nenhum cartão desenha o seu <input>.
"use client";

import { Input } from "@cloudflare/kumo";

export function CampoDePesquisa({ valor, aoMudar, rotulo, placeholder, idLista }: { valor: string; aoMudar: (v: string) => void; rotulo: string; placeholder: string; idLista: string }) {
  return (
    <Input
      type="text"
      role="combobox"
      aria-label={rotulo}
      aria-controls={idLista}
      aria-expanded="true"
      aria-autocomplete="list"
      autoComplete="off"
      placeholder={placeholder}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      className="h-auto! min-w-0 grow rounded-none! border-0! bg-transparent! px-2 py-2.5 shadow-none! ring-0! focus:ring-0!"
    />
  );
}
